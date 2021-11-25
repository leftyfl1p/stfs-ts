import { readFileSync } from 'fs';
import { TextDecoder } from 'util';

import Directory from './Directory';
import File from './File';
import { readInt24BE, readInt24LE } from './utils';

enum PackageType {
    // Console signed
    CON = 1,

    // MS signed
    LIVE,

    // system updates
    PIRS
}

interface BlockHash {
    index: number;
    hash: Buffer;
    status: number;
    nextBlock: number;
}

const ErrBadPkg = new Error('File is not valid STFS');

class Package {
    type: PackageType;
    buffer: Buffer;
    tableSizeShift: number;
    fileTableBlockCount: number;
    fileTableBlockNumber: number;
    fileCount: number;
    Root: Directory;
    tableSpacing: number[][] = [
        [0xab, 0x718f, 0xfe7da], // type 0
        [0xac, 0x723a, 0xfd00b] // type 1
    ];
    baseBlock: number;

    constructor(path: string);
    constructor(buffer: Buffer);
    constructor(thing: unknown) {
        if (typeof thing === 'string') {
            this.buffer = readFileSync(thing);
        } else if (thing instanceof Buffer) {
            this.buffer = thing;
        } else {
            throw new Error('Invalid argument');
        }

        if (this.buffer.length < 0x4) {
            throw ErrBadPkg;
        }

        const magic = this.buffer.slice(0, 4).toString();
        switch (magic) {
            case 'CON ':
                this.type = PackageType.CON;
                break;
            case 'LIVE':
                this.type = PackageType.LIVE;
                break;
            case 'PIRS':
                this.type = PackageType.PIRS;
                break;
            default:
                throw ErrBadPkg;
        }

        let pos = 0x340;
        if (this.buffer.length < pos + 4) {
            throw ErrBadPkg;
        }

        const headerSize = this.buffer.readInt32BE(pos);

        if (((headerSize + 0xfff) & 0xf000) >> 0xc == 0xb) {
            this.tableSizeShift = 0;
            this.baseBlock = 0xb << 12;
        } else {
            this.tableSizeShift = 1;
            this.baseBlock = 0xa << 12;
        }

        pos = 0x37c;
        this.fileTableBlockCount = this.buffer.readInt16LE(pos);
        pos += 2;

        if (this.fileTableBlockCount > 1) {
            throw ErrBadPkg;
        }

        this.fileTableBlockNumber = readInt24LE(this.buffer, pos);
        pos = 0x39d;

        this.fileCount = this.buffer.readInt32LE(pos);
        pos += 4;

        this.Root = new Directory('/');

        const dirsOrdinal: Record<number, Directory> = {};
        dirsOrdinal[-1] = this.Root;

        let items = 0;
        const fileTableBlocks = this.getFileBlocks(
            this.fileTableBlockNumber,
            this.fileTableBlockCount,
            false
        );

        for (let i = 0; i < fileTableBlocks.length; i++) {
            const currentBlock = fileTableBlocks[i];
            let basePosition = 0;

            pos = this.blockToOffset(currentBlock);
            const currentBlockBuf = this.buffer.slice(pos, pos + 0x1000);
            pos += 0x1000;
            for (let j = 0; j < 0x40; j++) {
                basePosition = 0x40 * j;
                if (currentBlockBuf.at(basePosition) === 0) {
                    break;
                }
                pos = basePosition + 0x28;
                const flags = currentBlockBuf.readInt8(pos);
                pos = basePosition;

                const nameBytesLen = flags & 0x3f;
                const nameBytes = currentBlockBuf.slice(
                    basePosition,
                    basePosition + nameBytesLen
                );
                pos += nameBytesLen;
                const name = new TextDecoder('windows-1252').decode(nameBytes);
                pos = basePosition + 0x29;
                const numBlocks = readInt24LE(currentBlockBuf, pos);
                pos += 3;

                // unused/unknown
                pos += 0x3;

                const startBlock = readInt24LE(currentBlockBuf, pos);
                pos += 3;

                const parentDir = currentBlockBuf.readInt16BE(pos);
                pos += 2;

                const size = currentBlockBuf.readUInt32BE(pos);
                pos += 4;

                // unused: update
                pos += 4;

                // unused: access
                pos += 4;

                const parent = dirsOrdinal[parentDir];
                if (!parent) {
                    throw new Error('referenced non existant dir?');
                }

                if ((flags & 0x80) == 0x80) {
                    // item is a directory
                    const tmp = new Directory(name, parent);
                    dirsOrdinal[items] = tmp;
                    parent.addDir(tmp);
                } else {
                    // item is a file
                    if ((flags & 0x40) == 0x40) {
                        // blocks are sequential
                        const dataBlocks = this.getFileBlocks(
                            startBlock,
                            numBlocks,
                            true
                        );

                        const file = File.newStrict(
                            name,
                            size,
                            dataBlocks,
                            parent,
                            this
                        );
                        parent.addFile(file);
                    } else {
                        // offload block calculation until we need it
                        const file = File.newLazy(
                            name,
                            size,
                            startBlock,
                            numBlocks,
                            parent,
                            this
                        );
                        parent.addFile(file);
                    }
                }
                items++;
            }
        }
    }

    getFileBlocks(
        blockNum: number,
        numBlocks: number,
        sequential: boolean
    ): number[] {
        const ret = [];

        if (sequential) {
            for (let i = 0; i < numBlocks; i++) {
                ret.push(blockNum + i);
            }
        } else {
            let numBlocksLeft = numBlocks;
            while (numBlocksLeft > 0) {
                const hash = this.getBlockHash(blockNum);
                ret[numBlocks - numBlocksLeft] = blockNum;
                numBlocksLeft--;
                blockNum = hash.nextBlock;
                if (blockNum === hash.index || blockNum === -1) {
                    break;
                }
            }

            if (numBlocksLeft > 0 || ret.length === 0) {
                throw new Error('failed to get all blocks');
            }
        }

        return ret;
    }

    getBlockHash(blockNum: number): BlockHash {
        const record = blockNum % 0xaa;
        let tableIndex =
            Math.floor(blockNum / 0xaa) *
            this.tableSpacing[this.tableSizeShift][0];
        if (blockNum >= 0xaa) {
            tableIndex +=
                (Math.floor(blockNum / 0x70e4) + 1) << this.tableSizeShift;
            if (blockNum >= 0x70e4) {
                tableIndex += 1 << this.tableSizeShift;
            }
        }

        let pos = this.baseBlock + tableIndex * 0x1000 + record * 0x18;

        const hash = this.buffer.slice(pos, pos + 0x14);
        pos += 0x14;

        const status = this.buffer.readInt8(pos) & 0xff;
        pos += 1;

        const nextBlock = readInt24BE(this.buffer, pos);
        pos += 3;

        return {
            index: blockNum,
            hash,
            status,
            nextBlock
        };
    }

    blockToOffset(blockNum: number): number {
        if (blockNum > 0xffffff) {
            return -1;
        }

        return 0xc000 + this.fixBlockNumber(blockNum) * 0x1000;
    }

    fixBlockNumber(blockNum: number): number {
        let adjust = 0;

        if (blockNum >= 0xaa) {
            adjust += (Math.floor(blockNum / 0xaa) + 1) << this.tableSizeShift;
        }

        if (blockNum >= 0x70e4) {
            adjust +=
                (Math.floor(blockNum / 0x70e4) + 1) << this.tableSizeShift;
        }

        return blockNum + adjust;
    }

    static IsSTFS(path: string) {
        const file = readFileSync(path);

        const magic = file.slice(0, 4).toString();
        return magic === 'CON ' || magic === 'LIVE' || magic === 'PIRS';
    }
}

export default Package;

import Directory from './Directory';
import Package from './Package';

class File {
    name!: string;
    size!: number;
    parent!: Directory;
    dataBlocks?: number[];
    startBlock = 0;
    numBlocks!: number;
    container!: Package;

    static newStrict(
        name: string,
        size: number,
        dataBlocks: number[],
        parent: Directory,
        container: Package
    ) {
        const file = new File();
        file.name = name;
        file.size = size;
        file.parent = parent;

        file.numBlocks = dataBlocks.length;
        file.dataBlocks = dataBlocks;
        file.container = container;

        if (file.numBlocks > 0) {
            file.startBlock = dataBlocks[0];
        }

        return file;
    }

    static newLazy(
        name: string,
        size: number,
        startBlock: number,
        numBlocks: number,
        parent: Directory,
        container: Package
    ) {
        const file = new File();
        file.name = name;
        file.size = size;
        file.startBlock = startBlock;
        file.numBlocks = numBlocks;
        file.parent = parent;
        file.container = container;
        return file;
    }

    data() {
        if (!this.dataBlocks) {
            this.dataBlocks = this.container.getFileBlocks(
                this.startBlock,
                this.numBlocks,
                false
            );
        }

        let blockOffset = 0;
        let count = this.size;
        let readData = Buffer.alloc(0);

        for (let i = 0; i < this.dataBlocks.length; i++) {
            const pos = this.container.blockToOffset(
                this.dataBlocks[i] + blockOffset
            );
            let bytesToRead = 0x1000 - blockOffset;
            if (count < bytesToRead) {
                bytesToRead = count;
            }
            const readBytes = this.container.buffer.slice(
                pos,
                pos + bytesToRead
            );
            const readByteCount = readBytes.length;
            readData = Buffer.concat([readData, readBytes]);

            count -= readByteCount;
            blockOffset = 0;
            if (count <= 0) {
                break;
            }
        }

        return readData;
    }
}

export default File;

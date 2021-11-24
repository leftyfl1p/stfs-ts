import Directory from './Directory';
import Package from './Package';

class File {
    name!: string;
    size!: number;
    parent!: Directory;
    dataBlocks: number[] = [];
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
}

export default File;

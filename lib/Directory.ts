import File from './File';

class Directory {
    name: string;
    parent?: Directory;
    dirs: Record<string, Directory>;
    files: Record<string, File>;

    constructor(name: string, parent?: Directory) {
        this.name = name;
        this.parent = parent;
        this.dirs = {};
        this.files = {};
    }

    addDir(dir: Directory) {
        if (!this.dirs[dir.name]) {
            this.dirs[dir.name] = dir;
        }
    }

    addFile(file: File) {
        if (!this.files[file.name]) {
            this.files[file.name] = file;
        }
    }
}

export default Directory;

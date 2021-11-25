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

    recursiveDescription(indent = 0) {
        const indentStr = ' '.repeat(indent);

        let ret = `${indentStr}${this.name}\n`;
        for (const key in this.files) {
            if (Object.prototype.hasOwnProperty.call(this.files, key)) {
                const file = this.files[key];
                ret += `${indentStr}  ${file.name} (${file.size} bytes)\n`;
            }
        }

        for (const key in this.dirs) {
            if (Object.prototype.hasOwnProperty.call(this.dirs, key)) {
                const dir = this.dirs[key];
                ret += dir.recursiveDescription(indent + 2);
            }
        }

        return ret;
    }
}

export default Directory;

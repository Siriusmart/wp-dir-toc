import micromatch from "micromatch";
import path from "path";
import { createRequire } from "module";
export class FileNamedProcOne {
    parent;
    proc;
    constructor(parent, proc) {
        this.parent = parent;
        this.proc = proc;
    }
    getSettings() {
        return this.proc.getSettings(this.parent);
    }
    async getResult() {
        return await this.proc.getResult(this.parent);
    }
    async getProcessor() {
        return await this.proc.getProcessor(this.parent);
    }
    equals(other) {
        return this.proc.processor === other;
    }
}
export class FileNamedProcs {
    parent;
    procsSet;
    constructor(parent, procsSet) {
        this.parent = parent;
        this.procsSet = procsSet;
    }
    values() {
        return this.procsSet
            .values()
            .map((proc) => new FileNamedProcOne(this.parent, proc));
    }
    toSet() {
        return new Set(this.values());
    }
}
export class FileProcs {
    parent;
    procsMap;
    constructor(parent, procsMap) {
        this.parent = parent;
        this.procsMap = procsMap;
    }
    procs(options = {}) {
        let out = new Map();
        for (const [name, fileNamedProcs] of this.procsMap.entries()) {
            if ((options.include === undefined && options.exclude === undefined) ||
                micromatch.isMatch(name, options.include ?? "**", { ignore: options.exclude })) {
                out.set(name, new FileNamedProcs(this.parent, fileNamedProcs));
            }
        }
        return out;
    }
}
export default class Processor {
    __handle;
    buildInstance;
    constructor(buildInstance, meta, id) {
        const require = createRequire(import.meta.url);
        const { default: ProcessorHandle } = require("./processorHandle");
        this.buildInstance = buildInstance;
        this.__handle = new ProcessorHandle(buildInstance, meta, this, id);
    }
    filePath(options = {}) {
        if (options.absolute !== true) {
            return this.__handle.meta.relativePath;
        }
        else {
            return this.__handle.meta.childPath;
        }
    }
    parentPath(option = {}) {
        return path.dirname(this.filePath(option));
    }
    files(options = {}) {
        let dirPath = this.__handle.meta.ruleLocation;
        let out = new Map();
        for (const [absPath, procsMap] of this.buildInstance
            .getProcByFiles()
            .entries()) {
            let relPath;
            if (options.absolute ?? false) {
                relPath = absPath;
            }
            else {
                if (!absPath.startsWith(dirPath)) {
                    continue;
                }
                relPath = absPath.substring(dirPath.length - 1);
            }
            if ((options.include === undefined && options.exclude === undefined) ||
                micromatch.isMatch(relPath, options.include ?? "**", { ignore: options.exclude })) {
                out.set(relPath, new FileProcs(this.__handle, procsMap));
            }
        }
        return out;
    }
    settings() {
        return this.__handle.meta.settings;
    }
    shouldRebuild(newFiles) {
        return false;
    }
}
//# sourceMappingURL=processor.js.map
import path from "path";
import micromatch from "micromatch";
class NewFiles {
    internal;
    handle;
    constructor(internal, handle) {
        this.internal = internal;
        this.handle = handle;
    }
    files(options = {}) {
        let dirPath = this.handle.meta.ruleLocation;
        let out = new Set();
        for (const absPath of this.internal.values()) {
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
                out.add(relPath);
            }
        }
        return out;
    }
}
export default NewFiles;
//# sourceMappingURL=newfiles.js.map
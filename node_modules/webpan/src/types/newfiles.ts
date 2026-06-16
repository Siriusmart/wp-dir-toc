import path from "path"
import micromatch from "micromatch"

import type ProcessorHandle from "./processorHandle.js"

class NewFiles {
    private internal: Set<string>;
    private handle: ProcessorHandle;

    constructor(internal: Set<string>, handle: ProcessorHandle) {
        this.internal = internal;
        this.handle = handle;
    }

    files(options: { absolute?: boolean, include?: string | string[], exclude?: string | string[] } = {}): Set<string> {
        let dirPath = this.handle.meta.ruleLocation;

        let out: Set<string> = new Set();

        for (const absPath of this.internal.values()) {
            let relPath;

            if (options.absolute ?? false) {
                relPath = absPath;
            } else {
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

export default NewFiles

import assert from "assert";
import path from "path";
import Processor from "webpan/dist/types/processor.js";
import { ProcessorOutputRaw } from "webpan/dist/types/processorStates.js";

type TocEntry = DirEntry | FileEntry;

interface DirEntry {
    type: "dir",
    meta?: any,
    source: string,
    children: TocEntry[],
}

interface FileEntry {
    type: "file",
    meta: any,
    source: string,
    output: string | null
}

export default class DirTocProcessor extends Processor {
    async build(content: Buffer | "dir"): Promise<ProcessorOutputRaw> {
        if (content !== "dir")
            throw new Error("dir-toc can only be used on a directory")

        let entries: Map<string[], FileEntry> = new Map()

        for (const [fileName, fileProcs] of this.files({ include: path.join(this.filePath(), "/**") }).entries()) {
            let unifiedProcs = fileProcs.procs().get("unified");

            if (unifiedProcs === undefined)
                continue;

            outer: for (const proc of unifiedProcs.values()) {
                let res = await proc.getResult();
                for (const plugin of res.result.pluginResults) {
                    if (plugin.pluginName === "remark-frontmatter") {
                        entries.set(fileName.split('/').filter(s => s.length), {
                            type: "file",
                            source: fileName,
                            meta: plugin.result,
                            output: res.files.values().next().value ?? null
                        })
                        break outer;
                    }
                }
            }
        }

        let directories: Record<string, TocEntry> = {}

        for (const path of entries.keys()) {
            for (let i = 0; i < path.length; i++) {
                let dirPath = path.slice(0, i).join("/");
                if (directories[dirPath] === undefined)
                    directories[dirPath] = {
                        type: "dir",
                        source: dirPath,
                        children: []
                    }

                if (i !== 0) {
                    let parentDirPath = path.slice(0, i - 1).join("/");
                    assert(directories[parentDirPath]?.type === "dir")
                    directories[parentDirPath].children.push(directories[dirPath])
                }
            }
        }

        for (const [path, file] of entries.entries()) {
            let dirPath = path.slice(0, -1).join("/");
            assert(directories[dirPath]?.type === "dir")
            directories[dirPath].children.push(file)
        }

        let result = directories[""]

        return {
            relative: new Map([[path.join(this.filePath(), "index.json"), { buffer: JSON.stringify(result), priority: this.settings().priority ?? 0 }]]),
            result
        }
    }
}

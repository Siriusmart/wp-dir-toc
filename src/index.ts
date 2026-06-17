import assert from "assert";
import path from "path";
import Processor from "webpan/dist/types/processor.js";
import NewFiles from "webpan/dist/types/newfiles.js";
import { ProcessorOutputRaw } from "webpan/dist/types/processorStates.js";

export type TocEntry = DirEntry | FileEntry;
export type TocEntryOrdered = DirEntryOrdered | FileEntry;

export interface DirEntry {
    type: "dir",
    meta?: any,
    sourceAbs: string,
    sourceRel: string,
    children: Set<TocEntry>,
}

export interface FileEntry {
    type: "file",
    meta: any,
    sourceAbs: string,
    sourceRel: string,
    outputAbs: string | null,
    outputRel: string | null
}

export interface DirEntryOrdered {
    type: "dir",
    meta?: any,
    sourceAbs: string,
    sourceRel: string,
    children: TocEntryOrdered[],
}

export default class DirTocProcessor extends Processor {
    async build(content: Buffer | "dir"): Promise<ProcessorOutputRaw> {
        if (content !== "dir")
            throw new Error("dir-toc can only be used on a directory")

        let entries: Map<string[], FileEntry> = new Map()
        let prefixLength = this.filePath().length;

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
                            sourceAbs: fileName,
                            sourceRel: fileName.slice(prefixLength),
                            meta: plugin.result,
                            outputAbs: res.files.values().next().value ?? null,
                            outputRel: res.files.values().next().value?.slice(prefixLength) ?? null
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
                if (directories[dirPath] === undefined) {
                    let sourceAbs = ["", ...path.slice(0, i)].join("/") + "/";
                    directories[dirPath] = {
                        type: "dir",
                        sourceAbs,
                        sourceRel: sourceAbs.slice(prefixLength),
                        children: new Set()
                    }
                }

                if (i !== 0) {
                    let parentDirPath = path.slice(0, i - 1).join("/");
                    assert(directories[parentDirPath]?.type === "dir")
                    directories[parentDirPath].children.add(directories[dirPath])
                }
            }
        }

        for (const [path, file] of entries.entries()) {
            let dirPath = path.slice(0, -1).join("/");
            assert(directories[dirPath]?.type === "dir")
            directories[dirPath].children.add(file)
        }

        let result = directories[this.filePath().slice(1, -1)]

        function asOrdered(entry: TocEntry): TocEntryOrdered {
            switch (entry.type) {
                case "dir":
                    return {
                        type: "dir",
                        meta: entry.meta,
                        sourceAbs: entry.sourceAbs,
                        sourceRel: entry.sourceRel,
                        children: Array.from(entry.children).map(asOrdered)
                    }
                case "file":
                    return entry
            }
        }

        let ordered = result === undefined ? undefined : asOrdered(result)

        return {
            relative: new Map([[path.join(this.filePath(), "dir-toc.json"), { buffer: JSON.stringify(ordered), priority: this.settings().priority ?? 0 }]]),
            result: ordered
        }
    }

    shouldRebuild(newFiles: NewFiles): boolean {
        return newFiles.files({ include: path.join(this.filePath(), "/**/*.md") }).size !== 0;
    }
}

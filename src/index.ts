import assert from "assert";
import path from "path";
import Processor, { FileNamedProcOne } from "webpan/dist/types/processor.js";
import NewFiles from "webpan/dist/types/newfiles.js";
import { ProcessorOutputRaw } from "webpan/dist/types/processorStates.js";

export type TocEntry = DirEntry | FileEntry;
export type TocEntryOrdered = DirEntryOrdered | FileEntry;

export interface DirEntry {
    type: "dir",
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
    frontMatter?: Record<string, any>
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
        let prefix = this.filePath({ absolute: true });
        let prefixLength = prefix.length;

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
                            sourceAbs: this.filePath({ absolute: true }).slice(0, -1) + fileName,
                            sourceRel: fileName,
                            meta: plugin.result,
                            outputAbs: res.files.values().next().value ?? null,
                            outputRel: res.files.values().next().value?.slice(prefixLength - 1) ?? null,
                            ...plugin.result === undefined ? {} : { frontMatter: plugin.result }
                        })
                        break outer;
                    }
                }
            }
        }

        let directories: Record<string, TocEntry> = {}

        for (const entryPath of entries.keys()) {
            for (let i = 0; i < entryPath.length; i++) {
                let dirPath = entryPath.slice(0, i).join("/");
                if (directories[dirPath] === undefined) {
                    let sourceRel = ["", ...entryPath.slice(0, i)].join("/") + "/";
                    directories[dirPath] = {
                        type: "dir",
                        sourceAbs: path.join(prefix, sourceRel),
                        sourceRel,
                        children: new Set()
                    }
                }

                if (i !== 0) {
                    let parentDirPath = entryPath.slice(0, i - 1).join("/");
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

        const asOrdered = async (entry: TocEntry): Promise<TocEntryOrdered> => {
            switch (entry.type) {
                case "dir":
                    const tocYamlPath = path.join("/", entry.sourceRel, "toc.yml")
                    const tocYaml = this.files({ include: tocYamlPath }).get(tocYamlPath)?.procs({ include: "yaml-parse" }).get("yaml-parse")?.values().next().value as FileNamedProcOne | undefined;
                    const tocYamlContent = await tocYaml?.getResult();
                    const ordering = new Map((tocYamlContent?.result?.order as string[] ?? []).map((value, i) => [value, i]));
                    return {
                        type: "dir",
                        meta: tocYamlContent?.result,
                        sourceAbs: entry.sourceAbs,
                        sourceRel: entry.sourceRel,
                        children: (await Promise.all(Array.from(entry.children).map(asOrdered))).sort((a, b) => {
                            const aBase = path.basename(a.sourceRel);
                            const bBase = path.basename(b.sourceRel);
                            const aOrder = ordering.get(aBase) ?? Number.MAX_SAFE_INTEGER;
                            const bOrder = ordering.get(bBase) ?? Number.MAX_SAFE_INTEGER;

                            return aOrder === bOrder ? aBase.localeCompare(bBase) : aOrder - bOrder;
                        }),
                    }
                case "file":
                    return entry
            }
        }

        let ordered = result === undefined ? undefined : await asOrdered(result)

        return {
            relative: new Map([[path.join(this.filePath(), "dir-toc.json"), { buffer: JSON.stringify(ordered), priority: this.settings().priority ?? 0 }]]),
            result: ordered
        }
    }

    shouldRebuild(newFiles: NewFiles): boolean {
        const thisPath = this.filePath();
        const patterns = ["**/*.md", "**/toc.yml", "*.md", "toc.yml"]
        return patterns.some(pattern => newFiles.files({ include: path.join(thisPath, pattern) }).size)
    }
}

export function first(dir: DirEntryOrdered): FileEntry | undefined {
    for (const child of dir.children) {
        switch (child.type) {
            case "file":
                return child;
            case "dir":
                const dirFirst = first(child);
                if (dirFirst)
                    return dirFirst;
        }
    }
}

export function last(dir: DirEntryOrdered): FileEntry | undefined {
    for (const child of dir.children.toReversed()) {
        switch (child.type) {
            case "file":
                return child;
            case "dir":
                const dirLast = last(child);
                if (dirLast)
                    return dirLast;
        }
    }
}

export function after(dir: DirEntryOrdered, entry: FileEntry): FileEntry | undefined {
    function afterInternal(dir: DirEntryOrdered): "found entry" | undefined | FileEntry {
        for (const [i, currentEntry] of dir.children.entries()) {
            if (!entry.sourceRel.startsWith(currentEntry.sourceRel)) {
                continue;
            }

            switch (currentEntry.type) {
                case "file": {
                    if (entry.sourceRel === currentEntry.sourceRel) {
                        // base case: file found
                        for (const entryAfter of dir.children.slice(i + 1)) {
                            switch (entryAfter.type) {
                                case "file":
                                    return entryAfter;
                                case "dir":
                                    const min = first(entryAfter);
                                    if (min) return min;
                            }
                        }

                        return "found entry";
                    } else {
                        // nope, not the file
                        continue;
                    }
                }
                case "dir": {
                    const res = afterInternal(currentEntry);
                    if (res === "found entry") {
                        for (const entryAfter of dir.children.slice(i + 1)) {
                            switch (entryAfter.type) {
                                case "file":
                                    return entryAfter;
                                case "dir":
                                    const min = first(entryAfter);
                                    if (min) return min;
                            }
                        }
                        return "found entry";
                    } else {
                        return res;
                    }
                }
            }

        }
    }

    const res = afterInternal(dir);
    if (res === "found entry" || res === undefined) return undefined;
    else return res;
}

export function before(dir: DirEntryOrdered, entry: FileEntry): FileEntry | undefined {
    function beforeInternal(dir: DirEntryOrdered): "found entry" | undefined | FileEntry {
        for (const [i, currentEntry] of dir.children.entries().toArray().toReversed()) {
            if (!entry.sourceRel.startsWith(currentEntry.sourceRel)) {
                continue;
            }

            switch (currentEntry.type) {
                case "file": {
                    if (entry.sourceRel === currentEntry.sourceRel) {
                        // base case: file found
                        for (const entryBefore of dir.children.slice(0, i).toReversed()) {
                            switch (entryBefore.type) {
                                case "file":
                                    return entryBefore;
                                case "dir":
                                    const min = last(entryBefore);
                                    if (min) return min;
                            }
                        }

                        return "found entry";
                    } else {
                        // nope, not the file
                        continue;
                    }
                }
                case "dir": {
                    const res = beforeInternal(currentEntry);
                    if (res === "found entry") {
                        for (const entryBefore of dir.children.slice(0, i).toReversed()) {
                            switch (entryBefore.type) {
                                case "file":
                                    return entryBefore;
                                case "dir":
                                    const min = last(entryBefore);
                                    if (min) return min;
                            }
                        }
                        return "found entry";
                    } else {
                        return res;
                    }
                }
            }

        }
    }

    const res = beforeInternal(dir);
    if (res === "found entry" || res === undefined) return undefined;
    else return res;
}

import assert from "assert";
import path from "path";
import Processor from "webpan/dist/types/processor.js";
export default class DirTocProcessor extends Processor {
    async build(content) {
        if (content !== "dir")
            throw new Error("dir-toc can only be used on a directory");
        let entries = new Map();
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
                            outputRel: res.files.values().next().value?.slice(prefixLength) ?? null,
                            ...plugin.result === undefined ? {} : { frontMatter: plugin.result }
                        });
                        break outer;
                    }
                }
            }
        }
        let directories = {};
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
                    };
                }
                if (i !== 0) {
                    let parentDirPath = path.slice(0, i - 1).join("/");
                    assert(directories[parentDirPath]?.type === "dir");
                    directories[parentDirPath].children.add(directories[dirPath]);
                }
            }
        }
        for (const [path, file] of entries.entries()) {
            let dirPath = path.slice(0, -1).join("/");
            assert(directories[dirPath]?.type === "dir");
            directories[dirPath].children.add(file);
        }
        let result = directories[this.filePath().slice(1, -1)];
        const asOrdered = async (entry) => {
            switch (entry.type) {
                case "dir":
                    const tocYamlPath = path.join("/", entry.sourceRel, "toc.yml");
                    const tocYaml = this.files({ include: tocYamlPath }).get(tocYamlPath)?.procs({ include: "yaml-parse" }).get("yaml-parse")?.values().next().value;
                    const tocYamlContent = await tocYaml?.getResult();
                    const ordering = new Map((tocYamlContent?.result?.order ?? []).map((value, i) => [value, i]));
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
                    };
                case "file":
                    return entry;
            }
        };
        let ordered = result === undefined ? undefined : await asOrdered(result);
        return {
            relative: new Map([[path.join(this.filePath(), "dir-toc.json"), { buffer: JSON.stringify(ordered), priority: this.settings().priority ?? 0 }]]),
            result: ordered
        };
    }
    shouldRebuild(newFiles) {
        return newFiles.files({ include: path.join(this.filePath(), "/**/*.md") }).size !== 0 || newFiles.files({ include: path.join(this.filePath(), "/**/toc.yml") }).size !== 0;
    }
}
//# sourceMappingURL=index.js.map
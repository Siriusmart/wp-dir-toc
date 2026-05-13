import path from "path";
import webpan = require("webpan")
import type { ProcessorOutputRaw } from "webpan/dist/types/processorStates";

interface DirTocEntry {
    meta: any,
    output: string | null
}

export default class DirTocProcessor extends webpan.Processor {
    async build(content: Buffer | "dir"): Promise<ProcessorOutputRaw> {
        if (content !== "dir")
            throw new Error("Bad rule: wp-dir-toc can only be used on directories.")

        let entries: Record<string, DirTocEntry> = {}

        for (const [fileName, fileProcs] of this.files({ include: path.join(this.filePath(), "/**") }).entries()) {
            let unifiedProcs = fileProcs.procs().get("unified");

            if (unifiedProcs === undefined)
                continue;

            outer: for (const proc of unifiedProcs.values()) {
                let res = await proc.getResult();
                for (const plugin of res.result.pluginResults) {
                    if (plugin.pluginName === "remark-frontmatter") {
                        entries[fileName] = {
                            meta: plugin.result,
                            output: res.files.values().next().value ?? null
                        }
                        break outer;
                    }
                }
            }
        }

        return {
            relative: new Map([[path.join(this.filePath(), "index.json"), { buffer: JSON.stringify(entries), priority: this.settings().priority ?? 0 }]]),
            result: {

            }
        }
    }
}

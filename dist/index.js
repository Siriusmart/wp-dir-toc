"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const webpan = require("webpan");
class DirTocProcessor extends webpan.Processor {
    async build(content) {
        if (content !== "dir")
            throw new Error("Bad rule: wp-dir-toc can only be used on directories.");
        let entries = {};
        for (const [fileName, fileProcs] of this.files({ include: path_1.default.join(this.filePath(), "/**") }).entries()) {
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
                        };
                        break outer;
                    }
                }
            }
        }
        return {
            relative: new Map([[path_1.default.join(this.filePath(), "index.json"), { buffer: JSON.stringify(entries), priority: this.settings().priority ?? 0 }]]),
            result: {}
        };
    }
}
exports.default = DirTocProcessor;
//# sourceMappingURL=index.js.map
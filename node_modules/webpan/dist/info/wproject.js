import yargs from "yargs";
import fs from "fs/promises";
import path from "path";
async function createProjectManifest(root, yargs) {
    const content = await fs.readFile(path.join(root, "wproject.json"), "utf8");
    let wproject;
    try {
        wproject = JSON.parse(content);
    }
    catch (e) {
        if (typeof e === "object" && e !== null && "stack" in e) {
            e = e.stack;
        }
        throw new Error(`Error parsing wproject.json because ${e}`);
    }
    wproject.format ??= {};
    wproject.cmd ??= {};
    wproject.cmd.build ??= {};
    return {
        format: {
            tabSpaces: yargs.tabSpaces ?? wproject.format.tabSpaces ?? 4,
            buildInfo: yargs.formatbuildinfo ?? wproject.format.buildInfo ?? false,
        },
        cmd: {
            build: {
                clean: yargs.clean ??
                    wproject.cmd.build.clean ??
                    false,
            },
        },
    };
}
export default {
    createProjectManifest,
};
//# sourceMappingURL=wproject.js.map
import yargs from "yargs";
import fs from "fs/promises";
import path from "path";
import type * as yargsTypes from "yargs";

import type * as wmanifest from "../types/wmanifest.js";

async function createProjectManifest(
    root: string,
    yargs: yargsTypes.ArgumentsCamelCase<{}>
): Promise<wmanifest.WManifest> {
    const content = await fs.readFile(path.join(root, "wproject.json"), "utf8");
    let wproject: any;
    try {
        wproject = JSON.parse(content);
    } catch (e) {
        if (typeof e === "object" && e !== null && "stack" in e) {
            e = e.stack;
        }
        throw new Error(`Error parsing wproject.json because ${e}`);
    }

    wproject.format ??= {};
    wproject.cmd ??= {};
    wproject.cmd.build ??= {};
    wproject.system ??= {};
    wproject.system.packageManager ??= "npm";

    return {
        system: {
            packageManager: wproject.system.packageManager
        },
        format: {
            tabSpaces:
                (yargs.tabSpaces as number) ?? wproject.format.tabSpaces ?? 4,
            buildInfo:
                yargs.formatbuildinfo ?? wproject.format.buildInfo ?? false,
        },
        cmd: {
            build: {
                clean:
                    (yargs.clean as boolean) ??
                    wproject.cmd.build.clean ??
                    false,
            },
        },
    };
}

export default {
    createProjectManifest,
};

import path from "path";
import fs from "fs/promises";
import assert from "assert";
import fsUtils from "../utils/fsUtils.js";
import { createRequire } from "module";
function replacer(_, value) {
    if (value instanceof Map) {
        return {
            _t: "Map",
            _c: Array.from(value.entries()),
        };
    }
    if (value instanceof Set) {
        return {
            _t: "Set",
            _c: Array.from(value.values()),
        };
    }
    return value;
}
function reviver(_, value) {
    if (typeof value === "object" && value !== null) {
        if (value._t === "Map") {
            return new Map(value._c);
        }
        if (value._t === "Set") {
            return new Set(value._c);
        }
    }
    return value;
}
async function readBuildInfo(root) {
    const buildInfoPath = path.join(root, "build", "buildInfo.json");
    try {
        if (await fsUtils.existsFile(buildInfoPath)) {
            const content = await fs.readFile(buildInfoPath, "utf8");
            return JSON.parse(content, reviver);
        }
        else {
            return {
                hashedEntries: new Map(),
                rules: new Map(),
                buildCache: [],
                writeEntries: new Map(),
            };
        }
    }
    catch (e) {
        if (typeof e === "object" && e !== null && "stack" in e) {
            e = e.stack;
        }
        throw new Error("Could not read " + buildInfoPath + " because " + e);
    }
}
async function writeBuildInfo(root, manifest, data) {
    const buildInfoPath = path.join(root, "build", "buildInfo.json");
    await fsUtils.writeCreate(buildInfoPath, JSON.stringify(data, replacer, manifest.format.buildInfo ? manifest.format.tabSpaces : 0));
}
function wrapBuildInfo(hashedEntries, cachedProcessors, cachedRules, writeManager) {
    return {
        hashedEntries,
        rules: cachedRules,
        writeEntries: writeManager.__getOutputTargets(),
        buildCache: Array.from(cachedProcessors.values().flatMap((fileProcs) => fileProcs.values().flatMap((fileProcWithName) => Array.from(fileProcWithName.values().map((proc) => {
            let state;
            switch (proc.state.status) {
                case "built":
                case "resultonly":
                    state = [
                        "ok",
                        {
                            files: Array.from(proc.state.result.files),
                            result: proc.state.result.result,
                        },
                    ];
                    break;
                case "error":
                    let e = proc.state.err;
                    if (typeof e === "object" &&
                        e !== null &&
                        "stack" in e) {
                        e = e.stack;
                    }
                    state = ["err", e];
                    break;
                case "empty":
                    state = ["empty"];
                    break;
                case "building":
                    throw new Error("Intermediate states should not be possible");
            }
            return {
                id: proc.id,
                meta: proc.meta,
                dependents: Array.from(proc.dependents).map((proc) => proc.id),
                dependencies: Array.from(proc.dependencies).map((proc) => proc.id),
                state,
            };
        }))))),
    };
}
const require = createRequire(import.meta.url);
function unwrapBuildInfo(root, manifest, buildInfo) {
    const { default: BuildInstance } = require("../types/buildInstance");
    let buildInstance = new BuildInstance(root, manifest, buildInfo.writeEntries);
    let cachedProcessors = new Map();
    let cachedProcessorsFlat = new Map();
    let relationsMap = new Map();
    for (const resultEntry of buildInfo.buildCache) {
        let foundClass;
        try {
            foundClass = require(`wp-${resultEntry.meta.procName}`).default;
        }
        catch (e) {
            throw new Error("Could not load proccessor with name " +
                resultEntry.meta.procName +
                " because " +
                e);
        }
        let procObject = new foundClass(buildInstance, resultEntry.meta, resultEntry.id);
        relationsMap.set(resultEntry.id, {
            dependencies: resultEntry.dependencies,
            dependents: resultEntry.dependents,
        });
        if (!cachedProcessors.has(resultEntry.meta.childPath)) {
            cachedProcessors.set(resultEntry.meta.childPath, new Map());
        }
        if (!cachedProcessors
            .get(resultEntry.meta.childPath)
            ?.has(resultEntry.meta.procName)) {
            cachedProcessors
                .get(resultEntry.meta.childPath)
                ?.set(resultEntry.meta.procName, new Set());
        }
        cachedProcessors
            .get(resultEntry.meta.childPath)
            ?.get(resultEntry.meta.procName)
            ?.add(procObject.__handle);
        cachedProcessorsFlat.set(procObject.__handle.id, procObject.__handle);
        switch (resultEntry.state[0]) {
            case "empty":
                break; // it is empty by default
            case "ok":
                procObject.__handle.state = {
                    status: "resultonly",
                    result: {
                        files: new Set(resultEntry.state[1].files),
                        result: resultEntry.state[1].result,
                    },
                };
                break;
            case "err":
                procObject.__handle.state = {
                    status: "error",
                    err: resultEntry.state[1],
                };
                break;
        }
    }
    for (let [id, handle] of cachedProcessorsFlat.entries()) {
        const relationEntry = relationsMap.get(id);
        assert(relationEntry !== undefined);
        const { dependencies, dependents } = relationEntry;
        handle.dependencies = new Set(dependencies.map((id) => {
            const dependency = cachedProcessorsFlat.get(id);
            assert(dependency !== undefined);
            return dependency;
        }));
        handle.dependents = new Set(dependents.map((id) => {
            const dependency = cachedProcessorsFlat.get(id);
            assert(dependency !== undefined);
            return dependency;
        }));
    }
    const { default: WriteEntriesManager } = require("../info/writeEntriesManager");
    return {
        hashedEntries: buildInfo.hashedEntries,
        cachedRules: buildInfo.rules,
        cachedProcessors,
        cachedProcessorsFlat,
        writeManager: new WriteEntriesManager(buildInfo.writeEntries),
        buildInstance,
    };
}
export default {
    readBuildInfo,
    writeBuildInfo,
    wrapBuildInfo,
    unwrapBuildInfo,
};
//# sourceMappingURL=buildInfo.js.map
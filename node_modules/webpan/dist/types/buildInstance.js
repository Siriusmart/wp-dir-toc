import cleanBuild from "../actions/cleanBuild.js";
import assert from "assert";
import fs from "fs/promises";
import wrules from "../info/wrules.js";
import buildInfo from "../info/buildInfo.js";
import path from "path";
import fsUtils from "../utils/fsUtils.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
class BuildInstance {
    root;
    manifest;
    writeEntries;
    // fs
    fsContent;
    fsHashedEntries;
    fsDiff;
    // processor
    procByFiles;
    procById;
    rules;
    additionalBuildingQueue;
    additionalBuilding;
    static normaliseOutput(output, meta) {
        let writes = new Map();
        if (output.relative !== undefined)
            output.relative.entries().forEach(([filePath, buffer]) => {
                filePath = path.normalize(path.join(meta.ruleLocation, filePath));
                if (writes.has(filePath))
                    console.warn(`Double writes to ${filePath}`);
                let cleanBuffer;
                if (typeof buffer === "object" && "priority" in buffer)
                    cleanBuffer = buffer;
                else
                    cleanBuffer = {
                        buffer,
                        priority: 0
                    };
                writes.set(filePath, cleanBuffer);
            });
        if (output.absolute !== undefined)
            output.absolute.entries().forEach(([filePath, buffer]) => {
                filePath = path.normalize(filePath);
                if (writes.has(filePath))
                    console.warn(`Double writes to ${filePath}`);
                let cleanBuffer;
                if (typeof buffer === "object" && "priority" in buffer)
                    cleanBuffer = buffer;
                else
                    cleanBuffer = {
                        buffer,
                        priority: 0
                    };
                writes.set(filePath, cleanBuffer);
            });
        return {
            files: writes,
            result: output.result ?? null,
        };
    }
    constructor(root, manifest, writeEntries) {
        const { default: WriteEntriesManager } = require("../info/writeEntriesManager");
        this.root = root;
        this.manifest = manifest;
        this.writeEntries = new WriteEntriesManager(writeEntries);
        this.fsContent = new Map();
        this.fsHashedEntries = new Map();
        this.fsDiff = new Map();
        this.procByFiles = new Map();
        this.procById = new Map();
        this.rules = new Map();
        this.additionalBuildingQueue = new Set();
        this.additionalBuilding = new Map();
        this.count = 0;
    }
    withHashedEntries(hashedEntries) {
        this.fsHashedEntries = hashedEntries;
        return this;
    }
    count;
    addTaskDuringBuild(handle) {
        if (this.additionalBuilding.has(handle)) {
            this.additionalBuildingQueue.add(handle);
            return;
        }
        this.additionalBuilding.set(handle, handle.buildWithBuffer());
    }
    async buildOutputAll() {
        let toBuild = new Set();
        for (const proc of this.getProcById().values()) {
            if (proc.state.status !== "empty") {
                continue;
            }
            const { promise, resolve, reject } = proc.pendingResultPromise();
            proc.state = {
                status: "building",
                pendingResult: promise,
                reject,
                resolve,
            };
            toBuild.add(proc);
        }
        let res = new Set();
        let fsContent = this.getFsContent();
        await Promise.all(toBuild.values().map(async (handle) => {
            assert(handle.state.status === "building");
            let output;
            let fsEntry = fsContent.get(handle.meta.childPath);
            assert(fsEntry !== undefined);
            let content;
            try {
                switch (fsEntry.content[0]) {
                    case "file":
                        content = fsEntry.content[1];
                        break;
                    case "dir":
                        content = "dir";
                }
                output = await handle.processor.build(content);
            }
            catch (err) {
                const reject = handle.state.reject;
                assert(reject !== undefined);
                handle.state = {
                    status: "error",
                    err,
                };
                reject(err);
                err =
                    typeof err === "object" &&
                        err !== null &&
                        "stack" in err
                        ? err.stack
                        : err;
                console.error(`Build failed at ${handle.meta.procName} for ${handle.meta.childPath} because ${err}`);
                return;
            }
            let outputClean = BuildInstance.normaliseOutput(output, handle.meta);
            res.add([handle, outputClean]);
            const resolve = handle.state.resolve;
            assert(resolve !== undefined);
            let fileKeys = new Set(outputClean.files.keys());
            handle.state = {
                status: "built",
                processor: handle.processor,
                result: {
                    result: output.result,
                    files: fileKeys,
                },
            };
            resolve({
                result: output.result,
                files: fileKeys,
            });
        }));
        do {
            await Promise.all(this.additionalBuilding.values());
            this.additionalBuilding.clear();
            let currentAdditionalBuildingQueue = this.additionalBuildingQueue;
            this.additionalBuildingQueue = new Set();
            currentAdditionalBuildingQueue.forEach(handle => this.addTaskDuringBuild(handle));
        } while (this.additionalBuilding.size !== 0 || this.additionalBuildingQueue.size !== 0);
        return res;
    }
    async withFsContent(fsContent, hashedEntries, fsDiff) {
        this.fsContent = fsContent;
        this.fsHashedEntries = hashedEntries;
        this.fsDiff = fsDiff;
        await wrules.updateRules(this);
        return this;
    }
    withProcs(procByFiles, procById) {
        this.procByFiles = procByFiles;
        this.procById = procById;
        return this;
    }
    withRules(rules) {
        this.rules = rules;
        return this;
    }
    withBuildCycleState(buildCycleState) {
        this.writeEntries.setState(buildCycleState);
        switch (buildCycleState) {
            case "readonly":
                this.fsDiff.clear();
                this.fsContent.clear();
                break;
            default: {
            }
        }
        return this;
    }
    getRoot() {
        return this.root;
    }
    getWriteEntriesManager() {
        return this.writeEntries;
    }
    getFsDiff() {
        return this.fsDiff;
    }
    getFsContent() {
        return this.fsContent;
    }
    getFsHashedEntries() {
        return this.fsHashedEntries;
    }
    getRules() {
        return this.rules;
    }
    getProcByFiles() {
        return this.procByFiles;
    }
    getProcById() {
        return this.procById;
    }
    async clean() {
        await cleanBuild(this.root);
    }
    async writeMeta() {
        await buildInfo.writeBuildInfo(this.root, this.manifest, buildInfo.wrapBuildInfo(this.fsHashedEntries, this.procByFiles, this.rules, this.writeEntries));
    }
    async flush() {
        const actions = this.getWriteEntriesManager().getActions();
        await Promise.all(Array.from(actions.removes).map(async (relPath) => {
            const fullPath = path.join(this.getRoot(), relPath);
            await fs.unlink(fullPath);
        }));
        await Promise.all(Array.from(actions.writes).map(async ([relPath, buffer]) => {
            const fullPath = path.join(this.getRoot(), relPath);
            await fsUtils.writeCreate(fullPath, buffer);
        }));
        // no race conditions here, because only move1 only moves from dist to meta/shadowed/
        // move2 only moves from there into dist
        await Promise.all(Array.from(actions.moves1).map(async ([from, to]) => {
            const fullPathFrom = path.join(this.getRoot(), from);
            const fullPathTo = path.join(this.getRoot(), to);
            await fsUtils.moveCreate(fullPathFrom, fullPathTo);
        }));
        await Promise.all(Array.from(actions.moves2).map(async ([from, to]) => {
            const fullPathFrom = path.join(this.getRoot(), from);
            const fullPathTo = path.join(this.getRoot(), to);
            await fsUtils.moveCreate(fullPathFrom, fullPathTo);
        }));
    }
}
export default BuildInstance;
//# sourceMappingURL=buildInstance.js.map
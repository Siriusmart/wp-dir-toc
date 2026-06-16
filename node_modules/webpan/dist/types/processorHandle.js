import assert from "assert";
import path from "path";
import Processor from "./processor.js";
import BuildInstance from "../types/buildInstance.js";
import calcDiff from "../utils/calcDiff.js";
import random from "../utils/random.js";
import WriteEntriesManager from "../info/writeEntriesManager.js";
class ProcessorHandle {
    id;
    state;
    meta;
    processor;
    buildInstance;
    dependents;
    dependencies;
    constructor(buildInstance, meta, processor, id) {
        this.id =
            id ??
                random.hexString(8, (id) => !buildInstance.getProcById().has(id));
        buildInstance.getProcById().set(this.id, this);
        this.state = {
            status: "empty",
        };
        this.buildInstance = buildInstance;
        this.meta = meta;
        this.processor = processor;
        this.dependents = new Set();
        this.dependencies = new Set();
    }
    equals(proc) {
        return this.processor === proc;
    }
    drop() {
        this.resetWithoutRebuild();
        if (!this.buildInstance.getProcById().delete(this.id)) {
            throw new Error("You called drop twice!");
        }
    }
    isOrDependsOn(needle, path = []) {
        return needle === this || path.includes(this) ||
            Array.from(this.dependencies).some((dependent) => dependent.isOrDependsOn(needle, path.concat([this])));
    }
    resetWithoutRebuild() {
        if ("result" in this.state) {
            this.state.result.files.forEach((toDelete) => this.buildInstance
                .getWriteEntriesManager()
                .set(toDelete, { processor: this, content: "remove", priority: 0 }));
        }
        if (this.state.status === "empty") {
            return;
        }
        this.dependencies.forEach((handle) => handle.dependents.delete(this));
        this.dependents.forEach((handle) => handle.resetWithoutRebuild());
        this.dependencies.clear();
        this.dependents.clear();
        this.state = {
            status: "empty",
        };
    }
    resetAndRebuildDependentsDuringBuild() {
        if ("result" in this.state) {
            this.state.result.files.forEach((toDelete) => this.buildInstance
                .getWriteEntriesManager()
                .set(toDelete, { processor: this, content: "remove", priority: 0 }));
        }
        if (this.state.status === "empty") {
            return;
        }
        this.dependencies.forEach((handle) => handle.dependents.delete(this));
        this.dependencies.clear();
        this.dependents.clear();
        let dependentsBeforeClear = this.dependents;
        this.dependencies = new Set();
        dependentsBeforeClear.forEach((handle) => this.buildInstance.addTaskDuringBuild(handle));
        this.state = {
            status: "empty",
        };
    }
    getIdent() {
        return [this.meta.childPath, this.meta.procName];
    }
    hasResult() {
        return (this.state.status === "resultonly" || this.state.status === "built");
    }
    hasProcessor() {
        return this.state.status === "built";
    }
    updateWithOutput(output, writeEntries) {
        // normaliseOutput(output, this.meta);
        const previousOutput = "result" in this.state ? this.state.result.files : new Set();
        const previousOutputMap = new Map(Array.from(previousOutput).map((filePath) => [filePath, null]));
        const outputDiff = calcDiff.calcDiff(previousOutputMap, output.files);
        for (let [filePath, difftype] of outputDiff.entries()) {
            let content;
            let priority;
            switch (difftype) {
                case "changed":
                case "created":
                    content = output.files.get(filePath)?.buffer;
                    priority = output.files.get(filePath)?.priority;
                    break;
                case "removed":
                    content = "remove";
                    priority = 0;
            }
            const writeEntry = {
                content,
                processor: this,
                priority
            };
            writeEntries.set(filePath, writeEntry);
        }
    }
    pendingResultPromise() {
        const { promise, resolve } = Promise.withResolvers();
        const wrappedResolve = (result) => {
            resolve(["ok", result]);
        };
        const wrappedReject = (err) => {
            resolve(["err", err]);
        };
        this.state = {
            status: "building",
            pendingResult: promise,
            reject: wrappedReject,
            resolve: wrappedResolve,
        };
        return {
            promise,
            reject: wrappedReject,
            resolve: wrappedResolve,
        };
    }
    unwrapPendingResult(res) {
        switch (res[0]) {
            case "ok":
                return res[1];
            case "err":
                throw res[1];
        }
    }
    // adds build entry, writes directly into write manager ()
    async buildWithBuffer() {
        const contentEntry = this.buildInstance
            .getFsContent()
            .get(this.meta.childPath);
        assert(contentEntry !== undefined);
        let content;
        switch (contentEntry.content[0]) {
            case "file":
                content = contentEntry.content[1];
                break;
            case "dir":
                content = "dir";
                break;
        }
        this.resetAndRebuildDependentsDuringBuild();
        // this lines modifies state the building
        const { promise, resolve, reject } = this.pendingResultPromise();
        try {
            let output = await this.processor.build(content);
            let cleanOutput = BuildInstance.normaliseOutput(output, this.meta);
            this.updateWithOutput(cleanOutput, this.buildInstance.getWriteEntriesManager());
            this.state = {
                status: "built",
                processor: this.processor,
                result: {
                    result: cleanOutput.result,
                    files: new Set(cleanOutput.files.keys()),
                },
            };
            resolve(this.state.result);
        }
        catch (err) {
            this.state = {
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
            /*
    console.error(
        `Build failed at ${this.meta.procName} for ${this.meta.childPath} because ${err}`
    );
    */
        }
        return this.unwrapPendingResult(await promise);
    }
    // need mechanism to detect dead locks
    async getResult(requester) {
        if (this.isOrDependsOn(requester)) {
            throw new Error("There is a cycle in dependency.");
        }
        this.dependents.add(requester);
        requester.dependencies.add(this);
        switch (this.state.status) {
            case "resultonly":
            case "built":
                return this.state.result;
            case "empty":
                throw new Error("processor is not being built and will not be resolved");
            case "building":
                return this.unwrapPendingResult(await this.state.pendingResult);
            case "error":
                throw this.state.err;
        }
    }
    async getProcessor(requester) {
        if (this.isOrDependsOn(requester)) {
            throw new Error("There is a cycle in dependency.");
        }
        this.dependents.add(requester);
        requester.dependencies.add(this);
        switch (this.state.status) {
            case "resultonly":
                await this.buildWithBuffer();
                return this.processor;
            case "empty":
                throw new Error("processor is not being built and will not be resolved");
            case "building":
                await this.state.pendingResult;
                return this.processor;
            case "error":
                throw this.state.err;
            case "built":
                return this.processor;
        }
    }
    getSettings(requester) {
        if (this.isOrDependsOn(requester)) {
            throw new Error("There is a cycle in dependency.");
        }
        this.dependents.add(requester);
        return this.meta.settings;
    }
}
export default ProcessorHandle;
//# sourceMappingURL=processorHandle.js.map
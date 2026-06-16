import assert from "assert";
import path from "path";

import type * as procEntries from "./procEntries.js";
import Processor from "./processor.js";
import type * as processorStates from "./processorStates.js";
import BuildInstance from "../types/buildInstance.js";
import type * as writeEntry from "../types/writeEntry.js";

import calcDiff from "../utils/calcDiff.js";
import random from "../utils/random.js";
import WriteEntriesManager from "../info/writeEntriesManager.js";
import type * as fsEntries from "./fsEntries.js";

class ProcessorHandle {
    id: string;
    state: processorStates.ProcessorState;
    meta: procEntries.ProcessorMetaEntry;
    processor: Processor;
    buildInstance: BuildInstance;
    dependents: Set<ProcessorHandle>;
    dependencies: Set<ProcessorHandle>;

    constructor(
        buildInstance: BuildInstance,
        meta: procEntries.ProcessorMetaEntry,
        processor: Processor,
        id?: string
    ) {
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

    equals(proc: Processor): boolean {
        return this.processor === proc
    }

    drop(): void {
        this.resetWithoutRebuild();
        if (!this.buildInstance.getProcById().delete(this.id)) {
            throw new Error("You called drop twice!");
        }
    }

    isOrDependsOn(needle: ProcessorHandle, path: ProcessorHandle[] = []): boolean {
        return needle === this || path.includes(this) ||
            Array.from(this.dependencies).some((dependent) =>
                dependent.isOrDependsOn(needle, path.concat([this]))
            );
    }

    resetWithoutRebuild(): void {
        if ("result" in this.state) {
            this.state.result.files.forEach((toDelete) =>
                this.buildInstance
                    .getWriteEntriesManager()
                    .set(toDelete, { processor: this, content: "remove", priority: 0 })
            );
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

    private resetAndRebuildDependentsDuringBuild(): void {
        if ("result" in this.state) {
            this.state.result.files.forEach((toDelete) =>
                this.buildInstance
                    .getWriteEntriesManager()
                    .set(toDelete, { processor: this, content: "remove", priority: 0 })
            );
        }

        if (this.state.status === "empty") {
            return;
        }

        this.dependencies.forEach((handle) => handle.dependents.delete(this));
        this.dependencies.clear();
        this.dependents.clear();
        let dependentsBeforeClear = this.dependents;
        this.dependencies = new Set()
        dependentsBeforeClear.forEach((handle) => this.buildInstance.addTaskDuringBuild(handle));

        this.state = {
            status: "empty",
        };
    }

    getIdent(): [string, string] {
        return [this.meta.childPath, this.meta.procName];
    }

    hasResult(): boolean {
        return (
            this.state.status === "resultonly" || this.state.status === "built"
        );
    }

    hasProcessor(): boolean {
        return this.state.status === "built";
    }

    updateWithOutput(
        output: processorStates.ProcessorOutputClean,
        writeEntries: WriteEntriesManager
    ) {
        // normaliseOutput(output, this.meta);
        const previousOutput: Set<string> =
            "result" in this.state ? this.state.result.files : new Set();
        const previousOutputMap: Map<string, any> = new Map(
            Array.from(previousOutput).map((filePath) => [filePath, null])
        );
        const outputDiff = calcDiff.calcDiff(previousOutputMap, output.files);

        for (let [filePath, difftype] of outputDiff.entries()) {
            let content: fsEntries.BufferLike | "remove";
            let priority: number;
            switch (difftype) {
                case "changed":
                case "created":
                    content = output.files.get(filePath)?.buffer as fsEntries.BufferLike;
                    priority = output.files.get(filePath)?.priority as number;
                    break;
                case "removed":
                    content = "remove";
                    priority = 0;
            }

            const writeEntry: writeEntry.WriteEntry = {
                content,
                processor: this,
                priority
            };
            writeEntries.set(filePath, writeEntry);
        }
    }

    pendingResultPromise(): {
        promise: Promise<
            ["ok", processorStates.ProcessorResult] | ["err", any]
        >;
        resolve: (result: processorStates.ProcessorResult) => void;
        reject: (err: any) => void;
    } {
        const { promise, resolve } = Promise.withResolvers<
            ["ok", processorStates.ProcessorResult] | ["err", any]
        >();
        const wrappedResolve = (result: processorStates.ProcessorResult) => {
            resolve(["ok", result]);
        };
        const wrappedReject = (err: any) => {
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

    unwrapPendingResult(
        res: ["ok", processorStates.ProcessorResult] | ["err", any]
    ): processorStates.ProcessorResult {
        switch (res[0]) {
            case "ok":
                return res[1];
            case "err":
                throw res[1];
        }
    }

    // adds build entry, writes directly into write manager ()
    async buildWithBuffer(): Promise<processorStates.ProcessorResult> {
        const contentEntry = this.buildInstance
            .getFsContent()
            .get(this.meta.childPath);
        assert(contentEntry !== undefined);
        let content: Buffer | "dir";

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
            this.updateWithOutput(
                cleanOutput,
                this.buildInstance.getWriteEntriesManager()
            );

            this.state = {
                status: "built",
                processor: this.processor,
                result: {
                    result: cleanOutput.result,
                    files: new Set(cleanOutput.files.keys()),
                },
            };

            resolve(this.state.result);
        } catch (err) {
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
    async getResult(
        requester: ProcessorHandle
    ): Promise<processorStates.ProcessorResult> {
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
                throw new Error(
                    "processor is not being built and will not be resolved"
                );
            case "building":
                return this.unwrapPendingResult(await this.state.pendingResult);
            case "error":
                throw this.state.err;
        }
    }

    async getProcessor(requester: ProcessorHandle): Promise<Processor> {
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
                throw new Error(
                    "processor is not being built and will not be resolved"
                );
            case "building":
                await this.state.pendingResult;
                return this.processor;
            case "error":
                throw this.state.err;
            case "built":
                return this.processor;
        }
    }

    getSettings(requester: ProcessorHandle): Record<string, any> {
        if (this.isOrDependsOn(requester)) {
            throw new Error("There is a cycle in dependency.");
        }
        this.dependents.add(requester);
        return this.meta.settings
    }
}

export default ProcessorHandle;

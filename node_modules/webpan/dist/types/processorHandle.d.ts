import type * as procEntries from "./procEntries.js";
import Processor from "./processor.js";
import type * as processorStates from "./processorStates.js";
import BuildInstance from "../types/buildInstance.js";
import WriteEntriesManager from "../info/writeEntriesManager.js";
declare class ProcessorHandle {
    id: string;
    state: processorStates.ProcessorState;
    meta: procEntries.ProcessorMetaEntry;
    processor: Processor;
    buildInstance: BuildInstance;
    dependents: Set<ProcessorHandle>;
    dependencies: Set<ProcessorHandle>;
    constructor(buildInstance: BuildInstance, meta: procEntries.ProcessorMetaEntry, processor: Processor, id?: string);
    equals(proc: Processor): boolean;
    drop(): void;
    isOrDependsOn(needle: ProcessorHandle, path?: ProcessorHandle[]): boolean;
    resetWithoutRebuild(): void;
    private resetAndRebuildDependentsDuringBuild;
    getIdent(): [string, string];
    hasResult(): boolean;
    hasProcessor(): boolean;
    updateWithOutput(output: processorStates.ProcessorOutputClean, writeEntries: WriteEntriesManager): void;
    pendingResultPromise(): {
        promise: Promise<[
            "ok",
            processorStates.ProcessorResult
        ] | ["err", any]>;
        resolve: (result: processorStates.ProcessorResult) => void;
        reject: (err: any) => void;
    };
    unwrapPendingResult(res: ["ok", processorStates.ProcessorResult] | ["err", any]): processorStates.ProcessorResult;
    buildWithBuffer(): Promise<processorStates.ProcessorResult>;
    getResult(requester: ProcessorHandle): Promise<processorStates.ProcessorResult>;
    getProcessor(requester: ProcessorHandle): Promise<Processor>;
    getSettings(requester: ProcessorHandle): Record<string, any>;
}
export default ProcessorHandle;
//# sourceMappingURL=processorHandle.d.ts.map
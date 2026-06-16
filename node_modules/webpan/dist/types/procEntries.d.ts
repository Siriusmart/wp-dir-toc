import type Processor from "./processor.js";
import type ProcessorHandle from "./processorHandle.js";
import type BuildInstance from "../types/buildInstance.js";
import type * as procEntries from "../types/procEntries.js";
export type ProcByFileMap = Map<string, Map<string, Set<ProcessorHandle>>>;
export type ProcByIdMap = Map<string, ProcessorHandle>;
export interface ProcessorMetaEntry {
    childPath: string;
    procName: string;
    relativePath: string;
    ruleLocation: string;
    settings: any;
}
export type ProcClass = {
    new (buildInstance: BuildInstance, meta: procEntries.ProcessorMetaEntry, id?: string): Processor;
};
export type DiffType = "changed" | "removed" | "created";
export type DiffEntries<K> = Map<K, DiffType>;
//# sourceMappingURL=procEntries.d.ts.map
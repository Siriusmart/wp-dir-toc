import type BuildInstance from "./buildInstance.js";
import type NewFiles from "./newfiles.js";
import type * as procEntries from "./procEntries.js";
import type * as processorStates from "./processorStates.js";
import type ProcessorHandle from "./processorHandle.js";
export declare class FileNamedProcOne {
    private parent;
    private proc;
    constructor(parent: ProcessorHandle, proc: ProcessorHandle);
    getSettings(): Record<string, any>;
    getResult(): Promise<processorStates.ProcessorResult>;
    getProcessor(): Promise<Processor>;
    equals(other: Processor): boolean;
}
export declare class FileNamedProcs {
    private parent;
    private procsSet;
    constructor(parent: ProcessorHandle, procsSet: Set<ProcessorHandle>);
    values(): IteratorObject<FileNamedProcOne>;
    toSet(): Set<FileNamedProcOne>;
}
export declare class FileProcs {
    private parent;
    private procsMap;
    constructor(parent: ProcessorHandle, procsMap: Map<string, Set<ProcessorHandle>>);
    procs(options?: {
        include?: string | string[];
        exclude?: string | string[];
    }): Map<string, FileNamedProcs>;
}
export default abstract class Processor {
    __handle: ProcessorHandle;
    private buildInstance;
    constructor(buildInstance: BuildInstance, meta: procEntries.ProcessorMetaEntry, id?: string);
    filePath(options?: {
        absolute?: boolean;
    }): string;
    parentPath(option?: {
        absolute?: boolean;
    }): string;
    files(options?: {
        include?: string | string[];
        exclude?: string | string[];
        absolute?: boolean;
    }): Map<string, FileProcs>;
    settings(): any;
    abstract build(content: Buffer | "dir"): Promise<processorStates.ProcessorOutputRaw>;
    shouldRebuild(newFiles: NewFiles): boolean;
}
//# sourceMappingURL=processor.d.ts.map
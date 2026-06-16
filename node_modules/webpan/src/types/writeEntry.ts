import type * as fsEntries from "./fsEntries.js";
import ProcessorHandle from "./processorHandle.js";

export interface OutputTarget {
    surface: { procId: string, priority: number } | null;

    // procId, priority
    allOutputs: Map<string, number>
    newWrites: Map<string, WriteEntry>
}

export interface WriteEntry {
    processor: ProcessorHandle;
    content: fsEntries.BufferLike | "remove";
    priority: number
}

export type WriteEntryManagerState = "writable" | "readonly" | "disabled";

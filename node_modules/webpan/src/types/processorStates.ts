import type * as fsEntries from "./fsEntries.js";
import Processor from "./processor.js";

export interface ProcessorOutputEntry {
    buffer: fsEntries.BufferLike,
    priority: number
}

export interface ProcessorOutputRaw {
    relative?: Map<string, fsEntries.BufferLike | ProcessorOutputEntry>;
    absolute?: Map<string, fsEntries.BufferLike | ProcessorOutputEntry>;
    result?: any;
}

export interface ProcessorOutputClean {
    files: Map<string, ProcessorOutputEntry>;
    result: any;
}

export interface ProcessorResult {
    files: Set<string>;
    result: any;
}

export interface ResultOnlyProcessorState {
    status: "resultonly";
    result: ProcessorResult;
}

export interface EmptyProcessorState {
    status: "empty";
}

export interface ErrorProcessorState {
    status: "error";
    err: any;
}

export interface BuildingProcessorState {
    status: "building";
    pendingResult: Promise<["ok", ProcessorResult] | ["err", any]>;
    resolve: (value: ProcessorResult) => void;
    reject: (reason?: any) => void;
}

export interface BuiltProcessorState {
    status: "built";
    processor: Processor;
    result: ProcessorResult;
}

export type ProcessorState =
    | ResultOnlyProcessorState
    | EmptyProcessorState
    | BuildingProcessorState
    | BuiltProcessorState
    | ErrorProcessorState;

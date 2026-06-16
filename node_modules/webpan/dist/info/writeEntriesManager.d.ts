import * as writeEntry from "../types/writeEntry.js";
import type * as fsEntries from "../types/fsEntries.js";
interface OutputActions {
    removes: Set<string>;
    moves1: [string, string][];
    moves2: [string, string][];
    writes: [string, fsEntries.BufferLike][];
}
declare class WriteEntriesManager {
    private state;
    private outputTargets;
    constructor(outputTargets: Map<string, writeEntry.OutputTarget>);
    __getOutputTargets(): Map<string, writeEntry.OutputTarget>;
    set(path: string, content: writeEntry.WriteEntry): void;
    getActions(): OutputActions;
    setState(state: writeEntry.WriteEntryManagerState): void;
}
export default WriteEntriesManager;
//# sourceMappingURL=writeEntriesManager.d.ts.map
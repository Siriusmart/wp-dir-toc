import type * as procEntries from "../types/procEntries.js";
import type BuildInstance from "../types/buildInstance.js";
declare function updateRules(buildInstance: BuildInstance): Promise<void>;
interface FoundProcessorEntry {
    processorClass: procEntries.ProcClass;
    settings: any;
    relativePath: string;
    ruleLocation: string;
    pattern: string;
    procName: string;
}
declare function resolveProcessors(buildInstance: BuildInstance, dirCursor: string, fileName?: string): Promise<Set<FoundProcessorEntry>>;
declare const _default: {
    updateRules: typeof updateRules;
    resolveProcessors: typeof resolveProcessors;
};
export default _default;
//# sourceMappingURL=wrules.d.ts.map
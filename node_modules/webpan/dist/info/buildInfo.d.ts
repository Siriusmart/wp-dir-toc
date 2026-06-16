import type BuildInstance from "../types/buildInstance.js";
import type WriteEntriesManager from "../info/writeEntriesManager.js";
import type ProcessorHandle from "../types/processorHandle.js";
import type * as wmanifest from "../types/wmanifest.js";
import type * as fsEntries from "../types/fsEntries.js";
import type * as procEntries from "../types/procEntries.js";
import type * as ruleEntry from "../types/ruleEntry.js";
import type * as writeEntry from "../types/writeEntry.js";
interface BuildResultEntry {
    id: string;
    meta: procEntries.ProcessorMetaEntry;
    state: ["ok", {
        files: string[];
        result: any;
    }] | ["err", string] | ["empty"];
    dependents: string[];
    dependencies: string[];
}
interface BuildInfo {
    hashedEntries: Map<string, string | null>;
    buildCache: BuildResultEntry[];
    rules: Map<string, ruleEntry.RuleEntryNormalised>;
    writeEntries: Map<string, writeEntry.OutputTarget>;
}
declare function readBuildInfo(root: string): Promise<BuildInfo>;
declare function writeBuildInfo(root: string, manifest: wmanifest.WManifest, data: BuildInfo): Promise<void>;
declare function wrapBuildInfo(hashedEntries: fsEntries.HashedEntries, cachedProcessors: Map<string, Map<string, Set<ProcessorHandle>>>, cachedRules: Map<string, ruleEntry.RuleEntryNormalised>, writeManager: WriteEntriesManager): BuildInfo;
declare function unwrapBuildInfo(root: string, manifest: wmanifest.WManifest, buildInfo: BuildInfo): {
    hashedEntries: fsEntries.HashedEntries;
    cachedProcessors: Map<string, Map<string, Set<ProcessorHandle>>>;
    cachedProcessorsFlat: Map<string, ProcessorHandle>;
    cachedRules: Map<string, ruleEntry.RuleEntryNormalised>;
    writeManager: WriteEntriesManager;
    buildInstance: BuildInstance;
};
declare const _default: {
    readBuildInfo: typeof readBuildInfo;
    writeBuildInfo: typeof writeBuildInfo;
    wrapBuildInfo: typeof wrapBuildInfo;
    unwrapBuildInfo: typeof unwrapBuildInfo;
};
export default _default;
//# sourceMappingURL=buildInfo.d.ts.map
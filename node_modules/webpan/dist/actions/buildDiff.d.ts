import type * as fsEntries from "../types/fsEntries.js";
import type * as procEntries from "../types/procEntries.js";
import type BuildInstance from "../types/buildInstance.js";
declare function buildDiff(buildInstance: BuildInstance, fsContent: fsEntries.FsContentEntries, diff: procEntries.DiffEntries<string>, hashedEntries: fsEntries.HashedEntries): Promise<void>;
export default buildDiff;
//# sourceMappingURL=buildDiff.d.ts.map
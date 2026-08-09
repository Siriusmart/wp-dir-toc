import type BuildInstance from "../types/buildInstance.js";
import type { HashedEntries, FsContentEntries } from "../types/fsEntries.js";
import type { DiffEntries } from "../types/procEntries.js";
export declare function watchBuild(buildInstance: BuildInstance, fsContent: FsContentEntries, hashedEntries: HashedEntries, fsDiff: DiffEntries<string>): Promise<void>;
//# sourceMappingURL=watchBuild.d.ts.map
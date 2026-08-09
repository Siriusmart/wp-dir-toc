import type * as fsEntries from "../types/fsEntries.js";
export declare function calcHash(entry: ["file", Buffer] | ["dir"]): string | null;
declare function calcHashedEntries(fsEntries: fsEntries.FsContentEntries): fsEntries.HashedEntries;
export default calcHashedEntries;
//# sourceMappingURL=calcHashedEntries.d.ts.map
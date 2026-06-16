import type * as fsEntries from "../types/fsEntries.js";
declare function exists(path: string): Promise<boolean>;
declare function existsFile(path: string): Promise<boolean>;
declare function existsDir(path: string): Promise<boolean>;
declare function readDirRecursive(dir: string): Promise<fsEntries.FsContentEntries>;
declare function writeCreate(target: string, data: fsEntries.BufferLike): Promise<void>;
declare function moveCreate(from: string, to: string): Promise<void>;
declare const _default: {
    exists: typeof exists;
    existsFile: typeof existsFile;
    existsDir: typeof existsDir;
    readDirRecursive: typeof readDirRecursive;
    writeCreate: typeof writeCreate;
    moveCreate: typeof moveCreate;
};
export default _default;
//# sourceMappingURL=fsUtils.d.ts.map
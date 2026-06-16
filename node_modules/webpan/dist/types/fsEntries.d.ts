import type * as Stream from "stream";
export interface OutputEntry {
    path: string;
    buffer: Buffer;
}
export interface FsContentEntry {
    fullPath: string;
    childPath: string;
    content: ["file", Buffer] | ["dir"];
}
export type HashedEntries = Map<string, string | null>;
export type OutputEntries = Map<string, OutputEntry>;
export type FsContentEntries = Map<string, FsContentEntry>;
export type BufferLike = string | NodeJS.ArrayBufferView | Iterable<string | NodeJS.ArrayBufferView> | AsyncIterable<string | NodeJS.ArrayBufferView> | Stream;
//# sourceMappingURL=fsEntries.d.ts.map
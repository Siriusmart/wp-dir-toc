import Processor from "webpan/dist/types/processor.js";
import NewFiles from "webpan/dist/types/newfiles.js";
import { ProcessorOutputRaw } from "webpan/dist/types/processorStates.js";
export type TocEntry = DirEntry | FileEntry;
export type TocEntryOrdered = DirEntryOrdered | FileEntry;
export interface DirEntry {
    type: "dir";
    sourceAbs: string;
    sourceRel: string;
    children: Set<TocEntry>;
}
export interface FileEntry {
    type: "file";
    meta: any;
    sourceAbs: string;
    sourceRel: string;
    outputAbs: string | null;
    outputRel: string | null;
    frontMatter?: Record<string, any>;
}
export interface DirEntryOrdered {
    type: "dir";
    meta?: any;
    sourceAbs: string;
    sourceRel: string;
    children: TocEntryOrdered[];
}
export default class DirTocProcessor extends Processor {
    build(content: Buffer | "dir"): Promise<ProcessorOutputRaw>;
    shouldRebuild(newFiles: NewFiles): boolean;
}
export declare function first(dir: DirEntryOrdered): FileEntry | undefined;
export declare function last(dir: DirEntryOrdered): FileEntry | undefined;
export declare function after(dir: DirEntryOrdered, entry: FileEntry): FileEntry | undefined;
export declare function before(dir: DirEntryOrdered, entry: FileEntry): FileEntry | undefined;
//# sourceMappingURL=index.d.ts.map
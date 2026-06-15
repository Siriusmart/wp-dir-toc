import Processor from "webpan/dist/types/processor.js";
import { ProcessorOutputRaw } from "webpan/dist/types/processorStates.js";
export type TocEntry = DirEntry | FileEntry;
export type TocEntryOrdered = DirEntryOrdered | FileEntry;
export interface DirEntry {
    type: "dir";
    meta?: any;
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
}
//# sourceMappingURL=index.d.ts.map
import type ProcessorHandle from "./processorHandle.js";
declare class NewFiles {
    private internal;
    private handle;
    constructor(internal: Set<string>, handle: ProcessorHandle);
    files(options?: {
        absolute?: boolean;
        include?: string | string[];
        exclude?: string | string[];
    }): Set<string>;
}
export default NewFiles;
//# sourceMappingURL=newfiles.d.ts.map
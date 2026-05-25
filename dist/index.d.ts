import Processor from "webpan/dist/types/processor.js";
import { ProcessorOutputRaw } from "webpan/dist/types/processorStates.js";
export default class DirTocProcessor extends Processor {
    build(content: Buffer | "dir"): Promise<ProcessorOutputRaw>;
}
//# sourceMappingURL=index.d.ts.map
import path from "path";
import Processor from "../types/processor.js";
import fsUtils from "../utils/fsUtils.js";
import { createRequire } from "module";
let cachedProcessorClasses = new Map();
async function getProcessor(root, ident) {
    const cachedProcessor = cachedProcessorClasses.get(ident);
    if (cachedProcessor !== undefined) {
        return cachedProcessor;
    }
    const procPath = path.join(root, "node_modules", `wp-${ident}`);
    if (!(await fsUtils.existsDir(procPath))) {
        throw new Error(`Processor not found: no directory at ${procPath}`);
    }
    const require = createRequire(import.meta.url);
    const procClass = (require(`wp-${ident}`) ?? {}).default;
    if (typeof procClass !== "function") {
        throw new Error(`Package ${ident} doesn't seem to be a webpan processor`);
    }
    cachedProcessorClasses.set(ident, procClass);
    return procClass;
}
export default getProcessor;
//# sourceMappingURL=getProcessor.js.map
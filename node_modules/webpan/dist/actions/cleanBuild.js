import path from "path";
import fs from "fs/promises";
import fsUtils from "../utils/fsUtils.js";
async function cleanBuild(root) {
    const distPath = path.join(root, "build");
    if (await fsUtils.exists(distPath)) {
        await fs.rm(distPath, { recursive: true });
    }
}
export default cleanBuild;
//# sourceMappingURL=cleanBuild.js.map
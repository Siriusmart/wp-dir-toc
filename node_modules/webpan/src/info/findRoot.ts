import path from "path";

import fsUtils from "../utils/fsUtils.js";

async function findRoot(pathHint: string = "."): Promise<string | null> {
    if (await fsUtils.existsDir(pathHint)) {
        if (await fsUtils.existsFile(path.join(pathHint, "wproject.json"))) {
            return pathHint;
        }

        // ../ is /
        if (path.resolve(pathHint) === path.resolve(path.join(pathHint, "..")))
            return null;

        return await findRoot(path.join(pathHint, ".."));
    } else {
        return null;
    }
}

export default findRoot;

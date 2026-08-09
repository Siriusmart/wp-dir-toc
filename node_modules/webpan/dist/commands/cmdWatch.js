import path from "path";
import fs from "fs/promises";
import WriteEntriesManager from "../info/writeEntriesManager.js";
import BuildInstance from "../types/buildInstance.js";
import findRoot from "../info/findRoot.js";
import buildInfo from "../info/buildInfo.js";
import cleanBuild from "../actions/cleanBuild.js";
import fsUtils from "../utils/fsUtils.js";
import calcHashedEntries from "../info/calcHashedEntries.js";
import calcDiff from "../utils/calcDiff.js";
import buildDiff from "../actions/buildDiff.js";
import wproject from "../info/wproject.js";
import { watchBuild } from "../actions/watchBuild.js";
async function cmdWatch(args) {
    const argPath = args.path;
    const root = await findRoot(argPath);
    if (root === null) {
        console.error("Project not initialised: no project root found.");
        return;
    }
    const manifest = await wproject.createProjectManifest(root, args);
    if (manifest.cmd.build.clean) {
        await cleanBuild(root);
    }
    const gotBuildInfo = await buildInfo.readBuildInfo(root);
    const unwrappedBuildInfo = buildInfo.unwrapBuildInfo(root, manifest, gotBuildInfo);
    unwrappedBuildInfo.buildInstance
        .withHashedEntries(unwrappedBuildInfo.hashedEntries)
        .withRules(unwrappedBuildInfo.cachedRules)
        .withProcs(unwrappedBuildInfo.cachedProcessors, unwrappedBuildInfo.cachedProcessorsFlat);
    const srcPath = path.join(root, "src");
    if (!(await fsUtils.exists(srcPath))) {
        await fs.mkdir(srcPath, { recursive: true });
    }
    const srcContents = await fsUtils.readDirRecursive(srcPath);
    const hashedEntries = calcHashedEntries(srcContents);
    // this does not specify whether the changed item is a file or a directory
    // this info is contained in srcContents
    // a changed item must be a file, and exists in srcContents
    const hashedDiff = calcDiff.calcDiff(unwrappedBuildInfo.hashedEntries, hashedEntries);
    await fs.mkdir(path.join(root, "build"), { recursive: true });
    await watchBuild(unwrappedBuildInfo.buildInstance, srcContents, hashedEntries, hashedDiff);
}
export default cmdWatch;
//# sourceMappingURL=cmdWatch.js.map
import fs from "node:fs/promises";
import path from "node:path";
import buildDiff from "../actions/buildDiff.js";
import { calcHash } from "../info/calcHashedEntries.js";
import chokidar from 'chokidar';
export async function watchBuild(buildInstance, fsContent, hashedEntries, fsDiff) {
    let start = Date.now();
    console.log("□ Initial build started");
    buildDiff(buildInstance, fsContent, fsDiff, hashedEntries)
        .then(() => {
        console.log(`■ Initial build completed in ${((Date.now() - start) / 1000).toFixed(2)}s, watching for changes`);
    });
    let debounce = undefined;
    let diff = new Map();
    const watcher = chokidar.watch(".", {
        cwd: path.join(buildInstance.getRoot(), "src"),
        persistent: true,
        ignoreInitial: true,
    });
    watcher.on("all", async (event, filename) => {
        clearTimeout(debounce);
        debounce = undefined;
        let fsPath = path.join(buildInstance.getRoot(), "src", filename);
        let childPath = path.join("/", filename);
        switch (event) {
            case "change": {
                const s = await fs.stat(fsPath);
                if (s.isDirectory()) {
                    childPath = path.join(childPath, "/");
                    diff.set(childPath, { type: "changed", buffer: ["dir"], hash: calcHash(["dir"]), fsPath });
                }
                else if (s.isFile()) {
                    let buffer = ["file", await fs.readFile(fsPath)];
                    diff.set(childPath, { type: "changed", buffer, hash: calcHash(buffer), fsPath });
                }
                console.log(`~ ${childPath}`);
                break;
            }
            case "add":
                let buffer = ["file", await fs.readFile(fsPath)];
                diff.set(childPath, { type: "created", buffer, hash: calcHash(buffer), fsPath });
                console.log(`+ ${childPath}`);
                break;
            case "addDir":
                childPath = path.join(childPath, "/");
                diff.set(childPath, { type: "created", buffer: ["dir"], hash: calcHash(["dir"]), fsPath });
                console.log(`+ ${childPath}`);
                break;
            case "unlink":
                diff.set(childPath, { type: "removed" });
                console.log(`- ${childPath}`);
                break;
            case "unlinkDir":
                childPath = path.join(childPath, "/");
                diff.set(childPath, { type: "removed" });
                console.log(`- ${childPath}`);
                break;
        }
        debounce = setTimeout(() => {
            debounce = undefined;
            let thisDiff = diff;
            diff = new Map();
            // apply diff as a patch to the state
            let outDiff = new Map();
            for (const [fileName, diffEntry] of thisDiff.entries()) {
                outDiff.set(fileName, diffEntry.type);
                switch (diffEntry.type) {
                    case "created":
                        hashedEntries.set(fileName, diffEntry.hash);
                        fsContent.set(fileName, {
                            childPath: fileName,
                            fullPath: diffEntry.fsPath,
                            content: diffEntry.buffer
                        });
                        break;
                    case "changed":
                        hashedEntries.set(fileName, diffEntry.hash);
                        fsContent.set(fileName, {
                            childPath: fileName,
                            fullPath: diffEntry.fsPath,
                            content: diffEntry.buffer
                        });
                        break;
                    case "removed":
                        hashedEntries.delete(fileName);
                        break;
                }
            }
            (async () => {
                await buildDiff(buildInstance, fsContent, outDiff, hashedEntries);
            })();
        }, 100);
    });
}
//# sourceMappingURL=watchBuild.js.map
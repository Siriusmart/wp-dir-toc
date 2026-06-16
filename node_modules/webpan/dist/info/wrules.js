import path from "path";
import assert from "assert";
import micromatch from "micromatch";
import getProcessor from "./getProcessor.js";
import deepEq from "../utils/deepEq.js";
function normaliseRawProcessor(proc) {
    switch (typeof proc) {
        case "string":
            return [{ procName: proc, settings: {} }];
        case "object":
            if (Array.isArray(proc)) {
                return proc.map((ident) => ({
                    procName: ident,
                    settings: {},
                }));
            }
            else {
                return Array.from(Object.entries(proc).map(([ident, settings]) => ({
                    procName: ident,
                    settings,
                })));
            }
    }
}
function rawToNormalised(raw) {
    if (raw.processors === undefined) {
        raw.processors = new Map();
    }
    return {
        processors: new Map(Object.entries(raw.processors).map(([fileName, procs]) => [
            fileName,
            new Set(normaliseRawProcessor(procs)),
        ])),
    };
}
async function updateRules(buildInstance) {
    let procCache = buildInstance.getProcByFiles();
    let cachedRules = buildInstance.getRules();
    let fsEntries = buildInstance.getFsContent();
    let diff = buildInstance.getFsDiff();
    for (const [filePath, diffType] of diff.entries()) {
        if (path.basename(filePath) !== "wrules.json") {
            continue;
        }
        const rulesDirName = path.join(path.dirname(filePath), "/");
        let previousRules = cachedRules.get(rulesDirName);
        let newRules;
        switch (diffType) {
            case "removed":
                cachedRules?.delete(rulesDirName);
                newRules = undefined;
                break;
            case "changed":
            case "created":
                let entry = fsEntries.get(filePath);
                assert(entry !== undefined);
                try {
                    assert(entry.content[0] === "file");
                    const rulesRaw = JSON.parse(entry.content[1].toString("utf8"));
                    newRules = rawToNormalised(rulesRaw);
                    assert(cachedRules !== undefined);
                    cachedRules.set(rulesDirName, newRules);
                }
                catch (e) {
                    if (typeof e === "object" && e !== null && "stack" in e) {
                        e = e.stack;
                    }
                    throw new Error(`Failed to read ${filePath} because ${e}.`);
                }
        }
        for (const absFileName of fsEntries.keys()) {
            if (!absFileName.startsWith(rulesDirName) ||
                (diff.has(absFileName) && diff.get(absFileName) !== "changed")) {
                continue;
            }
            const relFileName = absFileName.substring(rulesDirName.length - 1);
            let removedProcs = new Set();
            let fileProcsBefore = new Set();
            if (previousRules !== undefined) {
                for (const [pattern, procs,] of previousRules.processors.entries()) {
                    if (micromatch.isMatch(relFileName, pattern)) {
                        procs.forEach((setting) => fileProcsBefore.add(setting));
                    }
                }
            }
            let fileProcsAfter = new Set();
            if (newRules !== undefined) {
                for (const [pattern, procs] of newRules.processors.entries()) {
                    if (micromatch.isMatch(relFileName, pattern)) {
                        procs.forEach((setting) => fileProcsAfter.add(setting));
                    }
                }
            }
            for (const procRule of fileProcsBefore.values()) {
                let matchedProcRule = fileProcsAfter
                    .values()
                    .find((procRuleAfter) => deepEq(procRule, procRuleAfter));
                if (matchedProcRule === undefined) {
                    removedProcs.add(procRule);
                }
                else {
                    fileProcsAfter.delete(matchedProcRule);
                }
            }
            let fileProcsEditable = procCache.get(absFileName);
            if (fileProcsEditable === undefined) {
                fileProcsEditable = new Map();
                procCache.set(absFileName, fileProcsEditable);
            }
            // now removedProcs contains all procs removed
            // and fileProcsAfter contains all added procs
            nextProc: for (const toRemove of removedProcs) {
                let setWithProcName = fileProcsEditable.get(toRemove.procName) ?? new Set();
                for (const potentialTarget of setWithProcName) {
                    if (potentialTarget.meta.ruleLocation === rulesDirName &&
                        deepEq(potentialTarget.meta.settings, toRemove.settings)) {
                        potentialTarget.drop();
                        setWithProcName.delete(potentialTarget);
                        if (setWithProcName.size === 0) {
                            fileProcsEditable.delete(toRemove.procName);
                        }
                        continue nextProc;
                    }
                }
                throw new Error(`Cannot find processor ${toRemove} for removal`);
            }
            for (const toAdd of fileProcsAfter.values()) {
                const procClass = await getProcessor(buildInstance.getRoot(), toAdd.procName);
                const meta = {
                    childPath: absFileName,
                    procName: toAdd.procName,
                    relativePath: relFileName,
                    ruleLocation: rulesDirName,
                    settings: toAdd.settings,
                };
                let procObj = new procClass(buildInstance, meta);
                let procNamedSet = fileProcsEditable.get(toAdd.procName);
                if (procNamedSet === undefined) {
                    procNamedSet = new Set();
                    fileProcsEditable.set(toAdd.procName, procNamedSet);
                }
                procNamedSet.add(procObj.__handle);
            }
            if (fileProcsEditable.size === 0) {
                procCache.delete(absFileName);
            }
        }
    }
}
async function resolveProcessors(buildInstance, dirCursor, fileName = dirCursor.endsWith("/") ? "/" : "") {
    const dirRule = buildInstance.getRules().get(dirCursor);
    let foundEntries = new Set();
    if (dirRule !== undefined) {
        for (const [pattern, procs] of dirRule.processors.entries()) {
            if (micromatch.isMatch(fileName, pattern)) {
                for (const proc of procs) {
                    foundEntries.add({
                        processorClass: await getProcessor(buildInstance.getRoot(), proc.procName),
                        settings: proc.settings,
                        relativePath: fileName,
                        ruleLocation: dirCursor,
                        pattern: pattern,
                        procName: proc.procName,
                    });
                }
            }
        }
    }
    if (dirCursor !== "/") {
        const parentProcessors = await resolveProcessors(buildInstance, path.join(path.dirname(dirCursor), "/"), path.join("/", path.basename(dirCursor), fileName));
        parentProcessors.forEach(foundEntries.add, foundEntries);
    }
    return foundEntries;
}
export default {
    updateRules,
    resolveProcessors,
};
//# sourceMappingURL=wrules.js.map
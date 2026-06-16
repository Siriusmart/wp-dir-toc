import * as writeEntry from "../types/writeEntry.js";
import path from "path";
import assert from "assert";
class WriteEntriesManager {
    state = "disabled";
    outputTargets;
    constructor(outputTargets) {
        this.outputTargets = outputTargets;
    }
    __getOutputTargets() {
        return this.outputTargets;
    }
    set(path, content) {
        if (this.state !== "writable") {
            throw new Error("attempt to write to writeEntries when it isn't writeable");
        }
        let target = this.outputTargets.get(path);
        if (target === undefined) {
            this.outputTargets.set(path, {
                surface: null,
                allOutputs: new Map([[content.processor.id, content.priority]]),
                newWrites: new Map([[content.processor.id, content]])
            });
        }
        else {
            if (target.surface !== null && target.surface.procId === content.processor.id)
                target.surface.priority = content.priority;
            target.newWrites.set(content.processor.id, content);
        }
    }
    getActions() {
        if (this.state === "disabled") {
            throw new Error("attempt to read from writeEntries when it is disabled");
        }
        let removes = new Set();
        for (const [childPath, targetEntry] of this.outputTargets.entries())
            for (const [prodId, writeEntry] of targetEntry.newWrites)
                if (writeEntry.content === "remove") {
                    if (targetEntry.surface !== null && writeEntry.processor.id === targetEntry.surface.procId) {
                        removes.add(path.join("build/dist", childPath));
                        targetEntry.surface = null;
                    }
                    else
                        removes.add(path.join("build/shadowed", childPath) + `.${prodId}`);
                    targetEntry.allOutputs.delete(prodId);
                }
        let writes = [];
        for (const [childPath, targetEntry] of this.outputTargets.entries())
            for (const [prodId, writeEntry] of targetEntry.newWrites)
                if (writeEntry.content !== "remove") {
                    if (targetEntry.surface !== null && writeEntry.processor.id === targetEntry.surface.procId) {
                        let relPath = path.join("build/dist", childPath);
                        if (!removes.has(relPath))
                            writes.push([relPath, writeEntry.content]);
                    }
                    else {
                        let relPath = path.join("build/shadowed", childPath) + `.${prodId}`;
                        if (!removes.has(relPath))
                            writes.push([relPath, writeEntry.content]);
                    }
                    targetEntry.allOutputs.set(prodId, writeEntry.priority);
                }
        let moves1 = [];
        let moves2 = [];
        for (const [childPath, targetEntry] of this.outputTargets.entries()) {
            if (targetEntry.allOutputs.size === 0)
                continue;
            let entries = Array.from(targetEntry.allOutputs.entries());
            let maxPriority = entries[0]?.[1];
            let maxPriorityProc = entries[0]?.[0];
            for (const [procId, priority] of entries) {
                if (priority > maxPriority) {
                    maxPriority = priority;
                    maxPriorityProc = procId;
                }
            }
            if (targetEntry.surface === null) {
                targetEntry.surface = { procId: maxPriorityProc, priority: maxPriority };
                moves2.push([path.join("build/shadowed", childPath) + `.${maxPriorityProc}`, path.join("build/dist", childPath)]);
            }
            else if (targetEntry.surface.priority < maxPriority) {
                moves1.push([path.join("build/dist", childPath), path.join("build/shadowed", childPath) + `.${targetEntry.surface?.procId}`]);
                moves2.push([path.join("build/shadowed", childPath) + `.${maxPriorityProc}`, path.join("build/dist", childPath)]);
                targetEntry.surface = { priority: maxPriority, procId: maxPriorityProc };
            }
        }
        return {
            writes,
            removes,
            moves1,
            moves2
        };
    }
    setState(state) {
        switch (this.state) {
            case "disabled":
                if (state !== "writable") {
                    throw new Error("the state after disabled should be writable");
                }
                break;
            case "writable":
                if (state !== "readonly") {
                    throw new Error("the state after writable should be readonly");
                }
                break;
            case "readonly":
                if (state !== "disabled") {
                    throw new Error("the state after readonly should be disabled");
                }
                break;
        }
        if (state === "disabled")
            for (const [childPath, targetEntry] of this.outputTargets.entries()) {
                targetEntry.newWrites.clear();
                if (targetEntry.allOutputs.size === 0)
                    this.outputTargets.delete(childPath);
            }
        this.state = state;
    }
}
export default WriteEntriesManager;
//# sourceMappingURL=writeEntriesManager.js.map
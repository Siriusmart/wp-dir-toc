function calcDiffByEq(before, after, eq) {
    let diffs = new Map();
    for (const [key, vBefore] of before.entries()) {
        const vAfter = after.get(key);
        if (vAfter === undefined) {
            diffs.set(key, "removed");
        }
        else if (!eq(vBefore, vAfter)) {
            diffs.set(key, "changed");
        }
    }
    for (const key of after.keys()) {
        if (!before.has(key)) {
            diffs.set(key, "created");
        }
    }
    return diffs;
}
function calcDiffByExtractor(before, after, extractor) {
    return calcDiffByEq(before, after, (a, b) => extractor(a) === extractor(b));
}
function calcDiff(before, after) {
    return calcDiffByExtractor(before, after, (a) => a);
}
export default {
    calcDiffByEq,
    calcDiffByExtractor,
    calcDiff,
};
//# sourceMappingURL=calcDiff.js.map
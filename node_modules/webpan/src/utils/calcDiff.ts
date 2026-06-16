import type * as procEntries from "../types/procEntries.js";

function calcDiffByEq<K, V>(
    before: Map<K, V>,
    after: Map<K, V>,
    eq: (a: V, b: V) => boolean
): procEntries.DiffEntries<K> {
    let diffs: procEntries.DiffEntries<K> = new Map();

    for (const [key, vBefore] of before.entries()) {
        const vAfter = after.get(key);
        if (vAfter === undefined) {
            diffs.set(key, "removed");
        } else if (!eq(vBefore, vAfter)) {
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

function calcDiffByExtractor<K, V, T>(
    before: Map<K, V>,
    after: Map<K, V>,
    extractor: (a: V) => T
): procEntries.DiffEntries<K> {
    return calcDiffByEq(before, after, (a, b) => extractor(a) === extractor(b));
}

function calcDiff<K, V>(
    before: Map<K, V>,
    after: Map<K, V>
): procEntries.DiffEntries<K> {
    return calcDiffByExtractor(before, after, (a) => a);
}

export default {
    calcDiffByEq,
    calcDiffByExtractor,
    calcDiff,
};

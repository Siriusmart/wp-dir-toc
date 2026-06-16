import type * as procEntries from "../types/procEntries.js";
declare function calcDiffByEq<K, V>(before: Map<K, V>, after: Map<K, V>, eq: (a: V, b: V) => boolean): procEntries.DiffEntries<K>;
declare function calcDiffByExtractor<K, V, T>(before: Map<K, V>, after: Map<K, V>, extractor: (a: V) => T): procEntries.DiffEntries<K>;
declare function calcDiff<K, V>(before: Map<K, V>, after: Map<K, V>): procEntries.DiffEntries<K>;
declare const _default: {
    calcDiffByEq: typeof calcDiffByEq;
    calcDiffByExtractor: typeof calcDiffByExtractor;
    calcDiff: typeof calcDiff;
};
export default _default;
//# sourceMappingURL=calcDiff.d.ts.map
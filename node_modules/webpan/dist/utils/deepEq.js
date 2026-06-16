function deepEq(a, b) {
    if (typeof a === "number" && typeof b === "number" && isNaN(a)) {
        return isNaN(b);
    }
    // null or typeof !== object
    if (a === b)
        return true;
    if (typeof a !== typeof b)
        return false;
    if (typeof a !== "object")
        return a === b;
    if (a === null)
        return b === null;
    if (a.constructor?.name !== "Object" && a.constructor?.name !== "Array")
        throw new Error("cannot use deepEq on structures other than Object or Array");
    let checkedKeys = new Set();
    for (const [key, value] of Object.entries(a)) {
        checkedKeys.add(key);
        if (!deepEq(value, b[key]))
            return false;
    }
    for (const [key, value] of Object.entries(b)) {
        if (checkedKeys.has(key))
            continue;
        if (!deepEq(value, a[key]))
            return false;
    }
    return true;
}
export default deepEq;
//# sourceMappingURL=deepEq.js.map
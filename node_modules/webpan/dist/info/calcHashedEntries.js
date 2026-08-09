import crypto from "crypto";
export function calcHash(entry) {
    switch (entry[0]) {
        case "file": {
            let hash = crypto
                .createHmac("md5", "")
                .update(entry[1])
                .digest("hex");
            return hash;
        }
        case "dir": {
            return null;
        }
    }
}
function calcHashedEntries(fsEntries) {
    let hashedEntries = new Map();
    for (const [childPath, fsContent] of fsEntries.entries()) {
        hashedEntries.set(childPath, calcHash(fsContent.content));
    }
    return hashedEntries;
}
export default calcHashedEntries;
//# sourceMappingURL=calcHashedEntries.js.map
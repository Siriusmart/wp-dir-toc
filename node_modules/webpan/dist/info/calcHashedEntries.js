import crypto from "crypto";
function calcHashedEntries(fsEntries) {
    let hashedEntries = new Map();
    for (const [childPath, fsContent] of fsEntries.entries()) {
        switch (fsContent.content[0]) {
            case "file": {
                let hash = crypto
                    .createHmac("md5", "")
                    .update(fsContent.content[1])
                    .digest("hex");
                hashedEntries.set(childPath, hash);
                break;
            }
            case "dir": {
                hashedEntries.set(childPath, null);
            }
        }
    }
    return hashedEntries;
}
export default calcHashedEntries;
//# sourceMappingURL=calcHashedEntries.js.map
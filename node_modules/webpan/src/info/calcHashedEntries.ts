import crypto from "crypto";

import type * as fsEntries from "../types/fsEntries.js";

function calcHashedEntries(
    fsEntries: fsEntries.FsContentEntries
): fsEntries.HashedEntries {
    let hashedEntries: fsEntries.HashedEntries = new Map();
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

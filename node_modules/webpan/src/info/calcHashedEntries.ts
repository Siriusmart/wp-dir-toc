import crypto from "crypto";

import type * as fsEntries from "../types/fsEntries.js";

export function calcHash(entry: ["file", Buffer] | ["dir"]): string | null {
    switch (entry[0]) {
        case "file": {
            let hash = crypto
                .createHmac("md5", "")
                .update(entry[1])
                .digest("hex");

            return hash
        }
        case "dir": {
            return null
        }
    }
}

function calcHashedEntries(
    fsEntries: fsEntries.FsContentEntries
): fsEntries.HashedEntries {
    let hashedEntries: fsEntries.HashedEntries = new Map();
    for (const [childPath, fsContent] of fsEntries.entries()) {
        hashedEntries.set(childPath, calcHash(fsContent.content));
    }

    return hashedEntries;
}

export default calcHashedEntries;

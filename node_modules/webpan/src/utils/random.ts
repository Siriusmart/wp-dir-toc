import crypto from "crypto";

function hexString(
    length: number = 8,
    constraint: (output: string) => boolean
): string {
    let toTest = crypto.randomBytes(length).toString("hex");

    if (constraint(toTest)) {
        return toTest;
    } else {
        return hexString(length, constraint);
    }
}

export default {
    hexString,
};

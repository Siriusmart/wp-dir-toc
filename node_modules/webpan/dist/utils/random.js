import crypto from "crypto";
function hexString(length = 8, constraint) {
    let toTest = crypto.randomBytes(length).toString("hex");
    if (constraint(toTest)) {
        return toTest;
    }
    else {
        return hexString(length, constraint);
    }
}
export default {
    hexString,
};
//# sourceMappingURL=random.js.map
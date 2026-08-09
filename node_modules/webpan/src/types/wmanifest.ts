export type PackageManager = "pnpm" | "npm";
export interface WManifest {
    system: {
        packageManager: PackageManager
    },
    format: {
        tabSpaces: number;
        buildInfo: boolean;
    };
    cmd: {
        build: {
            clean: boolean;
        };
    };
}

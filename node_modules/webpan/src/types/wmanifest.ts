export interface WManifest {
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

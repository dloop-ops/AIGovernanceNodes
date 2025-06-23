declare namespace _default {
    let preset: string;
    let extensionsToTreatAsEsm: string[];
    let globals: {
        'ts-jest': {
            useESM: boolean;
        };
    };
    let testEnvironment: string;
    let roots: string[];
    let testMatch: string[];
    let transform: {
        '^.+\\.(ts|tsx)$': (string | {
            useESM: boolean;
        })[];
    };
    let collectCoverageFrom: string[];
    let coverageDirectory: string;
    let coverageReporters: string[];
    let setupFilesAfterEnv: string[];
    let moduleNameMapper: {
        '^@/(.*)$': string;
        '^@elizaos/(.*)$': string;
        '^(\\.{1,2}/.*)\\.js$': string;
    };
    let moduleFileExtensions: string[];
    let testTimeout: number;
    let maxWorkers: number;
    let verbose: boolean;
}
export default _default;
//# sourceMappingURL=jest.config.d.ts.map
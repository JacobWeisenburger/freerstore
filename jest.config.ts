import type { Config } from 'jest'

export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: [ 'src', '.' ],
    openHandlesTimeout: 15_000,
    testTimeout: 15_000,
    testRegex: [
        // '**/*.test.ts',
        'freerstore.test.ts',
        // 'dev.test.ts',
    ],
    passWithNoTests: true,
} as Config
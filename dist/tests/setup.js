import dotenv from 'dotenv';
// Load test environment variables
dotenv.config({ path: '.env.test' });
// Set test timeout
jest.setTimeout(30000);
// Mock console methods for cleaner test output
const originalConsole = console;
beforeAll(() => {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
});
afterAll(() => {
    Object.assign(console, originalConsole);
});
global.testUtils = {
    generateMockWallet: () => ({
        address: '0x' + '1'.repeat(40),
        privateKey: '0x' + '1'.repeat(64)
    }),
    generateMockContract: () => ({
        address: '0x' + '2'.repeat(40)
    })
};
//# sourceMappingURL=setup.js.map
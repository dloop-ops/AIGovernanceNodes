// Must be at the very top - Jest auto-hoisting
jest.mock('../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => mockLogger)
  };

  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
    governanceLogger: mockLogger,
    contractLogger: mockLogger,
    strategyLogger: mockLogger,
    walletLogger: mockLogger,
    nodeLogger: mockLogger
  };
});

import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.ETHEREUM_RPC_URL = 'https://sepolia.infura.io/v3/test';
process.env.ASSET_DAO_ADDRESS = '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
process.env.AI_NODE_REGISTRY_ADDRESS = '0x0045c7D99489f1d8A5900243956B0206344417DD';
process.env.DLOOP_TOKEN_ADDRESS = '0x05B366778566e93abfB8e4A9B794e4ad006446b4';
process.env.SOULBOUND_NFT_ADDRESS = '0x6391C14631b2Be5374297fA3110687b80233104c';

// Test private keys (these are test keys, not real ones) - properly formatted with 66 characters (0x + 64 hex)
process.env.AI_NODE_1_PRIVATE_KEY = '0xd74ae2c1a798042c9bbf56f15d2649df6d114e763f9444e2cddcde050900f1d0';
process.env.AI_NODE_2_PRIVATE_KEY = '0x241083ae625b93b41b555052840c09458c71704889b22774101d21b4d1482e62';
process.env.AI_NODE_3_PRIVATE_KEY = '0x0aa4b2f50b7efc44721b23a2ef7fc3ab11b658369af23381752c6d86b42628b1';
process.env.AI_NODE_4_PRIVATE_KEY = '0x7dde37bea0f47ea849c9a7a285f3a277acd81c908accdb501ca036db1a5b11da';
process.env.AI_NODE_5_PRIVATE_KEY = '0x64da71a2688d24c0f970ded84d2d744081e467ae493f4c3256c4f8ee9bb959ee';

// Global test timeout
jest.setTimeout(30000);

// Mock ethers module before any imports
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getNetwork: jest.fn(() => Promise.resolve({ chainId: 11155111, name: 'sepolia' })),
      getBalance: jest.fn(() => Promise.resolve('1000000000000000000')),
      getGasPrice: jest.fn(() => Promise.resolve('20000000000')),
      estimateGas: jest.fn(() => Promise.resolve('21000')),
      call: jest.fn(() => Promise.resolve('0x')),
      getBlockNumber: jest.fn(() => Promise.resolve(12345))
    })),
    Wallet: jest.fn().mockImplementation(() => ({
      address: '0x1234567890123456789012345678901234567890',
      privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
      connect: jest.fn(),
      getBalance: jest.fn(() => Promise.resolve('1000000000000000000')),
      estimateGas: jest.fn(() => Promise.resolve('21000')),
      sendTransaction: jest.fn(() => Promise.resolve({
        hash: '0xabcdef123456789',
        wait: jest.fn(() => Promise.resolve({ status: 1 }))
      }))
    })),
    Contract: jest.fn().mockImplementation(() => ({
      address: '0xa87e662061237a121Ca2E83E77dA8251bc4B3529',
      getFunction: jest.fn().mockReturnValue(jest.fn()),
      connect: jest.fn().mockReturnThis(),
      interface: {
        encodeFunctionData: jest.fn().mockReturnValue('0x1234'),
        decodeFunctionResult: jest.fn().mockReturnValue(['result'])
      },
      vote: jest.fn().mockImplementation(() => Promise.resolve({
        hash: '0x123456789abcdef',
        wait: jest.fn().mockImplementation(() => Promise.resolve({ status: 1 }))
      })),
      getProposal: jest.fn().mockImplementation(() => Promise.resolve({
        id: '1',
        proposer: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
        description: 'Test proposal',
        proposalType: 'ASSET_TRANSFER',
        assetAddress: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
        amount: '1000000000000000000',
        votesFor: '500000000000000000',
        votesAgainst: '200000000000000000',
        startTime: Math.floor(Date.now() / 1000) - 3600,
        endTime: Math.floor(Date.now() / 1000) + 3600,
        state: 1, // ACTIVE state
        executed: false,
        cancelled: false,
        title: 'Test Proposal',
        targets: [],
        values: [],
        calldatas: [],
        quorumReached: false
      })),
    })),
    formatEther: jest.fn().mockImplementation((value: any) => value),
    parseEther: jest.fn().mockImplementation((value: any) => value),
    isAddress: jest.fn().mockReturnValue(true),
    getAddress: jest.fn().mockImplementation((address: any) => address)
  }
}));

// Test utilities
export const testUtils = {
  createMockWallet: () => ({
    address: '0x1234567890123456789012345678901234567890',
    privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
    connect: jest.fn(),
    getBalance: jest.fn(() => Promise.resolve('1000000000000000000')),
    estimateGas: jest.fn(() => Promise.resolve('21000')),
    sendTransaction: jest.fn(() => Promise.resolve({
      hash: '0xabcdef123456789',
      wait: jest.fn(() => Promise.resolve({ status: 1 }))
    }))
  }),

  createMockProvider: () => ({
    getNetwork: jest.fn(() => Promise.resolve({ chainId: 11155111, name: 'sepolia' })),
    getBalance: jest.fn(() => Promise.resolve('1000000000000000000')),
    getGasPrice: jest.fn(() => Promise.resolve('20000000000')),
    estimateGas: jest.fn(() => Promise.resolve('21000')),
    call: jest.fn(() => Promise.resolve('0x')),
    getBlockNumber: jest.fn(() => Promise.resolve(12345))
  })
};

// Setup and teardown
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Add testUtils to global scope for compatibility
declare global {
  var testUtils: {
    createMockWallet: () => any;
    createMockProvider: () => any;
    mockEnvironmentVariables: () => void;
    cleanupEnvironmentVariables: () => void;
  };
}

global.testUtils = {
  ...testUtils,
  mockEnvironmentVariables: () => {
    // Environment variables are already set at the top of this file
  },
  cleanupEnvironmentVariables: () => {
    // Clean up if needed
  }
};

export default testUtils;
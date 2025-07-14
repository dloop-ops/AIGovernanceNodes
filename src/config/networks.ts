import { NetworkConfig } from '../types/index.js';

// Ensure proper module exports for both ESM and CommonJS

export const networks: Record<string, NetworkConfig> = {
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl:
      process.env.INFURA_SEPOLIA_URL ||
      'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    blockExplorer: 'https://etherscan.io'
  }
};

export const getNetwork = (networkName: string): NetworkConfig => {
  const network = networks[networkName];
  if (!network) {
    throw new Error(`Network ${networkName} not supported`);
  }
  return network;
};

export const getCurrentNetwork = (): NetworkConfig => {
  const networkName = process.env.NETWORK_NAME || 'sepolia';
  return getNetwork(networkName);
};

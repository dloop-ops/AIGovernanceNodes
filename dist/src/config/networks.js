"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentNetwork = exports.getNetwork = exports.networks = void 0;
exports.networks = {
    sepolia: {
        name: 'Sepolia',
        chainId: 11155111,
        rpcUrl: process.env.INFURA_SEPOLIA_URL ||
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
const getNetwork = (networkName) => {
    const network = exports.networks[networkName];
    if (!network) {
        throw new Error(`Network ${networkName} not supported`);
    }
    return network;
};
exports.getNetwork = getNetwork;
const getCurrentNetwork = () => {
    const networkName = process.env.NETWORK_NAME || 'sepolia';
    return (0, exports.getNetwork)(networkName);
};
exports.getCurrentNetwork = getCurrentNetwork;
//# sourceMappingURL=networks.js.map
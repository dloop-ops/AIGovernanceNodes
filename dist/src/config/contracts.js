"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssetAddress = exports.getAssetAddresses = exports.assetAddresses = exports.getCurrentContractAddresses = exports.getContractAddresses = exports.contractAddresses = void 0;
exports.contractAddresses = {
    sepolia: {
        assetDao: process.env.ASSET_DAO_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8251bc4B3529',
        aiNodeRegistry: process.env.AI_NODE_REGISTRY_ADDRESS || '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: process.env.DLOOP_TOKEN_ADDRESS || '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
        soulboundNft: process.env.SOULBOUND_NFT_ADDRESS || '0x6391C14631b2Be5374297fA3110687b80233104c'
    },
    mainnet: {
        assetDao: process.env.MAINNET_ASSET_DAO_ADDRESS || '',
        aiNodeRegistry: process.env.MAINNET_AI_NODE_REGISTRY_ADDRESS || '',
        dloopToken: process.env.MAINNET_DLOOP_TOKEN_ADDRESS || '',
        soulboundNft: process.env.MAINNET_SOULBOUND_NFT_ADDRESS || ''
    }
};
const getContractAddresses = (networkName) => {
    const addresses = exports.contractAddresses[networkName];
    if (!addresses) {
        throw new Error(`Contract addresses not configured for network: ${networkName}`);
    }
    return addresses;
};
exports.getContractAddresses = getContractAddresses;
const getCurrentContractAddresses = () => {
    const networkName = process.env.NETWORK_NAME || 'sepolia';
    return (0, exports.getContractAddresses)(networkName);
};
exports.getCurrentContractAddresses = getCurrentContractAddresses;
exports.assetAddresses = {
    sepolia: {
        USDC: '0xA0b86a33E6417c90D01C24a37cbc88a3e5556c97',
        WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        PAXG: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
        EURT: '0xC581b735A1688071A1746c968e0798D642EDE491'
    },
    mainnet: {
        USDC: '0xA0b86a33E6417c90D01C24a37cbc88a3e5556c97',
        WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        PAXG: '0x45804880De22913dAFE09f4980848ECE6EcbAf78',
        EURT: '0xC581b735A1688071A1746c968e0798D642EDE491'
    }
};
const getAssetAddresses = (networkName) => {
    const assets = exports.assetAddresses[networkName];
    if (!assets) {
        throw new Error(`Asset addresses not configured for network: ${networkName}`);
    }
    return assets;
};
exports.getAssetAddresses = getAssetAddresses;
const getAssetAddress = (networkName, symbol) => {
    const assets = (0, exports.getAssetAddresses)(networkName);
    const address = assets[symbol];
    if (!address) {
        throw new Error(`Asset ${symbol} not configured for network: ${networkName}`);
    }
    return address;
};
exports.getAssetAddress = getAssetAddress;
//# sourceMappingURL=contracts.js.map
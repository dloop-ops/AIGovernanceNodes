import { ContractAddresses } from '../types/index.js';
export declare const contractAddresses: Record<string, ContractAddresses>;
export declare const getContractAddresses: (networkName: string) => ContractAddresses;
export declare const getCurrentContractAddresses: () => ContractAddresses;
export declare const assetAddresses: Record<string, Record<string, string>>;
export declare const getAssetAddresses: (networkName: string) => Record<string, string>;
export declare const getAssetAddress: (networkName: string, symbol: string) => string;
//# sourceMappingURL=contracts.d.ts.map
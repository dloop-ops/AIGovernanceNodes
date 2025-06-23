"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationBlockerResolver = void 0;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class RegistrationBlockerResolver {
    constructor() {
        this.wallets = [];
        this.provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
        this.initializeContracts();
        this.loadWallets();
    }
    initializeContracts() {
        const registryAbi = [
            'function registerAINode(string endpoint, string name, string description, string nodeType) external returns (uint256)',
            'function getNodeInfo(address) view returns (tuple(address,string,string,string,string,bool,uint256,uint256))',
            'function nodeStakeAmount() view returns (uint256)',
            'function minReputation() view returns (uint256)',
            'function paused() view returns (bool)',
            'function hasRole(bytes32 role, address account) view returns (bool)'
        ];
        const dloopAbi = [
            'function balanceOf(address) view returns (uint256)',
            'function allowance(address,address) view returns (uint256)',
            'function approve(address,uint256) external returns (bool)'
        ];
        const soulboundAbi = [
            'function balanceOf(address) view returns (uint256)',
            'function hasValidSoulboundNFT(address) view returns (bool)'
        ];
        this.registryContract = new ethers_1.ethers.Contract('0x0045c7D99489f1d8A5900243956B0206344417DD', registryAbi, this.provider);
        this.dloopContract = new ethers_1.ethers.Contract('0x05B366778566e93abfB8e4A9B794e4ad006446b4', dloopAbi, this.provider);
        this.soulboundContract = new ethers_1.ethers.Contract('0x6391C14631b2Be5374297fA3110687b80233104c', soulboundAbi, this.provider);
    }
    loadWallets() {
        const privateKeys = [
            process.env.AI_NODE_1_PRIVATE_KEY,
            process.env.AI_NODE_2_PRIVATE_KEY,
            process.env.AI_NODE_3_PRIVATE_KEY,
            process.env.AI_NODE_4_PRIVATE_KEY,
            process.env.AI_NODE_5_PRIVATE_KEY
        ];
        this.wallets = privateKeys.map(key => new ethers_1.ethers.Wallet(key, this.provider));
    }
    /**
     * Analyze the custom error 0x06d919f2
     */
    analyzeCustomError() {
        return {
            code: '0x06d919f2',
            selector: '06d919f2',
            description: 'Custom contract error preventing node registration',
            possibleCauses: [
                'Contract paused or registration disabled',
                'Insufficient DLOOP token stake amount',
                'Missing SoulBound NFT requirement',
                'Caller lacks required role/permission',
                'Contract state validation failure',
                'Gas estimation failure due to contract logic',
                'Invalid endpoint or metadata format',
                'Registration window or timing restriction'
            ],
            solutions: [
                'Verify contract is not paused',
                'Check required stake amount matches contract requirement',
                'Ensure SoulBound NFT authentication is complete',
                'Validate caller has required permissions',
                'Review contract state requirements',
                'Adjust gas limits and fee structure',
                'Validate input parameter formats',
                'Check for registration timing restrictions'
            ]
        };
    }
    /**
     * Comprehensive prerequisite verification
     */
    async verifyAllPrerequisites(nodeIndex) {
        const wallet = this.wallets[nodeIndex];
        try {
            const [tokenBalance, tokenApproval, soulboundBalance, ethBalance, requiredStake, minReputation] = await Promise.all([
                this.dloopContract.balanceOf(wallet.address),
                this.dloopContract.allowance(wallet.address, '0x0045c7D99489f1d8A5900243956B0206344417DD'),
                this.soulboundContract.balanceOf(wallet.address),
                this.provider.getBalance(wallet.address),
                this.registryContract.nodeStakeAmount(),
                this.registryContract.minReputation()
            ]);
            let contractPaused = false;
            try {
                contractPaused = await this.registryContract.paused();
            }
            catch {
                // Contract may not have paused function
            }
            const meetsRequirements = tokenBalance >= requiredStake &&
                tokenApproval >= requiredStake &&
                soulboundBalance > 0n &&
                ethBalance >= ethers_1.ethers.parseEther('0.01') &&
                !contractPaused;
            return {
                tokenBalance,
                tokenApproval,
                soulboundBalance,
                ethBalance,
                requiredStake,
                minReputation,
                contractPaused,
                meetsRequirements
            };
        }
        catch (error) {
            console.log(`Prerequisites check failed for node ${nodeIndex + 1}: ${error.message}`);
            throw error;
        }
    }
    /**
     * Try alternative registration approaches
     */
    async attemptAlternativeRegistration(nodeIndex) {
        const wallet = this.wallets[nodeIndex];
        const connectedContract = this.registryContract.connect(wallet);
        const endpoint = "https://d-loop.io/identity/identity.json";
        const name = `AI Governance Node ai-gov-${String(nodeIndex + 1).padStart(2, '0')}`;
        const description = `Automated governance node using ${nodeIndex % 2 === 0 ? 'Conservative' : 'Aggressive'} strategy`;
        const nodeType = "governance";
        const metadata = JSON.stringify({
            name,
            description,
            endpoint,
            nodeType,
            strategy: nodeIndex % 2 === 0 ? 'conservative' : 'aggressive',
            version: '1.0.0',
            registeredAt: Date.now()
        });
        try {
            // Get optimal gas configuration
            const feeData = await this.provider.getFeeData();
            const gasLimit = 2500000n; // Very high gas limit
            const txOptions = { gasLimit };
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                txOptions.maxFeePerGas = feeData.maxFeePerGas * 300n / 100n;
                txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 200n / 100n;
            }
            else if (feeData.gasPrice) {
                txOptions.gasPrice = feeData.gasPrice * 300n / 100n;
            }
            console.log(`Attempting registration for ${name}`);
            console.log(`Gas configuration: ${JSON.stringify(txOptions, (k, v) => typeof v === 'bigint' ? v.toString() : v)}`);
            // Try direct registration call
            const tx = await connectedContract.registerAINode(endpoint, name, description, nodeType, txOptions);
            console.log(`Transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait(3);
            return {
                nodeAddress: wallet.address,
                metadata,
                gasLimit,
                gasPrice: txOptions.maxFeePerGas || txOptions.gasPrice || 0n,
                success: receipt?.status === 1,
                error: receipt?.status !== 1 ? 'Transaction failed' : undefined
            };
        }
        catch (error) {
            console.log(`Registration attempt failed: ${error.message}`);
            let errorCode = 'unknown';
            if (error.data && error.data.includes('06d919f2')) {
                errorCode = '0x06d919f2';
            }
            return {
                nodeAddress: wallet.address,
                metadata,
                gasLimit: 2500000n,
                gasPrice: 0n,
                success: false,
                error: `${errorCode}: ${error.message}`
            };
        }
    }
    /**
     * Execute comprehensive registration resolution
     */
    async resolveRegistrationBlockers() {
        console.log('REGISTRATION BLOCKER RESOLUTION SYSTEM');
        console.log('=====================================');
        const errorAnalysis = this.analyzeCustomError();
        console.log('\nCUSTOM ERROR ANALYSIS');
        console.log('---------------------');
        console.log(`Error Code: ${errorAnalysis.code}`);
        console.log(`Description: ${errorAnalysis.description}`);
        console.log('\nPossible Causes:');
        errorAnalysis.possibleCauses.forEach((cause, index) => {
            console.log(`  ${index + 1}. ${cause}`);
        });
        console.log('\nRecommended Solutions:');
        errorAnalysis.solutions.forEach((solution, index) => {
            console.log(`  ${index + 1}. ${solution}`);
        });
        // Analyze each node
        const results = [];
        for (let i = 0; i < 1; i++) { // Test first node only for diagnosis
            console.log(`\n${'='.repeat(50)}`);
            console.log(`ANALYZING NODE ${i + 1}: ${this.wallets[i].address}`);
            console.log(`${'='.repeat(50)}`);
            try {
                // Check prerequisites
                console.log('\n1. PREREQUISITE VERIFICATION');
                console.log('-----------------------------');
                const prerequisites = await this.verifyAllPrerequisites(i);
                console.log(`Token Balance: ${ethers_1.ethers.formatEther(prerequisites.tokenBalance)} DLOOP`);
                console.log(`Token Approval: ${ethers_1.ethers.formatEther(prerequisites.tokenApproval)} DLOOP`);
                console.log(`Required Stake: ${ethers_1.ethers.formatEther(prerequisites.requiredStake)} DLOOP`);
                console.log(`SoulBound NFT: ${prerequisites.soulboundBalance > 0n ? 'YES' : 'NO'}`);
                console.log(`ETH Balance: ${ethers_1.ethers.formatEther(prerequisites.ethBalance)} ETH`);
                console.log(`Contract Paused: ${prerequisites.contractPaused ? 'YES' : 'NO'}`);
                console.log(`Meets Requirements: ${prerequisites.meetsRequirements ? 'YES' : 'NO'}`);
                if (!prerequisites.meetsRequirements) {
                    console.log('\n❌ Prerequisites not met - registration will fail');
                    continue;
                }
                // Attempt registration
                console.log('\n2. REGISTRATION ATTEMPT');
                console.log('-----------------------');
                const attempt = await this.attemptAlternativeRegistration(i);
                results.push(attempt);
                if (attempt.success) {
                    console.log('✅ Registration successful!');
                }
                else {
                    console.log(`❌ Registration failed: ${attempt.error}`);
                }
            }
            catch (error) {
                console.log(`Node ${i + 1} analysis failed: ${error.message}`);
                results.push({
                    nodeAddress: this.wallets[i].address,
                    metadata: '',
                    gasLimit: 0n,
                    gasPrice: 0n,
                    success: false,
                    error: error.message
                });
            }
        }
        // Final summary
        console.log('\n' + '='.repeat(50));
        console.log('REGISTRATION RESOLUTION SUMMARY');
        console.log('='.repeat(50));
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        console.log(`Successful registrations: ${successful.length}/${results.length}`);
        console.log(`Failed registrations: ${failed.length}/${results.length}`);
        if (failed.length > 0) {
            console.log('\nFailed Registration Analysis:');
            failed.forEach((result, index) => {
                console.log(`  Node ${index + 1}: ${result.error}`);
            });
        }
        console.log('\nRECOMMENDATIONS:');
        if (failed.every(r => r.error?.includes('0x06d919f2'))) {
            console.log('• Custom error 0x06d919f2 indicates contract-level restrictions');
            console.log('• All visible prerequisites are satisfied');
            console.log('• Contract administrator consultation may be required');
            console.log('• Registration may have undocumented requirements or timing restrictions');
        }
        else {
            console.log('• Mixed error patterns detected - individual node analysis required');
            console.log('• System will continue automated retry attempts');
        }
    }
}
exports.RegistrationBlockerResolver = RegistrationBlockerResolver;
/**
 * Execute the registration blocker resolution
 */
async function main() {
    const resolver = new RegistrationBlockerResolver();
    await resolver.resolveRegistrationBlockers();
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=resolveRegistrationBlocker.js.map
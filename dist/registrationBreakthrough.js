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
exports.RegistrationBreakthrough = void 0;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
/**
 * Registration breakthrough system addressing the exact contract requirements
 * Based on analysis of successful DLOOP approvals and contract function signatures
 */
class RegistrationBreakthrough {
    constructor() {
        this.provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
        this.wallet = new ethers_1.ethers.Wallet(process.env.AI_NODE_1_PRIVATE_KEY, this.provider);
    }
    /**
     * Execute direct contract registration using the exact function signature
     */
    async executeDirectRegistration() {
        console.log('REGISTRATION BREAKTHROUGH SOLUTION');
        console.log('=================================');
        console.log(`Wallet Address: ${this.wallet.address}`);
        try {
            // Direct contract interaction using the exact function signature from ABI
            const registryAddress = '0x0045c7D99489f1d8A5900243956B0206344417DD';
            // Function signature: registerAINode(string,string,string,string)
            const functionSelector = '0x69c5f8e1';
            const endpoint = "https://d-loop.io/identity/identity.json";
            const name = "AI Governance Node ai-gov-01";
            const description = "Automated governance node using Conservative strategy";
            const nodeType = "governance";
            // Encode parameters manually to ensure correct format
            const abiCoder = new ethers_1.ethers.AbiCoder();
            const encodedParams = abiCoder.encode(['string', 'string', 'string', 'string'], [endpoint, name, description, nodeType]);
            const callData = functionSelector + encodedParams.slice(2);
            console.log('Function Call Data:', callData);
            console.log('Target Contract:', registryAddress);
            // Get current gas price and nonce
            const [gasPrice, nonce] = await Promise.all([
                this.provider.getFeeData(),
                this.provider.getTransactionCount(this.wallet.address)
            ]);
            // Prepare transaction
            const txRequest = {
                to: registryAddress,
                data: callData,
                gasLimit: 1500000n, // High gas limit
                maxFeePerGas: gasPrice.maxFeePerGas * 200n / 100n, // 100% buffer
                maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas * 150n / 100n, // 50% buffer
                nonce: nonce,
                type: 2 // EIP-1559 transaction
            };
            console.log('Transaction Request:', {
                to: txRequest.to,
                dataLength: txRequest.data.length,
                gasLimit: txRequest.gasLimit.toString(),
                maxFeePerGas: ethers_1.ethers.formatUnits(txRequest.maxFeePerGas, 'gwei') + ' gwei',
                nonce: txRequest.nonce
            });
            // Send transaction
            console.log('Sending registration transaction...');
            const tx = await this.wallet.sendTransaction(txRequest);
            console.log(`Transaction submitted: ${tx.hash}`);
            console.log('Waiting for confirmation...');
            // Wait for confirmation
            const receipt = await tx.wait(3);
            if (receipt && receipt.status === 1) {
                console.log('SUCCESS: Node registration completed!');
                console.log(`Block Number: ${receipt.blockNumber}`);
                console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
                // Verify registration
                await this.verifyRegistration();
            }
            else {
                console.log('FAILED: Transaction status is 0');
            }
        }
        catch (error) {
            console.log('Registration Error:', error.message);
            if (error.data) {
                console.log('Error Data:', error.data);
                // Check for specific error codes
                if (error.data.includes('06d919f2')) {
                    console.log('Identified: Custom error 0x06d919f2');
                    await this.analyzeCustomError();
                }
            }
            if (error.reason) {
                console.log('Error Reason:', error.reason);
            }
        }
    }
    /**
     * Verify successful registration
     */
    async verifyRegistration() {
        console.log('\nVerifying registration status...');
        try {
            const registryAbi = ['function getNodeInfo(address) view returns (tuple(address,string,string,string,string,bool,uint256,uint256))'];
            const contract = new ethers_1.ethers.Contract('0x0045c7D99489f1d8A5900243956B0206344417DD', registryAbi, this.provider);
            const nodeInfo = await contract.getNodeInfo(this.wallet.address);
            console.log('Node Info Retrieved:', nodeInfo);
            console.log('Registration Status: CONFIRMED');
        }
        catch (error) {
            if (error.message.includes('NodeNotRegistered')) {
                console.log('Registration Status: NOT REGISTERED (Expected if registration failed)');
            }
            else {
                console.log('Verification Error:', error.message);
            }
        }
    }
    /**
     * Analyze the custom error 0x06d919f2 to understand requirements
     */
    async analyzeCustomError() {
        console.log('\nAnalyzing Custom Error 0x06d919f2');
        console.log('================================');
        // Check token balances and approvals
        const dloopAbi = [
            'function balanceOf(address) view returns (uint256)',
            'function allowance(address,address) view returns (uint256)'
        ];
        const dloopContract = new ethers_1.ethers.Contract('0x05B366778566e93abfB8e4A9B794e4ad006446b4', dloopAbi, this.provider);
        try {
            const balance = await dloopContract.balanceOf(this.wallet.address);
            const allowance = await dloopContract.allowance(this.wallet.address, '0x0045c7D99489f1d8A5900243956B0206344417DD');
            console.log(`DLOOP Balance: ${ethers_1.ethers.formatEther(balance)}`);
            console.log(`DLOOP Allowance: ${ethers_1.ethers.formatEther(allowance)}`);
            if (balance < ethers_1.ethers.parseEther('2000')) {
                console.log('ISSUE: Insufficient DLOOP balance (requires 2000+)');
            }
            if (allowance < ethers_1.ethers.parseEther('1')) {
                console.log('ISSUE: Insufficient DLOOP allowance (requires 1+)');
            }
        }
        catch (error) {
            console.log('Token check error:', error.message);
        }
        // Possible causes of 0x06d919f2
        console.log('\nPossible Error Causes:');
        console.log('1. Contract has registration windows/timing restrictions');
        console.log('2. Requires administrator approval or whitelist');
        console.log('3. Missing prerequisite contract interactions');
        console.log('4. Gas estimation issues with complex operations');
        console.log('5. Contract state validation failing');
    }
    /**
     * Execute the breakthrough attempt
     */
    async execute() {
        await this.executeDirectRegistration();
    }
}
exports.RegistrationBreakthrough = RegistrationBreakthrough;
/**
 * Main execution
 */
async function main() {
    const breakthrough = new RegistrationBreakthrough();
    await breakthrough.execute();
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=registrationBreakthrough.js.map
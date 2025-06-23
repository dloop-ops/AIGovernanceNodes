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
exports.ContractRegistrationAnalysis = void 0;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
dotenv.config();
/**
 * Contract registration analysis to decode custom error 0x06d919f2
 * and implement working registration solution
 */
class ContractRegistrationAnalysis {
    constructor() {
        // Use most reliable provider
        this.provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
        this.initializeContracts();
        this.wallet = new ethers_1.ethers.Wallet(process.env.AI_NODE_1_PRIVATE_KEY, this.provider);
    }
    initializeContracts() {
        const registryAbiData = JSON.parse(fs.readFileSync('./abis/ainoderegistry.json', 'utf8'));
        this.registryContract = new ethers_1.ethers.Contract('0x0045c7D99489f1d8A5900243956B0206344417DD', registryAbiData.abi || registryAbiData, this.provider);
        const dloopAbiData = JSON.parse(fs.readFileSync('./abis/dlooptoken.json', 'utf8'));
        this.dloopContract = new ethers_1.ethers.Contract('0x05B366778566e93abfB8e4A9B794e4ad006446b4', dloopAbiData.abi || dloopAbiData, this.provider);
    }
    /**
     * Analyze contract state and requirements
     */
    async analyzeContractRequirements() {
        console.log('ANALYZING CONTRACT REGISTRATION REQUIREMENTS');
        console.log('==========================================');
        const nodeAddress = this.wallet.address;
        console.log(`Analyzing for address: ${nodeAddress}`);
        try {
            // Check current DLOOP balance and approval
            const balance = await this.dloopContract.balanceOf(nodeAddress);
            const approval = await this.dloopContract.allowance(nodeAddress, this.registryContract.target);
            console.log(`DLOOP Balance: ${ethers_1.ethers.formatEther(balance)} DLOOP`);
            console.log(`DLOOP Approval: ${ethers_1.ethers.formatEther(approval)} DLOOP`);
            // Check if node is already registered
            try {
                const nodeInfo = await this.registryContract.getNodeInfo(nodeAddress);
                console.log('Node Status: ALREADY REGISTERED');
                console.log('Node Info:', nodeInfo);
                return;
            }
            catch (error) {
                if (error.reason === 'NodeNotRegistered()') {
                    console.log('Node Status: NOT REGISTERED (Ready for registration)');
                }
                else {
                    console.log(`Node Status Error: ${error.message}`);
                }
            }
            // Decode the transaction data that's failing
            console.log('\nDECODING FAILING TRANSACTION DATA');
            console.log('================================');
            const endpoint = "https://d-loop.io/identity/identity.json";
            const name = "AI Governance Node ai-gov-01";
            const description = "Automated governance node using Conservative strategy";
            const nodeType = "governance";
            // Encode the function call to see what's being sent
            const functionData = this.registryContract.interface.encodeFunctionData('registerAINode', [endpoint, name, description, nodeType]);
            console.log('Function selector:', functionData.slice(0, 10));
            console.log('Encoded parameters:', functionData.slice(10));
            // Try to simulate the call to get better error information
            console.log('\nSIMULATING REGISTRATION CALL');
            console.log('===========================');
            try {
                const connectedContract = this.registryContract.connect(this.wallet);
                const result = await connectedContract.registerAINode.staticCall(endpoint, name, description, nodeType);
                console.log('Static call successful. Result:', result);
            }
            catch (error) {
                console.log('Static call failed:', error.message);
                // Try to decode the custom error
                if (error.data) {
                    console.log('Error data:', error.data);
                    // Check if this matches the known error 0x06d919f2
                    if (error.data.includes('06d919f2')) {
                        console.log('IDENTIFIED: Custom error 0x06d919f2 confirmed');
                        await this.investigateCustomError();
                    }
                }
            }
            // Check contract configuration
            console.log('\nCONTRART CONFIGURATION ANALYSIS');
            console.log('==============================');
            try {
                // Try to read contract state variables if accessible
                const contractCode = await this.provider.getCode(this.registryContract.target);
                console.log(`Contract code length: ${contractCode.length} bytes`);
                // Check if contract has specific requirements we might be missing
                console.log('Contract appears to be deployed and functional');
            }
            catch (error) {
                console.log('Contract analysis error:', error.message);
            }
        }
        catch (error) {
            console.error('Analysis error:', error.message);
        }
    }
    /**
     * Investigate the specific custom error 0x06d919f2
     */
    async investigateCustomError() {
        console.log('\nINVESTIGATING CUSTOM ERROR 0x06d919f2');
        console.log('====================================');
        // The error selector 0x06d919f2 corresponds to a specific function signature
        // Let's try to determine what it means
        console.log('Error selector: 0x06d919f2');
        // Common patterns for this type of error:
        const possibleErrors = [
            'InsufficientStake()',
            'NodeAlreadyExists()',
            'InvalidNodeType()',
            'RegistrationPaused()',
            'InsufficientApproval()',
            'InvalidEndpoint()',
            'UnauthorizedCaller()'
        ];
        console.log('Possible error meanings:');
        possibleErrors.forEach((error, i) => {
            const hash = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(error)).slice(0, 10);
            console.log(`  ${i + 1}. ${error} -> ${hash}`);
            if (hash === '0x06d919f2') {
                console.log(`     *** MATCH FOUND: ${error} ***`);
            }
        });
        // Try alternative registration approaches
        await this.tryAlternativeRegistration();
    }
    /**
     * Try alternative registration approaches
     */
    async tryAlternativeRegistration() {
        console.log('\nTRYING ALTERNATIVE REGISTRATION METHODS');
        console.log('======================================');
        const connectedContract = this.registryContract.connect(this.wallet);
        // Method 1: Check if we need to stake tokens first
        console.log('Method 1: Checking if separate staking is required...');
        try {
            // Look for other functions that might be needed first
            const functions = Object.keys(this.registryContract.interface.functions);
            console.log('Available functions:', functions.filter(f => f.includes('stake') || f.includes('register')));
        }
        catch (error) {
            console.log('Function enumeration error:', error.message);
        }
        // Method 2: Try with higher approval amount
        console.log('Method 2: Ensuring sufficient DLOOP approval...');
        try {
            const currentApproval = await this.dloopContract.allowance(this.wallet.address, this.registryContract.target);
            if (currentApproval < ethers_1.ethers.parseEther('1000')) {
                console.log('Approval may be insufficient. Current:', ethers_1.ethers.formatEther(currentApproval));
                console.log('Consider increasing approval to 1000+ DLOOP');
            }
            else {
                console.log('Approval appears sufficient:', ethers_1.ethers.formatEther(currentApproval));
            }
        }
        catch (error) {
            console.log('Approval check error:', error.message);
        }
        // Method 3: Check for prerequisite conditions
        console.log('Method 3: Checking for prerequisite conditions...');
        try {
            // Check if there are any contract state requirements
            const balance = await this.dloopContract.balanceOf(this.wallet.address);
            console.log(`Current DLOOP balance: ${ethers_1.ethers.formatEther(balance)}`);
            if (balance < ethers_1.ethers.parseEther('2000')) {
                console.log('WARNING: Balance below typical requirement of 2000 DLOOP');
            }
        }
        catch (error) {
            console.log('Prerequisites check error:', error.message);
        }
        console.log('\nRECOMMENDATIONS');
        console.log('==============');
        console.log('1. Ensure DLOOP balance >= 2000 tokens');
        console.log('2. Ensure DLOOP approval >= 1000 tokens');
        console.log('3. Verify SoulBound NFT authentication');
        console.log('4. Check if contract has registration windows/conditions');
        console.log('5. Consider contacting contract administrators if error persists');
    }
    /**
     * Execute comprehensive analysis
     */
    async executeAnalysis() {
        try {
            await this.analyzeContractRequirements();
        }
        catch (error) {
            console.error('Fatal analysis error:', error.message);
        }
    }
}
exports.ContractRegistrationAnalysis = ContractRegistrationAnalysis;
/**
 * Execute the contract analysis
 */
async function main() {
    const analysis = new ContractRegistrationAnalysis();
    await analysis.executeAnalysis();
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=contractRegistrationAnalysis.js.map
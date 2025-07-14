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
const ethers_1 = require("ethers");
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const assetDaoAbi = require(path.join(process.cwd(), 'abis', 'assetdao.abi.v1.json')).abi;
const dloopTokenAbi = require(path.join(process.cwd(), 'abis', 'dlooptoken.abi.v1.json')).abi;
async function quickTest() {
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8');
    const assetDao = new ethers_1.ethers.Contract('0xa87e662061237a121Ca2E83E77dA8251bc4B3529', assetDaoAbi, provider);
    const dloopToken = new ethers_1.ethers.Contract('0x05B366778566e93abfB8e4A9B794e4ad006446b4', dloopTokenAbi, provider);
    console.log('📊 AssetDAO Analysis:');
    const proposalCount = await assetDao.getProposalCount();
    console.log('Total Proposals:', proposalCount.toString());
    console.log('\n👛 Node Token Balances:');
    const nodes = [
        '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
        '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
        '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
        '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
        '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
    ];
    for (let i = 0; i < nodes.length; i++) {
        try {
            const dloopBalance = await dloopToken.balanceOf(nodes[i]);
            console.log(`Node ${i + 1}: ${ethers_1.ethers.formatEther(dloopBalance)} DLOOP`);
        }
        catch (e) {
            console.log(`Node ${i + 1}: Error fetching balance - ${e.message}`);
        }
    }
}
quickTest().catch(console.error);

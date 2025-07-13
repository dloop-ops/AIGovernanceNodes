
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const assetDaoAbi = JSON.parse(readFileSync(join(process.cwd(), 'abis', 'assetdao.abi.v1.json'), 'utf8')).abi;
const dloopTokenAbi = JSON.parse(readFileSync(join(process.cwd(), 'abis', 'dlooptoken.abi.v1.json'), 'utf8')).abi;

async function quickTest() {
  const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8');
  const assetDao = new ethers.Contract('0xa87e662061237a121Ca2E83E77dA8251bc4B3529', assetDaoAbi, provider);
  const dloopToken = new ethers.Contract('0x05B366778566e93abfB8e4A9B794e4ad006446b4', dloopTokenAbi, provider);
  
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
      console.log(`Node ${i+1}: ${ethers.formatEther(dloopBalance)} DLOOP`);
    } catch (e) {
      console.log(`Node ${i+1}: Error fetching balance - ${e.message}`);
    }
  }
}

quickTest().catch(console.error);

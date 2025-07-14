
import { ethers } from 'ethers';

async function diagnoseProposals() {
  console.log('🔍 PROPOSAL DIAGNOSTIC SCRIPT');
  console.log('==============================');

  try {
    // Use multiple RPC providers with fallback
    const rpcProviders = [
      {
        url: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
        name: 'Primary RPC'
      },
      {
        url: 'https://ethereum-sepolia-rpc.publicnode.com',
        name: 'PublicNode'
      },
      {
        url: 'https://rpc.sepolia.org',
        name: 'Sepolia.org'
      },
      {
        url: 'https://sepolia.gateway.tenderly.co',
        name: 'Tenderly'
      }
    ];

    let provider = null;
    let providerName = '';

    // Try each provider until one works
    for (const rpc of rpcProviders) {
      try {
        console.log(`🔄 Trying ${rpc.name}...`);
        const testProvider = new ethers.JsonRpcProvider(rpc.url);
        
        // Test with a simple call
        await Promise.race([
          testProvider.getBlockNumber(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        provider = testProvider;
        providerName = rpc.name;
        console.log(`✅ Connected to ${rpc.name}`);
        break;
      } catch (error) {
        console.log(`❌ ${rpc.name} failed: ${error.message.substring(0, 50)}...`);
      }
    }

    if (!provider) {
      throw new Error('All RPC providers failed');
    }

    const assetDAOAddress = '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
    const assetDAOABI = [
      "function getProposalCount() external view returns (uint256)",
      "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
    ];

    const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);

    // Add much longer initial delay
    console.log('⏳ Waiting 5 seconds to avoid rate limiting...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get total proposal count with retry
    let totalCount = 0;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`📊 Getting proposal count (attempt ${attempt}/3)...`);
        const count = await Promise.race([
          contract.getProposalCount(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
        ]);
        totalCount = Number(count);
        console.log(`📊 Total proposals: ${totalCount}`);
        break;
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed: ${error.message.substring(0, 50)}...`);
        if (attempt < 3) {
          const delay = 5000 * attempt; // 5s, 10s, 15s
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (totalCount === 0) {
      console.log('❌ Could not get proposal count');
      return;
    }

    const currentTimeSec = Math.floor(Date.now() / 1000);
    let activeFound = 0;
    let expiredFound = 0;
    let errorCount = 0;

    // Check only last 10 proposals to reduce load
    const startFrom = Math.max(1, totalCount - 9);
    const endAt = Math.min(totalCount, startFrom + 9);

    console.log(`\n🔍 Analyzing proposals ${startFrom} to ${endAt} (${endAt - startFrom + 1} total):`);
    console.log('ID   | State | End Time           | Status      | Description');
    console.log('-----|-------|--------------------|-----------  |------------');

    for (let i = startFrom; i <= endAt; i++) {
      try {
        // Much longer delay between requests (5-10 seconds)
        const delay = 5000 + Math.random() * 5000; // 5-10 second random delay
        console.log(`⏳ Waiting ${Math.round(delay)}ms before fetching proposal ${i}...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Fetch proposal with multiple retries
        let proposalData = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            proposalData = await Promise.race([
              contract.getProposal(i),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ]);
            break;
          } catch (error) {
            console.log(`   ⚠️  Proposal ${i} attempt ${attempt} failed: ${error.message.substring(0, 30)}...`);
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
            }
          }
        }

        if (!proposalData) {
          console.log(`${String(i).padStart(4)} | ERROR | Could not fetch after 3 attempts`);
          errorCount++;
          continue;
        }

        // Validate proposal data structure
        if (!proposalData || proposalData.length < 12) {
          console.log(`${String(i).padStart(4)} | ERROR | Invalid data structure`);
          errorCount++;
          continue;
        }

        // Parse proposal data using correct field mapping
        const proposalId = proposalData[0];
        const proposalType = proposalData[1];
        const assetAddress = proposalData[2];
        const amount = proposalData[3];
        const description = proposalData[4];
        const proposer = proposalData[5];
        const createdAt = proposalData[6];
        const votingEnds = proposalData[7];
        const yesVotes = proposalData[8];
        const noVotes = proposalData[9];
        const status = proposalData[10];
        const executed = proposalData[11];

        const state = Number(status);
        const finalEndTime = Number(votingEnds);
        const timeLeft = finalEndTime - currentTimeSec;

        // Status determination
        let proposalStatus = 'UNKNOWN';
        if (proposer === '0x0000000000000000000000000000000000000000') {
          proposalStatus = 'INVALID';
        } else {
          switch (state) {
            case 0:
              proposalStatus = 'PENDING';
              break;
            case 1:
              if (timeLeft > 0) {
                const hoursLeft = Math.floor(timeLeft / 3600);
                const daysLeft = Math.floor(hoursLeft / 24);
                proposalStatus = daysLeft > 0 ? `ACTIVE (${daysLeft}d ${hoursLeft % 24}h left)` : `ACTIVE (${hoursLeft}h left)`;
                activeFound++;
              } else {
                const expiredHours = Math.floor(Math.abs(timeLeft) / 3600);
                const expiredDays = Math.floor(expiredHours / 24);
                proposalStatus = expiredDays > 0 ? `EXPIRED (${expiredDays}d ago)` : `EXPIRED (${expiredHours}h ago)`;
                expiredFound++;
              }
              break;
            case 2:
              proposalStatus = 'CANCELLED';
              break;
            case 3:
              proposalStatus = 'DEFEATED';
              break;
            case 4:
              proposalStatus = 'SUCCEEDED';
              break;
            case 5:
              proposalStatus = 'QUEUED';
              break;
            case 6:
              proposalStatus = 'EXPIRED';
              break;
            case 7:
              proposalStatus = 'EXECUTED';
              break;
            default:
              proposalStatus = `STATE_${state}`;
          }
        }

        const endTimeFormatted = new Date(finalEndTime * 1000).toISOString().slice(0, 19);
        const truncatedDescription = description.length > 40 ? description.slice(0, 40) + '...' : description;

        console.log(`${String(i).padStart(4)} | ${String(state).padStart(5)} | ${endTimeFormatted} | ${proposalStatus.padEnd(15)} | ${truncatedDescription}`);
        
        if (state === 1 && timeLeft > 0) {
          console.log(`     | ✅ ACTIVE PROPOSAL FOUND! Time left: ${timeLeft}s`);
        }

      } catch (error) {
        console.log(`${String(i).padStart(4)} | ERROR | ${error.message.substring(0, 50)}...`);
        errorCount++;
        
        // Add extra delay if we hit rate limits
        if (error.message.includes('Too Many Requests') || error.message.includes('429')) {
          console.log(`     | ⏸️  Rate limited, adding 10 second delay...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }

    console.log('\n📋 SUMMARY:');
    console.log(`   ✅ Active proposals found: ${activeFound}`);
    console.log(`   ⏰ Expired proposals found: ${expiredFound}`);
    console.log(`   ❌ Errors encountered: ${errorCount}`);
    console.log(`   📊 Total proposals analyzed: ${endAt - startFrom + 1}`);
    console.log(`   🔗 Provider used: ${providerName}`);
    console.log(`   🕐 Current timestamp: ${currentTimeSec} (${new Date().toISOString()})`);

    if (activeFound === 0 && expiredFound > 0) {
      console.log('\n🚨 ISSUE: All state=1 proposals are expired!');
      console.log('   This suggests timestamp conversion issues in the voting system.');
    } else if (activeFound > 0) {
      console.log('\n✅ SUCCESS: Found active proposals! The system is working correctly.');
    } else if (errorCount > 0) {
      console.log('\n⚠️  WARNING: Many errors encountered. Consider using a different RPC provider.');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

diagnoseProposals().then(() => {
  console.log('\n🔍 Diagnostic complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Diagnostic crashed:', error.message);
  process.exit(1);
});

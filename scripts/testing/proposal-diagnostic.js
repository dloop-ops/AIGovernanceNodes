
import { ethers } from 'ethers';

async function diagnoseProposals() {
  console.log('🔍 PROPOSAL DIAGNOSTIC SCRIPT');
  console.log('==============================');

  try {
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const assetDAOAddress = '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
    const assetDAOABI = [
      "function getProposalCount() external view returns (uint256)",
      "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
    ];

    const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);

    // Get total proposal count
    const totalCount = await contract.getProposalCount();
    console.log(`📊 Total proposals: ${totalCount}`);

    const currentTimeSec = Math.floor(Date.now() / 1000);
    let activeFound = 0;
    let expiredFound = 0;

    // Check last 20 proposals only to prevent EPIPE
    const startFrom = Math.max(1, Number(totalCount) - 19);

    console.log(`\n🔍 Analyzing proposals ${startFrom} to ${totalCount}:`);
    console.log('ID   | State | End Time           | Status      | Description');
    console.log('-----|-------|--------------------|-----------  |------------');

    for (let i = startFrom; i <= Number(totalCount); i++) {
      try {
        const proposalData = await contract.getProposal(i);

        // Enhanced debugging for timestamp issues - Fix field mapping based on ABI
        // According to assetdao.abi.v1.json, getProposal returns:
        // [id, proposalType, assetAddress, amount, description, proposer, createdAt, votingEnds, yesVotes, noVotes, status, executed]
        const proposalId = proposalData[0];
        const proposalType = proposalData[1];
        const assetAddress = proposalData[2];
        const amount = proposalData[3];
        const description = proposalData[4];
        const proposer = proposalData[5];
        const createdAt = proposalData[6];  // Correct field index for start time
        const votingEnds = proposalData[7]; // Correct field index for end time
        const yesVotes = proposalData[8];
        const noVotes = proposalData[9];
        const status = proposalData[10];     // Correct field index for state
        const executed = proposalData[11];

        const state = Number(status);
        let finalStartTime = Number(createdAt);
        let finalEndTime = Number(votingEnds);
        
        // Validate and convert timestamps properly
        if (finalStartTime === 0 || finalEndTime === 0) {
          console.log(`     | ⚠️  Zero timestamps detected - proposal may be in invalid state`);
          console.log(`     | 📊 Raw data: createdAt=${createdAt}, votingEnds=${votingEnds}`);
          
          // Try to use block timestamp or current time for invalid proposals
          if (finalStartTime === 0) {
            finalStartTime = currentTimeSec - 86400; // Assume created 24h ago
          }
          if (finalEndTime === 0) {
            finalEndTime = finalStartTime + 259200; // 72 hour voting period
          }
        }

        const timeLeft = finalEndTime - currentTimeSec;
        const proposer = proposalData[2];
        const description = proposalData[4] || `Proposal ${i}`;

        // Enhanced status determination with proper state mapping
        let status = 'UNKNOWN';
        if (proposer === '0x0000000000000000000000000000000000000000') {
          status = 'INVALID';
        } else {
          switch (state) {
            case 0:
              status = 'PENDING';
              break;
            case 1:
              if (timeLeft > 0) {
                const hoursLeft = Math.floor(timeLeft / 3600);
                const daysLeft = Math.floor(hoursLeft / 24);
                status = daysLeft > 0 ? `ACTIVE (${daysLeft}d ${hoursLeft % 24}h left)` : `ACTIVE (${hoursLeft}h left)`;
              } else {
                const expiredHours = Math.floor(Math.abs(timeLeft) / 3600);
                const expiredDays = Math.floor(expiredHours / 24);
                status = expiredDays > 0 ? `EXPIRED (${expiredDays}d ago)` : `EXPIRED (${expiredHours}h ago)`;
              }
              break;
            case 2:
              status = 'CANCELLED';
              break;
            case 3:
              status = 'DEFEATED';
              break;
            case 4:
              status = 'SUCCEEDED';
              break;
            case 5:
              status = 'QUEUED';
              break;
            case 6:
              status = 'EXPIRED';
              break;
            case 7:
              status = 'EXECUTED';
              break;
            default:
              status = `STATE_${state}`;
          }
        }

        const endTimeFormatted = new Date(finalEndTime * 1000).toISOString().slice(0, 19);

        // Protected console output to prevent EPIPE
        try {
          console.log(`${String(i).padStart(4)} | ${String(state).padStart(5)} | ${endTimeFormatted} | ${status.padEnd(15)} | ${description.slice(0, 40)}...`);
          console.log(`     | RAW: ${normalizedEndTime} | NORM: ${finalEndTime} | LEFT: ${timeLeft}s | CURRENT: ${currentTimeSec}`);
        } catch (writeError) {
          // If console write fails, break to prevent EPIPE crash
          break;
        }

        if (state === 1 && timeLeft > 0) {
          activeFound++;
          try {
            console.log(`     | ✅ TRULY ACTIVE PROPOSAL FOUND!`);
          } catch (writeError) {
            // Ignore write errors
          }
        } else if (state === 1 && timeLeft <= 0) {
          expiredFound++;
        }

        // Small delay to prevent overwhelming output
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        try {
          console.log(`${String(i).padStart(4)} | ERROR | ${error instanceof Error ? error.message.slice(0, 50) : 'Unknown error'}`);
        } catch (writeError) {
          break;
        }
      }
    }

    // Protected summary output
    try {
      console.log('\n📋 SUMMARY:');
      console.log(`   ✅ Active proposals found: ${activeFound}`);
      console.log(`   ⏰ Expired proposals found: ${expiredFound}`);
      console.log(`   📊 Total proposals analyzed: ${Number(totalCount) - startFrom + 1}`);
      console.log(`   🕐 Current timestamp: ${currentTimeSec} (${new Date().toISOString()})`);

      if (activeFound === 0 && expiredFound > 0) {
        console.log('\n🚨 CRITICAL ISSUE DETECTED: All state=1 proposals are flagged as expired!');
        console.log('   This confirms a timestamp conversion problem in the main governance logic.');
      } else if (activeFound > 0) {
        console.log('\n✅ SUCCESS: Found active proposals! The timestamp logic is working correctly.');
      }
    } catch (writeError) {
      // Silent exit if summary can't be written
    }

  } catch (error) {
    try {
      console.error('❌ Diagnostic failed:', error);
    } catch (writeError) {
      // Silent exit
    }
  }
}

diagnoseProposals().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(1);
});

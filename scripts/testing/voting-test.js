
import { ethers } from 'ethers';

async function testVotingCapability() {
  console.log('🗳️ VOTING CAPABILITY TEST');
  console.log('=========================');

  try {
    // Use the same RPC providers as diagnostic script
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
      }
    ];

    let provider = null;
    let providerName = '';

    // Find working provider
    for (const rpc of rpcProviders) {
      try {
        console.log(`🔄 Testing ${rpc.name}...`);
        const testProvider = new ethers.JsonRpcProvider(rpc.url);
        
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

    // Initialize wallets
    const wallets = [];
    for (let i = 1; i <= 5; i++) {
      const privateKey = process.env[`AI_NODE_${i}_PRIVATE_KEY`];
      if (privateKey) {
        let normalizedKey = privateKey.trim();
        if (!normalizedKey.startsWith('0x')) {
          normalizedKey = '0x' + normalizedKey;
        }
        const wallet = new ethers.Wallet(normalizedKey, provider);
        wallets.push({ index: i, wallet, address: wallet.address });
        console.log(`🤖 Node ${i}: ${wallet.address.slice(0, 10)}...`);
      }
    }

    if (wallets.length === 0) {
      throw new Error('No wallets found - check environment variables');
    }

    // Contract setup
    const assetDAOAddress = '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
    const assetDAOABI = [
      "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)",
      "function hasVoted(uint256 proposalId, address voter) external view returns (bool)",
      "function vote(uint256 proposalId, bool support) external"
    ];

    const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);

    // Test with the first active proposal found in diagnostic (proposal 121)
    const testProposalId = 121;
    
    console.log(`\n🎯 Testing voting on proposal ${testProposalId}...`);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check proposal details
    const proposalData = await Promise.race([
      contract.getProposal(testProposalId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
    ]);

    const proposalState = Number(proposalData[10]);
    const votingEnds = Number(proposalData[7]);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeLeft = votingEnds - currentTime;

    console.log(`📋 Proposal ${testProposalId} details:`);
    console.log(`   State: ${proposalState} (1=ACTIVE)`);
    console.log(`   Time left: ${Math.floor(timeLeft / 3600)}h ${Math.floor((timeLeft % 3600) / 60)}m`);
    console.log(`   Description: ${proposalData[4].substring(0, 50)}...`);

    if (proposalState !== 1 || timeLeft <= 0) {
      console.log(`❌ Proposal ${testProposalId} is not active for voting`);
      return;
    }

    console.log(`\n🗳️ Testing vote capability with each node:`);

    let votingResults = {
      alreadyVoted: 0,
      canVote: 0,
      errors: 0
    };

    // Test each wallet
    for (const walletInfo of wallets.slice(0, 3)) { // Test first 3 nodes only
      const { index, wallet, address } = walletInfo;
      
      try {
        console.log(`\n🤖 Testing Node ${index} (${address.slice(0, 10)}...):`);
        
        // Add delay between wallet checks
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Check if already voted
        const hasVoted = await Promise.race([
          contract.hasVoted(testProposalId, address),
          new Promise((_, reject) => setTimeout(() => reject(new Error('hasVoted timeout')), 5000))
        ]);

        if (hasVoted) {
          console.log(`   ✅ Already voted on proposal ${testProposalId}`);
          votingResults.alreadyVoted++;
          continue;
        }

        console.log(`   🎯 Can vote on proposal ${testProposalId}`);
        
        // Test vote transaction preparation (don't actually send)
        const contractWithSigner = contract.connect(wallet);
        
        // Estimate gas for voting
        try {
          const gasEstimate = await contractWithSigner.vote.estimateGas(testProposalId, true);
          console.log(`   ⛽ Estimated gas: ${gasEstimate.toString()}`);
          
          // Check ETH balance for gas
          const balance = await wallet.provider.getBalance(address);
          const balanceEth = ethers.formatEther(balance);
          console.log(`   💰 ETH balance: ${balanceEth}`);
          
          if (parseFloat(balanceEth) > 0.001) {
            console.log(`   ✅ Node ${index} CAN VOTE (sufficient gas + not voted)`);
            votingResults.canVote++;
          } else {
            console.log(`   ❌ Node ${index} insufficient ETH for gas`);
            votingResults.errors++;
          }
          
        } catch (gasError) {
          console.log(`   ❌ Gas estimation failed: ${gasError.message.substring(0, 50)}...`);
          votingResults.errors++;
        }

      } catch (error) {
        console.log(`   ❌ Error testing node ${index}: ${error.message.substring(0, 50)}...`);
        votingResults.errors++;
      }
    }

    console.log(`\n📊 VOTING TEST SUMMARY:`);
    console.log(`   🗳️  Already voted: ${votingResults.alreadyVoted} nodes`);
    console.log(`   ✅ Can vote: ${votingResults.canVote} nodes`);
    console.log(`   ❌ Errors: ${votingResults.errors} nodes`);
    console.log(`   🔗 Provider: ${providerName}`);

    if (votingResults.canVote > 0) {
      console.log(`\n🎉 SUCCESS: ${votingResults.canVote} nodes can vote on active proposals!`);
      console.log(`💡 The governance system is ready for voting.`);
    } else if (votingResults.alreadyVoted > 0) {
      console.log(`\n✅ ALREADY ACTIVE: All tested nodes have already voted.`);
      console.log(`💡 The governance system is working - nodes are voting automatically.`);
    } else {
      console.log(`\n⚠️  WARNING: No nodes can vote. Check balances and configuration.`);
    }

  } catch (error) {
    console.error('❌ Voting test failed:', error.message);
  }
}

// Run the test
testVotingCapability().then(() => {
  console.log('\n🔍 Voting test complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Voting test crashed:', error.message);
  process.exit(1);
});

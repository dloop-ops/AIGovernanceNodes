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
        const currentTime = Math.floor(Date.now() / 1000);
        let activeFound = 0;
        let expiredFound = 0;
        // Check last 50 proposals for comprehensive analysis
        const startFrom = Math.max(1, Number(totalCount) - 49);
        console.log(`\n🔍 Analyzing proposals ${startFrom} to ${totalCount}:`);
        console.log('ID   | State | End Time           | Status      | Description');
        console.log('-----|-------|--------------------|-----------  |------------');
        for (let i = startFrom; i <= Number(totalCount); i++) {
            try {
                const proposalData = await contract.getProposal(i);
                const proposer = proposalData[2];
                // Skip if invalid proposal
                if (proposer === '0x0000000000000000000000000000000000000000') {
                    console.log(`${i.toString().padStart(4)} | SKIP  | Invalid proposer   | INVALID     | N/A`);
                    continue;
                }
                const state = Number(proposalData[10]);
                const endTime = Number(proposalData[9]);
                const description = proposalData[4].substring(0, 30);
                const timeLeft = endTime - currentTime;
                let status;
                if (state === 1) {
                    if (timeLeft > 0) {
                        status = `ACTIVE (${Math.floor(timeLeft / 3600)}h left)`;
                        activeFound++;
                    }
                    else {
                        status = `EXPIRED (${Math.floor(-timeLeft / 3600)}h ago)`;
                        expiredFound++;
                    }
                }
                else {
                    const stateNames = ['PENDING', 'ACTIVE', 'CANCELED', 'DEFEATED', 'SUCCEEDED', 'QUEUED', 'EXPIRED', 'EXECUTED'];
                    status = stateNames[state] || `STATE_${state}`;
                    expiredFound++;
                }
                const endTimeStr = new Date(endTime * 1000).toLocaleString();
                console.log(`${i.toString().padStart(4)} | ${state}     | ${endTimeStr} | ${status.padEnd(11)} | ${description}...`);
            }
            catch (error) {
                console.log(`${i.toString().padStart(4)} | ERROR | ${error.message.substring(0, 50)}...`);
            }
        }
        console.log('\n📈 SUMMARY:');
        console.log(`✅ Active proposals found: ${activeFound}`);
        console.log(`⏰ Expired/Other proposals: ${expiredFound}`);
        if (activeFound === 0) {
            console.log('\n🚨 NO ACTIVE PROPOSALS FOUND!');
            console.log('This explains why the governance agent is not finding anything to vote on.');
            console.log('Consider creating new proposals or checking if there are newer proposals beyond the range checked.');
        }
    }
    catch (error) {
        console.error('❌ Diagnostic failed:', error);
    }
}
// Run if called directly (ES module way to check)
if (import.meta.url === `file://${process.argv[1]}`) {
    diagnoseProposals();
}
export { diagnoseProposals };
//# sourceMappingURL=proposal-diagnostic.js.map
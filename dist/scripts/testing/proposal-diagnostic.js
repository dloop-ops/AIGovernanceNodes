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
                // Enhanced debugging for timestamp issues
                const rawEndTime = proposalData[9];
                const rawStartTime = proposalData[8];
                const state = Number(proposalData[10]);
                let normalizedEndTime;
                let normalizedStartTime;
                // Handle BigInt conversion
                if (typeof rawEndTime === 'bigint') {
                    normalizedEndTime = Number(rawEndTime);
                }
                else {
                    normalizedEndTime = Number(rawEndTime);
                }
                if (typeof rawStartTime === 'bigint') {
                    normalizedStartTime = Number(rawStartTime);
                }
                else {
                    normalizedStartTime = Number(rawStartTime);
                }
                // FIXED: Better timestamp format detection
                const currentTimeMs = Date.now();
                const currentTimeSec = Math.floor(currentTimeMs / 1000);
                // Use year 2030 as conservative threshold for milliseconds detection
                const year2030InSeconds = 1893456000;
                const endIsMs = normalizedEndTime > year2030InSeconds;
                const startIsMs = normalizedStartTime > year2030InSeconds;
                const finalEndTime = endIsMs ? Math.floor(normalizedEndTime / 1000) : normalizedEndTime;
                const finalStartTime = startIsMs ? Math.floor(normalizedStartTime / 1000) : normalizedStartTime;
                const timeLeft = finalEndTime - currentTimeSec;
                const proposer = proposalData[2];
                const description = proposalData[4] || `Proposal ${i}`;
                // Status determination
                let status = 'UNKNOWN';
                if (proposer === '0x0000000000000000000000000000000000000000') {
                    status = 'INVALID';
                }
                else if (state === 1 && timeLeft > 0) {
                    status = `ACTIVE (${Math.floor(timeLeft / 3600)}h left)`;
                }
                else if (state === 1 && timeLeft <= 0) {
                    const expiredHours = Math.floor(Math.abs(timeLeft) / 3600);
                    status = `EXPIRED (${expiredHours}h ago)`;
                }
                else {
                    status = `STATE_${state}`;
                }
                const endTimeFormatted = new Date(finalEndTime * 1000).toISOString().slice(0, 19);
                console.log(`${String(i).padStart(4)} | ${String(state).padStart(5)} | ${endTimeFormatted} | ${status.padEnd(15)} | ${description.slice(0, 40)}...`);
                console.log(`     | RAW: ${normalizedEndTime} | NORM: ${finalEndTime} | LEFT: ${timeLeft}s`);
                if (state === 1 && timeLeft > 0) {
                    activeFound++;
                }
                else if (state === 1 && timeLeft <= 0) {
                    expiredFound++;
                }
            }
            catch (error) {
                console.log(`${String(i).padStart(4)} | ERROR | ${error instanceof Error ? error.message.slice(0, 50) : 'Unknown error'}`);
            }
        }
        console.log('\n📋 SUMMARY:');
        console.log(`   ✅ Active proposals found: ${activeFound}`);
        console.log(`   ⏰ Expired proposals found: ${expiredFound}`);
        console.log(`   📊 Total proposals analyzed: ${Number(totalCount) - startFrom + 1}`);
        if (activeFound === 0 && expiredFound > 0) {
            console.log('\n🚨 ISSUE DETECTED: All state=1 proposals are expired!');
            console.log('   This suggests a timestamp conversion problem.');
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
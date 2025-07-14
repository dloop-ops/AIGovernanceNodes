"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnoseProposals = diagnoseProposals;
const ethers_1 = require("ethers");
async function diagnoseProposals() {
    console.log('🔍 PROPOSAL DIAGNOSTIC SCRIPT');
    console.log('==============================');
    try {
        const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8';
        const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const assetDAOAddress = '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
        const assetDAOABI = [
            "function getProposalCount() external view returns (uint256)",
            "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)",
            "function proposals(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
        ];
        const contract = new ethers_1.ethers.Contract(assetDAOAddress, assetDAOABI, provider);
        const totalCount = await contract.getProposalCount();
        console.log(`📊 Total proposals: ${totalCount}`);
        const currentTime = Math.floor(Date.now() / 1000);
        let activeFound = 0;
        let expiredFound = 0;
        const startFrom = Math.max(1, Number(totalCount) - 19);
        console.log(`\n🔍 Analyzing proposals ${startFrom} to ${totalCount}:`);
        console.log('ID   | State | End Time           | Status      | Description');
        console.log('-----|-------|--------------------|-----------  |------------');
        for (let i = startFrom; i <= Number(totalCount); i++) {
            try {
                console.log(`🔍 Testing proposal ${i} with both methods...`);
                let proposalData;
                try {
                    proposalData = await contract.proposals(i);
                    console.log(`✅ proposals(${i}) successful`);
                }
                catch (mappingError) {
                    console.log(`❌ proposals(${i}) failed, trying getProposal...`);
                    try {
                        proposalData = await contract.getProposal(i);
                        console.log(`✅ getProposal(${i}) successful`);
                    }
                    catch (getError) {
                        console.log(`❌ Both methods failed for proposal ${i}`);
                        continue;
                    }
                }
                const proposalId = Number(proposalData[0]);
                const proposalType = Number(proposalData[1]);
                const proposer = proposalData[2];
                const amount = proposalData[3];
                const description = proposalData[4] || `Proposal ${i}`;
                const assetAddress = proposalData[5];
                const forVotes = proposalData[6];
                const againstVotes = proposalData[7];
                const startTime = Number(proposalData[8]);
                const endTime = Number(proposalData[9]);
                const state = Number(proposalData[10]);
                const executed = Boolean(proposalData[11]);
                let finalEndTime = endTime;
                if (endTime > currentTime * 1000) {
                    finalEndTime = Math.floor(endTime / 1000);
                    console.log(`📅 Converted ${i} endTime from ms: ${endTime} -> ${finalEndTime}`);
                }
                if (finalEndTime === 0 || finalEndTime < 1000000000) {
                    console.log(`🔍 Searching for valid timestamps in proposal ${i}...`);
                    for (let idx = 0; idx < proposalData.length; idx++) {
                        const value = Number(proposalData[idx]);
                        if (value === 0 || value < 1000000000)
                            continue;
                        const asSeconds = value > currentTime * 1000 ? Math.floor(value / 1000) : value;
                        const oneYearFromNow = currentTime + (365 * 24 * 60 * 60);
                        if (asSeconds > currentTime && asSeconds < oneYearFromNow) {
                            finalEndTime = asSeconds;
                            console.log(`📅 Found valid endTime at index ${idx}: ${finalEndTime}`);
                            break;
                        }
                    }
                }
                const timeLeft = finalEndTime - currentTime;
                let status = 'UNKNOWN';
                if (proposer === '0x0000000000000000000000000000000000000000') {
                    status = 'INVALID';
                }
                else {
                    switch (state) {
                        case 0:
                            status = 'PENDING';
                            break;
                        case 1:
                            if (finalEndTime === 0) {
                                status = 'ACTIVE (no end time)';
                            }
                            else if (timeLeft > 0) {
                                const hoursLeft = Math.floor(timeLeft / 3600);
                                const daysLeft = Math.floor(hoursLeft / 24);
                                status = daysLeft > 0 ? `ACTIVE (${daysLeft}d ${hoursLeft % 24}h left)` : `ACTIVE (${hoursLeft}h left)`;
                            }
                            else {
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
                const endTimeFormatted = finalEndTime === 0 ?
                    '1970-01-01T00:00:00' :
                    new Date(finalEndTime * 1000).toISOString().slice(0, 19);
                try {
                    console.log(`${String(i).padStart(4)} | ${String(state).padStart(5)} | ${endTimeFormatted} | ${status.padEnd(15)} | ${description.slice(0, 40)}...`);
                    console.log(`     | RAW: ${endTime} | NORM: ${finalEndTime} | LEFT: ${timeLeft}s | CURRENT: ${currentTime}`);
                }
                catch (writeError) {
                    break;
                }
                if (state === 1 && timeLeft > 0) {
                    activeFound++;
                }
                else if (state === 1 && timeLeft <= 0) {
                    expiredFound++;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
                try {
                    console.log(`${String(i).padStart(4)} | ERROR | ${error instanceof Error ? error.message.slice(0, 50) : 'Unknown error'}`);
                }
                catch (writeError) {
                    break;
                }
            }
        }
        try {
            console.log('\n📋 SUMMARY:');
            console.log(`   ✅ Active proposals found: ${activeFound}`);
            console.log(`   ⏰ Expired proposals found: ${expiredFound}`);
            console.log(`   📊 Total proposals analyzed: ${Number(totalCount) - startFrom + 1}`);
            if (activeFound === 0 && expiredFound > 0) {
                console.log('\n🚨 ISSUE DETECTED: All state=1 proposals are expired!');
                console.log('   This suggests a timestamp conversion problem.');
            }
            else if (activeFound > 0) {
                console.log('\n✅ SUCCESS: Found active proposals!');
            }
        }
        catch (writeError) {
        }
    }
    catch (error) {
        try {
            console.error('❌ Diagnostic failed:', error);
        }
        catch (writeError) {
        }
    }
}
if (require.main === module) {
    diagnoseProposals().then(() => {
        process.exit(0);
    }).catch(() => {
        process.exit(1);
    });
}
//# sourceMappingURL=proposal-diagnostic.js.map
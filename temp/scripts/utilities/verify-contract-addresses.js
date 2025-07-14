#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const logger_1 = require("../../src/utils/logger");
const dotenv = require("dotenv");
dotenv.config();
async function verifyContractAddresses() {
    logger_1.governanceLogger.info('🔍 Verifying contract addresses and deployment info');
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.INFURA_SEPOLIA_URL);
        const contracts = {
            'AI Node Registry': '0x0045c7D99489f1d8A5900243956B0206344417DD',
            'Asset DAO': '0xa87e662061237a121Ca2E83E77dA8251bc4B3529',
            'Admin Wallet': '0x3639D1F746A977775522221f53D0B1eA5749b8b9'
        };
        logger_1.governanceLogger.info('📊 CONTRACT VERIFICATION REPORT');
        logger_1.governanceLogger.info('=' + '='.repeat(50));
        for (const [name, address] of Object.entries(contracts)) {
            logger_1.governanceLogger.info(`\n🔍 Analyzing: ${name}`);
            logger_1.governanceLogger.info(`   Address: ${address}`);
            try {
                // 1. Check if contract exists
                const code = await provider.getCode(address);
                const isContract = code !== '0x';
                logger_1.governanceLogger.info(`   Is Contract: ${isContract}`);
                if (isContract) {
                    logger_1.governanceLogger.info(`   Bytecode Length: ${code.length} bytes`);
                    // 2. Get deployment transaction (creation info)
                    try {
                        // For contracts, we can't easily get creation tx without an archive node
                        // But we can check recent transaction activity
                        logger_1.governanceLogger.info(`   📈 Checking recent activity...`);
                        // Check current block for reference
                        const currentBlock = await provider.getBlockNumber();
                        logger_1.governanceLogger.info(`   Current Block: #${currentBlock}`);
                        // Try to get some transaction history (last 1000 blocks)
                        const fromBlock = Math.max(0, currentBlock - 1000);
                        logger_1.governanceLogger.info(`   Checking blocks ${fromBlock} to ${currentBlock}...`);
                        // Look for any events or transactions to this address
                        let transactionCount = 0;
                        for (let i = currentBlock; i > fromBlock && transactionCount < 10; i--) {
                            try {
                                const block = await provider.getBlock(i, true);
                                if (block && block.transactions) {
                                    for (const tx of block.transactions) {
                                        if (typeof tx === 'object' && tx !== null && tx && 'to' in tx && 'from' in tx) {
                                            const transaction = tx;
                                            if (transaction.to === address || transaction.from === address) {
                                                transactionCount++;
                                                logger_1.governanceLogger.info(`   📤 Recent TX: ${transaction.hash} at block #${i}`);
                                                logger_1.governanceLogger.info(`     From: ${transaction.from} To: ${transaction.to}`);
                                                logger_1.governanceLogger.info(`     Value: ${ethers_1.ethers.formatEther(transaction.value || 0)} ETH`);
                                                if (transactionCount >= 5)
                                                    break;
                                            }
                                        }
                                    }
                                }
                            }
                            catch (blockError) {
                                // Skip blocks that error
                            }
                        }
                        if (transactionCount === 0) {
                            logger_1.governanceLogger.info(`   ⚠️  No recent transactions found in last 1000 blocks`);
                        }
                    }
                    catch (historyError) {
                        logger_1.governanceLogger.info(`   ⚠️  Could not retrieve transaction history`);
                    }
                    // 3. Test basic contract calls
                    logger_1.governanceLogger.info(`   🧪 Testing basic contract calls...`);
                    const basicAbi = [
                        'function owner() view returns (address)',
                        'function name() view returns (string)',
                        'function symbol() view returns (string)',
                        'function totalSupply() view returns (uint256)',
                        'function paused() view returns (bool)',
                        'function implementation() view returns (address)' // For proxy contracts
                    ];
                    const contract = new ethers_1.ethers.Contract(address, basicAbi, provider);
                    // Test each function
                    const testFunctions = ['owner', 'name', 'symbol', 'totalSupply', 'paused', 'implementation'];
                    for (const funcName of testFunctions) {
                        try {
                            const result = await contract[funcName]();
                            logger_1.governanceLogger.info(`   ✅ ${funcName}(): ${result}`);
                        }
                        catch (funcError) {
                            if (!funcError.message.includes('function not found')) {
                                logger_1.governanceLogger.info(`   ⚠️  ${funcName}(): Error - ${funcError.message.slice(0, 50)}`);
                            }
                        }
                    }
                }
                else {
                    // For EOA accounts, check balance and nonce
                    const balance = await provider.getBalance(address);
                    const nonce = await provider.getTransactionCount(address);
                    logger_1.governanceLogger.info(`   ETH Balance: ${ethers_1.ethers.formatEther(balance)}`);
                    logger_1.governanceLogger.info(`   Nonce: ${nonce}`);
                }
            }
            catch (error) {
                logger_1.governanceLogger.error(`   ❌ Error analyzing ${name}: ${error.message}`);
            }
        }
        // 4. Cross-reference with known D-Loop contracts
        logger_1.governanceLogger.info('\n🔗 CROSS-REFERENCING WITH D-LOOP ECOSYSTEM:');
        logger_1.governanceLogger.info('=' + '='.repeat(50));
        // Check if DAO contract knows about the registry
        logger_1.governanceLogger.info('\n🏛️  Checking DAO -> Registry relationship...');
        try {
            const daoAddress = '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
            const registryAddress = '0x0045c7D99489f1d8A5900243956B0206344417DD';
            const daoAbi = [
                'function nodeRegistry() view returns (address)',
                'function registryContract() view returns (address)',
                'function getNodeRegistry() view returns (address)',
                'function aiNodeRegistry() view returns (address)'
            ];
            const daoContract = new ethers_1.ethers.Contract(daoAddress, daoAbi, provider);
            const registryFunctions = ['nodeRegistry', 'registryContract', 'getNodeRegistry', 'aiNodeRegistry'];
            for (const funcName of registryFunctions) {
                try {
                    const result = await daoContract[funcName]();
                    logger_1.governanceLogger.info(`   DAO.${funcName}(): ${result}`);
                    if (result.toLowerCase() === registryAddress.toLowerCase()) {
                        logger_1.governanceLogger.info(`   ✅ DAO confirms registry address!`);
                    }
                    else {
                        logger_1.governanceLogger.info(`   ⚠️  DAO points to different registry: ${result}`);
                    }
                }
                catch (error) {
                    // Function doesn't exist
                }
            }
        }
        catch (daoError) {
            logger_1.governanceLogger.info('   ⚠️  Could not verify DAO -> Registry relationship');
        }
        // 5. Check if admin wallet has made any successful calls
        logger_1.governanceLogger.info('\n👤 ADMIN WALLET TRANSACTION ANALYSIS:');
        const adminAddress = '0x3639D1F746A977775522221f53D0B1eA5749b8b9';
        try {
            const adminBalance = await provider.getBalance(adminAddress);
            const adminNonce = await provider.getTransactionCount(adminAddress);
            logger_1.governanceLogger.info(`   Admin ETH Balance: ${ethers_1.ethers.formatEther(adminBalance)}`);
            logger_1.governanceLogger.info(`   Admin Transaction Count: ${adminNonce}`);
            if (adminNonce > 0) {
                logger_1.governanceLogger.info(`   ✅ Admin has sent ${adminNonce} transactions`);
                logger_1.governanceLogger.info(`   💡 This confirms the admin wallet is active`);
            }
            else {
                logger_1.governanceLogger.info(`   ⚠️  Admin wallet has never sent a transaction`);
            }
        }
        catch (adminError) {
            logger_1.governanceLogger.info('   ❌ Could not analyze admin wallet');
        }
        // 6. Recommendations based on findings
        logger_1.governanceLogger.info('\n💡 RECOMMENDATIONS:');
        logger_1.governanceLogger.info('=' + '='.repeat(50));
        logger_1.governanceLogger.info('Based on the analysis:');
        logger_1.governanceLogger.info('1. If contracts show recent activity → Address is correct');
        logger_1.governanceLogger.info('2. If DAO confirms registry → Addresses are valid');
        logger_1.governanceLogger.info('3. If admin has transaction history → Wallet is functional');
        logger_1.governanceLogger.info('4. If all basic calls fail → Contract might need initialization');
        logger_1.governanceLogger.info('5. Consider checking Sepolia block explorer for deployment details');
    }
    catch (error) {
        logger_1.governanceLogger.error('Contract address verification failed', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}
if (require.main === module) {
    verifyContractAddresses()
        .then(() => {
        logger_1.governanceLogger.info('🎯 Contract address verification completed');
        process.exit(0);
    })
        .catch((error) => {
        logger_1.governanceLogger.error('Verification failed', { error });
        process.exit(1);
    });
}

#!/usr/bin/env tsx
import { ethers } from 'ethers';
import { governanceLogger as logger } from '../../src/utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyContractAddresses(): Promise<void> {
  logger.info('🔍 Verifying contract addresses and deployment info');
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.INFURA_SEPOLIA_URL);
    
    const contracts = {
      'AI Node Registry': '0x0045c7D99489f1d8A5900243956B0206344417DD',
      'Asset DAO': '0xa87e662061237a121Ca2E83E77dA8251bc4B3529',
      'Admin Wallet': '0x3639D1F746A977775522221f53D0B1eA5749b8b9'
    };

    logger.info('📊 CONTRACT VERIFICATION REPORT');
    logger.info('=' + '='.repeat(50));

    for (const [name, address] of Object.entries(contracts)) {
      logger.info(`\n🔍 Analyzing: ${name}`);
      logger.info(`   Address: ${address}`);

      try {
        // 1. Check if contract exists
        const code = await provider.getCode(address);
        const isContract = code !== '0x';
        logger.info(`   Is Contract: ${isContract}`);
        
        if (isContract) {
          logger.info(`   Bytecode Length: ${code.length} bytes`);
          
          // 2. Get deployment transaction (creation info)
          try {
            // For contracts, we can't easily get creation tx without an archive node
            // But we can check recent transaction activity
            logger.info(`   📈 Checking recent activity...`);
            
            // Check current block for reference
            const currentBlock = await provider.getBlockNumber();
            logger.info(`   Current Block: #${currentBlock}`);
            
            // Try to get some transaction history (last 1000 blocks)
            const fromBlock = Math.max(0, currentBlock - 1000);
            logger.info(`   Checking blocks ${fromBlock} to ${currentBlock}...`);
            
                         // Look for any events or transactions to this address
             let transactionCount = 0;
             for (let i = currentBlock; i > fromBlock && transactionCount < 10; i--) {
               try {
                 const block = await provider.getBlock(i, true);
                 if (block && block.transactions) {
                   for (const tx of block.transactions) {
                     if (typeof tx === 'object' && tx !== null && tx && 'to' in tx && 'from' in tx) {
                       const transaction = tx as ethers.TransactionResponse;
                       if (transaction.to === address || transaction.from === address) {
                         transactionCount++;
                         logger.info(`   📤 Recent TX: ${transaction.hash} at block #${i}`);
                         logger.info(`     From: ${transaction.from} To: ${transaction.to}`);
                         logger.info(`     Value: ${ethers.formatEther(transaction.value || 0)} ETH`);
                         
                         if (transactionCount >= 5) break;
                       }
                     }
                   }
                 }
               } catch (blockError) {
                 // Skip blocks that error
               }
             }
            
            if (transactionCount === 0) {
              logger.info(`   ⚠️  No recent transactions found in last 1000 blocks`);
            }
            
          } catch (historyError) {
            logger.info(`   ⚠️  Could not retrieve transaction history`);
          }
          
          // 3. Test basic contract calls
          logger.info(`   🧪 Testing basic contract calls...`);
          
          const basicAbi = [
            'function owner() view returns (address)',
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function totalSupply() view returns (uint256)',
            'function paused() view returns (bool)',
            'function implementation() view returns (address)'  // For proxy contracts
          ];
          
          const contract = new ethers.Contract(address, basicAbi, provider);
          
          // Test each function
          const testFunctions = ['owner', 'name', 'symbol', 'totalSupply', 'paused', 'implementation'];
          
          for (const funcName of testFunctions) {
            try {
              const result = await contract[funcName]();
              logger.info(`   ✅ ${funcName}(): ${result}`);
            } catch (funcError: any) {
              if (!funcError.message.includes('function not found')) {
                logger.info(`   ⚠️  ${funcName}(): Error - ${funcError.message.slice(0, 50)}`);
              }
            }
          }
          
        } else {
          // For EOA accounts, check balance and nonce
          const balance = await provider.getBalance(address);
          const nonce = await provider.getTransactionCount(address);
          logger.info(`   ETH Balance: ${ethers.formatEther(balance)}`);
          logger.info(`   Nonce: ${nonce}`);
        }
        
      } catch (error: any) {
        logger.error(`   ❌ Error analyzing ${name}: ${error.message}`);
      }
    }

    // 4. Cross-reference with known D-Loop contracts
    logger.info('\n🔗 CROSS-REFERENCING WITH D-LOOP ECOSYSTEM:');
    logger.info('=' + '='.repeat(50));
    
    // Check if DAO contract knows about the registry
    logger.info('\n🏛️  Checking DAO -> Registry relationship...');
    try {
      const daoAddress = '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
      const registryAddress = '0x0045c7D99489f1d8A5900243956B0206344417DD';
      
      const daoAbi = [
        'function nodeRegistry() view returns (address)',
        'function registryContract() view returns (address)',
        'function getNodeRegistry() view returns (address)',
        'function aiNodeRegistry() view returns (address)'
      ];
      
      const daoContract = new ethers.Contract(daoAddress, daoAbi, provider);
      
      const registryFunctions = ['nodeRegistry', 'registryContract', 'getNodeRegistry', 'aiNodeRegistry'];
      
      for (const funcName of registryFunctions) {
        try {
          const result = await daoContract[funcName]();
          logger.info(`   DAO.${funcName}(): ${result}`);
          
          if (result.toLowerCase() === registryAddress.toLowerCase()) {
            logger.info(`   ✅ DAO confirms registry address!`);
          } else {
            logger.info(`   ⚠️  DAO points to different registry: ${result}`);
          }
        } catch (error) {
          // Function doesn't exist
        }
      }
      
    } catch (daoError) {
      logger.info('   ⚠️  Could not verify DAO -> Registry relationship');
    }

    // 5. Check if admin wallet has made any successful calls
    logger.info('\n👤 ADMIN WALLET TRANSACTION ANALYSIS:');
    const adminAddress = '0x3639D1F746A977775522221f53D0B1eA5749b8b9';
    
    try {
      const adminBalance = await provider.getBalance(adminAddress);
      const adminNonce = await provider.getTransactionCount(adminAddress);
      
      logger.info(`   Admin ETH Balance: ${ethers.formatEther(adminBalance)}`);
      logger.info(`   Admin Transaction Count: ${adminNonce}`);
      
      if (adminNonce > 0) {
        logger.info(`   ✅ Admin has sent ${adminNonce} transactions`);
        logger.info(`   💡 This confirms the admin wallet is active`);
      } else {
        logger.info(`   ⚠️  Admin wallet has never sent a transaction`);
      }
      
    } catch (adminError) {
      logger.info('   ❌ Could not analyze admin wallet');
    }

    // 6. Recommendations based on findings
    logger.info('\n💡 RECOMMENDATIONS:');
    logger.info('=' + '='.repeat(50));
    logger.info('Based on the analysis:');
    
    logger.info('1. If contracts show recent activity → Address is correct');
    logger.info('2. If DAO confirms registry → Addresses are valid');
    logger.info('3. If admin has transaction history → Wallet is functional');
    logger.info('4. If all basic calls fail → Contract might need initialization');
    logger.info('5. Consider checking Sepolia block explorer for deployment details');

  } catch (error) {
    logger.error('Contract address verification failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

if (require.main === module) {
  verifyContractAddresses()
    .then(() => {
      logger.info('🎯 Contract address verification completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Verification failed', { error });
      process.exit(1);
    });
} 
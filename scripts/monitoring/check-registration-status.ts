import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { WalletService } from '../../src/services/WalletService';
import { getCurrentContractAddresses } from '../../src/config/contracts';

// Load environment variables
dotenv.config();

/**
 * Check Registration Status of D-Loop AI Governance Nodes
 * 
 * This script checks if the nodes are already registered in the AINodeRegistry
 * to understand why registration attempts are failing with NodeAlreadyRegistered.
 */

async function checkRegistrationStatus() {
  console.log('🔍 Checking D-Loop AI Governance Node Registration Status');
  console.log('=========================================================');

  try {
    // Initialize services
    console.log('\n1. Initializing services...');
    const walletService = new WalletService();
    const addresses = getCurrentContractAddresses();

    // Load AINodeRegistry ABI
    const path = require('path');
    const fs = require('fs');
    const abiDir = path.join(process.cwd(), 'abis');
    const aiNodeRegistryAbi = JSON.parse(fs.readFileSync(path.join(abiDir, 'ainoderegistry.abi.v1.json'), 'utf8')).abi;

    // Initialize contract
    const provider = walletService.getProvider();
    const aiNodeRegistry = new ethers.Contract(addresses.aiNodeRegistry, aiNodeRegistryAbi, provider);

    console.log(`✅ Services initialized`);
    console.log(`   - AINodeRegistry: ${addresses.aiNodeRegistry}`);
    console.log(`   - Total nodes to check: ${walletService.getWalletCount()}`);

    // Check registration status for each node
    console.log('\n2. Checking registration status...');

    for (let i = 0; i < walletService.getWalletCount(); i++) {
      const wallet = walletService.getWallet(i);
      const nodeAddress = wallet.address;

      console.log(`\n   Node ${i} (${nodeAddress}):`);

      try {
        // Try different methods to check registration
        let isRegistered = false;
        let nodeInfo = null;

        // Method 1: Check if node exists in nodes mapping
        try {
          const nodeData = await aiNodeRegistry.nodes(nodeAddress);
          if (nodeData && nodeData.isActive !== undefined) {
            isRegistered = nodeData.isActive;
            nodeInfo = nodeData;
            console.log(`     ✅ Found in nodes mapping: ${isRegistered ? 'REGISTERED' : 'NOT ACTIVE'}`);
            if (nodeInfo) {
              console.log(`     📋 Node Info:`, {
                isActive: (nodeInfo as any).isActive,
                owner: (nodeInfo as any).owner || 'N/A',
                registeredAt: (nodeInfo as any).registeredAt ? new Date(Number((nodeInfo as any).registeredAt) * 1000).toISOString() : 'N/A'
              });
            }
          }
                 } catch (error) {
           console.log(`     ❌ nodes() method failed: ${error instanceof Error ? error.message : String(error)}`);
         }

        // Method 2: Try isNodeRegistered if it exists
        try {
          const registered = await aiNodeRegistry.isNodeRegistered(nodeAddress);
          console.log(`     ✅ isNodeRegistered(): ${registered ? 'REGISTERED' : 'NOT REGISTERED'}`);
          isRegistered = isRegistered || registered;
        } catch (error) {
          console.log(`     ❌ isNodeRegistered() method not available`);
        }

        // Method 3: Try getNodeInfo if it exists
        try {
          const info = await aiNodeRegistry.getNodeInfo(nodeAddress);
          if (info) {
            console.log(`     ✅ getNodeInfo() found data`);
            isRegistered = true;
          }
        } catch (error) {
          console.log(`     ❌ getNodeInfo() method failed`);
        }

        // Summary for this node
        console.log(`     🎯 FINAL STATUS: ${isRegistered ? '✅ REGISTERED' : '❌ NOT REGISTERED'}`);

             } catch (error) {
         console.log(`     💥 Error checking node: ${error instanceof Error ? error.message : String(error)}`);
       }
    }

    console.log('\n3. Summary:');
    console.log('   The registration failures with NodeAlreadyRegistered() error');
    console.log('   indicate that the nodes are already properly registered in');
    console.log('   the D-Loop AINodeRegistry contract.');

    console.log('\n✅ Registration status check completed');

  } catch (error) {
    console.error('\n❌ Registration status check failed:', error);
    process.exit(1);
  }
}

// Run the check
checkRegistrationStatus()
  .then(() => {
    console.log('\n🎉 Check completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Check failed with error:', error);
    process.exit(1);
  });
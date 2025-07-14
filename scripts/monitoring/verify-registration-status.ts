#!/usr/bin/env ts-node

import { ethers } from 'ethers';
import fs from 'fs';

const SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8';
const ADMIN_PRIVATE_KEY = '531e9b0fa5bfcdb376c7f4adea3bc22b5a5c3630619f433a492f83adb60dca46';

const NODE_ADDRESSES = [
  '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A',
  '0x1563915e194D8CfBA1943570603F7606A3115508', 
  '0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB',
  '0x7564105E977516C53bE337314c7E53838967bDaC',
  '0xe1fAE9b4fAB2F5726677ECfA912d96b0B683e6a9'
];

async function checkRegistrationStatus() {
  console.log('🔍 Checking current node registration status...');
  
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  
  const registryABI = JSON.parse(fs.readFileSync('./abis/AINodeRegistry.json', 'utf8'));
  const tokenABI = JSON.parse(fs.readFileSync('./abis/DLoopToken.json', 'utf8'));
  
  const registry = new ethers.Contract('0x0045c7D99489f1d8A5900243956B0206344417DD', registryABI, adminWallet);
  const dloopToken = new ethers.Contract('0x05B366778566e93abfB8e4A9B794e4ad006446b4', tokenABI, adminWallet);
  
  let registeredNodes = 0;
  
  for (let i = 0; i < NODE_ADDRESSES.length; i++) {
    const nodeAddress = NODE_ADDRESSES[i];
    console.log(`\n📱 Node ${i + 1}: ${nodeAddress}`);
    
    // Check ETH balance
    try {
      const ethBalance = await provider.getBalance(nodeAddress);
      console.log(`  💰 ETH: ${ethers.formatEther(ethBalance)}`);
    } catch (error) {
      console.log(`  💰 ETH: Error checking balance`);
    }
    
    // Check DLOOP balance  
    try {
      const dloopBalance = await dloopToken.balanceOf(nodeAddress);
      console.log(`  🪙 DLOOP: ${ethers.formatEther(dloopBalance)}`);
    } catch (error) {
      console.log(`  🪙 DLOOP: Error checking balance`);
    }
    
    // Check registration status using getNodeInfo
    try {
      const nodeInfo = await registry.getNodeInfo(nodeAddress);
      console.log(`  ✅ Registration: REGISTERED`);
      console.log(`  👤 Owner: ${nodeInfo[0]}`);
      console.log(`  📝 Metadata: ${nodeInfo[1].substring(0, 50)}...`);
      console.log(`  📅 Registered: ${new Date(Number(nodeInfo[2]) * 1000).toISOString()}`);
      console.log(`  ⏰ Active Until: ${new Date(Number(nodeInfo[3]) * 1000).toISOString()}`);
      console.log(`  📊 State: ${nodeInfo[4]}`);
      console.log(`  ⭐ Reputation: ${nodeInfo[5]}`);
      registeredNodes++;
    } catch (error: any) {
      console.log(`  ❌ Registration: NOT REGISTERED`);
      console.log(`  🔍 Error: ${error.message.split('(')[0]}`);
    }
  }
  
  console.log(`\n📊 Summary: ${registeredNodes}/${NODE_ADDRESSES.length} nodes registered`);
  
  if (registeredNodes === NODE_ADDRESSES.length) {
    console.log('🎉 ALL NODES REGISTERED! The application should work now.');
  } else if (registeredNodes > 0) {
    console.log('🔄 Some nodes registered. Partial functionality available.');
  } else {
    console.log('❌ No nodes registered. Registration process needed.');
  }
  
  return registeredNodes;
}

async function attemptEmergencyRegistration() {
  console.log('\n🚨 Attempting emergency registration for unregistered nodes...');
  
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
  
  const registryABI = JSON.parse(fs.readFileSync('./abis/AINodeRegistry.json', 'utf8'));
  const registry = new ethers.Contract('0x0045c7D99489f1d8A5900243956B0206344417DD', registryABI, adminWallet);
  
  for (let i = 0; i < NODE_ADDRESSES.length; i++) {
    const nodeAddress = NODE_ADDRESSES[i];
    
    try {
      // Check if already registered
      await registry.getNodeInfo(nodeAddress);
      console.log(`Node ${i + 1}: Already registered, skipping`);
      continue;
    } catch (error) {
      // Not registered, try to register
      console.log(`\n🔧 Emergency registration for Node ${i + 1}...`);
      
      try {
        // Try the simplest registration method
        const metadata = `{"name":"AI Governance Node ${i + 1}","type":"governance"}`;
        
        const tx = await registry.registerNode(
          nodeAddress,
          adminWallet.address,
          metadata,
          {
            gasLimit: 500000,
            gasPrice: ethers.parseUnits('20', 'gwei') // Higher gas price for faster processing
          }
        );
        
        console.log(`  ⏳ Emergency registration tx: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`  ✅ Emergency registration successful! Block: ${receipt.blockNumber}`);
        
      } catch (regError: any) {
        console.log(`  ❌ Emergency registration failed: ${regError.message.split('(')[0]}`);
      }
    }
  }
}

async function main() {
  console.log('🔍 D-Loop Node Registration Status Verification');
  console.log('='.repeat(50));
  
  const registeredCount = await checkRegistrationStatus();
  
  if (registeredCount < NODE_ADDRESSES.length) {
    await attemptEmergencyRegistration();
    
    // Re-check after emergency registration
    console.log('\n🔄 Re-checking registration status...');
    await checkRegistrationStatus();
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Monitor application logs: tail -f logs/governance.log');
  console.log('2. Check if NodeNotRegistered errors are resolved');
  console.log('3. Verify node operations are working correctly');
}

main().catch(console.error); 
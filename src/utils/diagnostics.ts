import { ethers } from 'ethers';
import { WalletService } from '../services/WalletService.js';
import { ContractService } from '../services/ContractService.js';
import { contractLogger as logger } from './logger.js';

export interface NodeDiagnosticResult {
  nodeIndex: number;
  address: string;
  isRegistered: boolean;
  dloopBalance: string;
  ethBalance: string;
  hasStakeApproval: boolean;
  stakeRequirement: string;
  registrationErrors: string[];
}

export class DiagnosticService {
  private walletService: WalletService;
  private contractService: ContractService;

  constructor(walletService: WalletService, contractService: ContractService) {
    this.walletService = walletService;
    this.contractService = contractService;
  }

  /**
   * Run comprehensive diagnostics on all nodes
   */
  async runFullDiagnostics(): Promise<NodeDiagnosticResult[]> {
    const results: NodeDiagnosticResult[] = [];
    
    logger.info('Starting comprehensive node diagnostics...');
    
    for (let i = 0; i < this.walletService.getWalletCount(); i++) {
      try {
        const result = await this.diagnoseNode(i);
        results.push(result);
        
        // Log summary for each node
        logger.info(`Node ${i + 1} Diagnostic Summary:`, {
          address: result.address,
          registered: result.isRegistered,
          dloopBalance: result.dloopBalance,
          ethBalance: result.ethBalance,
          hasApproval: result.hasStakeApproval,
          errors: result.registrationErrors
        });
        
      } catch (error: any) {
        logger.error(`Failed to diagnose node ${i}:`, error);
        results.push({
          nodeIndex: i,
          address: 'unknown',
          isRegistered: false,
          dloopBalance: '0',
          ethBalance: '0',
          hasStakeApproval: false,
          stakeRequirement: '0',
          registrationErrors: [`Diagnostic failed: ${error.message}`]
        });
      }
    }
    
    // Generate overall summary
    this.generateDiagnosticSummary(results);
    
    return results;
  }

  /**
   * Diagnose a specific node
   */
  async diagnoseNode(nodeIndex: number): Promise<NodeDiagnosticResult> {
    const wallet = this.walletService.getWallet(nodeIndex);
    const address = wallet.address;
    const errors: string[] = [];

    logger.info(`Diagnosing node ${nodeIndex + 1} (${address})...`);

    // Check ETH balance
    const ethBalance = await this.walletService.getProvider().getBalance(address);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);

    // Check DLOOP token balance
    let dloopBalance = '0';
    try {
      dloopBalance = await this.contractService.getTokenBalance(nodeIndex);
    } catch (error: any) {
      errors.push(`Failed to get DLOOP balance: ${error.message}`);
    }

    // Check if node is registered by checking node info
    let isRegistered = false;
    try {
      const nodeInfo = await this.contractService.getNodeInfo(address);
      isRegistered = nodeInfo.isActive;
    } catch (error: any) {
      // If getNodeInfo fails, likely node is not registered
      isRegistered = false;
      errors.push(`Node not registered or failed to check: ${error.message}`);
    }

    // For staking requirements, we'll use a default value since it's not available in ContractService
    const stakeRequirement = '1000'; // Default staking requirement
    
    // Check if node has valid SoulBound NFT (authentication requirement)
    let hasStakeApproval = false;
    try {
      hasStakeApproval = await this.contractService.hasValidSoulboundNFT(nodeIndex);
    } catch (error: any) {
      errors.push(`Failed to check SoulBound NFT validity: ${error.message}`);
    }

    // Validate requirements
    if (ethers.parseEther('0.01') > ethBalance) {
      errors.push('Insufficient ETH balance for transactions (minimum 0.01 ETH recommended)');
    }

    if (ethers.parseEther(dloopBalance) < ethers.parseEther(stakeRequirement)) {
      errors.push(`Insufficient DLOOP balance. Required: ${stakeRequirement}, Available: ${dloopBalance}`);
    }

    if (!hasStakeApproval && dloopBalance !== '0') {
      errors.push('DLOOP tokens not approved for staking contract');
    }

    return {
      nodeIndex,
      address,
      isRegistered,
      dloopBalance,
      ethBalance: ethBalanceFormatted,
      hasStakeApproval,
      stakeRequirement,
      registrationErrors: errors
    };
  }

  /**
   * Attempt to fix common registration issues
   */
  async attemptAutoFix(nodeIndex: number): Promise<{success: boolean, actions: string[], errors: string[]}> {
    const actions: string[] = [];
    const errors: string[] = [];
    let success = true;

    logger.info(`Attempting auto-fix for node ${nodeIndex + 1}...`);

    try {
      // Get current diagnostic
      const diagnostic = await this.diagnoseNode(nodeIndex);
      
      // Fix 1: Mint SoulBound NFT if needed (authentication requirement)
      if (!diagnostic.hasStakeApproval && parseFloat(diagnostic.dloopBalance) > 0) {
        try {
          logger.info(`Minting SoulBound NFT for node ${nodeIndex + 1}...`);
          const txHash = await this.contractService.mintSoulboundNFT(nodeIndex, 'Node Authentication Token');
          actions.push(`Minted SoulBound NFT for authentication (tx: ${txHash})`);
        } catch (error: any) {
          errors.push(`Failed to mint SoulBound NFT: ${error.message}`);
          success = false;
        }
      }

      // Fix 2: Attempt registration if requirements are met
      if (!diagnostic.isRegistered && diagnostic.hasStakeApproval) {
        try {
          logger.info(`Attempting to register node ${nodeIndex + 1}...`);
          const wallet = this.walletService.getWallet(nodeIndex);
          // Try to auto-register the node
          await this.contractService.registerAINode(
            nodeIndex
          );
          actions.push(`Registered node successfully`);
        } catch (error: any) {
          errors.push(`Failed to register node: ${error.message}`);
          success = false;
        }
      }

    } catch (error: any) {
      errors.push(`Auto-fix failed: ${error.message}`);
      success = false;
    }

    return { success, actions, errors };
  }

  /**
   * Generate diagnostic summary report
   */
  private generateDiagnosticSummary(results: NodeDiagnosticResult[]): void {
    const registered = results.filter(r => r.isRegistered).length;
    const withSufficientBalance = results.filter(r => parseFloat(r.dloopBalance) > 0).length;
    const withApproval = results.filter(r => r.hasStakeApproval).length;
    const withErrors = results.filter(r => r.registrationErrors.length > 0).length;

    logger.info('=== DIAGNOSTIC SUMMARY ===', {
      totalNodes: results.length,
      registeredNodes: registered,
      nodesWithBalance: withSufficientBalance,
      nodesWithApproval: withApproval,
      nodesWithErrors: withErrors
    });

    if (withErrors > 0) {
      logger.warn(`${withErrors} nodes have registration issues that need attention`);
    }

    if (registered === results.length) {
      logger.info('✅ All nodes are successfully registered!');
    } else {
      logger.warn(`⚠️  ${results.length - registered} nodes need registration`);
    }
  }

  /**
   * Monitor node status continuously
   */
  async startContinuousMonitoring(intervalMs: number = 60000): Promise<void> {
    logger.info(`Starting continuous node monitoring (interval: ${intervalMs}ms)`);
    
    setInterval(async () => {
      try {
        const results = await this.runFullDiagnostics();
        const issues = results.filter(r => r.registrationErrors.length > 0);
        
        if (issues.length > 0) {
          logger.warn(`Monitoring alert: ${issues.length} nodes have issues`, {
            affectedNodes: issues.map(r => r.nodeIndex + 1)
          });
        }
      } catch (error: any) {
        logger.error('Monitoring cycle failed:', error);
      }
    }, intervalMs);
  }
} 
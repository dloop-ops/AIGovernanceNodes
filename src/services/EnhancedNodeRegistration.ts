import { ethers } from 'ethers';
import fs from 'fs';
import logger from '../utils/logger.js';
import { RpcManager } from './RpcManager.js';
import { TransactionManager } from './TransactionManager.js';
import { WalletService } from './WalletService.js';

export interface NodeRegistrationConfig {
  nodeId: string;
  nodeAddress: string;
  nodeName: string;
  endpoint: string;
  nodeType: string;
  nodeIndex: number;
}

export interface RegistrationResult {
  success: boolean;
  isRegistered: boolean;
  transactionHash?: string;
  error?: string;
  requirementsMet?: boolean;
  stakingComplete?: boolean;
  authenticationStatus?: boolean;
}

export class EnhancedNodeRegistration {
  private rpcManager: RpcManager;
  private transactionManager: TransactionManager;
  private walletService: WalletService;
  private contractAddresses: any;
  private contractABIs: Map<string, any[]> = new Map();

  constructor(rpcManager: RpcManager, walletService: WalletService) {
    this.rpcManager = rpcManager;
    this.transactionManager = new TransactionManager(rpcManager);
    this.walletService = walletService;
    this.contractAddresses = {
      aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
      dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
      soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
    };
    this.loadContractABIs();
  }

  private async loadContractABIs(): Promise<void> {
    try {
      const abiFiles = [
        { name: 'aiNodeRegistry', file: 'attached_assets/ainoderegistry.abi.v1.json' },
        { name: 'dloopToken', file: 'attached_assets/dlooptoken.abi.v1.json' },
        { name: 'soulboundNft', file: 'attached_assets/soulboundnft.abi.v1.json' }
      ];

      for (const { name, file } of abiFiles) {
        try {
          const abiData = JSON.parse(fs.readFileSync(file, 'utf8'));
          this.contractABIs.set(name, abiData.abi || abiData);
          logger.info(`Loaded ABI for ${name}`, { file });
        } catch (error) {
          logger.warn(`Failed to load ABI for ${name}`, { file, error: (error as Error).message });
        }
      }
    } catch (error) {
      logger.error('Failed to initialize contract ABIs', { error: (error as Error).message });
    }
  }

  public async registerNodeWithComprehensiveFlow(
    config: NodeRegistrationConfig
  ): Promise<RegistrationResult> {
    logger.info('Starting comprehensive node registration', {
      nodeId: config.nodeId,
      address: config.nodeAddress
    });

    try {
      // Step 1: Check current registration status
      const registrationStatus = await this.checkNodeRegistrationStatus(config.nodeAddress);
      if (registrationStatus.isRegistered) {
        logger.info('Node already registered', { nodeId: config.nodeId });
        return {
          success: true,
          isRegistered: true,
          requirementsMet: true,
          stakingComplete: true
        };
      }

      // Step 2: Verify DLOOP token requirements
      const tokenRequirements = await this.verifyTokenRequirements(config.nodeAddress);
      if (!tokenRequirements.sufficient) {
        logger.error('Insufficient DLOOP tokens for registration', {
          nodeId: config.nodeId,
          required: tokenRequirements.required,
          available: tokenRequirements.available
        });
        return {
          success: false,
          isRegistered: false,
          error: 'Insufficient DLOOP tokens',
          requirementsMet: false
        };
      }

      // Step 3: Approve DLOOP tokens with enhanced gas handling
      const approvalResult = await this.approveTokensWithFallback(config);
      if (!approvalResult.success) {
        return {
          success: false,
          isRegistered: false,
          error: `Token approval failed: ${approvalResult.error}`,
          requirementsMet: false
        };
      }

      // Step 4: Register node with multiple fallback strategies
      const registrationResult = await this.registerWithMultipleStrategies(config);

      if (registrationResult.success) {
        logger.info('Node registration completed successfully', {
          nodeId: config.nodeId,
          txHash: registrationResult.transactionHash
        });

        // Step 5: Verify registration completion
        await this.delay(5000); // Wait for block confirmation
        const finalStatus = await this.checkNodeRegistrationStatus(config.nodeAddress);

        return {
          success: true,
          isRegistered: finalStatus.isRegistered,
          transactionHash: registrationResult.transactionHash,
          requirementsMet: true,
          stakingComplete: true
        };
      }

      return {
        ...registrationResult,
        isRegistered: false
      };
    } catch (error: any) {
      logger.error('Comprehensive registration failed', {
        nodeId: config.nodeId,
        error: error.message
      });

      return {
        success: false,
        isRegistered: false,
        error: error.message,
        requirementsMet: false
      };
    }
  }

  private async checkNodeRegistrationStatus(
    nodeAddress: string
  ): Promise<{ isRegistered: boolean; nodeInfo?: any }> {
    try {
      const abi = this.contractABIs.get('aiNodeRegistry');
      if (!abi) {
        throw new Error('AI Node Registry ABI not loaded');
      }

      const result = await this.transactionManager.executeContractRead(
        this.contractAddresses.aiNodeRegistry,
        abi,
        'getNodeInfo',
        [nodeAddress]
      );

      return {
        isRegistered: true,
        nodeInfo: result
      };
    } catch (error: any) {
      if (error.message?.includes('NodeNotRegistered')) {
        return { isRegistered: false };
      }
      throw error;
    }
  }

  private async verifyTokenRequirements(nodeAddress: string): Promise<{
    sufficient: boolean;
    required: string;
    available: string;
  }> {
    try {
      const wallet = this.walletService.getWalletByAddress(nodeAddress);
      if (!wallet) {
        throw new Error(`Wallet not found for address: ${nodeAddress}`);
      }

      const dloopAbi = this.contractABIs.get('dloopToken');
      if (!dloopAbi) {
        throw new Error('DLOOP Token ABI not loaded');
      }

      // Check DLOOP balance
      const balance = await this.transactionManager.executeContractRead(
        this.contractAddresses.dloopToken,
        dloopAbi,
        'balanceOf',
        [nodeAddress]
      );

      const requiredAmount = ethers.parseEther('1.0'); // 1 DLOOP token
      const availableAmount = BigInt(balance.toString());

      logger.debug('Token requirements verification', {
        nodeAddress,
        required: ethers.formatEther(requiredAmount),
        available: ethers.formatEther(availableAmount),
        sufficient: availableAmount >= requiredAmount
      });

      return {
        sufficient: availableAmount >= requiredAmount,
        required: ethers.formatEther(requiredAmount),
        available: ethers.formatEther(availableAmount)
      };
    } catch (error: any) {
      logger.error('Token requirements verification failed', {
        nodeAddress,
        error: error.message
      });
      return {
        sufficient: false,
        required: '1.0',
        available: '0.0'
      };
    }
  }

  private async approveTokensWithFallback(config: NodeRegistrationConfig): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      const wallet = this.walletService.getWalletByAddress(config.nodeAddress);
      if (!wallet) {
        throw new Error(`Wallet not found for address: ${config.nodeAddress}`);
      }

      const dloopAbi = this.contractABIs.get('dloopToken');
      if (!dloopAbi) {
        throw new Error('DLOOP Token ABI not loaded');
      }

      const approveAmount = ethers.parseEther('1.0');

      logger.info('Approving DLOOP tokens with enhanced gas handling', {
        nodeId: config.nodeId,
        amount: ethers.formatEther(approveAmount),
        spender: this.contractAddresses.aiNodeRegistry
      });

      const result = await this.transactionManager.executeTransaction(
        wallet,
        this.contractAddresses.dloopToken,
        dloopAbi,
        'approve',
        [this.contractAddresses.aiNodeRegistry, approveAmount],
        {
          gasLimit: '100000',
          retries: 5,
          timeout: 60000
        }
      );

      if (result.success) {
        logger.info('Token approval successful', {
          nodeId: config.nodeId,
          txHash: result.transactionHash,
          gasUsed: result.gasUsed
        });

        return {
          success: true,
          transactionHash: result.transactionHash
        };
      }

      return {
        success: false,
        error: result.error
      };
    } catch (error: any) {
      logger.error('Token approval failed', {
        nodeId: config.nodeId,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  private async registerWithMultipleStrategies(config: NodeRegistrationConfig): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    const strategies = [
      () => this.registerWithStakingMethod(config),
      () => this.registerWithSafeApprovalMethod(config),
      () => this.registerWithOptimizedApprovalMethod(config)
    ];

    let lastError: string = '';

    for (let i = 0; i < strategies.length; i++) {
      const strategyName = ['Staking', 'SafeApproval', 'OptimizedApproval'][i];

      try {
        logger.info(`Attempting registration strategy: ${strategyName}`, {
          nodeId: config.nodeId,
          attempt: i + 1
        });

        const result = await strategies[i]();

        if (result.success) {
          logger.info(`Registration successful with ${strategyName} strategy`, {
            nodeId: config.nodeId,
            txHash: result.transactionHash
          });
          return result;
        }

        lastError = result.error || `${strategyName} strategy failed`;
        logger.warn(`${strategyName} strategy failed, trying next`, {
          nodeId: config.nodeId,
          error: lastError
        });
      } catch (error: any) {
        lastError = error.message;
        logger.warn(`${strategyName} strategy exception, trying next`, {
          nodeId: config.nodeId,
          error: error.message
        });
      }

      // Wait between attempts
      if (i < strategies.length - 1) {
        await this.delay(2000);
      }
    }

    return {
      success: false,
      error: `All registration strategies failed. Last error: ${lastError}`
    };
  }

  private async registerWithStakingMethod(config: NodeRegistrationConfig): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    const wallet = this.walletService.getWalletByAddress(config.nodeAddress);
    if (!wallet) {
      throw new Error(`Wallet not found for address: ${config.nodeAddress}`);
    }

    const abi = this.contractABIs.get('aiNodeRegistry');
    if (!abi) {
      throw new Error('AI Node Registry ABI not loaded');
    }

    const metadata = JSON.stringify({
      name: config.nodeName,
      description: `Automated governance node using ${config.nodeType} strategy`,
      endpoint: config.endpoint,
      nodeType: config.nodeType,
      strategy: config.nodeType.toLowerCase(),
      version: '1.0.0',
      registeredAt: Date.now()
    });

    return await this.transactionManager.executeTransaction(
      wallet,
      this.contractAddresses.aiNodeRegistry,
      abi,
      'registerNodeWithStaking',
      [config.nodeAddress, metadata, 0], // requirementId = 0 for default
      {
        gasLimit: '1000000',
        retries: 3,
        timeout: 120000
      }
    );
  }

  private async registerWithSafeApprovalMethod(config: NodeRegistrationConfig): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    const wallet = this.walletService.getWalletByAddress(config.nodeAddress);
    if (!wallet) {
      throw new Error(`Wallet not found for address: ${config.nodeAddress}`);
    }

    const abi = this.contractABIs.get('aiNodeRegistry');
    if (!abi) {
      throw new Error('AI Node Registry ABI not loaded');
    }

    return await this.transactionManager.executeTransaction(
      wallet,
      this.contractAddresses.aiNodeRegistry,
      abi,
      'registerNodeWithSafeApproval',
      [],
      {
        gasLimit: '800000',
        retries: 3,
        timeout: 120000
      }
    );
  }

  private async registerWithOptimizedApprovalMethod(config: NodeRegistrationConfig): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    const wallet = this.walletService.getWalletByAddress(config.nodeAddress);
    if (!wallet) {
      throw new Error(`Wallet not found for address: ${config.nodeAddress}`);
    }

    const abi = this.contractABIs.get('aiNodeRegistry');
    if (!abi) {
      throw new Error('AI Node Registry ABI not loaded');
    }

    return await this.transactionManager.executeTransaction(
      wallet,
      this.contractAddresses.aiNodeRegistry,
      abi,
      'registerNodeWithOptimizedApproval',
      [],
      {
        gasLimit: '700000',
        retries: 3,
        timeout: 120000
      }
    );
  }

  public async batchRegisterNodes(configs: NodeRegistrationConfig[]): Promise<{
    successful: string[];
    failed: Array<{ nodeId: string; error: string }>;
    totalProcessed: number;
  }> {
    const successful: string[] = [];
    const failed: Array<{ nodeId: string; error: string }> = [];

    logger.info('Starting batch node registration', {
      totalNodes: configs.length
    });

    for (const config of configs) {
      try {
        const result = await this.registerNodeWithComprehensiveFlow(config);

        if (result.success) {
          successful.push(config.nodeId);
          logger.info('Batch registration success', {
            nodeId: config.nodeId,
            txHash: result.transactionHash
          });
        } else {
          failed.push({
            nodeId: config.nodeId,
            error: result.error || 'Unknown error'
          });
        }

        // Wait between registrations to avoid rate limiting
        await this.delay(3000);
      } catch (error: any) {
        failed.push({
          nodeId: config.nodeId,
          error: error.message
        });
        logger.error('Batch registration error', {
          nodeId: config.nodeId,
          error: error.message
        });
      }
    }

    logger.info('Batch registration completed', {
      successful: successful.length,
      failed: failed.length,
      totalProcessed: configs.length
    });

    return {
      successful,
      failed,
      totalProcessed: configs.length
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

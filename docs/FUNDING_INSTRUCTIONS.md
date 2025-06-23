# Funding Instructions for AI Governance Nodes

## Overview
Your AI governance nodes have been generated and need to be funded before they can operate.

## Required Funding

Each node needs:
- **ETH**: Minimum 0.1 ETH for transaction fees
- **DLOOP Tokens**: Minimum 1000 DLOOP for staking requirements

## Node Addresses

### Node 1
- **Address**: `0x0E354b735a6eee60726e6e3A431e3320Ba26ba45`
- **Required ETH**: 0.1 ETH
- **Required DLOOP**: 1000 DLOOP

### Node 2
- **Address**: `0xb1c25B40A79b7D046E539A9fbBB58789efFD0874`
- **Required ETH**: 0.1 ETH
- **Required DLOOP**: 1000 DLOOP

### Node 3
- **Address**: `0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58`
- **Required ETH**: 0.1 ETH
- **Required DLOOP**: 1000 DLOOP

### Node 4
- **Address**: `0x766766f2815f835E4A0b1360833C7A15DDF2b72a`
- **Required ETH**: 0.1 ETH
- **Required DLOOP**: 1000 DLOOP

### Node 5
- **Address**: `0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA`
- **Required ETH**: 0.1 ETH
- **Required DLOOP**: 1000 DLOOP

## Funding Steps

1. **Get Sepolia ETH** (for testing):
   - Visit https://sepoliafaucet.com/
   - Enter each node address and request ETH
   - Wait for transactions to confirm

2. **Get DLOOP Tokens**:
   - Contact the DLoop team for test tokens
   - Or use the DLOOP token faucet if available
   - Send 1000+ DLOOP to each node address

3. **Verify Funding**:
   ```bash
   npm run diagnose
   ```

## Important Security Notes

⚠️  **NEVER share your private keys!**
⚠️  **Keep the .env file secure and never commit it to version control!**
⚠️  **These are testnet addresses - do not send mainnet funds!**

## Troubleshooting

If you encounter issues:

1. Check that all environment variables are set correctly
2. Verify that contract addresses are correct for Sepolia
3. Ensure RPC endpoints are working
4. Run diagnostics to identify specific issues

## Next Steps

After funding all nodes:

1. Run `npm run diagnose` to verify setup
2. The script will attempt to register nodes automatically
3. Start the governance system with `npm run dev`
4. Monitor logs for successful operation

Generated on: 2025-06-06T15:56:41.669Z

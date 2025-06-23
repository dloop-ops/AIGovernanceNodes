# 🗳️ Netlify Automation Guide

**Automated Multi-Node Voting Every 30 Minutes**

This guide explains how to set up **serverless automation** for your DLoop AI Governance Nodes using **Netlify Scheduled Functions**.

## 🎯 Overview

The Netlify automation system provides:
- ⏰ **Scheduled Execution**: Runs every 30 minutes automatically
- 🌐 **Serverless**: No local infrastructure required
- 📊 **Cloud Logging**: View execution logs in Netlify dashboard
- 🔒 **Secure**: Environment variables stored securely in Netlify
- 💰 **Cost-Effective**: Netlify's generous free tier covers most usage

## 🚀 Setup Instructions

### 1. Deploy to Netlify

```bash
# Build the project with scheduled function
npm run build

# Deploy to Netlify (production)
npm run deploy-automation
```

### 2. Configure Environment Variables

In your **Netlify Dashboard** → **Site Settings** → **Environment Variables**, add:

```bash
# Required: Blockchain Configuration
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
ASSET_DAO_CONTRACT_ADDRESS=0xa87e662061237a121Ca2E83E77dA8251bc4B3529

# Required: AI Node Private Keys (5 nodes)
AI_NODE_1_PRIVATE_KEY=0x...
AI_NODE_2_PRIVATE_KEY=0x...
AI_NODE_3_PRIVATE_KEY=0x...
AI_NODE_4_PRIVATE_KEY=0x...
AI_NODE_5_PRIVATE_KEY=0x...

# Optional: Additional Configuration
NODE_ENV=production
LOG_LEVEL=info
```

### 3. Verify Deployment

1. **Check Function Status**:
   - Go to Netlify Dashboard → **Functions**
   - Look for `scheduled-voting` function
   - Status should show "Active"

2. **Test Manual Execution**:
   ```bash
   # Test locally first
   npm run test-scheduled-voting
   
   # Or call the deployed function directly
   curl https://your-site.netlify.app/.netlify/functions/scheduled-voting
   ```

3. **Monitor Logs**:
   - Netlify Dashboard → **Functions** → **scheduled-voting**
   - Click on function to view execution logs

## 📋 How It Works

### Scheduled Function Structure

```javascript
// netlify/functions/scheduled-voting.js
const { schedule } = require('@netlify/functions');

// Runs every 30 minutes: */30 * * * *
exports.handler = schedule('*/30 * * * *', async (event, context) => {
  // 1. Initialize voting service
  // 2. Check for active proposals
  // 3. Vote with all 5 nodes
  // 4. Return results
});
```

### Voting Logic

The automated system follows the same **Conservative Strategy**:

- ✅ **YES** on proposals ≤ 1 ETH (very small amounts)
- ✅ **YES** on USDC proposals ≤ $5,000
- ❌ **NO** on all other proposals
- ⏭️ **SKIP** if nodes already voted

### Execution Flow

```
⏰ Every 30 minutes:
├── 🔍 Scan last 20 proposals for active ones
├── 📊 Analyze each active proposal
├── 🎯 Apply conservative voting strategy
├── 🗳️ Vote with all 5 nodes (if criteria met)
├── ⏱️ 3-second delay between nodes
└── 📝 Log results and return status
```

## 📊 Monitoring & Logs

### Netlify Function Logs

Access logs via:
1. **Netlify Dashboard** → **Functions** → **scheduled-voting**
2. **Real-time logs** during execution
3. **Historical logs** for past executions

### Log Format

```
🗳️ STARTING NETLIFY SCHEDULED VOTING
=====================================
⏰ Start time: 2025-01-23T22:30:00.000Z
📊 Checking proposals 93-112 for active ones...
   ✅ Found VALID active proposal 112 (67h left)
📋 Found 1 active proposals

📋 Processing Proposal 112
   💰 Amount: 0.000000001750711788 ETH
   🔍 Asset analysis: 0x3639D1F746... (USDC: false)
   ✅ Small amount proposal - voting YES
   🎯 Decision: Vote YES on proposal 112

   🤖 Node 1 (ai-gov-01): 0x0E354b73...
      ✅ Vote cast: 0xdbb2ac7c...

📊 NETLIFY VOTING SUMMARY
   📝 Total votes cast: 5
```

### API Response

The function returns structured JSON:

```json
{
  "success": true,
  "timestamp": "2025-01-23T22:30:15.123Z",
  "message": "Scheduled voting completed successfully",
  "totalVotes": 5,
  "results": [
    {
      "proposalId": "112",
      "decision": "YES",
      "votes": [
        { "nodeIndex": 1, "status": "success", "txHash": "0xdbb2ac7c..." },
        { "nodeIndex": 2, "status": "success", "txHash": "0xf1622be5..." }
      ]
    }
  ]
}
```

## 🔧 Customization Options

### Change Schedule Frequency

Edit `netlify/functions/scheduled-voting.js`:

```javascript
// Every 15 minutes
exports.handler = schedule('*/15 * * * *', scheduledHandler);

// Every hour
exports.handler = schedule('0 * * * *', scheduledHandler);

// Every 2 hours
exports.handler = schedule('0 */2 * * *', scheduledHandler);

// Daily at 12:00 UTC
exports.handler = schedule('0 12 * * *', scheduledHandler);
```

### Modify Voting Strategy

Update the `makeVotingDecision()` method:

```javascript
makeVotingDecision(proposal) {
  const isUSDC = proposal.assetAddress.toLowerCase().includes('usdc_address');
  const amount = parseFloat(proposal.amount);
  
  // Custom strategy here
  if (amount <= 0.5) {  // Even more conservative
    return { vote: true, support: true };
  }
  
  return { vote: false, support: false };
}
```

### Add Notifications

Integrate with external services:

```javascript
// Add to scheduledHandler after voting
if (results.totalVotes > 0) {
  // Send notification to Discord/Slack/Email
  await sendNotification({
    message: `Voted on ${results.totalVotes} proposals`,
    results: results.results
  });
}
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Function Not Executing

**Symptoms**: No logs in Netlify dashboard

**Solutions**:
- Check function deployment status
- Verify cron schedule syntax
- Ensure environment variables are set
- Check Netlify build logs

#### 2. RPC Connection Errors

**Symptoms**: "Failed to fetch proposals" errors

**Solutions**:
- Verify `ETHEREUM_RPC_URL` is correct
- Check Infura/Alchemy rate limits
- Test RPC endpoint manually

#### 3. Voting Transaction Failures

**Symptoms**: "Failed to vote" errors

**Solutions**:
- Check private key format (must include 0x prefix)
- Verify wallet has sufficient ETH for gas
- Check contract address is correct
- Ensure proposal is still active

#### 4. Environment Variable Issues

**Symptoms**: "Wallet not found" or connection errors

**Solutions**:
- Double-check all 5 private keys are set
- Verify no extra spaces in environment variables
- Ensure keys are properly formatted

### Debug Commands

```bash
# Test locally with environment variables
npm run test-scheduled-voting

# Check function deployment
netlify functions:list

# View recent function logs
netlify functions:log scheduled-voting

# Test API endpoint manually
curl -X POST https://your-site.netlify.app/.netlify/functions/scheduled-voting
```

## 📈 Performance & Limits

### Netlify Limits

- **Function Runtime**: 10 seconds (background functions: 15 minutes)
- **Executions**: 125,000/month (free tier)
- **Bandwidth**: 100GB/month (free tier)

### Optimization Tips

- ✅ **Efficient**: Only checks last 20 proposals
- ✅ **Rate Limited**: 3-second delays between nodes
- ✅ **Error Handling**: Graceful failure recovery
- ✅ **Logging**: Comprehensive execution tracking

### Expected Usage

- **Executions/Month**: ~1,440 (every 30 minutes)
- **Runtime**: ~30-60 seconds per execution
- **Bandwidth**: Minimal (JSON responses only)

## 🔐 Security Best Practices

### Environment Variables

- ✅ **Never commit** private keys to git
- ✅ **Use Netlify dashboard** for sensitive variables
- ✅ **Rotate keys** periodically
- ✅ **Monitor access** via wallet addresses

### Function Security

- ✅ **CORS headers** configured
- ✅ **Error handling** prevents information leakage
- ✅ **Input validation** on all parameters
- ✅ **Timeout protection** prevents hanging

## 🎉 Benefits vs Local Automation

| Feature | Netlify Automation | Local Automation |
|---------|-------------------|------------------|
| **Reliability** | ✅ 99.9% uptime | ❌ Depends on local machine |
| **Maintenance** | ✅ Zero maintenance | ❌ Requires monitoring |
| **Scaling** | ✅ Automatic | ❌ Manual setup |
| **Cost** | ✅ Free tier available | ❌ Electricity/hardware costs |
| **Logs** | ✅ Cloud dashboard | ❌ Local log management |
| **Security** | ✅ Managed environment | ❌ Local security responsibility |

## 📞 Support

If you encounter issues:

1. **Check Netlify Logs** first
2. **Test locally** with `npm run test-scheduled-voting`
3. **Verify environment variables** are set correctly
4. **Review function deployment** status

The Netlify automation provides a robust, serverless solution for continuous governance participation without requiring local infrastructure! 🚀 
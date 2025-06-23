# 🚀 DLoop AI Governance Nodes - elizaOS & Netlify Deployment Guide

Complete guide for deploying autonomous AI governance agents using elizaOS framework on Netlify.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [elizaOS Setup](#elizaos-setup)
3. [Local Development](#local-development)
4. [Netlify Deployment](#netlify-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Testing & Validation](#testing--validation)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Configuration](#advanced-configuration)

## 🔧 Prerequisites

### System Requirements
- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher (or **yarn** 1.22.0+)
- **Git** for version control
- **Modern web browser** for testing

### Accounts & Credentials Needed

#### Essential Accounts
- [**OpenAI**](https://platform.openai.com/) - API key for AI decision making
- [**Infura**](https://infura.io/) or [**Alchemy**](https://alchemy.com/) - Ethereum RPC access
- [**Netlify**](https://netlify.com/) - Cloud deployment platform
- [**GitHub**](https://github.com/) - Code repository hosting

#### Optional Social Media Accounts
- [**Discord**](https://discord.com/developers/applications) - Bot development
- [**Telegram**](https://core.telegram.org/bots) - Bot API
- [**Twitter**](https://developer.twitter.com/) - Social media integration

### Wallet Setup
You need **5 Ethereum wallets** with:
- **Sepolia testnet ETH** (for transaction gas fees)
- **DLOOP tokens** (1000 per wallet for governance participation)

## 🤖 elizaOS Setup

### 1. Install elizaOS CLI

```bash
# Install globally using npm
npm install -g @elizaos/cli

# Verify installation
elizaos --version

# Get help
elizaos --help
```

### 2. Clone & Setup Project

```bash
# Clone the repository
git clone https://github.com/your-username/dloop-ai-governance-nodes.git
cd dloop-ai-governance-nodes

# Install dependencies
npm install

# Verify elizaOS dependencies
npm list @elizaos/core
```

### 3. Verify Project Structure

```bash
# Check elizaOS configuration
elizaos agent list

# Validate character file
cat characters/dloop-governance.character.json | jq .

# Check plugin structure
ls -la plugins/*/src/index.ts
```

## 💻 Local Development

### 1. Environment Configuration

```bash
# Create environment file from template
cp .env.example .env

# Edit using elizaOS CLI (recommended)
elizaos env edit-local

# Or edit manually
nano .env
```

#### Required Variables
```bash
# AI Configuration
OPENAI_API_KEY=sk-your-actual-openai-key

# Blockchain
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
ASSET_DAO_CONTRACT_ADDRESS=0xa87e662061237a121Ca2E83E77dA8251bc4B3529
DLOOP_TOKEN_ADDRESS=0xC37f5136084A0Ecf88Bc1a2E3F20c4BB4EDAfCe3

# AI Node Wallets (replace with actual private keys)
AI_NODE_1_PRIVATE_KEY=0x...
AI_NODE_2_PRIVATE_KEY=0x...
AI_NODE_3_PRIVATE_KEY=0x...
AI_NODE_4_PRIVATE_KEY=0x...
AI_NODE_5_PRIVATE_KEY=0x...
```

### 2. Start Development Server

```bash
# Start elizaOS in development mode
elizaos dev

# Alternative: Use npm script
npm run dev

# Check logs for startup status
tail -f logs/combined.log
```

### 3. Test Agent Functionality

```bash
# Run health check
npm run health-check

# Test governance connection
npm run test-governance

# Verify node registration
npm run check-registration

# Test multi-node voting (if proposals are active)
npm run multi-node-voting
```

### 4. Web Interface Access

- **Local URL**: http://localhost:3000
- **API Endpoint**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/api/health

## 🌐 Netlify Deployment

### Method 1: Automatic Deployment (Recommended)

#### Step 1: Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "feat: elizaOS integration for Netlify deployment"
git push origin main
```

#### Step 2: Connect to Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click **"New site from Git"**
3. Choose **GitHub** as provider
4. Select your `dloop-ai-governance-nodes` repository
5. Configure build settings:
   ```
   Branch: main
   Build command: npm run build
   Publish directory: dist
   ```

#### Step 3: Environment Variables
In Netlify Dashboard → Site Settings → Environment Variables:

```bash
# Core Configuration
NODE_ENV=production
ELIZA_RUNTIME=production
LOG_LEVEL=info

# AI & elizaOS
OPENAI_API_KEY=sk-your-openai-key-here
DATABASE_PATH=/tmp/dloop-governance.db

# Blockchain (Sepolia)
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
ASSET_DAO_CONTRACT_ADDRESS=0xa87e662061237a121Ca2E83E77dA8251bc4B3529
DLOOP_TOKEN_ADDRESS=0xC37f5136084A0Ecf88Bc1a2E3F20c4BB4EDAfCe3

# AI Node Private Keys
AI_NODE_1_PRIVATE_KEY=0x...
AI_NODE_2_PRIVATE_KEY=0x...
AI_NODE_3_PRIVATE_KEY=0x...
AI_NODE_4_PRIVATE_KEY=0x...
AI_NODE_5_PRIVATE_KEY=0x...

# Optional: Social Media
DISCORD_BOT_TOKEN=your-discord-token
TELEGRAM_BOT_TOKEN=your-telegram-token
TWITTER_API_KEY=your-twitter-key
```

#### Step 4: Deploy
1. Click **"Deploy site"**
2. Monitor build logs for any errors
3. Wait for deployment to complete (usually 2-5 minutes)

### Method 2: Manual Deployment with CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site (first time only)
netlify init

# Build project locally
npm run build

# Deploy to production
netlify deploy --prod --dir=dist

# Check deployment status
netlify status
```

## ⚙️ Environment Configuration

### Production Environment Variables

```bash
# Deployment Environment
NODE_ENV=production
ELIZA_RUNTIME=production
DATABASE_PATH=/tmp/dloop-governance.db

# Performance Settings
LOG_LEVEL=info
MAX_RETRY_ATTEMPTS=3
REQUEST_TIMEOUT=30000
HEALTH_CHECK_INTERVAL=300000

# Governance Configuration
VOTING_STRATEGY=conservative
MAX_INVESTMENT_THRESHOLD=5000
MIN_VOTING_DELAY_MS=3000
```

### Security Best Practices

#### Private Key Security
```bash
# ❌ NEVER do this
AI_NODE_1_PRIVATE_KEY=1234567890abcdef... # exposed in code

# ✅ Always use environment variables
AI_NODE_1_PRIVATE_KEY=${SECURE_PRIVATE_KEY_1}
```

#### API Key Rotation
```bash
# Set up automatic rotation schedule
# Update keys in Netlify dashboard every 90 days
# Test with new keys before removing old ones
```

## 🧪 Testing & Validation

### Pre-Deployment Tests

```bash
# Full test suite
npm test

# elizaOS specific tests
npm run test:integration

# Governance functionality
npm run test-governance

# Build verification
npm run build
node dist/src/index.js --help
```

### Post-Deployment Validation

#### Health Check
```bash
# Check deployed agent health
curl https://your-site.netlify.app/api/health

# Expected response:
{
  "status": "operational",
  "runtime": true,
  "clients": 3,
  "timestamp": "2025-01-XX...",
  "version": "2.0.0-elizaOS"
}
```

#### Functionality Tests
```bash
# Test governance endpoint
curl https://your-site.netlify.app/api/governance/status

# Test voting capability
curl -X POST https://your-site.netlify.app/api/governance/check-proposals
```

### Monitoring Setup

#### Netlify Monitoring
1. **Functions Tab**: Monitor serverless function performance
2. **Analytics**: Track usage and performance metrics
3. **Deploy Logs**: Review build and deployment logs
4. **Real-time Logs**: Monitor live agent activity

#### Custom Monitoring
```javascript
// Add to your monitoring script
const monitorAgent = async () => {
  const response = await fetch('https://your-site.netlify.app/api/health');
  const status = await response.json();
  
  if (status.status !== 'operational') {
    // Send alert (email, Slack, Discord, etc.)
    console.error('Agent health check failed:', status);
  }
};

// Run every 5 minutes
setInterval(monitorAgent, 5 * 60 * 1000);
```

## 🐛 Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Error: elizaOS dependencies not found
# Solution: Verify package.json and npm install

# Error: TypeScript compilation failed
# Solution: Check tsconfig.json module settings

# Error: Missing environment variables
# Solution: Verify all required vars in Netlify dashboard
```

#### Runtime Errors
```bash
# Error: Database connection failed
# Solution: Check DATABASE_PATH for serverless environment

# Error: RPC connection timeout
# Solution: Verify ETHEREUM_RPC_URL and backup URLs

# Error: Private key invalid
# Solution: Ensure proper 0x prefix and 64 hex characters
```

### Debug Tools

#### Local Debugging
```bash
# Enable verbose logging
LOG_LEVEL=debug elizaos dev

# Test specific components
npm run check-registration
npm run verify-addresses
npm run test-governance
```

#### Production Debugging
```bash
# Check Netlify function logs
netlify functions:log governance-agent

# View real-time logs
netlify dev

# Test production API locally
netlify dev --live
```

### Performance Issues

#### Memory Optimization
```javascript
// netlify.toml function configuration
[functions."governance-agent"]
  node_bundler = "esbuild"
  [functions."governance-agent".environment]
    NODE_ENV = "production"
    OPTIMIZE_FOR_SERVERLESS = "true"
```

#### Cold Start Mitigation
```bash
# Add warming endpoint
curl https://your-site.netlify.app/api/warm

# Schedule regular health checks
# Use external monitoring service (UptimeRobot, etc.)
```

## ⚡ Advanced Configuration

### Custom elizaOS Plugins

#### Plugin Development
```typescript
// plugins/custom-governance/src/index.ts
import { Plugin, Action } from "@elizaos/core";

export const customGovernancePlugin: Plugin = {
  name: "custom-governance",
  description: "Enhanced governance features",
  actions: [new CustomVotingAction()],
  evaluators: [new CustomEvaluator()],
  providers: [new CustomProvider()]
};
```

#### Plugin Registration
```json
// characters/dloop-governance.character.json
{
  "plugins": [
    "@elizaos/plugin-bootstrap",
    "@elizaos/plugin-evm",
    "./plugins/governance-plugin",
    "./plugins/custom-governance"
  ]
}
```

### Multi-Environment Setup

#### Staging Environment
```bash
# Create staging branch
git checkout -b staging

# Deploy to staging
netlify deploy --alias staging

# Test staging deployment
curl https://staging--your-site.netlify.app/api/health
```

#### Production Release
```bash
# Merge to main
git checkout main
git merge staging

# Tag release
git tag v2.0.0-elizaOS
git push origin v2.0.0-elizaOS

# Deploy production
netlify deploy --prod
```

### Database Scaling

#### SQLite to PostgreSQL Migration
```bash
# Update environment variables
DATABASE_URL=postgresql://user:pass@host:port/db

# Update dependencies
npm install @elizaos/adapter-postgres

# Update configuration
// src/index.ts
import { PostgresAdapter } from "@elizaos/adapter-postgres";
```

### API Rate Limiting

#### Netlify Edge Functions
```javascript
// netlify/edge-functions/rate-limit.js
export default async (request, context) => {
  const rateLimitKey = context.ip;
  const limit = 100; // requests per hour
  
  // Implement rate limiting logic
  return context.next();
};
```

## 📞 Support & Resources

### Getting Help

#### Documentation
- [elizaOS Documentation](https://elizaos.github.io/eliza/)
- [Netlify Documentation](https://docs.netlify.com/)
- [Project README](../README.md)

#### Community Support
- **Discord**: [Join DLoop Community](https://discord.gg/dloop)
- **GitHub Issues**: [Report bugs](https://github.com/your-repo/issues)
- **Email**: support@dloop.ai

#### Professional Support
- **Netlify Pro**: Priority support and advanced features
- **elizaOS Enterprise**: Commercial support options
- **Custom Development**: Contact development team

### Additional Resources

#### Learning Materials
- [elizaOS Plugin Development Guide](https://elizaos.github.io/eliza/docs/plugins/)
- [Netlify Serverless Functions](https://docs.netlify.com/functions/overview/)
- [Ethereum Development Resources](https://ethereum.org/developers/)

#### Tools & Utilities
- [Netlify CLI Documentation](https://cli.netlify.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Infura API Documentation](https://docs.infura.io/)

---

**Deployment Guide Version**: 2.0.0-elizaOS  
**Last Updated**: January 2025  
**Framework**: elizaOS v1.0.11  
**Platform**: Netlify  
**Status**: Production Ready ✅ 
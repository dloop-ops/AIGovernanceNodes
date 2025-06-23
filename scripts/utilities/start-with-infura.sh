#!/bin/bash

echo "🚀 Starting DLoop AI Governance Nodes with Infura Endpoint"
echo "================================================="

# Kill any existing processes
pkill -f "node dist/src/index.js" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

# Clear old logs to see fresh output
rm -f logs/governance-nodes.log 2>/dev/null || true
rm -f logs/combined.log 2>/dev/null || true
rm -f logs/error.log 2>/dev/null || true

echo "📋 Environment Configuration:"
echo "  INFURA_SEPOLIA_URL=https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8"
echo "  NETWORK_NAME=sepolia"
echo ""

# Export environment variables explicitly
export INFURA_SEPOLIA_URL="https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8"
export NETWORK_NAME="sepolia"
export NODE_ENV="development"

# Clear any environment variables that might interfere
unset ETHEREUM_RPC_URL
unset DRPC_API_KEY

echo "🔧 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully"
echo ""
echo "🌟 Starting AI Governance Nodes..."
echo "   - Using Infura Sepolia endpoint"
echo "   - No drpc.org endpoints will be used"
echo "   - Sequential RPC calls (no batch requests)"
echo ""

# Start the application
npm start

echo ""
echo "📝 Application logs can be found in:"
echo "   - logs/governance-nodes.log"
echo "   - logs/combined.log"
echo "   - logs/error.log" 
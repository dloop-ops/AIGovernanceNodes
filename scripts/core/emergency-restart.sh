#!/bin/bash

echo "🚨 EMERGENCY RESTART: DLoop AI Governance System"
echo "=================================================="

# Kill the current blocked process
echo "🔄 Stopping blocked DLoop process (PID 92186)..."
kill -TERM 92186 2>/dev/null || echo "Process not found or already stopped"

# Wait for graceful shutdown
sleep 3

# Force kill if still running
kill -KILL 92186 2>/dev/null || echo "Process already terminated"

echo "✅ Previous process stopped"

# Clear any stuck processes
echo "🧹 Cleaning up any stuck node processes..."
pkill -f "ts-node src/index.ts" 2>/dev/null || echo "No additional processes found"

# Wait a moment
sleep 2

echo "🔄 Starting optimized DLoop system..."

# Set resource limits to prevent issues
ulimit -n 1024  # Limit file descriptors
ulimit -u 256   # Limit user processes

# Start with Node.js optimization flags
export NODE_OPTIONS="--max-old-space-size=512 --max-semi-space-size=32"

# Start the system in background
nohup npm run dev > dloop-restart.log 2>&1 &
NEW_PID=$!

echo "🚀 DLoop system restarted with PID: $NEW_PID"
echo "📋 Log file: dloop-restart.log"

# Wait for system to start
sleep 5

# Check if it's running
if ps -p $NEW_PID > /dev/null; then
    echo "✅ System is running successfully"
    
    # Test health endpoint
    echo "🔍 Testing system health..."
    sleep 3
    
    curl -s -m 5 http://localhost:5001/health > /dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Health check passed"
        
        # Try to get proposal count
        echo "📊 Testing proposal access..."
        PROPOSAL_COUNT=$(curl -s -m 10 http://localhost:5001/active-proposals | grep -o '"count":[0-9]*' | cut -d: -f2)
        
        if [ ! -z "$PROPOSAL_COUNT" ]; then
            echo "✅ Found $PROPOSAL_COUNT active proposals"
            
            # Try manual voting trigger (with short timeout)
            echo "🗳️  Testing manual voting trigger..."
            timeout 30 curl -s -X POST http://localhost:5001/trigger-voting > voting-test.log 2>&1 &
            VOTE_PID=$!
            
            sleep 10
            
            if ps -p $VOTE_PID > /dev/null; then
                echo "🔄 Voting process started (PID: $VOTE_PID)"
                echo "📋 Voting log: voting-test.log"
            else
                echo "✅ Voting completed quickly"
            fi
        else
            echo "⚠️  Could not access proposals"
        fi
    else
        echo "❌ Health check failed"
    fi
else
    echo "❌ Failed to start system"
    echo "📋 Check dloop-restart.log for errors"
fi

echo ""
echo "🎯 EMERGENCY RESTART COMPLETE"
echo "=============================="
echo "Next steps:"
echo "1. Monitor dloop-restart.log for cron job execution"
echo "2. Check for 'missed execution' warnings"
echo "3. Verify votes are being cast on proposals"
echo "4. Monitor system resource usage" 
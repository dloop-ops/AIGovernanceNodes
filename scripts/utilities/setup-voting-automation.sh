#!/bin/bash

# 🗳️ DLoop AI Governance Nodes - Voting Automation Setup
# This script sets up automated voting every 30 minutes using macOS launchd

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLIST_FILE="com.dloop.governance.voting.plist"
PLIST_PATH="$PROJECT_DIR/$PLIST_FILE"
LAUNCHD_PATH="$HOME/Library/LaunchAgents/$PLIST_FILE"

echo "🗳️ DLoop AI Governance Nodes - Voting Automation Setup"
echo "======================================================"

# Function to check if Node.js path is correct
check_node_path() {
    local node_path="/usr/local/bin/node"
    if [[ -x "$node_path" ]]; then
        echo "✅ Node.js found at: $node_path"
        return 0
    fi
    
    # Try to find node in common locations
    for path in "/opt/homebrew/bin/node" "/usr/bin/node" "$(which node)"; do
        if [[ -x "$path" ]]; then
            echo "✅ Node.js found at: $path"
            echo "⚠️  Updating plist file with correct Node.js path..."
            sed -i '' "s|/usr/local/bin/node|$path|g" "$PLIST_PATH"
            return 0
        fi
    done
    
    echo "❌ Node.js not found! Please install Node.js or update the path in $PLIST_FILE"
    exit 1
}

# Function to create logs directory
setup_logs() {
    local logs_dir="$PROJECT_DIR/logs"
    if [[ ! -d "$logs_dir" ]]; then
        mkdir -p "$logs_dir"
        echo "✅ Created logs directory: $logs_dir"
    else
        echo "✅ Logs directory exists: $logs_dir"
    fi
}

# Function to install the launchd job
install_automation() {
    echo ""
    echo "📥 Installing automated voting system..."
    
    # Check if plist file exists
    if [[ ! -f "$PLIST_PATH" ]]; then
        echo "❌ Plist file not found: $PLIST_PATH"
        echo "Please make sure the plist file is in the project root directory"
        exit 1
    fi
    
    # Copy plist to LaunchAgents directory
    cp "$PLIST_PATH" "$LAUNCHD_PATH"
    echo "✅ Copied plist file to: $LAUNCHD_PATH"
    
    # Load the job
    launchctl load "$LAUNCHD_PATH"
    echo "✅ Loaded launchd job"
    
    # Start the job immediately for testing
    launchctl start com.dloop.governance.voting
    echo "✅ Started voting automation job"
    
    echo ""
    echo "🎉 Automated voting system installed successfully!"
    echo "   📅 Runs every: 30 minutes"
    echo "   📝 Logs: $PROJECT_DIR/logs/voting-automation.log"
    echo "   🚨 Errors: $PROJECT_DIR/logs/voting-automation-error.log"
}

# Function to uninstall the launchd job
uninstall_automation() {
    echo ""
    echo "🗑️  Uninstalling automated voting system..."
    
    # Stop and unload the job if it exists
    if launchctl list | grep -q "com.dloop.governance.voting"; then
        launchctl stop com.dloop.governance.voting 2>/dev/null || true
        launchctl unload "$LAUNCHD_PATH" 2>/dev/null || true
        echo "✅ Stopped and unloaded launchd job"
    fi
    
    # Remove plist file
    if [[ -f "$LAUNCHD_PATH" ]]; then
        rm "$LAUNCHD_PATH"
        echo "✅ Removed plist file"
    fi
    
    echo "✅ Automated voting system uninstalled"
}

# Function to check status
check_status() {
    echo ""
    echo "📊 Checking automation status..."
    
    if launchctl list | grep -q "com.dloop.governance.voting"; then
        echo "✅ Automated voting is ACTIVE"
        
        # Show recent log entries
        local log_file="$PROJECT_DIR/logs/voting-automation.log"
        if [[ -f "$log_file" ]]; then
            echo ""
            echo "📝 Recent log entries (last 10 lines):"
            echo "----------------------------------------"
            tail -n 10 "$log_file" || echo "No log entries yet"
        fi
        
        # Show next run time
        echo ""
        echo "⏰ Job will run every 30 minutes"
        echo "📍 Check logs for execution details"
        
    else
        echo "❌ Automated voting is NOT running"
    fi
}

# Function to test voting manually
test_voting() {
    echo ""
    echo "🧪 Testing voting system manually..."
    cd "$PROJECT_DIR"
    
    if [[ -f "dist/scripts/core/multi-node-voting.js" ]]; then
        echo "🗳️ Running multi-node voting test..."
        node dist/scripts/core/multi-node-voting.js
    else
        echo "❌ Compiled voting script not found. Running npm run build..."
        npm run build
        node dist/scripts/core/multi-node-voting.js
    fi
}

# Main script logic
case "${1:-install}" in
    "install")
        echo "🚀 Installing automated voting system..."
        check_node_path
        setup_logs
        install_automation
        ;;
    "uninstall")
        uninstall_automation
        ;;
    "status")
        check_status
        ;;
    "test")
        test_voting
        ;;
    "restart")
        echo "🔄 Restarting automated voting system..."
        uninstall_automation
        sleep 2
        check_node_path
        setup_logs
        install_automation
        ;;
    *)
        echo "Usage: $0 {install|uninstall|status|test|restart}"
        echo ""
        echo "Commands:"
        echo "  install   - Install automated voting (runs every 30 minutes)"
        echo "  uninstall - Remove automated voting"
        echo "  status    - Check if automation is running"
        echo "  test      - Run voting manually for testing"
        echo "  restart   - Restart the automation service"
        exit 1
        ;;
esac

echo ""
echo "✅ Operation completed successfully!" 
#!/bin/bash
# Launch both prototypes

echo "🚀 Launching Prototypes..."
echo ""

# Function to launch in new terminal window
launch_in_terminal() {
    local dir=$1
    local port=$2
    local name=$3
    
    osascript <<EOF
        tell application "Terminal"
            do script "cd $dir && source venv/bin/activate && uvicorn main:app --reload --port $port"
            set custom title of front window to "$name"
        end tell
EOF
}

echo "📂 PromptGuard (Port 8000) - AI Security Scanner"
launch_in_terminal "/Users/moltitasker/.openclaw/workspace/prototypes/prompt-guard" 8000 "PromptGuard"

sleep 2

echo "🏥 MedFlow (Port 8001) - Healthcare AI Workflows"
launch_in_terminal "/Users/moltitasker/.openclaw/workspace/prototypes/medflow" 8001 "MedFlow"

echo ""
echo "✅ Both prototypes launching in separate Terminal windows..."
echo ""
echo "📍 Access them at:"
echo "  • PromptGuard: http://localhost:8000"
echo "  • MedFlow:     http://localhost:8001"
echo ""
echo "Press any key to open in browser..."
read -n 1

open http://localhost:8000
open http://localhost:8001

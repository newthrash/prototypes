#!/bin/bash
# DataVerse Startup Script

echo "🚀 Starting DataVerse..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q -r requirements.txt

# Start the server
echo ""
echo "✅ Starting server on http://localhost:8000"
echo ""
python main.py

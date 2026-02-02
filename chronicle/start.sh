#!/bin/bash

echo "🚀 Starting Chronicle - Local-First Calendar"
echo "=============================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found. Please install Python 3."
    exit 1
fi

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip3 install -r requirements.txt
fi

echo ""
echo "🌐 Starting server..."
echo "   URL: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python3 main.py

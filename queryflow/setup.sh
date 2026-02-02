#!/bin/bash
# Setup script for QueryFlow

echo "⚡ Setting up QueryFlow..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🚀 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create templates directory (in case it doesn't exist)
mkdir -p templates

echo "✅ Setup complete!"
echo ""
echo "To run QueryFlow:"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --reload --port 8002"
echo ""
echo "Then open http://localhost:8002 in your browser"

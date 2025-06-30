#!/bin/bash

echo "🌐 Starting Invoo.es Landing Page Preview"
echo "========================================"

# Navigate to project root then landing
cd "$(dirname "$0")/.."
cd landing

echo "🚀 Starting local server..."
echo "📱 Open your browser and go to:"
echo "   http://localhost:8000"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

python3 -m http.server 8000
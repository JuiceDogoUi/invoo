#!/bin/bash

# 🚀 Invoo.es Development Startup Script
echo "🏗️  Starting Invoo.es - Bulletproof VeriFactu SaaS Platform"
echo "======================================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from example..."
    cp .env.local.example .env.local
    echo "⚠️  Please configure your environment variables in .env.local"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run type check
echo "🔍 Running TypeScript check..."
npm run typecheck

# Run linting
echo "🧹 Running ESLint..."
npm run lint

# Start development server
echo "🚀 Starting development server..."
echo "📱 Access your app at: http://localhost:3000"
echo "📊 Dashboard: http://localhost:3000/dashboard"
echo "🔐 Auth: http://localhost:3000/auth"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo "======================================================"

npm run dev
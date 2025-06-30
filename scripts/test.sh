#!/bin/bash

echo "🧪 Testing Invoo.es Application"
echo "================================"

# Test TypeScript compilation
echo "📝 Testing TypeScript..."
npm run typecheck
if [ $? -eq 0 ]; then
    echo "✅ TypeScript: PASSED"
else
    echo "❌ TypeScript: FAILED"
    exit 1
fi

# Test ESLint
echo "🧹 Testing ESLint..."
npm run lint
if [ $? -eq 0 ]; then
    echo "✅ ESLint: PASSED"
else
    echo "❌ ESLint: FAILED"
    exit 1
fi

# Test build
echo "🏗️  Testing build..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build: PASSED"
else
    echo "❌ Build: FAILED"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Your application is ready."
echo ""
echo "🚀 Start development server:"
echo "   npm run dev"
echo ""
echo "🌐 Access your app at:"
echo "   http://localhost:3000"
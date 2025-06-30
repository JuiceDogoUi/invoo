#!/bin/bash

# 🚀 Invoo.es Landing Page Deployment Script

echo "📦 Preparing Invoo.es Landing Page for Deployment"
echo "================================================="

# Create deployment directory
DEPLOY_DIR="invoo-landing-deploy"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

if [ -d "$DEPLOY_DIR" ]; then
    mv "$DEPLOY_DIR" "${DEPLOY_DIR}_backup_${TIMESTAMP}"
fi

mkdir -p "$DEPLOY_DIR"

# Copy landing page files
echo "📁 Copying landing page files..."
cp -r landing/* "$DEPLOY_DIR/"

# Create deployment package
echo "📦 Creating deployment package..."
cd "$DEPLOY_DIR"
zip -r "../invoo-landing-${TIMESTAMP}.zip" .
cd ..

echo ""
echo "✅ Deployment package ready!"
echo ""
echo "📂 Files ready for upload:"
echo "   📁 Directory: ${DEPLOY_DIR}/"
echo "   📦 ZIP file: invoo-landing-${TIMESTAMP}.zip"
echo ""
echo "🌐 Deployment options:"
echo "   1. Upload ${DEPLOY_DIR}/* to your web server"
echo "   2. Extract invoo-landing-${TIMESTAMP}.zip to web root"
echo "   3. Use Netlify/Vercel drag & drop with ZIP file"
echo ""
echo "🔧 Post-deployment checklist:"
echo "   □ Test homepage loading"
echo "   □ Test contact form functionality"
echo "   □ Test mobile responsiveness"
echo "   □ Verify HTTPS is working"
echo "   □ Check all links and buttons"
echo ""
echo "🎯 Your professional landing page is ready!"
echo "   Domain: https://invoo.es"
echo "   Contact: hello@invoo.es"
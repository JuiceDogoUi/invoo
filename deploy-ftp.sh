#!/bin/bash

# FTP Deployment Script for Invoo Landing Page
# Usage: ./deploy-ftp.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting FTP deployment for Invoo Landing Page${NC}"

# Check if config file exists
if [ ! -f "ftp-config.sh" ]; then
    echo -e "${RED}❌ FTP config file not found!${NC}"
    echo -e "${YELLOW}Please create ftp-config.sh with your FTP credentials:${NC}"
    echo ""
    echo "FTP_HOST=\"your-ftp-server.com\""
    echo "FTP_USER=\"your-username\""
    echo "FTP_PASS=\"your-password\""
    echo "FTP_DIR=\"/public_html\""
    echo ""
    exit 1
fi

# Load FTP configuration
source ftp-config.sh

# Validate required variables
if [ -z "$FTP_HOST" ] || [ -z "$FTP_USER" ] || [ -z "$FTP_PASS" ] || [ -z "$FTP_DIR" ]; then
    echo -e "${RED}❌ Missing FTP configuration variables${NC}"
    echo "Please ensure all variables are set in ftp-config.sh"
    exit 1
fi

# Check if landing directory exists
if [ ! -d "landing" ]; then
    echo -e "${RED}❌ Landing directory not found!${NC}"
    echo "Please run this script from the root of your project"
    exit 1
fi

echo -e "${YELLOW}📁 Checking files to upload...${NC}"

# List files that will be uploaded
echo "Files to upload:"
find landing -type f -name "*.html" -o -name "*.css" -o -name "*.js" -o -name "*.txt" -o -name "*.xml" -o -name "*.ico" -o -name "*.png" -o -name "*.webmanifest" -o -name "*.svg" -o -name "*.jpg" -o -name "*.jpeg" | sort

echo ""
echo -e "${YELLOW}🔄 Uploading files via FTP...${NC}"

# Create FTP script
cat > ftp_upload.txt << EOF
open $FTP_HOST
user $FTP_USER $FTP_PASS
binary
cd $FTP_DIR
put landing/index.html index.html
put landing/style.css style.css
put landing/script.js script.js
put landing/tailwind-compiled.css tailwind-compiled.css
put landing/robots.txt robots.txt
put landing/sitemap.xml sitemap.xml
put landing/favicon.ico favicon.ico
put landing/apple-touch-icon.png apple-touch-icon.png
put landing/site.webmanifest site.webmanifest
EOF

# Upload image directory
if [ -d "landing/img" ]; then
    echo "mkdir img" >> ftp_upload.txt
    echo "cd img" >> ftp_upload.txt
    for file in landing/img/*; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            echo "put $file $filename" >> ftp_upload.txt
        fi
    done
    echo "cd .." >> ftp_upload.txt
fi

# Upload docs directory if it exists
if [ -d "landing/docs" ]; then
    echo "mkdir docs" >> ftp_upload.txt
    echo "cd docs" >> ftp_upload.txt
    for file in landing/docs/*; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            echo "put $file $filename" >> ftp_upload.txt
        fi
    done
    echo "cd .." >> ftp_upload.txt
fi

echo "quit" >> ftp_upload.txt

# Execute FTP upload
if ftp -n < ftp_upload.txt; then
    echo -e "${GREEN}✅ FTP upload completed successfully!${NC}"
    echo -e "${BLUE}🌐 Your site should now be live${NC}"
else
    echo -e "${RED}❌ FTP upload failed${NC}"
    echo "Please check your FTP credentials and try again"
    rm -f ftp_upload.txt
    exit 1
fi

# Clean up
rm -f ftp_upload.txt

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${BLUE}Your landing page has been deployed via FTP${NC}"
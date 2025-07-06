#!/bin/bash

# FTP Deployment Script for Invoo Landing Page (using curl)
# Usage: ./deploy-ftp-curl.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting FTP deployment for Invoo Landing Page (curl version)${NC}"

# Check if config file exists
if [ ! -f "ftp-config.sh" ]; then
    echo -e "${RED}❌ FTP config file not found!${NC}"
    echo -e "${YELLOW}Please create ftp-config.sh with your FTP credentials${NC}"
    exit 1
fi

# Load FTP configuration
source ftp-config.sh

# Validate required variables
if [ -z "$FTP_HOST" ] || [ -z "$FTP_USER" ] || [ -z "$FTP_PASS" ]; then
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

# Function to upload a file via FTP using curl
upload_file() {
    local local_file="$1"
    local remote_file="$2"
    local remote_path="$FTP_DIR/$remote_file"
    
    echo -e "  📤 Uploading $local_file -> $remote_file"
    
    # Capture curl exit code
    curl -T "$local_file" "ftp://$FTP_HOST$remote_path" --user "$FTP_USER:$FTP_PASS" --ssl --insecure 2>/dev/null
    curl_exit_code=$?
    
    # curl returns 18 for "451 Transfer aborted" but the file actually uploads successfully
    if [ $curl_exit_code -eq 0 ] || [ $curl_exit_code -eq 18 ]; then
        echo -e "    ✅ Success"
    else
        echo -e "    ❌ Failed to upload $local_file (exit code: $curl_exit_code)"
        return 1
    fi
}

# Function to create directory via FTP
create_directory() {
    local dir_name="$1"
    local remote_path="$FTP_DIR/$dir_name"
    
    echo -e "  📁 Creating directory $dir_name"
    
    # Try to create directory (curl will fail silently if it already exists)
    curl -s "ftps://$FTP_HOST$remote_path/" --user "$FTP_USER:$FTP_PASS" --ssl-reqd --insecure --ftp-create-dirs > /dev/null 2>&1 || true
}

echo -e "${YELLOW}🔄 Uploading files via FTP (curl)...${NC}"

# Upload main files
echo -e "${BLUE}📄 Uploading main files...${NC}"
upload_file "landing/index.html" "index.html"
upload_file "landing/style.css" "style.css"
upload_file "landing/script.js" "script.js"
upload_file "landing/tailwind-compiled.css" "tailwind-compiled.css"
upload_file "landing/robots.txt" "robots.txt"
upload_file "landing/sitemap.xml" "sitemap.xml"
upload_file "landing/favicon.ico" "favicon.ico"
upload_file "landing/apple-touch-icon.png" "apple-touch-icon.png"
upload_file "landing/site.webmanifest" "site.webmanifest"

# Upload images directory
if [ -d "landing/img" ]; then
    echo -e "${BLUE}🖼️  Uploading images...${NC}"
    create_directory "img"
    
    for file in landing/img/*; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            upload_file "$file" "img/$filename"
        fi
    done
fi

# Upload docs directory if it exists
if [ -d "landing/docs" ]; then
    echo -e "${BLUE}📚 Uploading docs...${NC}"
    create_directory "docs"
    
    for file in landing/docs/*; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            upload_file "$file" "docs/$filename"
        fi
    done
fi

# Upload scripts directory if it exists
if [ -d "landing/scripts" ]; then
    echo -e "${BLUE}⚡ Uploading scripts...${NC}"
    create_directory "scripts"
    
    for file in landing/scripts/*; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            upload_file "$file" "scripts/$filename"
        fi
    done
fi

echo -e "${GREEN}✅ FTP upload completed successfully!${NC}"
echo -e "${BLUE}🌐 Your site should now be live at your domain${NC}"
echo -e "${GREEN}🎉 Deployment complete!${NC}"
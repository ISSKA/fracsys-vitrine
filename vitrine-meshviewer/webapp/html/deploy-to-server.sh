#!/bin/bash

# Automated deployment script for FracSYS Webapp to Apache server
# Usage: ./deploy-to-server.sh [user@]hostname

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SERVER="$1"
REMOTE_PATH="/var/www/html"
APACHE_USER="www-data"  # Change to 'apache' for CentOS/RHEL/Fedora

if [ -z "$SERVER" ]; then
    echo -e "${RED}Error: Server hostname required${NC}"
    echo "Usage: $0 [user@]hostname"
    echo "Example: $0 user@fracsys-vitrine.ch"
    exit 1
fi

echo -e "${GREEN}Starting deployment to $SERVER${NC}"
echo ""

# Step 1: Build
echo -e "${YELLOW}Step 1/4: Building project...${NC}"
npm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 2: Deploy files
echo -e "${YELLOW}Step 2/4: Deploying files to server...${NC}"
rsync -avz --delete dist/ "$SERVER:$REMOTE_PATH/"
echo -e "${GREEN}✓ Files deployed${NC}"
echo ""

# Step 3: Fix ownership
echo -e "${YELLOW}Step 3/4: Fixing file ownership...${NC}"
ssh "$SERVER" "sudo chown -R $APACHE_USER:$APACHE_USER $REMOTE_PATH/"
echo -e "${GREEN}✓ Ownership fixed${NC}"
echo ""

# Step 4: Fix permissions
echo -e "${YELLOW}Step 4/4: Fixing file permissions...${NC}"
ssh "$SERVER" "sudo find $REMOTE_PATH/ -type d -exec chmod 755 {} \; && sudo find $REMOTE_PATH/ -type f -exec chmod 644 {} \;"
echo -e "${GREEN}✓ Permissions fixed${NC}"
echo ""

# Verification
echo -e "${YELLOW}Verifying deployment...${NC}"
ssh "$SERVER" "ls -la $REMOTE_PATH/ && ls -la $REMOTE_PATH/assets/"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Site: https://fracsys-vitrine.ch"
echo "Remember to clear browser cache (Ctrl+Shift+R) to see changes"

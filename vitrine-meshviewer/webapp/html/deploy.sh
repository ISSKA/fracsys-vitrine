#!/bin/bash

# Deployment script for FracSYS Webapp
# This script builds the project and prepares it for deployment to Apache

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

echo "🏗️  Building project with Vite..."
npm run build

echo "✅ Build complete!"
echo ""
echo "📦 Unified deployment files ready in: $REPO_ROOT/dist/"
echo ""
echo "To deploy to Apache server:"
echo "1. Copy the contents of ./dist/ to /var/www/html/ on your server"
echo ""
echo "Commands:"
echo "  # Using rsync (recommended):"
echo "  rsync -avz --delete dist/ user@server:/var/www/html/"
echo ""
echo "  # Or using scp:"
echo "  scp -r dist/* user@server:/var/www/html/"
echo ""
echo "⚠️  Important: Copy the CONTENTS of dist/, not the dist folder itself!"
echo "    Correct:   /var/www/html/index.html"
echo "    Correct:   /var/www/html/assets/..."
echo "    Wrong:     /var/www/html/dist/index.html"

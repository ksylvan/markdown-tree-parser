#!/bin/bash

# Setup script for markdown-tree-parser package
echo "🚀 Setting up markdown-tree-parser package..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &>/dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
MIN_ACCEPTED_VERSION=18
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt ${MIN_ACCEPTED_VERSION} ]; then
    echo -e "${RED}❌ Node.js version ${MIN_ACCEPTED_VERSION} or higher is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed successfully${NC}"

# Make CLI executable
chmod +x bin/md-tree.js

# Run tests to make sure everything works
echo -e "${BLUE}🧪 Running tests...${NC}"
npm test

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Some tests failed, but installation can continue${NC}"
else
    echo -e "${GREEN}✅ All tests passed${NC}"
fi

# Create symlink for development
echo -e "${BLUE}🔗 Creating development symlink...${NC}"
npm link

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Global symlink created! You can now use 'md-tree' command${NC}"
else
    echo -e "${YELLOW}⚠️  Global symlink failed. You can still use: node bin/md-tree.js${NC}"
fi

echo -e "\n${GREEN}🎉 Setup complete!${NC}"
echo ""
echo -e "${BLUE}📖 Try these commands:${NC}"
echo "  md-tree help"
echo "  md-tree list test/sample.md"
echo "  md-tree tree test/sample.md"
echo "  md-tree extract test/sample.md 'Installation'"
echo "  md-tree extract-all test/sample.md 2 --output ./sections"
echo ""
echo -e "${BLUE}📚 Library usage:${NC}"
echo "  node examples/usage.js"
echo ""
echo -e "${BLUE}📝 Documentation:${NC}"
echo "  cat README.md"
echo ""

# Optional: Show package info
echo -e "${BLUE}📋 Package Information:${NC}"
echo "  Name: $(node -p "require('./package.json').name")"
echo "  Version: $(node -p "require('./package.json').version")"
echo "  Description: $(node -p "require('./package.json').description")"
echo ""

# Optional: Run a quick demo
read -p "🎯 Run a quick demo? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🎬 Running demo...${NC}"
    echo ""
    echo "=== Document Structure ==="
    md-tree tree test/sample.md
    echo ""
    echo "=== Extract Installation Section ==="
    md-tree extract test/sample.md "Installation"
    echo ""
    echo -e "${GREEN}✨ Demo completed!${NC}"
fi

echo ""
echo -e "${GREEN}🎯 Ready to parse some markdown!${NC}"
echo -e "${BLUE}💡 For help anytime: md-tree help${NC}"

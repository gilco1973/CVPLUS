#!/bin/bash

# Script to rename project to getmycv.ai and setup git repository

echo "🚀 Setting up getmycv.ai project..."

# Get the current directory
CURRENT_DIR=$(pwd)
PARENT_DIR=$(dirname "$CURRENT_DIR")

echo "📁 Current directory: $CURRENT_DIR"
echo "📁 Parent directory: $PARENT_DIR"

# Instructions for manual steps
echo ""
echo "⚠️  Please run these commands manually:"
echo ""
echo "1️⃣  Rename the project directory:"
echo "   cd $PARENT_DIR"
echo "   mv onecv getmycv"
echo "   cd getmycv"
echo ""
echo "2️⃣  Initialize git and set remote:"
echo "   git init"
echo "   git remote add origin git@github.com:gilco1973/getmycv.git"
echo ""
echo "3️⃣  Create initial commit:"
echo "   git add ."
echo "   git commit -m 'Initial commit: getmycv.ai - AI-powered CV creator'"
echo ""
echo "4️⃣  Push to GitHub:"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "✅ After running these commands, your project will be set up!"
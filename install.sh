#!/bin/bash

# clawgate Installation Script
# Ensures cloudflared is present and sets up the plugin environment.

set -e

echo "🛡️  Checking system requirements for clawgate..."

# If we are running this via curl | bash, we need to clone the repo first
if [ ! -f "plugin.json" ]; then
    echo "🌐 Remote installation detected. Cloning clawgate repository..."
    if command -v git &> /dev/null; then
        git clone https://github.com/muhammedilyasy/clawgate.git clawgate-plugin
        cd clawgate-plugin
    else
        echo "❌ git is required for remote installation."
        exit 1
    fi
fi

# Check for cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "⚠️  cloudflared not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install cloudflare/cloudflare/cloudflared
        else
            echo "❌ Homebrew not found. Please install manually: https://pkg.cloudflare.com/cloudflared-ascii.repo"
            exit 1
        fi
    else
        # Linux detection and install
        curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
        chmod +x cloudflared
        sudo mv cloudflared /usr/local/bin/
    fi
else
    echo "✅ cloudflared is already installed."
fi

# Install dependencies
echo "📦 Installing plugin dependencies..."
cp plugin-package.json package.json
npm install

# Build the plugin
echo "🏗️  Building clawgate..."
npm run build

echo "🚀 clawgate is ready! Register this plugin in your openclaw.config.json."
echo "   Plugin Path: $(pwd)"

#!/bin/bash

# Get the encryption key from .env file
ENCRYPTION_KEY=$(grep ENCRYPTION_KEY .env | cut -d '=' -f2)

if [ -z "$ENCRYPTION_KEY" ]; then
    echo "Error: Could not find ENCRYPTION_KEY in .env file"
    exit 1
fi

echo "Found encryption key: ${ENCRYPTION_KEY:0:8}..."

# Export the encryption key
export ENCRYPTION_KEY

# Read the Gemini API key from the user
echo "Please enter your Gemini API key (starts with 'AI'):"
read -r GEMINI_API_KEY

# Validate the Gemini API key format
if [[ ! $GEMINI_API_KEY =~ ^AI ]]; then
    echo "Error: Gemini API key must start with 'AI'"
    exit 1
fi

if [[ ${#GEMINI_API_KEY} -lt 20 ]]; then
    echo "Error: Gemini API key must be at least 20 characters long"
    exit 1
fi

# Export the Gemini API key
export GEMINI_API_KEY

# Run the fix-key script
node scripts/fix-key.js

# Start the service
cd ../..
yarn dev 
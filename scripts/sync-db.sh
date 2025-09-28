#!/bin/bash

# Script to sync database from local development to public folder for deployment

echo "Syncing database to public folder for deployment..."

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if local database exists
LOCAL_DB="$PROJECT_ROOT/frontend/database/database.sqlite"
PUBLIC_DB="$PROJECT_ROOT/frontend/public/database.sqlite"

if [ ! -f "$LOCAL_DB" ]; then
    echo "Error: Local database not found at $LOCAL_DB"
    exit 1
fi

# Copy database to public folder
cp "$LOCAL_DB" "$PUBLIC_DB"

if [ $? -eq 0 ]; then
    echo "✅ Database successfully copied to $PUBLIC_DB"
    echo "Don't forget to commit this file for deployment!"
else
    echo "❌ Failed to copy database"
    exit 1
fi
#!/bin/bash
# Launcher script for BigQuery Release Notes Web App

# Navigate to the script's directory
cd "$(dirname "$0")"

# Activate the virtual environment
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
else
    echo "Error: virtual environment 'venv' not found. Please set it up first."
    exit 1
fi

# Run the Flask app
echo "Starting Flask Server..."
python3 app.py

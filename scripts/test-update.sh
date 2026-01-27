#!/bin/bash

# Check if update-body.json exists
if [ ! -f "scripts/update-body.json" ]; then
  echo "Error: scripts/update-body.json not found"
  echo "Please copy scripts/update-body.json.example to scripts/update-body.json and fill in your userkey"
  exit 1
fi

# Make the POST request
curl -X POST http://localhost:3000/update \
  -H "Content-Type: application/json" \
  -d @scripts/update-body.json

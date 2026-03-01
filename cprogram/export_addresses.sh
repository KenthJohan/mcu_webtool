#!/bin/bash

# Script to export symbol addresses from compiled main.c to address.json

BINARY="./a.out"
OUTPUT="address.json"

# Check if binary exists
if [ ! -f "$BINARY" ]; then
    echo "Error: $BINARY not found. Please compile main.c first."
    echo "Run: gcc -g main.c"
    exit 1
fi

# Extract symbols using nm and format as JSON
echo "Extracting symbol addresses from $BINARY..."

# Create JSON output
echo "{" > "$OUTPUT"
echo '  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",' >> "$OUTPUT"
echo '  "binary": "'$BINARY'",' >> "$OUTPUT"
echo '  "symbols": {' >> "$OUTPUT"

# Get all symbols (functions, objects, etc.) with their addresses
# Filter out undefined symbols and format as JSON
first=true
nm -n "$BINARY" | while read -r addr type name; do
    # Skip empty lines
    [ -z "$addr" ] && continue
    
    # Skip undefined symbols (type 'U')
    [ "$type" = "U" ] && continue
    
    # Add comma before all entries except the first
    if [ "$first" = true ]; then
        first=false
        echo -n "    \"$name\": {" >> "$OUTPUT"
    else
        echo "," >> "$OUTPUT"
        echo -n "    \"$name\": {" >> "$OUTPUT"
    fi
    
    # Add address and type
    echo -n "\"address\": \"0x$addr\", \"type\": \"$type\"}" >> "$OUTPUT"
done

echo "" >> "$OUTPUT"
echo "  }" >> "$OUTPUT"
echo "}" >> "$OUTPUT"

# Pretty print with Python if available
if command -v python3 &> /dev/null; then
    python3 -c "
import json
with open('$OUTPUT', 'r') as f:
    data = json.load(f)
with open('$OUTPUT', 'w') as f:
    json.dump(data, f, indent=2)
"
fi

echo "Symbol addresses exported to $OUTPUT"
echo ""
echo "Key symbols found:"
grep -E "examples|main|Person" "$OUTPUT" || echo "No key symbols found"

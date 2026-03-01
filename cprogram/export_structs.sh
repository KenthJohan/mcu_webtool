#!/bin/bash

# Script to export struct layouts from compiled main.c to structs.json

BINARY="./a.out"
SOURCE="main.c"
OUTPUT="structs.json"

# Check if binary exists
if [ ! -f "$BINARY" ]; then
    echo "Error: $BINARY not found. Compiling with debug symbols..."
    gcc -g "$SOURCE" -o "$BINARY"
    if [ $? -ne 0 ]; then
        echo "Compilation failed!"
        exit 1
    fi
fi

echo "Extracting struct layouts from $BINARY..."

# Method 1: Try using pahole if available (cleanest output)
if command -v pahole &> /dev/null; then
    echo "Using pahole to extract struct information..."
    
    # Get struct info and convert to JSON
    python3 << 'PYTHON_EOF'
import subprocess
import json
import re
from datetime import datetime

try:
    # Run pahole to get struct information
    result = subprocess.run(['pahole', './a.out'], capture_output=True, text=True)
    output = result.stdout
    
    structs = {}
    current_struct = None
    current_fields = []
    
    for line in output.split('\n'):
        # Match struct definition: "struct StructName {"
        struct_match = re.match(r'^struct\s+(\w+)\s+{', line)
        if struct_match:
            if current_struct:
                structs[current_struct]['fields'] = current_fields
            current_struct = struct_match.group(1)
            current_fields = []
            structs[current_struct] = {
                'name': current_struct,
                'fields': []
            }
            continue
        
        # Match field: "    type        name;                /*  offset  size */"
        field_match = re.match(r'\s+(.+?)\s+(\w+);\s+/\*\s+(\d+)\s+(\d+)\s+\*/', line)
        if field_match and current_struct:
            field_type = field_match.group(1).strip()
            field_name = field_match.group(2)
            offset = int(field_match.group(3))
            size = int(field_match.group(4))
            
            current_fields.append({
                'name': field_name,
                'type': field_type,
                'offset': offset,
                'size': size
            })
            continue
        
        # Match struct size: "}; /* size: 56 */"
        size_match = re.match(r'}\;\s+/\*\s+size:\s+(\d+)', line)
        if size_match and current_struct:
            structs[current_struct]['size'] = int(size_match.group(1))
            structs[current_struct]['fields'] = current_fields
            current_struct = None
            current_fields = []
    
    # Create output JSON
    output_data = {
        'timestamp': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
        'binary': './a.out',
        'source': 'main.c',
        'structs': structs
    }
    
    with open('structs.json', 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"Struct layouts exported to structs.json")
    print(f"Found {len(structs)} struct(s)")
    
except Exception as e:
    print(f"Error using pahole: {e}")
    exit(1)

PYTHON_EOF

else
    # Method 2: Use GDB if pahole not available
    echo "pahole not found, using GDB to extract struct information..."
    
    python3 << 'PYTHON_EOF'
import subprocess
import json
import re
from datetime import datetime

# Create GDB script to extract struct info
gdb_commands = """
set pagination off
set print pretty on
ptype struct Person
quit
"""

try:
    # Run GDB with commands
    result = subprocess.run(
        ['gdb', '-batch', '-ex', 'file ./a.out', '-ex', 'ptype struct Person'],
        capture_output=True,
        text=True
    )
    
    output = result.stdout
    
    structs = {}
    
    # Parse GDB output for struct Person
    # Format: type = struct Person {
    #     char name[50];
    #     int age;
    # }
    
    if 'type = struct Person' in output:
        struct_name = 'Person'
        structs[struct_name] = {
            'name': struct_name,
            'fields': []
        }
        
        # Extract fields
        lines = output.split('\n')
        in_struct = False
        offset = 0
        
        for line in lines:
            if 'type = struct Person' in line:
                in_struct = True
                continue
            
            if in_struct and '}' in line:
                break
            
            if in_struct and line.strip():
                # Parse field: "    type name;" or "    type name[size];"
                field_match = re.match(r'(\w+)\s+(\w+)(\[\d+\])?;', line.strip())
                if field_match:
                    field_type = field_match.group(1)
                    field_name = field_match.group(2)
                    array_size = field_match.group(3) if field_match.group(3) else ''
                    
                    # Estimate size based on type
                    type_sizes = {
                        'char': 1,
                        'int': 4,
                        'short': 2,
                        'long': 8,
                        'float': 4,
                        'double': 8
                    }
                    
                    base_size = type_sizes.get(field_type, 4)
                    
                    # If array, multiply by array size
                    if array_size:
                        array_count = int(array_size.strip('[]'))
                        field_size = base_size * array_count
                        full_type = f"{field_type}{array_size}"
                    else:
                        field_size = base_size
                        full_type = field_type
                    
                    structs[struct_name]['fields'].append({
                        'name': field_name,
                        'type': full_type,
                        'offset': offset,
                        'size': field_size
                    })
                    
                    offset += field_size
        
        # Round up to alignment (usually 4 or 8 bytes)
        alignment = 4
        total_size = ((offset + alignment - 1) // alignment) * alignment
        structs[struct_name]['size'] = total_size
    
    # Create output JSON
    output_data = {
        'timestamp': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
        'binary': './a.out',
        'source': 'main.c',
        'structs': structs
    }
    
    with open('structs.json', 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"Struct layouts exported to structs.json")
    print(f"Found {len(structs)} struct(s)")
    
except Exception as e:
    print(f"Error using GDB: {e}")
    exit(1)

PYTHON_EOF

fi

echo ""
echo "Contents of structs.json:"
cat "$OUTPUT"

// Load and expand symbol reflection data
async function loadReflectionData() {
    const response = await fetch('test.json');
    const data = await response.json();
    return data;
}

// Expand a symbol and its nested members recursively
function expandSymbol(symbol, types, baseAddress = null, prefix = '') {
    const results = [];
    const address = baseAddress !== null ? baseAddress : symbol.address;
    
    // Add the symbol itself if it has a type_ref
    if (symbol.type_ref !== null && symbol.type_ref !== undefined) {
        const type = types[symbol.type_ref];
        
        // Count children recursively
        const childrenCount = type && type.members ? countChildren(type, types) : 0;
        
        results.push({
            name: prefix + symbol.name,
            address: address,
            type_ref: symbol.type_ref,
            ...(symbol.array_count && { count: symbol.array_count }),
            ...(childrenCount > 0 && { children_count: childrenCount })
        });
        
        // Expand members if it's a struct/composite type
        if (type && type.members) {
            for (const member of type.members) {
                const memberAddress = address + member.offset;
                const memberSymbol = {
                    name: member.name,
                    address: memberAddress,
                    type_ref: member.type_ref,
                    array_count: member.count
                };
                
                // Recursively expand nested structures
                const expanded = expandSymbol(memberSymbol, types, memberAddress, '');
                results.push(...expanded);
            }
        }
    }
    
    return results;
}

// Count total children (all descendants) for a type
function countChildren(type, types) {
    if (!type.members) return 0;
    
    let count = 0;
    for (const member of type.members) {
        count++; // Count this member
        
        // If member has a composite type, count its children too
        if (member.type_ref !== null && member.type_ref !== undefined) {
            const memberType = types[member.type_ref];
            if (memberType && memberType.members) {
                count += countChildren(memberType, types);
            }
        }
    }
    return count;
}

// Main function to expand all symbols
function expandAllSymbols(data) {
    const expanded = [];
    
    for (const symbol of data.symbols) {
        // Only expand symbols that have type_ref and are actual variables (not FILE, etc.)
        if (symbol.type_ref !== null && 
            symbol.type_ref !== undefined && 
            symbol.type === 'OBJECT') {
            const symbolExpanded = expandSymbol(symbol, data.types);
            expanded.push(...symbolExpanded);
            
            // Add blank line between different root symbols for readability
            if (symbolExpanded.length > 1) {
                expanded.push(null); // Separator
            }
        }
    }
    
    return expanded.filter(item => item !== null);
}

// Format output for display
function formatOutput(expanded) {
    return expanded.map(item => {
        const parts = [`name: "${item.name}"`, `address: ${item.address}`, `type_ref: ${item.type_ref}`];
        if (item.count) parts.push(`count: ${item.count}`);
        if (item.children_count) parts.push(`children_count: ${item.children_count}`);
        return `{${parts.join(', ')}}`;
    }).join(',\n');
}

// Display results in the page
function displayResults(expanded, data) {
    const output = document.getElementById('output');
    const pre = document.createElement('pre');
    
    let text = '[\n';
    
    // Group by root symbol
    let currentRoot = null;
    for (let i = 0; i < expanded.length; i++) {
        const item = expanded[i];
        
        // Detect new root (no offset calculation in address display)
        const isRoot = data.symbols.find(s => s.address === item.address && s.name === item.name);
        if (isRoot && currentRoot !== item.name) {
            if (currentRoot !== null) {
                text += '\n';
            }
            currentRoot = item.name;
        }
        
        const parts = [`name: "${item.name}"`, `address: ${item.address}`, `type_ref: ${item.type_ref}`];
        if (item.count) parts.push(`count: ${item.count}`);
        if (item.children_count) parts.push(`children_count: ${item.children_count}`);
        
        text += `  {${parts.join(', ')}}`;
        if (i < expanded.length - 1) text += ',';
        text += '\n';
    }
    
    text += ']';
    
    pre.textContent = text;
    output.appendChild(pre);
    
    console.log('Expanded symbols:', expanded);
}

// Init on page load
async function init() {
    try {
        const data = await loadReflectionData();
        console.log('Loaded data:', data);
        
        const expanded = expandAllSymbols(data);
        console.log('Expanded:', expanded);
        
        displayResults(expanded, data);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('output').textContent = 'Error loading data: ' + error.message;
    }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

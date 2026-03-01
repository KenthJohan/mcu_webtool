#!/usr/bin/env python3
"""
Export symbol information (name, address, type) from a compiled binary.
Supports ELF binaries without requiring gdb.
"""

import sys
import json
import re
from pathlib import Path

try:
    from elftools.elf.elffile import ELFFile
    from elftools.dwarf.descriptions import describe_form_class
    ELFTOOLS_AVAILABLE = True
except ImportError:
    ELFTOOLS_AVAILABLE = False


def get_variable_types_from_dwarf(binary_path):
    """
    Extract variable type information from DWARF debug information.
    
    Returns a dict mapping variable names to their types
    """
    var_types = {}
    
    with open(binary_path, 'rb') as f:
        elf = ELFFile(f)
        
        if not elf.has_dwarf_info():
            return var_types
        
        dwarfinfo = elf.get_dwarf_info()
        type_cache = {}  # Cache for type lookups

        def get_int_attr(die, attr_name):
            """Safely read an integer DWARF attribute value from a DIE."""
            attr = die.attributes.get(attr_name)
            if not attr:
                return None
            value = attr.value
            return value if isinstance(value, int) else None
        
        def get_type_name(die, dwarfinfo):
            """Recursively get the type name for a DIE"""
            if die.offset in type_cache:
                return type_cache[die.offset]
            
            if die.tag == 'DW_TAG_base_type':
                name = die.attributes.get('DW_AT_name')
                return name.value.decode('utf-8') if name else 'unknown'
            
            elif die.tag == 'DW_TAG_pointer_type':
                type_attr = die.attributes.get('DW_AT_type')
                if type_attr:
                    ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
                    base_type = get_type_name(ref_die, dwarfinfo)
                    return f"{base_type} *"
                return "void *"
            
            elif die.tag == 'DW_TAG_array_type':
                type_attr = die.attributes.get('DW_AT_type')
                if type_attr:
                    ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
                    base_type = get_type_name(ref_die, dwarfinfo)
                    dims = []
                    if die.has_children:
                        for child in die.iter_children():
                            if child.tag != 'DW_TAG_subrange_type':
                                continue

                            count = get_int_attr(child, 'DW_AT_count')
                            if count is not None:
                                dims.append(str(count))
                                continue

                            upper = get_int_attr(child, 'DW_AT_upper_bound')
                            if upper is None:
                                dims.append('')
                                continue

                            lower = get_int_attr(child, 'DW_AT_lower_bound')
                            if lower is None:
                                lower = 0
                            dims.append(str((upper - lower) + 1))

                    if not dims:
                        return f"{base_type}[]"
                    return f"{base_type}{''.join(f'[{d}]' for d in dims)}"
                return "unknown[]"
            
            elif die.tag == 'DW_TAG_structure_type':
                name = die.attributes.get('DW_AT_name')
                if name:
                    return f"struct {name.value.decode('utf-8')}"
                return "struct <anonymous>"
            
            elif die.tag == 'DW_TAG_typedef':
                name = die.attributes.get('DW_AT_name')
                if name:
                    return name.value.decode('utf-8')
                return "typedef"
            
            else:
                type_attr = die.attributes.get('DW_AT_type')
                if type_attr:
                    try:
                        ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
                        return get_type_name(ref_die, dwarfinfo)
                    except:
                        pass
                return die.tag.replace('DW_TAG_', '')
        
        for CU in dwarfinfo.iter_CUs():
            for DIE in CU.iter_DIEs():
                # Look for variable declarations
                if DIE.tag in ('DW_TAG_variable', 'DW_TAG_formal_parameter'):
                    var_name = DIE.attributes.get('DW_AT_name')
                    if var_name:
                        name = var_name.value.decode('utf-8')
                        type_attr = DIE.attributes.get('DW_AT_type')
                        
                        if type_attr:
                            try:
                                type_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
                                var_type = get_type_name(type_die, dwarfinfo)
                                var_types[name] = var_type
                                type_cache[DIE.offset] = var_type
                            except:
                                pass
    
    return var_types


def get_symbols_from_elf(binary_path, var_types=None, include_undefined=False):
    """
    Extract symbols from an ELF binary using pyelftools.
    
    Returns a list of dicts with keys: name, address, type, binding, size, dwarf_type
    By default, excludes undefined/imported symbols (SHN_UNDEF) because they
    do not have a resolved address in the current binary image.
    """
    if not ELFTOOLS_AVAILABLE:
        raise ImportError("pyelftools is required. Install with: pip install pyelftools")
    
    if var_types is None:
        var_types = {}
    
    symbols = []

    def get_array_count(dwarf_type):
        if not isinstance(dwarf_type, str):
            return None

        dims = re.findall(r'\[(\d+)\]', dwarf_type)
        if not dims:
            return None

        count = 1
        for dim in dims:
            count *= int(dim)
        return count
    
    with open(binary_path, 'rb') as f:
        elf = ELFFile(f)
        
        # Get symbol table
        for section in elf.iter_sections():
            if section.name == '.symtab' or section.name == '.dynsym':
                for symbol in section.iter_symbols():
                    # Skip empty entries
                    if not symbol.name:
                        continue
                    
                    # Map type constants to readable strings
                    symbol_type = symbol['st_info']['bind']  # LOCAL, GLOBAL, WEAK
                    symbol_kind = symbol['st_info']['type']  # NOTYPE, OBJECT, FUNC, SECTION, FILE, etc.
                    
                    # Create a readable type string
                    if symbol_kind == 'STT_FUNC':
                        kind_str = 'FUNCTION'
                    elif symbol_kind == 'STT_OBJECT':
                        kind_str = 'OBJECT'
                    elif symbol_kind == 'STT_NOTYPE':
                        kind_str = 'NOTYPE'
                    else:
                        kind_str = symbol_kind.replace('STT_', '')
                    
                    # Handle section index (can be int or string constant like 'SHN_UNDEF')
                    section_index = symbol['st_shndx']
                    is_undefined = section_index == 'SHN_UNDEF' or section_index == 0
                    if is_undefined and not include_undefined:
                        continue

                    if isinstance(section_index, str):
                        section_name = section_index
                    elif section_index == 0:
                        section_name = 'UNDEF'
                    else:
                        try:
                            section_name = elf.get_section(section_index).name
                        except:
                            section_name = 'UNKNOWN'
                    
                    # Get DWARF type if available
                    dwarf_type = var_types.get(symbol.name, None)
                    
                    symbols.append({
                        'name': symbol.name,
                        'address': f'0x{symbol["st_value"]:016x}',
                        'type': kind_str,
                        'binding': symbol_type,
                        'size': symbol['st_size'],
                        'section': section_name,
                        'dwarf_type': dwarf_type,
                        'array_count': get_array_count(dwarf_type)
                    })
    
    return symbols


def get_struct_types_from_dwarf(binary_path):
    """
    Extract struct type definitions from DWARF debug information.
    
    Returns a list of dicts with struct information including members and sizes
    """
    struct_types = []
    
    with open(binary_path, 'rb') as f:
        elf = ELFFile(f)
        
        if not elf.has_dwarf_info():
            return struct_types
        
        dwarfinfo = elf.get_dwarf_info()
        
        for CU in dwarfinfo.iter_CUs():
            for DIE in CU.iter_DIEs():
                # Look for structure type definitions
                if DIE.tag == 'DW_TAG_structure_type':
                    struct_name = DIE.attributes.get('DW_AT_name')
                    struct_size = DIE.attributes.get('DW_AT_byte_size')
                    
                    name = struct_name.value.decode('utf-8') if struct_name else '<anonymous>'
                    size = struct_size.value if struct_size else 0
                    
                    # Extract members
                    members = []
                    if DIE.has_children:
                        for child in DIE.iter_children():
                            if child.tag == 'DW_TAG_member':
                                member_name = child.attributes.get('DW_AT_name')
                                member_type = child.attributes.get('DW_AT_type')
                                member_offset = child.attributes.get('DW_AT_data_member_location')
                                
                                if member_name:
                                    m_name = member_name.value.decode('utf-8')
                                    m_offset = member_offset.value if member_offset else 0
                                    
                                    members.append({
                                        'name': m_name,
                                        'offset': m_offset
                                    })
                    
                    struct_types.append({
                        'name': name,
                        'size': size,
                        'members': members,
                        'member_count': len(members)
                    })
    
    return struct_types


def export_to_json(symbols=None, struct_types=None, output_file=None):
    """Export symbols and struct types to JSON format."""
    output = {}

    struct_name_to_index = {}
    if struct_types:
        for idx, struct in enumerate(struct_types):
            struct_name = struct.get('name')
            if struct_name:
                struct_name_to_index[struct_name] = idx

    if symbols:
        json_symbols = []
        for sym in symbols:
            json_sym = dict(sym)
            struct_type_index = None
            dwarf_type = json_sym.get('dwarf_type')
            if isinstance(dwarf_type, str) and dwarf_type.startswith('struct '):
                struct_name = dwarf_type[len('struct '):]
                struct_name = struct_name.split('[', 1)[0]
                struct_type_index = struct_name_to_index.get(struct_name)
            json_sym['struct_type'] = struct_type_index
            json_symbols.append(json_sym)

        output['symbols'] = json_symbols
        output['symbol_count'] = len(json_symbols)
    
    if struct_types:
        output['struct_types'] = struct_types
        output['struct_count'] = len(struct_types)
    
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(output, f, indent=2)
        print(f"Exported {len(symbols or [])} symbols and {len(struct_types or [])} struct types to {output_file}")
    else:
        print(json.dumps(output, indent=2))
    
    return output


def export_to_csv(symbols=None, struct_types=None, output_file=None):
    """Export symbols and struct types to CSV format."""
    if not output_file:
        output_file = 'symbols.csv'
    
    with open(output_file, 'w') as f:
        if symbols:
            f.write("=== SYMBOLS ===\n")
            f.write("Name,Address,ELF Type,Data Type,Binding,Size,Section\n")
            for sym in symbols:
                dwarf_type = sym.get('dwarf_type') or '-'
                f.write(f"{sym['name']},0x{sym['address']:x},{sym['type']},{dwarf_type},{sym['binding']},{sym['size']},{sym['section']}\n")
            f.write("\n")
        
        if struct_types:
            f.write("=== STRUCT TYPES ===\n")
            f.write("Struct Name,Size,Member Count\n")
            for st in struct_types:
                f.write(f"{st['name']},{st['size']},{st['member_count']}\n")
                if st['members']:
                    f.write(f"  Members:\n")
                    for member in st['members']:
                        f.write(f"    {member['name']} (offset: {member['offset']})\n")
    
    total_syms = len(symbols or [])
    total_structs = len(struct_types or [])
    print(f"Exported {total_syms} symbols and {total_structs} struct types to {output_file}")


def export_to_text(symbols=None, struct_types=None, output_file=None):
    """Export symbols and struct types to a formatted text file."""
    lines = []
    
    if symbols:
        lines.append("Symbol Information Export")
        lines.append("=" * 120)
        lines.append(f"{'Name':<40} {'Address':<12} {'ELF Type':<10} {'Data Type':<30}")
        lines.append("-" * 120)
        
        for sym in symbols:
            dwarf_type = sym.get('dwarf_type') or '-'
            lines.append(f"{sym['name']:<40} 0x{sym['address']:08x}   {sym['type']:<10} {dwarf_type:<30}")
    
    if struct_types:
        if symbols:
            lines.append("\n")
        lines.append("Struct Type Definitions")
        lines.append("=" * 120)
        
        for struct in struct_types:
            lines.append(f"\nstruct {struct['name']} (size: {struct['size']} bytes)")
            lines.append("-" * 80)
            if struct['members']:
                for member in struct['members']:
                    lines.append(f"  +{member['offset']:04d}  {member['name']}")
            else:
                lines.append("  (no members)")
    
    output = "\n".join(lines)
    
    if output_file:
        with open(output_file, 'w') as f:
            f.write(output)
        total_syms = len(symbols or [])
        total_structs = len(struct_types or [])
        print(f"Exported {total_syms} symbols and {total_structs} struct types to {output_file}")
    else:
        print(output)
    
    return output


def main():
    if len(sys.argv) < 2:
        print("Usage: export_reflection.py <binary> [--format json|csv|text] [--output file] [--symbols|--types|--all] [--include-undef]")
        print("\nExample:")
        print("  export_reflection.py ./a.out --format json --output symbols.json")
        print("  export_reflection.py ./a.out --format text --types")
        print("  export_reflection.py ./a.out --format json --all")
        sys.exit(1)
    
    binary_path = sys.argv[1]
    output_format = 'json'
    output_file = None
    export_type = 'all'  # 'symbols', 'types', or 'all'
    include_undefined = False
    
    # Parse arguments
    args = sys.argv[2:]
    i = 0
    while i < len(args):
        if args[i] == '--format' and i + 1 < len(args):
            output_format = args[i + 1]
            i += 2
        elif args[i] == '--output' and i + 1 < len(args):
            output_file = args[i + 1]
            i += 2
        elif args[i] == '--symbols':
            export_type = 'symbols'
            i += 1
        elif args[i] == '--types':
            export_type = 'types'
            i += 1
        elif args[i] == '--all':
            export_type = 'all'
            i += 1
        elif args[i] == '--include-undef':
            include_undefined = True
            i += 1
        else:
            i += 1
    
    # Check if binary exists
    if not Path(binary_path).exists():
        print(f"Error: Binary file '{binary_path}' not found")
        sys.exit(1)
    
    # Extract data based on export_type
    symbols = None
    struct_types = None
    
    print(f"Reading from: {binary_path}", file=sys.stderr)
    
    if export_type in ('symbols', 'all'):
        print(f"Extracting variable types from DWARF...", file=sys.stderr)
        var_types = get_variable_types_from_dwarf(binary_path)
        print(f"Found {len(var_types)} variable type definitions", file=sys.stderr)
        
        print(f"Extracting symbols...", file=sys.stderr)
        symbols = get_symbols_from_elf(binary_path, var_types, include_undefined=include_undefined)
        print(f"Found {len(symbols)} symbols", file=sys.stderr)
    
    if export_type in ('types', 'all'):
        print(f"Extracting struct types from DWARF...", file=sys.stderr)
        struct_types = get_struct_types_from_dwarf(binary_path)
        print(f"Found {len(struct_types)} struct types", file=sys.stderr)
    
    # Export in requested format
    if output_format == 'json':
        export_to_json(symbols, struct_types, output_file or 'symbols.json')
    elif output_format == 'csv':
        export_to_csv(symbols, struct_types, output_file or 'symbols.csv')
    elif output_format == 'text':
        export_to_text(symbols, struct_types, output_file or 'symbols.txt')
    else:
        print(f"Error: Unknown format '{output_format}'. Choose: json, csv, text")
        sys.exit(1)


if __name__ == '__main__':
    main()

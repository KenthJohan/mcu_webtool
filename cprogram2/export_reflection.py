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


def get_int_attr(die, attr_name):
    """Safely read an integer DWARF attribute value from a DIE."""
    attr = die.attributes.get(attr_name)
    if not attr:
        return None
    value = attr.value
    return value if isinstance(value, int) else None


def resolve_type_name(die, dwarfinfo, type_cache):
    """Recursively resolve a readable type name for a DIE."""
    if die is None:
        return 'unknown'

    if die.offset in type_cache:
        return type_cache[die.offset]

    if die.tag == 'DW_TAG_base_type':
        name = die.attributes.get('DW_AT_name')
        resolved = name.value.decode('utf-8') if name else 'unknown'

    elif die.tag == 'DW_TAG_pointer_type':
        type_attr = die.attributes.get('DW_AT_type')
        if type_attr:
            ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
            base_type = resolve_type_name(ref_die, dwarfinfo, type_cache)
            resolved = f"{base_type} *"
        else:
            resolved = "void *"

    elif die.tag == 'DW_TAG_reference_type':
        type_attr = die.attributes.get('DW_AT_type')
        if type_attr:
            ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
            base_type = resolve_type_name(ref_die, dwarfinfo, type_cache)
            resolved = f"{base_type} &"
        else:
            resolved = "unknown &"

    elif die.tag == 'DW_TAG_rvalue_reference_type':
        type_attr = die.attributes.get('DW_AT_type')
        if type_attr:
            ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
            base_type = resolve_type_name(ref_die, dwarfinfo, type_cache)
            resolved = f"{base_type} &&"
        else:
            resolved = "unknown &&"

    elif die.tag == 'DW_TAG_array_type':
        type_attr = die.attributes.get('DW_AT_type')
        if type_attr:
            ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
            base_type = resolve_type_name(ref_die, dwarfinfo, type_cache)
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
                resolved = f"{base_type}[]"
            else:
                resolved = f"{base_type}{''.join(f'[{d}]' for d in dims)}"
        else:
            resolved = "unknown[]"

    elif die.tag == 'DW_TAG_structure_type':
        name = die.attributes.get('DW_AT_name')
        if name:
            resolved = f"struct {name.value.decode('utf-8')}"
        else:
            resolved = f"struct <anonymous@0x{die.offset:x}>"

    elif die.tag == 'DW_TAG_union_type':
        name = die.attributes.get('DW_AT_name')
        if name:
            resolved = f"union {name.value.decode('utf-8')}"
        else:
            resolved = f"union <anonymous@0x{die.offset:x}>"

    elif die.tag == 'DW_TAG_enumeration_type':
        name = die.attributes.get('DW_AT_name')
        if name:
            resolved = f"enum {name.value.decode('utf-8')}"
        else:
            resolved = f"enum <anonymous@0x{die.offset:x}>"

    elif die.tag == 'DW_TAG_typedef':
        name = die.attributes.get('DW_AT_name')
        if name:
            resolved = name.value.decode('utf-8')
        else:
            type_attr = die.attributes.get('DW_AT_type')
            if type_attr:
                ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
                resolved = resolve_type_name(ref_die, dwarfinfo, type_cache)
            else:
                resolved = "typedef"

    elif die.tag == 'DW_TAG_const_type':
        type_attr = die.attributes.get('DW_AT_type')
        if type_attr:
            ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
            resolved = f"const {resolve_type_name(ref_die, dwarfinfo, type_cache)}"
        else:
            resolved = "const unknown"

    elif die.tag == 'DW_TAG_volatile_type':
        type_attr = die.attributes.get('DW_AT_type')
        if type_attr:
            ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
            resolved = f"volatile {resolve_type_name(ref_die, dwarfinfo, type_cache)}"
        else:
            resolved = "volatile unknown"

    else:
        type_attr = die.attributes.get('DW_AT_type')
        if type_attr:
            try:
                ref_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
                resolved = resolve_type_name(ref_die, dwarfinfo, type_cache)
            except:
                resolved = die.tag.replace('DW_TAG_', '')
        else:
            resolved = die.tag.replace('DW_TAG_', '')

    type_cache[die.offset] = resolved
    return resolved


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
        type_cache = {}
        
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
                                var_type = resolve_type_name(type_die, dwarfinfo, type_cache)
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
                        'address': symbol['st_value'],
                        'type': kind_str,
                        'binding': symbol_type,
                        'size': symbol['st_size'],
                        'section': section_name,
                        'dwarf_type': dwarf_type,
                        'array_count': get_array_count(dwarf_type)
                    })
    
    return symbols


def unwrap_array_type(die, dwarfinfo, type_cache):
    """
    If DIE is an array type, returns (base_type_die, count).
    Otherwise returns (die, None).
    """
    if die.tag != 'DW_TAG_array_type':
        return die, None
    
    type_attr = die.attributes.get('DW_AT_type')
    if not type_attr:
        return die, None
    
    try:
        base_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
    except:
        return die, None
    
    # Extract array count
    count = None
    if die.has_children:
        for child in die.iter_children():
            if child.tag != 'DW_TAG_subrange_type':
                continue
            
            count = get_int_attr(child, 'DW_AT_count')
            if count is not None:
                break
            
            upper = get_int_attr(child, 'DW_AT_upper_bound')
            if upper is None:
                break
            
            lower = get_int_attr(child, 'DW_AT_lower_bound')
            if lower is None:
                lower = 0
            count = (upper - lower) + 1
            break
    
    return base_die, count


def get_types_from_dwarf(binary_path):
    """
    Extract type definitions from DWARF debug information.

    Returns a list of type definitions.
    """
    all_types = []
    
    with open(binary_path, 'rb') as f:
        elf = ELFFile(f)
        
        if not elf.has_dwarf_info():
            return all_types
        
        dwarfinfo = elf.get_dwarf_info()
        type_cache = {}

        tag_to_kind = {
            'DW_TAG_base_type': 'base',
            'DW_TAG_typedef': 'typedef',
            'DW_TAG_pointer_type': 'pointer',
            'DW_TAG_reference_type': 'reference',
            'DW_TAG_rvalue_reference_type': 'rvalue_reference',
            'DW_TAG_structure_type': 'struct',
            'DW_TAG_union_type': 'union',
            'DW_TAG_enumeration_type': 'enum',
            'DW_TAG_const_type': 'const',
            'DW_TAG_volatile_type': 'volatile',
            'DW_TAG_subroutine_type': 'subroutine'
        }
        
        for CU in dwarfinfo.iter_CUs():
            for DIE in CU.iter_DIEs():
                if DIE.tag not in tag_to_kind:
                    continue
                
                # Skip DW_TAG_array_type - arrays are flattened into their member definitions
                if DIE.tag == 'DW_TAG_array_type':
                    continue

                kind = tag_to_kind[DIE.tag]
                resolved_name = resolve_type_name(DIE, dwarfinfo, type_cache)
                size = get_int_attr(DIE, 'DW_AT_byte_size')

                type_entry = {
                    'name': resolved_name,
                    'kind': kind,
                    'size': size,
                    'tag': DIE.tag
                }

                type_attr = DIE.attributes.get('DW_AT_type')
                if type_attr:
                    try:
                        base_die = dwarfinfo.get_DIE_from_refaddr(type_attr.value)
                        type_entry['base_type'] = resolve_type_name(base_die, dwarfinfo, type_cache)
                    except:
                        type_entry['base_type'] = None

                members = []
                if DIE.tag in ('DW_TAG_structure_type', 'DW_TAG_union_type') and DIE.has_children:
                    for child in DIE.iter_children():
                        if child.tag != 'DW_TAG_member':
                            continue

                        member_name = child.attributes.get('DW_AT_name')
                        m_name = member_name.value.decode('utf-8') if member_name else f"<anonymous@0x{child.offset:x}>"

                        m_offset = get_int_attr(child, 'DW_AT_data_member_location')
                        if m_offset is None:
                            m_offset = 0

                        member_type = None
                        member_count = None
                        member_size = None
                        member_type_attr = child.attributes.get('DW_AT_type')
                        if member_type_attr:
                            try:
                                member_type_die = dwarfinfo.get_DIE_from_refaddr(member_type_attr.value)
                                # Unwrap array types
                                unwrapped_die, count = unwrap_array_type(member_type_die, dwarfinfo, type_cache)
                                member_type = resolve_type_name(unwrapped_die, dwarfinfo, type_cache)
                                member_count = count
                                
                                # Get the size of the base type
                                element_size = get_int_attr(unwrapped_die, 'DW_AT_byte_size')
                                if element_size is not None:
                                    if member_count is not None:
                                        member_size = element_size * member_count
                                    else:
                                        member_size = element_size
                            except:
                                member_type = None

                        member_entry = {
                            'name': m_name,
                            'offset': m_offset,
                            'type': member_type
                        }
                        
                        if member_count is not None:
                            member_entry['count'] = member_count
                        
                        if member_size is not None:
                            member_entry['size'] = member_size
                        
                        members.append(member_entry)

                if members:
                    type_entry['members'] = members
                    type_entry['member_count'] = len(members)

                if DIE.tag == 'DW_TAG_enumeration_type' and DIE.has_children:
                    enumerators = []
                    for child in DIE.iter_children():
                        if child.tag != 'DW_TAG_enumerator':
                            continue
                        enum_name = child.attributes.get('DW_AT_name')
                        enum_value = get_int_attr(child, 'DW_AT_const_value')
                        if enum_name:
                            enumerators.append({
                                'name': enum_name.value.decode('utf-8'),
                                'value': enum_value
                            })
                    if enumerators:
                        type_entry['enumerators'] = enumerators
                        type_entry['enumerator_count'] = len(enumerators)

                all_types.append(type_entry)

    return all_types


def export_to_json(symbols=None, all_types=None, output_file=None):
    """Export symbols and type information to JSON format."""
    output = {}

    type_name_to_index = {}
    type_name_to_entry = {}
    if all_types:
        for idx, type_entry in enumerate(all_types):
            type_name = type_entry.get('name')
            if type_name and type_name not in type_name_to_index:
                type_name_to_index[type_name] = idx
                type_name_to_entry[type_name] = type_entry

    def is_primitive_type(type_name):
        """Resolve typedef chain and check if ultimately a primitive type."""
        if not isinstance(type_name, str):
            return True  # Default to primitive if can't determine
        
        visited = set()
        current_name = type_name
        
        while current_name and current_name not in visited:
            visited.add(current_name)
            type_entry = type_name_to_entry.get(current_name)
            
            if not type_entry:
                # Type not found in our list, assume primitive
                return True
            
            kind = type_entry.get('kind')
            
            # Primitive kinds
            if kind in ('base', 'pointer', 'reference', 'rvalue_reference', 'const', 'volatile'):
                return True
            
            # Non-primitive kinds
            if kind in ('struct', 'union', 'enum', 'subroutine'):
                return False
            
            # For typedef, follow the chain
            if kind == 'typedef':
                base_type = type_entry.get('base_type')
                if base_type and base_type != current_name:
                    current_name = base_type
                    continue
            
            # Unknown or can't resolve further
            return True
        
        return True

    def resolve_type_index(type_name):
        if not isinstance(type_name, str):
            return None

        exact_match = type_name_to_index.get(type_name)
        if exact_match is not None:
            return exact_match

        cleaned_type = type_name.split('[', 1)[0].strip()
        type_index = type_name_to_index.get(cleaned_type)
        return type_index

    if symbols:
        json_symbols = []
        for sym in symbols:
            json_sym = dict(sym)
            dwarf_type = json_sym.get('dwarf_type')
            json_sym['type_ref'] = resolve_type_index(dwarf_type)
            json_symbols.append(json_sym)

        output['symbols'] = json_symbols
        output['symbol_count'] = len(json_symbols)
    
    if all_types:
        json_types = []
        for idx, type_entry in enumerate(all_types):
            json_type_entry = dict(type_entry)
            json_type_entry['id'] = idx

            base_type = json_type_entry.get('base_type')
            if base_type is not None:
                json_type_entry['base_type_ref'] = resolve_type_index(base_type)

            members = json_type_entry.get('members')
            if isinstance(members, list):
                json_members = []
                for member in members:
                    json_member = dict(member)
                    member_type = json_member.get('type')
                    # For members with count, type_ref points to base type
                    json_member['type_ref'] = resolve_type_index(member_type)
                    json_member['is_primitive'] = is_primitive_type(member_type)
                    json_members.append(json_member)
                json_type_entry['members'] = json_members

            json_types.append(json_type_entry)

        output['types'] = json_types
        output['type_count'] = len(json_types)
    
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(output, f, indent=2)
        print(f"Exported {len(symbols or [])} symbols and {len(all_types or [])} total types to {output_file}")
    else:
        print(json.dumps(output, indent=2))
    
    return output


def export_to_csv(symbols=None, all_types=None, output_file=None):
    """Export symbols and type information to CSV format."""
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
        
        if all_types:
            f.write("\n=== ALL TYPES ===\n")
            f.write("Name,Kind,Size,Base Type,Member Count\n")
            for t in all_types:
                f.write(
                    f"{t.get('name','-')},{t.get('kind','-')},{t.get('size','-')},"
                    f"{t.get('base_type','-')},{t.get('member_count',0)}\n"
                )
    
    total_syms = len(symbols or [])
    total_types = len(all_types or [])
    print(f"Exported {total_syms} symbols and {total_types} total types to {output_file}")


def export_to_text(symbols=None, all_types=None, output_file=None):
    """Export symbols and type information to a formatted text file."""
    lines = []
    
    if symbols:
        lines.append("Symbol Information Export")
        lines.append("=" * 120)
        lines.append(f"{'Name':<40} {'Address':<12} {'ELF Type':<10} {'Data Type':<30}")
        lines.append("-" * 120)
        
        for sym in symbols:
            dwarf_type = sym.get('dwarf_type') or '-'
            lines.append(f"{sym['name']:<40} 0x{sym['address']:08x}   {sym['type']:<10} {dwarf_type:<30}")
    
    if all_types:
        if symbols:
            lines.append("\n")
        lines.append("All Type Definitions")
        lines.append("=" * 120)
        lines.append(f"{'Name':<40} {'Kind':<14} {'Size':<8} {'Base Type':<40}")
        lines.append("-" * 120)
        for t in all_types:
            lines.append(
                f"{str(t.get('name') or '-')[:40]:<40} "
                f"{str(t.get('kind') or '-')[:14]:<14} "
                f"{str(t.get('size') if t.get('size') is not None else '-'):<8} "
                f"{str(t.get('base_type') or '-')[:40]:<40}"
            )
    
    output = "\n".join(lines)
    
    if output_file:
        with open(output_file, 'w') as f:
            f.write(output)
        total_syms = len(symbols or [])
        total_types = len(all_types or [])
        print(f"Exported {total_syms} symbols and {total_types} total types to {output_file}")
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
    all_types = None
    
    print(f"Reading from: {binary_path}", file=sys.stderr)
    
    if export_type in ('symbols', 'all'):
        print(f"Extracting variable types from DWARF...", file=sys.stderr)
        var_types = get_variable_types_from_dwarf(binary_path)
        print(f"Found {len(var_types)} variable type definitions", file=sys.stderr)
        
        print(f"Extracting symbols...", file=sys.stderr)
        symbols = get_symbols_from_elf(binary_path, var_types, include_undefined=include_undefined)
        print(f"Found {len(symbols)} symbols", file=sys.stderr)
    
    if export_type in ('types', 'all'):
        print(f"Extracting types from DWARF...", file=sys.stderr)
        all_types = get_types_from_dwarf(binary_path)
        print(f"Found {len(all_types)} total types", file=sys.stderr)
    
    # Export in requested format
    if output_format == 'json':
        export_to_json(symbols, all_types, output_file or 'symbols.json')
    elif output_format == 'csv':
        export_to_csv(symbols, all_types, output_file or 'symbols.csv')
    elif output_format == 'text':
        export_to_text(symbols, all_types, output_file or 'symbols.txt')
    else:
        print(f"Error: Unknown format '{output_format}'. Choose: json, csv, text")
        sys.exit(1)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Create database from schema and export tables to Parquet files.
Supports both SQLite and DuckDB databases.
"""

import os
import sys

# Database and schema file paths
SCHEMA_FILE = 'schema_parameters.sql'
DB_FILE_SQLITE = 'parameters.db'
DB_FILE_DUCKDB = 'parameters_duckdb.db'

# Tables to export
TABLES = ['types', 'quantities', 'units', 'mcu_parameters']

def create_and_export_sqlite():
    """Create SQLite database from schema and export to Parquet using DuckDB."""
    import sqlite3
    
    print("Creating SQLite database from schema...")
    
    # Remove old database if exists
    if os.path.exists(DB_FILE_SQLITE):
        os.remove(DB_FILE_SQLITE)
    
    # Create database and run schema
    conn = sqlite3.connect(DB_FILE_SQLITE)
    try:
        with open(SCHEMA_FILE, 'r') as f:
            schema_sql = f.read()
        conn.executescript(schema_sql)
        conn.commit()
        print(f"✓ Created database: {DB_FILE_SQLITE}")
    finally:
        conn.close()
    
    # Now export using DuckDB (it can read SQLite and write Parquet efficiently)
    import duckdb
    
    print("\nExporting tables to Parquet files...")
    for table in TABLES:
        output_file = f"{table}.parquet"
        
        # DuckDB can directly query SQLite and export to Parquet
        conn = duckdb.connect()
        query = f"""
        COPY (SELECT * FROM sqlite_scan('{DB_FILE_SQLITE}', '{table}'))
        TO '{output_file}' (FORMAT PARQUET)
        """
        conn.execute(query)
        
        # Get row count
        row_count = conn.execute(
            f"SELECT COUNT(*) FROM sqlite_scan('{DB_FILE_SQLITE}', '{table}')"
        ).fetchone()[0]
        
        print(f"✓ Exported {table}: {row_count} rows → {output_file}")
        conn.close()

def create_and_export_duckdb():
    """Create DuckDB database from schema and export to Parquet."""
    import duckdb
    
    print("Creating DuckDB database from schema...")
    
    # Remove old database if exists
    if os.path.exists(DB_FILE_DUCKDB):
        os.remove(DB_FILE_DUCKDB)
    
    # Create database and run schema
    conn = duckdb.connect(DB_FILE_DUCKDB)
    try:
        with open(SCHEMA_FILE, 'r') as f:
            schema_sql = f.read()
        conn.execute(schema_sql)
        print(f"✓ Created database: {DB_FILE_DUCKDB}")
    finally:
        conn.close()
    
    # Export to Parquet
    print("\nExporting tables to Parquet files...")
    conn = duckdb.connect(DB_FILE_DUCKDB, read_only=True)
    try:
        for table in TABLES:
            output_file = f"{table}.parquet"
            
            # Check if table exists
            table_exists = conn.execute(
                f"SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '{table}'"
            ).fetchone()[0]
            
            if not table_exists:
                print(f"⚠ Table '{table}' does not exist, skipping...")
                continue
            
            # Export directly to parquet
            query = f"COPY (SELECT * FROM {table}) TO '{output_file}' (FORMAT PARQUET)"
            conn.execute(query)
            
            # Get row count
            row_count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            
            print(f"✓ Exported {table}: {row_count} rows → {output_file}")
    finally:
        conn.close()

if __name__ == '__main__':
    if not os.path.exists(SCHEMA_FILE):
        print(f"Error: Schema file '{SCHEMA_FILE}' not found!")
        exit(1)
    
    # Default to SQLite, but allow DuckDB via command line argument
    if len(sys.argv) > 1 and sys.argv[1] == '--duckdb':
        create_and_export_duckdb()
    else:
        create_and_export_sqlite()
    
    print("\n✅ Complete!")

# Export Schema to Parquet

This script creates a database from the SQL schema and exports each table to a Parquet file.

## Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

```bash
# Activate virtual environment
source venv/bin/activate

# Run the export (creates SQLite database by default)
python export_to_parquet.py

# Or use DuckDB
python export_to_parquet.py --duckdb
```

## Output

The script creates:
- **parameters.db** - SQLite database with all tables
- **types.parquet** - Data types table (13 rows)
- **quantities.parquet** - Physical quantities table (38 rows)  
- **units.parquet** - Units of measurement table (112 rows)
- **mcu_parameters.parquet** - MCU parameters table (empty initially)

## Tables

1. **types** - MCU data types (uint8_t, int16_t, float, etc.)
2. **quantities** - Physical quantities (voltage, temperature, frequency, etc.)
3. **units** - Units of measurement (V, mV, °C, Hz, etc.)
4. **mcu_parameters** - Main table for storing MCU flash parameters

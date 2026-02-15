# DuckDB Parquet Table Viewer

A simple PHP web application that uses DuckDB to read and display Parquet files as HTML tables.

## Features

- 📊 Read Parquet files directly using DuckDB
- 🎨 Clean and responsive HTML interface
- 📁 Browse multiple Parquet files
- 🔍 Automatic column detection
- ⚡ Fast in-memory processing

## Requirements

- PHP 7.4 or higher
- DuckDB CLI (command-line tool)

## Installation

### 1. Install DuckDB CLI

#### On Ubuntu/Debian:
```bash
# Download the latest DuckDB CLI
wget https://github.com/duckdb/duckdb/releases/download/v1.0.0/duckdb_cli-linux-amd64.zip
unzip duckdb_cli-linux-amd64.zip
sudo mv duckdb /usr/local/bin/
sudo chmod +x /usr/local/bin/duckdb
```

#### On macOS (with Homebrew):
```bash
brew install duckdb
```

#### Verify installation:
```bash
duckdb -version
```

### 2. No additional PHP configuration needed!

The application uses DuckDB CLI via shell commands, so no PHP extensions are required.

## Usage

### Start PHP Development Server

```bash
cd web
php -S localhost:8000
```

Then open your browser and navigate to:
```
http://localhost:8000/index.php
```

### File Structure

```
mcu_webtool/
├── db1/
│   ├── trains.parquet    # Parquet data files
│   └── ...
├── web/
│   ├── index.php         # Main page - lists available files
│   └── table.php         # Table viewer - displays parquet data
└── README.md
```

## How It Works

1. **index.php**: Scans the `db1/` folder for Parquet files and displays them as links
2. **table.php**: 
   - Accepts a `file` parameter (e.g., `table.php?file=trains.parquet`)
   - Calls DuckDB CLI with the query: `SELECT * FROM read_parquet('file.parquet')`
   - Parses the JSON output from DuckDB
   - Displays the results in an HTML table

## DuckDB CLI Advantages

- **No PHP extensions needed**: Uses standard shell commands
- **No data copying**: Reads Parquet files directly without loading into a database
- **SQL interface**: Use standard SQL to query Parquet files
- **Fast**: Optimized for analytical queries
- **Zero configuration**: No database server needed
- **Works everywhere**: As long as DuckDB CLI is installed

## Advanced Usage

### Query specific columns

Modify table.php to accept custom SQL queries:
```php
$query = "SELECT column1, column2 FROM read_parquet($escaped_file) LIMIT 100";
```

### Multiple files

Query multiple Parquet files at once:
```php
$query = "SELECT * FROM read_parquet(['file1.parquet', 'file2.parquet'])";
```

### Filtering data

Add WHERE clauses:
```php
$query = "SELECT * FROM read_parquet($escaped_file) WHERE column > 100";
```

## Troubleshooting

### DuckDB command not found
```bash
duckdb: command not found
```
**Solution**: Follow the installation steps above to install DuckDB CLI.

### Parquet file not found
```
Error: Parquet file not found
```
**Solution**: Ensure your Parquet files are in the `db1/` folder.

### Permission denied
**Solution**: Make sure the web server has read permissions for the `db1/` folder:
```bash
chmod 755 db1
chmod 644 db1/*.parquet
```

## License

Free to use and modify.

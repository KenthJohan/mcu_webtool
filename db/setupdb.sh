#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_FILE="$SCRIPT_DIR/test1.duckdb"

if ! command -v duckdb >/dev/null 2>&1; then
	echo "Error: duckdb CLI is not installed or not in PATH." >&2
	exit 1
fi

SQL_FILES=(
	"$SCRIPT_DIR/schema.sql"
	"$SCRIPT_DIR/data_types.sql"
	"$SCRIPT_DIR/data_units.sql"
	"$SCRIPT_DIR/data_quantities.sql"
	"$SCRIPT_DIR/data_parameters.sql"
)

for sql_file in "${SQL_FILES[@]}"; do
	if [[ ! -f "$sql_file" ]]; then
		echo "Skipping missing file: $sql_file"
		continue
	fi

	echo "Running: $(basename "$sql_file")"
	duckdb "$DB_FILE" < "$sql_file"
done

echo "Done. Database updated: $DB_FILE"

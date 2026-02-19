-- Drop existing table if it exists
DROP TABLE IF EXISTS parameters;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS quantities;
DROP TABLE IF EXISTS types;
DROP SEQUENCE IF EXISTS seq_global_id;

CREATE SEQUENCE IF NOT EXISTS seq_global_id START 1;


-- Table for storing physical and computer science quantities
CREATE TABLE IF NOT EXISTS quantities (
    id INTEGER PRIMARY KEY DEFAULT nextval('seq_global_id'),
    quantity_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing units of measurement
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY DEFAULT nextval('seq_global_id'),
    unit_symbol VARCHAR(20) NOT NULL UNIQUE,
    unit_name VARCHAR(100),
    quantity_id INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quantity_id) REFERENCES quantities(id)
);

-- Table for storing data types (must be created first due to foreign key dependencies)
CREATE TABLE IF NOT EXISTS types (
    id INTEGER PRIMARY KEY DEFAULT nextval('seq_global_id'),
    type_name VARCHAR(50) NOT NULL UNIQUE,
    size_bytes INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY DEFAULT nextval('seq_global_id'),
    name VARCHAR(100) NOT NULL,
    address INTEGER NOT NULL,
    alignment INTEGER NOT NULL DEFAULT 4,
    bitsize INTEGER NOT NULL,
    shiftleft INTEGER NOT NULL DEFAULT 0,
    count INTEGER NOT NULL DEFAULT 1,
    fk_type INTEGER,
    fk_quantity INTEGER,
    fk_unit INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fk_type) REFERENCES types(id),
    FOREIGN KEY (fk_quantity) REFERENCES quantities(id),
    FOREIGN KEY (fk_unit) REFERENCES units(id)
);


-- Create index on address for faster lookups
CREATE INDEX IF NOT EXISTS idx_address ON parameters(address);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_name ON parameters(name);
-- Drop sequence if it exists to avoid conflicts with the new schema
DROP SEQUENCE IF EXISTS seq_parameters_id;
CREATE SEQUENCE IF NOT EXISTS seq_parameters_id START 1;

--- Drop parameters table if it exists to avoid conflicts with the new schema
DROP TABLE IF EXISTS parameters;
CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY DEFAULT nextval('seq_parameters_id'),
    name VARCHAR(100) NOT NULL,
    address INTEGER NOT NULL,
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


-- Delete any existing parameters that conflict with the new configuration parameters we want to insert
DELETE FROM parameters WHERE name IN ('CONFIG_PARAM1', 'CONFIG_PARAM2', 'CONFIG_PARAM3', 'FLASH_PAGE_CRC32');
-- Insert example application parameters config stored in flash addresses
INSERT OR IGNORE INTO parameters (name, address, bitsize, count, fk_type, fk_quantity, fk_unit, description) VALUES
('CONFIG_PARAM1', '0x08003000'::INT, 32, 1, (SELECT id FROM types WHERE type_name='u32'), (SELECT id FROM quantities WHERE quantity_name='count'), (SELECT id FROM units WHERE unit_symbol=''), 'Configuration parameter 1 stored in flash'),
('CONFIG_PARAM2', '0x08003004'::INT, 32, 1, (SELECT id FROM types WHERE type_name='f32'), (SELECT id FROM quantities WHERE quantity_name='data_size'), (SELECT id FROM units WHERE unit_symbol=''), 'Configuration parameter 2 stored in flash'),
('CONFIG_PARAM3', '0x08003008'::INT, 16, 1, (SELECT id FROM types WHERE type_name='i16'), (SELECT id FROM quantities WHERE quantity_name='velocity'), (SELECT id FROM units WHERE unit_symbol='rpm'), 'Configuration parameter 3 stored in flash');

--- Insert CRC32 checksum at the end of the 2kB flash page for integrity verification, the sum need 64bit space, but we can store it as uint32_t and calculate the checksum in a way that it fits in 32 bits (e.g. by using a specific polynomial and initial value)
--- Base address of the page is 0x08003000, so the checksum will be stored at 0x080037FC, which is the last 4 bytes of the 2kB page (0x08003000 + 2048 - 4)
INSERT OR IGNORE INTO parameters (name, address, bitsize, count, fk_type, fk_quantity, fk_unit, description) VALUES
('FLASH_PAGE_CRC32', '0x080037FC'::INT, 32, 1, (SELECT id FROM types WHERE type_name='u32'), (SELECT id FROM quantities WHERE quantity_name='checksum'), (SELECT id FROM units WHERE unit_symbol=''), 'CRC32 checksum of the flash page for integrity verification');
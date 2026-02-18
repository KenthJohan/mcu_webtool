-- Drop existing table if it exists
DROP TABLE IF EXISTS quantities;

-- Table for storing physical and computer science quantities
CREATE TABLE IF NOT EXISTS quantities (
    id INTEGER PRIMARY KEY DEFAULT nextval('seq_quantities_id'),
    quantity_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common physical and computer science quantities
INSERT OR IGNORE INTO quantities (quantity_name, description) VALUES
-- Physical quantities
('voltage', 'Electric potential difference'),
('current', 'Electric current'),
('resistance', 'Electrical resistance'),
('power', 'Rate of energy transfer'),
('energy', 'Capacity to do work'),
('temperature', 'Measure of thermal energy'),
('pressure', 'Force per unit area'),
('force', 'Interaction that changes motion'),
('mass', 'Matter quantity'),
('length', 'Spatial distance'),
('time', 'Duration or moment'),
('velocity', 'Rate of position change'),
('acceleration', 'Rate of velocity change'),
('frequency', 'Events per unit time'),
('angle', 'Rotation measure'),
('angular_velocity', 'Rate of angle change'),
('torque', 'Rotational force'),
('capacitance', 'Charge storage capacity'),
('inductance', 'Magnetic flux storage'),
('magnetic_field', 'Magnetic field strength'),
('luminosity', 'Light intensity'),
('humidity', 'Water vapor content'),
-- Computer science quantities
('data_size', 'Amount of digital information'),
('data_rate', 'Data transfer speed'),
('clock_frequency', 'Processor clock speed'),
('bandwidth', 'Data transmission capacity'),
('count', 'Discrete number of items'),
('percentage', 'Ratio expressed as fraction of 100'),
('ratio', 'Relationship between two quantities'),
('index', 'Position in ordered collection'),
('flag', 'Binary state indicator'),
('address', 'Memory location'),
('checksum', 'Error detection value'),
('timestamp', 'Point in time'),
('duration', 'Time interval'),
('priority', 'Importance level'),
('identifier', 'Unique reference'),
('dimensionless', 'No physical dimension'),
('register', 'Hardware register');
-- Table for storing MCU flash parameters
CREATE TABLE IF NOT EXISTS mcu_parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    address INTEGER NOT NULL,
    size INTEGER NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_address ON mcu_parameters(address);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS idx_name ON mcu_parameters(name);

-- Insert common MCU parameters
INSERT OR IGNORE INTO mcu_parameters (name, address, size, count, fk_type, fk_quantity, fk_unit, description) VALUES
('GPIOA_MODER', 0x40020000, 4, 1, (SELECT id FROM types WHERE type_name='uint32_t'), (SELECT id FROM quantities WHERE quantity_name='register'), (SELECT id FROM units WHERE unit_symbol=''), 'GPIO port mode register'),
('GPIOA_OTYPER', 0x40020004, 4, 1, (SELECT id FROM types WHERE type_name='uint32_t'), (SELECT id FROM quantities WHERE quantity_name='register'), (SELECT id FROM units WHERE unit_symbol=''), 'GPIO port output type register'),
('GPIOA_OSPEEDR', 0x40020008, 4, 1, (SELECT id FROM types WHERE type_name='uint32_t'), (SELECT id FROM quantities WHERE quantity_name='register'), (SELECT id FROM units WHERE unit_symbol=''), 'GPIO port output speed register'),
('GPIOA_PUPDR', 0x4002000C, 4, 1, (SELECT id FROM types WHERE type_name='uint32_t'), (SELECT id FROM quantities WHERE quantity_name='register'), (SELECT id FROM units WHERE unit_symbol=''), 'GPIO port pull-up/pull-down register'),
('GPIOA_IDR', 0x40020010, 4, 1, (SELECT id FROM types WHERE type_name='uint32_t'), (SELECT id FROM quantities WHERE quantity_name='register'), (SELECT id FROM units WHERE unit_symbol=''), 'GPIO port input data register'),
('GPIOA_ODR', 0x40020014, 4, 1, (SELECT id FROM types WHERE type_name='uint32_t'), (SELECT id FROM quantities WHERE quantity_name='register'), (SELECT id FROM units WHERE unit_symbol=''), 'GPIO port output data register'),
('GPIOA_BSRR', 0x40020018, 4, 1, (SELECT id FROM types WHERE type_name='uint32_t'), (SELECT id FROM quantities WHERE quantity_name='register'), (SELECT id FROM units WHERE unit_symbol=''), 'GPIO port bit set/reset register'),
('GPIOA_LCKR', 0x4002001C, 4, 1, (SELECT id FROM types WHERE type_name='uint32_t'), (SELECT id FROM quantities WHERE quantity_name='register'), (SELECT id FROM units WHERE unit_symbol=''), 'GPIO port configuration lock register'),
('GPIOA_AFRL', 0x40020020, 4, 1, (SELECT id FROM types WHERE type_name='uint32_t'), (SELECT id FROM quantities WHERE quantity_name='register'), (SELECT id FROM units WHERE unit_symbol=''), 'GPIO alternate function low register'),
('GPIOA_AFRH', 0x40020024, 4, 1, (SELECT id FROM types WHERE type_name='uint32_t'), (SELECT id FROM quantities WHERE quantity_name='register'), (SELECT id FROM units WHERE unit_symbol=''), 'GPIO alternate function high register');


-- Table for storing data types
CREATE TABLE IF NOT EXISTS types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    size_bytes INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common MCU data types
INSERT OR IGNORE INTO types (type_name, size_bytes, description) VALUES
('uint8_t', 1, 'Unsigned 8-bit integer'),
('int8_t', 1, 'Signed 8-bit integer'),
('uint16_t', 2, 'Unsigned 16-bit integer'),
('int16_t', 2, 'Signed 16-bit integer'),
('uint32_t', 4, 'Unsigned 32-bit integer'),
('int32_t', 4, 'Signed 32-bit integer'),
('uint64_t', 8, 'Unsigned 64-bit integer'),
('int64_t', 8, 'Signed 64-bit integer'),
('float', 4, '32-bit floating point'),
('double', 8, '64-bit floating point'),
('char', 1, 'Character type'),
('bool', 1, 'Boolean type'),
('byte', 1, 'Byte type');

-- Table for storing physical and computer science quantities
CREATE TABLE IF NOT EXISTS quantities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
('dimensionless', 'No physical dimension');

-- Table for storing units of measurement
CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_symbol VARCHAR(20) NOT NULL UNIQUE,
    unit_name VARCHAR(100),
    quantity_id INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quantity_id) REFERENCES quantities(id)
);

-- Insert common units for physical and computer science quantities
INSERT OR IGNORE INTO units (unit_symbol, unit_name, description) VALUES
-- Voltage units
('V', 'Volt', 'SI unit of electric potential'),
('mV', 'Millivolt', '10^-3 volt'),
('kV', 'Kilovolt', '10^3 volt'),
('uV', 'Microvolt', '10^-6 volt'),
-- Current units
('A', 'Ampere', 'SI unit of electric current'),
('mA', 'Milliampere', '10^-3 ampere'),
('uA', 'Microampere', '10^-6 ampere'),
('nA', 'Nanoampere', '10^-9 ampere'),
-- Resistance units
('Ω', 'Ohm', 'SI unit of electrical resistance'),
('ohm', 'Ohm', 'SI unit of electrical resistance'),
('kΩ', 'Kilohm', '10^3 ohm'),
('MΩ', 'Megohm', '10^6 ohm'),
-- Power units
('W', 'Watt', 'SI unit of power'),
('mW', 'Milliwatt', '10^-3 watt'),
('kW', 'Kilowatt', '10^3 watt'),
('MW', 'Megawatt', '10^6 watt'),
-- Energy units
('J', 'Joule', 'SI unit of energy'),
('kJ', 'Kilojoule', '10^3 joule'),
('Wh', 'Watt-hour', 'Energy unit'),
('kWh', 'Kilowatt-hour', '10^3 watt-hour'),
('mWh', 'Milliwatt-hour', '10^-3 watt-hour'),
-- Temperature units
('°C', 'Celsius', 'Celsius temperature scale'),
('C', 'Celsius', 'Celsius temperature scale'),
('°F', 'Fahrenheit', 'Fahrenheit temperature scale'),
('F', 'Fahrenheit', 'Fahrenheit temperature scale'),
('K', 'Kelvin', 'SI unit of temperature'),
-- Pressure units
('Pa', 'Pascal', 'SI unit of pressure'),
('kPa', 'Kilopascal', '10^3 pascal'),
('MPa', 'Megapascal', '10^6 pascal'),
('bar', 'Bar', 'Pressure unit'),
('mbar', 'Millibar', '10^-3 bar'),
('psi', 'Pound per square inch', 'Imperial pressure unit'),
('atm', 'Atmosphere', 'Standard atmospheric pressure'),
-- Force units
('N', 'Newton', 'SI unit of force'),
('kN', 'Kilonewton', '10^3 newton'),
('mN', 'Millinewton', '10^-3 newton'),
-- Mass units
('kg', 'Kilogram', 'SI unit of mass'),
('g', 'Gram', '10^-3 kilogram'),
('mg', 'Milligram', '10^-6 kilogram'),
('ug', 'Microgram', '10^-9 kilogram'),
('t', 'Tonne', '10^3 kilogram'),
-- Length units
('m', 'Meter', 'SI unit of length'),
('km', 'Kilometer', '10^3 meter'),
('cm', 'Centimeter', '10^-2 meter'),
('mm', 'Millimeter', '10^-3 meter'),
('um', 'Micrometer', '10^-6 meter'),
('nm', 'Nanometer', '10^-9 meter'),
('in', 'Inch', 'Imperial length unit'),
('ft', 'Foot', 'Imperial length unit'),
-- Time units
('s', 'Second', 'SI unit of time'),
('ms', 'Millisecond', '10^-3 second'),
('us', 'Microsecond', '10^-6 second'),
('ns', 'Nanosecond', '10^-9 second'),
('min', 'Minute', '60 seconds'),
('h', 'Hour', '3600 seconds'),
('d', 'Day', '86400 seconds'),
-- Velocity units
('m/s', 'Meter per second', 'SI unit of velocity'),
('km/h', 'Kilometer per hour', 'Velocity unit'),
('mph', 'Mile per hour', 'Imperial velocity unit'),
-- Acceleration units
('m/s²', 'Meter per second squared', 'SI unit of acceleration'),
('m/s2', 'Meter per second squared', 'SI unit of acceleration'),
('g', 'Standard gravity', '9.80665 m/s²'),
-- Frequency units
('Hz', 'Hertz', 'SI unit of frequency'),
('kHz', 'Kilohertz', '10^3 hertz'),
('MHz', 'Megahertz', '10^6 hertz'),
('GHz', 'Gigahertz', '10^9 hertz'),
-- Angle units
('deg', 'Degree', 'Angular measurement'),
('°', 'Degree', 'Angular measurement'),
('rad', 'Radian', 'SI unit of angle'),
('mrad', 'Milliradian', '10^-3 radian'),
-- Angular velocity units
('rad/s', 'Radian per second', 'SI unit of angular velocity'),
('rpm', 'Revolutions per minute', 'Angular velocity unit'),
('deg/s', 'Degree per second', 'Angular velocity unit'),
-- Torque units
('Nm', 'Newton-meter', 'SI unit of torque'),
('N·m', 'Newton-meter', 'SI unit of torque'),
-- Capacitance units
('F', 'Farad', 'SI unit of capacitance'),
('uF', 'Microfarad', '10^-6 farad'),
('nF', 'Nanofarad', '10^-9 farad'),
('pF', 'Picofarad', '10^-12 farad'),
-- Inductance units
('H', 'Henry', 'SI unit of inductance'),
('mH', 'Millihenry', '10^-3 henry'),
('uH', 'Microhenry', '10^-6 henry'),
('nH', 'Nanohenry', '10^-9 henry'),
-- Magnetic field units
('T', 'Tesla', 'SI unit of magnetic flux density'),
('mT', 'Millitesla', '10^-3 tesla'),
('uT', 'Microtesla', '10^-6 tesla'),
('Gs', 'Gauss', 'CGS unit of magnetic flux density'),
-- Luminosity units
('cd', 'Candela', 'SI unit of luminous intensity'),
('lm', 'Lumen', 'SI unit of luminous flux'),
('lx', 'Lux', 'SI unit of illuminance'),
-- Humidity units
('%RH', 'Percent Relative Humidity', 'Relative humidity percentage'),
('%', 'Percent', 'Percentage unit'),
-- Data size units
('bit', 'Bit', 'Binary digit'),
('byte', 'Byte', '8 bits'),
('B', 'Byte', '8 bits'),
('KB', 'Kilobyte', '10^3 bytes'),
('MB', 'Megabyte', '10^6 bytes'),
('GB', 'Gigabyte', '10^9 bytes'),
('TB', 'Terabyte', '10^12 bytes'),
('KiB', 'Kibibyte', '2^10 bytes'),
('MiB', 'Mebibyte', '2^20 bytes'),
('GiB', 'Gibibyte', '2^30 bytes'),
-- Data rate units
('bps', 'Bits per second', 'Data transmission rate'),
('kbps', 'Kilobits per second', '10^3 bps'),
('Mbps', 'Megabits per second', '10^6 bps'),
('Gbps', 'Gigabits per second', '10^9 bps'),
('Bps', 'Bytes per second', 'Data transmission rate'),
('KBps', 'Kilobytes per second', '10^3 Bps'),
('MBps', 'Megabytes per second', '10^6 Bps'),
-- Dimensionless/Count units
('', 'Dimensionless', 'No unit'),
('count', 'Count', 'Number of items'),
('pcs', 'Pieces', 'Number of pieces'),
('ppm', 'Parts per million', 'Ratio unit'),
('ppb', 'Parts per billion', 'Ratio unit');

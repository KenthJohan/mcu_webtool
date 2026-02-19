-- Insert or update common MCU data types with hardcoded IDs
INSERT INTO types (id, type_name, size_bytes, description) VALUES
(1, 'u8', 1, 'Unsigned 8-bit integer'),
(2, 'i8', 1, 'Signed 8-bit integer'),
(3, 'u16', 2, 'Unsigned 16-bit integer'),
(4, 'i16', 2, 'Signed 16-bit integer'),
(5, 'u32', 4, 'Unsigned 32-bit integer'),
(6, 'i32', 4, 'Signed 32-bit integer'),
(7, 'u64', 8, 'Unsigned 64-bit integer'),
(8, 'i64', 8, 'Signed 64-bit integer'),
(9, 'f32', 4, '32-bit floating point'),
(10, 'f64', 8, '64-bit floating point'),
(11, 'char', 1, 'Character type'),
(12, 'bool', 1, 'Boolean type'),
(13, 'byte', 1, 'Byte type')
ON CONFLICT (id) DO UPDATE SET
    type_name = EXCLUDED.type_name,
    size_bytes = EXCLUDED.size_bytes,
    description = EXCLUDED.description;



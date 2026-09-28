CREATE DATABASE IF NOT EXISTS laboratorio;

USE laboratorio;

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL
);

INSERT INTO productos (nombre, precio)
VALUES
    ('Teclado', 85000),
    ('Mouse', 45000),
    ('Monitor', 650000);
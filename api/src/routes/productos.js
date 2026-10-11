
const express = require("express");
const router = express.Router();

const pool = require("../db");

const PRECIO_MAXIMO = 99999999.99;

function normalizarProducto(producto) {
    return {
        ...producto,
        precio: Number(Number(producto.precio).toFixed(2))
    };
}

// GET /productos
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, nombre, precio FROM productos ORDER BY id"
        );

        return res.json(rows.map(normalizarProducto));
    } catch (error) {
        console.error("Error consultando productos:", error.message);

        return res.status(503).json({
            error: "Base de datos no disponible"
        });
    }
});

// GET /productos/:id
router.get("/:id", async (req, res) => {
    const id = req.params.id;

    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            error: "El ID debe ser un entero positivo"
        });
    }

    try {
        const [rows] = await pool.query(
            "SELECT id, nombre, precio FROM productos WHERE id = ?",
            [Number(id)]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: "Producto no encontrado"
            });
        }

        return res.json(normalizarProducto(rows[0]));
    } catch (error) {
        console.error("Error consultando producto:", error.message);

        return res.status(503).json({
            error: "Base de datos no disponible"
        });
    }
});

// POST /productos
router.post("/", async (req, res) => {
    if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
    ) {
        return res.status(400).json({
            error: "Debe enviar un cuerpo JSON con nombre y precio"
        });
    }

    const { nombre, precio } = req.body;

    if (typeof nombre !== "string" || nombre.trim() === "") {
        return res.status(400).json({
            error: "El nombre es obligatorio"
        });
    }

    const nombreLimpio = nombre.trim();

    if (nombreLimpio.length > 100) {
        return res.status(400).json({
            error: "El nombre no puede superar los 100 caracteres"
        });
    }

    if (
        typeof precio !== "number" ||
        !Number.isFinite(precio) ||
        precio <= 0 ||
        precio > PRECIO_MAXIMO
    ) {
        return res.status(400).json({
            error: "El precio debe ser un número mayor que 0 y no superar 99999999.99"
        });
    }

    const precioRedondeado = Number(precio.toFixed(2));

    if (precioRedondeado <= 0) {
        return res.status(400).json({
            error: "El precio debe ser de al menos 0.01"
        });
    }

    try {
        const [result] = await pool.query(
            "INSERT INTO productos (nombre, precio) VALUES (?, ?)",
            [nombreLimpio, precioRedondeado]
        );

        return res.status(201).json({
            id: result.insertId,
            nombre: nombreLimpio,
            precio: precioRedondeado
        });
    } catch (error) {
        console.error("Error creando producto:", error.message);

        return res.status(503).json({
            error: "Base de datos no disponible"
        });
    }
});

module.exports = router;

const express = require("express");
const router = express.Router();

const pool = require("../db");

// GET /productos
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM productos ORDER BY id"
        );

        res.json(rows);

    } catch (error) {
        console.error("Error consultando productos:", error.message);

        res.status(503).json({
            error: "Base de datos no disponible"
        });
    }
});

// GET /productos/:id
router.get("/:id", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM productos WHERE id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: "Producto no encontrado"
            });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error("Error consultando producto:", error.message);

        res.status(503).json({
            error: "Base de datos no disponible"
        });
    }
});

// POST /productos
router.post("/", async (req, res) => {

    const { nombre, precio } = req.body;

    if (!nombre || typeof nombre !== "string" || nombre.trim() === "") {
        return res.status(400).json({
            error: "El nombre es obligatorio"
        });
    }

    if (
        precio === undefined ||
        typeof precio !== "number" ||
        precio <= 0
    ) {
        return res.status(400).json({
            error: "El precio debe ser un número mayor que 0"
        });
    }

    try {

        const [result] = await pool.query(
            "INSERT INTO productos (nombre, precio) VALUES (?, ?)",
            [nombre.trim(), precio]
        );

        res.status(201).json({
            id: result.insertId,
            nombre: nombre.trim(),
            precio
        });

    } catch (error) {

        console.error("Error creando producto:", error.message);

        res.status(503).json({
            error: "Base de datos no disponible"
        });
    }
});

module.exports = router;
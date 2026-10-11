
const express = require("express");
const pool = require("./db");
const productosRouter = require("./routes/productos");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        mensaje: "API del laboratorio funcionando"
    });
});

app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        return res.status(200).json({
            estado: "OK",
            baseDatos: "conectada"
        });
    } catch (error) {
        console.error("Healthcheck: MySQL no disponible:", error.message);

        return res.status(503).json({
            estado: "ERROR",
            baseDatos: "no disponible"
        });
    }
});

app.use("/productos", productosRouter);

// Control de errores, incluido JSON mal formado.
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError &&
        error.status === 400 &&
        Object.prototype.hasOwnProperty.call(error, "body")) {
        return res.status(400).json({
            error: "El cuerpo de la petición contiene JSON inválido"
        });
    }

    console.error("Error inesperado:", error.message);

    return res.status(500).json({
        error: "Error interno del servidor"
    });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`API ejecutándose en el puerto ${PORT}`);
    });
}

module.exports = app;

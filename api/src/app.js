const express = require("express");

const productosRouter = require("./routes/productos");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        mensaje: "API del laboratorio funcionando"
    });
});

app.get("/health", (req, res) => {
    res.json({
        estado: "OK"
    });
});

app.use("/productos", productosRouter);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`API ejecutándose en el puerto ${PORT}`);
    });
}

module.exports = app;
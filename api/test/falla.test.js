const { execFileSync } = require("node:child_process");
const path = require("node:path");

const API_URL = process.env.API_URL || "http://localhost:3000";
const RAIZ_PROYECTO = path.resolve(__dirname, "../..");

jest.setTimeout(180000);

async function solicitar(ruta, opciones = {}) {
    return fetch(`${API_URL}${ruta}`, {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            ...(opciones.headers || {})
        }
    });
}

async function esperarEstado(ruta, esperado, timeoutMs = 90000) {
    const limite = Date.now() + timeoutMs;

    while (Date.now() < limite) {
        try {
            const respuesta = await solicitar(ruta);
            if (respuesta.status === esperado) return respuesta;
        } catch (_) {
            // La API o MySQL pueden estar recuperándose.
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(
        `No se obtuvo HTTP ${esperado} en ${ruta} dentro del tiempo límite`
    );
}

function ejecutarCompose(argumentos) {
    execFileSync("docker", ["compose", ...argumentos], {
        cwd: RAIZ_PROYECTO,
        stdio: "inherit"
    });
}

function obtenerIdApi() {
    return execFileSync(
        "docker",
        ["inspect", "--format={{.Id}}", "laboratorio-api"],
        { encoding: "utf8" }
    ).trim();
}

async function crearProducto(nombre) {
    const respuesta = await solicitar("/productos", {
        method: "POST",
        body: JSON.stringify({ nombre, precio: 23000 })
    });

    expect(respuesta.status).toBe(201);
    return respuesta.json();
}

describe("CP-04 y CP-05: fallo y recuperación de MySQL", () => {
    afterAll(async () => {
        // Intenta dejar MySQL iniciado incluso si una prueba falla.
        try {
            ejecutarCompose(["up", "-d", "mysql"]);
            await esperarEstado("/health", 200);
        } catch (error) {
            console.error(
                "Advertencia: verifica manualmente que MySQL esté saludable."
            );
        }
    });

    test("CP-04: la API responde 503 cuando MySQL cae y sigue ejecutándose", async () => {
        await esperarEstado("/health", 200);

        ejecutarCompose(["stop", "mysql"]);

        const salud = await esperarEstado("/health", 503);
        expect(salud.status).toBe(503);

        const productos = await esperarEstado("/productos", 503);
        expect(productos.status).toBe(503);

        const estadoApi = execFileSync(
            "docker",
            ["inspect", "--format={{.State.Running}}", "laboratorio-api"],
            { encoding: "utf8" }
        ).trim();

        expect(estadoApi).toBe("true");
    });

    test("CP-05: la API recupera la conexión sin reiniciarse y conserva datos", async () => {
        ejecutarCompose(["up", "-d", "mysql"]);
        await esperarEstado("/health", 200);

        const nombre = `CP-05-Recuperacion-${Date.now()}`;
        const producto = await crearProducto(nombre);

        const idApiAntes = obtenerIdApi();

        ejecutarCompose(["stop", "mysql"]);
        await esperarEstado("/health", 503);

        ejecutarCompose(["up", "-d", "mysql"]);
        await esperarEstado("/health", 200);

        const idApiDespues = obtenerIdApi();
        expect(idApiDespues).toBe(idApiAntes);

        const respuesta = await solicitar(`/productos/${producto.id}`);
        expect(respuesta.status).toBe(200);

        const recuperado = await respuesta.json();
        expect(recuperado.id).toBe(producto.id);
        expect(recuperado.nombre).toBe(nombre);
        expect(Number(recuperado.precio)).toBe(23000);
    });
});
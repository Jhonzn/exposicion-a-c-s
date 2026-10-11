
const API_URL = process.env.API_URL || "http://localhost:3000";

async function solicitar(ruta, opciones = {}) {
    return fetch(`${API_URL}${ruta}`, {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            ...(opciones.headers || {})
        }
    });
}

describe("Pruebas funcionales de productos", () => {
    let productoCreado;

    test("CP-01: crear un producto y consultarlo", async () => {
        const nombre = `CP-01-Producto-${Date.now()}`;

        const respuestaCrear = await solicitar("/productos", {
            method: "POST",
            body: JSON.stringify({
                nombre,
                precio: 12500.567
            })
        });

        expect(respuestaCrear.status).toBe(201);

        productoCreado = await respuestaCrear.json();

        expect(productoCreado.id).toBeDefined();
        expect(productoCreado.nombre).toBe(nombre);
        expect(productoCreado.precio).toBe(12500.57);

        const respuestaConsultar = await solicitar(
            `/productos/${productoCreado.id}`
        );

        expect(respuestaConsultar.status).toBe(200);

        const consultado = await respuestaConsultar.json();

        expect(consultado.id).toBe(productoCreado.id);
        expect(consultado.nombre).toBe(nombre);
        expect(consultado.precio).toBe(12500.57);
    });

    test("CP-02: rechazar datos inválidos sin insertar productos", async () => {
        const respuestaAntes = await solicitar("/productos");
        expect(respuestaAntes.status).toBe(200);

        const antes = await respuestaAntes.json();

        const casosInvalidos = [
            {},
            { nombre: "", precio: 100 },
            { nombre: "CP-02-SinPrecio" },
            { nombre: "CP-02-Cero", precio: 0 },
            { nombre: "CP-02-Negativo", precio: -10 },
            { nombre: "CP-02-PrecioTexto", precio: "100" },
            { nombre: "CP-02-PrecioExcesivo", precio: 100000000 },
            { nombre: `CP-02-${"N".repeat(101)}`, precio: 100 }
        ];

        for (const datos of casosInvalidos) {
            const respuesta = await solicitar("/productos", {
                method: "POST",
                body: JSON.stringify(datos)
            });

            if (respuesta.status !== 400) {
    		console.log("DATO INVÁLIDO ACEPTADO:", datos);
    		console.log("ESTADO HTTP RECIBIDO:", respuesta.status);
	    }

expect(respuesta.status).toBe(400);
        }

        const respuestaDespues = await solicitar("/productos");
        expect(respuestaDespues.status).toBe(200);

        const despues = await respuestaDespues.json();

        expect(despues).toHaveLength(antes.length);
    });

    test("CP-03: devolver 404 para un producto inexistente", async () => {
        const respuesta = await solicitar("/productos/999999999");

        expect(respuesta.status).toBe(404);

        const cuerpo = await respuesta.json();
        expect(cuerpo.error).toBe("Producto no encontrado");
    });
});

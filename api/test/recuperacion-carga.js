
const API_URL = process.env.API_URL || "http://localhost:3000";

async function solicitar(ruta, timeout = 10000) {
    const respuesta = await fetch(`${API_URL}${ruta}`, {
        signal: AbortSignal.timeout(timeout)
    });

    await respuesta.body?.cancel();

    return respuesta.status;
}

async function ejecutarCarga(concurrencia, total) {
    let siguiente = 0;
    let exitosas = 0;
    let errores = 0;

    const inicio = performance.now();

    async function trabajador() {
        while (true) {
            const indice = siguiente++;

            if (indice >= total) {
                return;
            }

            try {
                const estado = await solicitar("/productos", 15000);

                if (estado === 200) {
                    exitosas++;
                } else {
                    errores++;
                }
            } catch (error) {
                errores++;
            }
        }
    }

    await Promise.all(
        Array.from(
            { length: concurrencia },
            () => trabajador()
        )
    );

    return {
        total,
        exitosas,
        errores,
        duracion: (performance.now() - inicio) / 1000
    };
}

async function verificarRecuperacion() {
    const resultados = [];
    let errores = 0;

    for (let i = 1; i <= 10; i++) {
        try {
            const health = await solicitar("/health");
            const productos = await solicitar("/productos");

            const correcto = health === 200 && productos === 200;

            if (!correcto) {
                errores++;
            }

            resultados.push({
                intento: i,
                health,
                productos,
                resultado: correcto ? "PASS" : "FAIL"
            });
        } catch (error) {
            errores++;

            resultados.push({
                intento: i,
                health: "ERROR",
                productos: "ERROR",
                resultado: "FAIL"
            });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { resultados, errores };
}

async function main() {
    console.log("CP-08: RECUPERACION DESPUES DE LA CARGA");
    console.log(`API: ${API_URL}`);
    console.log("");

    const inicial = await solicitar("/health");

    if (inicial !== 200) {
        throw new Error("La API no esta saludable al inicio.");
    }

    console.log("Fase 1: carga concurrente");

    const carga = await ejecutarCarga(100, 200);

    console.log(`Solicitudes: ${carga.total}`);
    console.log(`Exitosas: ${carga.exitosas}`);
    console.log(`Errores: ${carga.errores}`);
    console.log(`Duracion: ${carga.duracion.toFixed(2)} segundos`);
    console.log("");

    console.log("Fase 2: periodo de recuperacion de 5 segundos");

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("Fase 3: verificar salud y acceso a productos");

    const recuperacion = await verificarRecuperacion();

    console.log("");
    console.log("RESULTADOS DE RECUPERACION");
    console.log("Intento | Health | Productos | Resultado");

    for (const r of recuperacion.resultados) {
        console.log(
            `${r.intento} | ${r.health} | ${r.productos} | ${r.resultado}`
        );
    }

    const fallosCarga = carga.errores;
    const fallosRecuperacion = recuperacion.errores;

    console.log("");
    console.log(`Errores durante carga: ${fallosCarga}`);
    console.log(`Fallos despues de la carga: ${fallosRecuperacion}`);

    if (fallosCarga === 0 && fallosRecuperacion === 0) {
        console.log("CP-08 PASS: servicio estable despues de la carga.");
    } else if (fallosRecuperacion === 0) {
        console.log("CP-08: servicio recuperado; hubo errores durante la carga.");
    } else {
        console.log("CP-08 FAIL: se detectaron fallos despues de la carga.");
        process.exitCode = 1;
    }
}

main().catch(error => {
    console.error("ERROR:", error.message);
    process.exitCode = 1;
});

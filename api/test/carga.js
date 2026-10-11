
const API_URL = process.env.API_URL || "http://localhost:3000";
const RUTA = "/productos";

const niveles = [
    { concurrencia: 1, solicitudes: 40 },
    { concurrencia: 5, solicitudes: 40 },
    { concurrencia: 10, solicitudes: 40 },
    { concurrencia: 20, solicitudes: 40 }
];

function percentil(valores, porcentaje) {
    if (valores.length === 0) {
        return 0;
    }

    const ordenados = [...valores].sort((a, b) => a - b);
    const indice = Math.ceil(porcentaje * ordenados.length) - 1;

    return ordenados[Math.max(0, indice)];
}

async function ejecutarNivel(concurrencia, total) {
    const tiempos = [];
    let exitosas = 0;
    let errores = 0;
    let siguiente = 0;

    const inicioNivel = performance.now();

    async function trabajador() {
        while (true) {
            const indice = siguiente++;

            if (indice >= total) {
                return;
            }

            const inicio = performance.now();

            try {
                const respuesta = await fetch(`${API_URL}${RUTA}`, {
                    signal: AbortSignal.timeout(10000)
                });

                tiempos.push(performance.now() - inicio);

                if (respuesta.status === 200) {
                    exitosas++;
                } else {
                    errores++;
                }

                await respuesta.body?.cancel();
            } catch (error) {
                errores++;
                tiempos.push(performance.now() - inicio);
            }
        }
    }

    const trabajadores = Array.from(
        { length: Math.min(concurrencia, total) },
        () => trabajador()
    );

    await Promise.all(trabajadores);

    const duracion = (performance.now() - inicioNivel) / 1000;
    const promedio = tiempos.length > 0
        ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length
        : 0;

    return {
        concurrencia,
        total,
        exitosas,
        errores,
        duracion,
        promedio,
        p95: percentil(tiempos, 0.95),
        solicitudesSegundo: duracion > 0 ? total / duracion : 0
    };
}

async function main() {
    console.log("CP-06: PRUEBA DE CARGA PROGRESIVA");
    console.log(`API: ${API_URL}`);
    console.log(`Ruta: ${RUTA}`);
    console.log("Se realizaran solicitudes GET sin crear productos.");
    console.log("");

    const comprobacion = await fetch(`${API_URL}/health`, {
        signal: AbortSignal.timeout(10000)
    });

    await comprobacion.body?.cancel();

    if (comprobacion.status !== 200) {
        throw new Error(
            `La API no esta saludable. HTTP ${comprobacion.status}`
        );
    }

    const resultados = [];

    for (const nivel of niveles) {
        console.log(
            `Ejecutando ${nivel.solicitudes} solicitudes con ` +
            `${nivel.concurrencia} solicitudes concurrentes...`
        );

        const resultado = await ejecutarNivel(
            nivel.concurrencia,
            nivel.solicitudes
        );

        resultados.push(resultado);
    }

    console.log("");
    console.log("RESULTADOS");
    console.log(
        "Concurrentes | Total | Exitosas | Errores | " +
        "Duracion(s) | Promedio(ms) | P95(ms) | Req/s"
    );

    for (const resultado of resultados) {
        console.log(
            `${resultado.concurrencia} | ` +
            `${resultado.total} | ` +
            `${resultado.exitosas} | ` +
            `${resultado.errores} | ` +
            `${resultado.duracion.toFixed(2)} | ` +
            `${resultado.promedio.toFixed(2)} | ` +
            `${resultado.p95.toFixed(2)} | ` +
            `${resultado.solicitudesSegundo.toFixed(2)}`
        );
    }

    console.log("");
    console.log("CP-06 finalizada.");
}

main().catch((error) => {
    console.error("ERROR EN LA PRUEBA:", error.message);
    process.exitCode = 1;
});

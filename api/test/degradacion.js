
const API_URL = process.env.API_URL || "http://localhost:3000";

const NIVELES = [
    { concurrencia: 25, solicitudes: 200 },
    { concurrencia: 50, solicitudes: 200 },
    { concurrencia: 100, solicitudes: 200 }
];

function percentil(valores, p) {
    if (valores.length === 0) {
        return 0;
    }

    const ordenados = [...valores].sort((a, b) => a - b);
    const indice = Math.ceil(p * ordenados.length) - 1;

    return ordenados[Math.max(0, indice)];
}

async function probarNivel(concurrencia, total) {
    let siguiente = 0;
    let exitosas = 0;
    let errores = 0;

    const tiempos = [];
    const inicio = performance.now();

    async function trabajador() {
        while (true) {
            const indice = siguiente++;

            if (indice >= total) {
                return;
            }

            const inicioSolicitud = performance.now();

            try {
                const respuesta = await fetch(`${API_URL}/productos`, {
                    signal: AbortSignal.timeout(15000)
                });

                tiempos.push(performance.now() - inicioSolicitud);

                if (respuesta.status === 200) {
                    exitosas++;
                } else {
                    errores++;
                }

                await respuesta.body?.cancel();
            } catch (error) {
                errores++;
                tiempos.push(performance.now() - inicioSolicitud);
            }
        }
    }

    const trabajadores = Array.from(
        { length: Math.min(concurrencia, total) },
        () => trabajador()
    );

    await Promise.all(trabajadores);

    const duracion = (performance.now() - inicio) / 1000;

    const promedio = tiempos.length > 0
        ? tiempos.reduce((suma, tiempo) => suma + tiempo, 0) / tiempos.length
        : 0;

    return {
        concurrencia,
        total,
        exitosas,
        errores,
        duracion,
        promedio,
        p95: percentil(tiempos, 0.95),
        reqSegundo: duracion > 0 ? total / duracion : 0
    };
}

async function main() {
    console.log("CP-07: EVALUACION DE DEGRADACION");
    console.log(`API: ${API_URL}`);
    console.log("");

    const health = await fetch(`${API_URL}/health`, {
        signal: AbortSignal.timeout(10000)
    });

    await health.body?.cancel();

    if (health.status !== 200) {
        throw new Error(`Healthcheck fallo: HTTP ${health.status}`);
    }

    const resultados = [];

    for (const nivel of NIVELES) {
        console.log(
            `Ejecutando ${nivel.solicitudes} solicitudes con ` +
            `${nivel.concurrencia} solicitudes concurrentes...`
        );

        const resultado = await probarNivel(
            nivel.concurrencia,
            nivel.solicitudes
        );

        resultados.push(resultado);
    }

    console.log("");
    console.log("RESULTADOS");
    console.log(
        "Concurrencia | Total | OK | Errores | Segundos | " +
        "Promedio_ms | P95_ms | Req_s"
    );

    for (const r of resultados) {
        console.log(
            `${r.concurrencia} | ${r.total} | ${r.exitosas} | ` +
            `${r.errores} | ${r.duracion.toFixed(2)} | ` +
            `${r.promedio.toFixed(2)} | ${r.p95.toFixed(2)} | ` +
            `${r.reqSegundo.toFixed(2)}`
        );
    }

    console.log("");
    console.log("CP-07 finalizada.");
}

main().catch((error) => {
    console.error("ERROR:", error.message);
    process.exitCode = 1;
});

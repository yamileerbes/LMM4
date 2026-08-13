// Máquina de estados del diálogo — 5 estados, flujo LINEAL.
// Camino único: SILENCIO → VOZ_UNICA → ARQUIMEDES → CLOTOIDE → CONVERGENCIA
//
// ARQUIMEDES y CLOTOIDE ocurren exactamente una vez: cuando se cumplen sus
// condiciones se avanza y no se vuelve atrás entre ellos.
// La convergencia se alcanza por score acumulado (silencios, calidad, fusiones).

const LISTA_ESTADOS = [
  'SILENCIO', 'VOZ_UNICA', 'ARQUIMEDES', 'CLOTOIDE', 'CONVERGENCIA',
];

function actualizarEstado(ctx) {
  const {
    hablaA, hablaB, dt,
    segundosSinVoz, estado, estadoForzado,
    bonoPorSilencio,
  } = ctx;
  
  let silencio = segundosSinVoz || 0;
  let score = ctx.score || 0; 
  let proximo = estado;

  if (estadoForzado !== null && estadoForzado !== undefined) {
    if (estadoForzado === 'CONVERGENCIA') score = 1.0;
    else if (estadoForzado === 'SILENCIO') score = 0;
    return { estado: estadoForzado, score: limitarScore(score), reiniciar: false };
  }

  // 15 segundos exactos para volver todo a cero
  if (!hablaA && !hablaB && silencio >= 15) {
    return { estado: 'SILENCIO', score: 0, reiniciar: true };
  }

  let estanHablando = (hablaA || hablaB);

  // Suman puntos siempre y cuando no lleven 2 segundos callados
  if (silencio < 2) {
    let multiplicador = 5.0; 
    let puntosGanados = ((ctx.bonoScore || 0) + (bonoPorSilencio || 0)) * multiplicador;
    score += puntosGanados;
  }

  switch (estado) {
    case 'SILENCIO':
    case 'VOZ_UNICA': 
    case 'ARQUIMEDES': 
      if (estanHablando) {
        proximo = 'CLOTOIDE';
      }
      break;

    case 'CLOTOIDE':
      // El goteo pasivo más rápido (0.15) para que se note la subida
      if (silencio < 2) {
        score += 0.05 * dt; 
      }
      if (score >= SCORE_ENTRADA_CONVERGENCIA) {
        proximo = 'CONVERGENCIA';
        score = Math.max(score, 0.6); 
      }
      break;

    case 'CONVERGENCIA':
      if (silencio < 2) {
        score = Math.min(1, score + SCORE_SUBIDA_CONVERGENCIA * dt);
      }
      break;
  }

  // EXPORTAMOS TODO A OVERLAYS
  window.scoreGlobal = limitarScore(score);
  window.segundosSinVozGlobal = silencio;
  window.estadoActualGlobal = proximo; // <-- Esto evitará que se apague al ganar
  
  return { estado: proximo, score: limitarScore(score), reiniciar: false };
}

function limitarScore(v) {
  return Math.max(0, Math.min(1, v));
}

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
    hablaA, hablaB, dt, tiempoA, tiempoB,
    nivelSolape, calidadDialogo, comunesValidos,
    segundosSinVoz, tiempoEnEstado, colapsoConv, estado, estadoForzado,
    bonoPorSilencio,
  } = ctx;
  let score = ctx.score + (ctx.bonoScore || 0) + (bonoPorSilencio || 0);
  let proximo = estado;

  // Override manual (panel de debug)
  if (estadoForzado !== null && estadoForzado !== undefined) {
    if (estadoForzado === 'CONVERGENCIA') score = 1.0;
    else if (estadoForzado === 'SILENCIO') score = 0;
    return { estado: estadoForzado, score: limitarScore(score), reiniciar: false };
  }

  // Inactividad total: olvido completo desde cualquier estado
  if (!hablaA && !hablaB && segundosSinVoz >= UMBRAL_OLVIDO) {
    return { estado: 'SILENCIO', score: 0, reiniciar: true };
  }

  const ambosHablaron = tiempoA > TIEMPO_MIN_HABLA && tiempoB > TIEMPO_MIN_HABLA;
  const dwellCumplido = tiempoEnEstado >= (DWELL[estado] ?? 0);

  switch (estado) {

    case 'SILENCIO': {
      if (hablaA || hablaB) {
        // Si ambos ya hablaron antes (sesión recuperada del umbral de reinicio)
        // se salta directamente a ARQUIMEDES
        proximo = ambosHablaron ? 'ARQUIMEDES' : 'VOZ_UNICA';
      }
      break;
    }

    case 'VOZ_UNICA': {
      if (!dwellCumplido) break;
      if (ambosHablaron) {
        proximo = 'ARQUIMEDES';
      } else if (segundosSinVoz >= UMBRAL_REINICIO) {
        proximo = 'SILENCIO';
        // score se conserva — no se pierde
      }
      break;
    }

    case 'ARQUIMEDES': {
      // Estado lineal: avanza a CLOTOIDE cuando hay solapamiento sostenido
      // o cuando lleva el tiempo mínimo y la calidad lo permite.
      // NO vuelve a estados anteriores — solo avanza o queda quieto.
      if (!dwellCumplido) break;

      if (nivelSolape >= ENTRAR_SOLAPE || calidadDialogo >= CALIDAD_ENTRADA_CONV) {
        proximo = 'CLOTOIDE';
      }
      // Única excepción de retroceso: olvido total (ya cubierto arriba)
      break;
    }

    case 'CLOTOIDE': {
      // Estado lineal: avanza a CONVERGENCIA cuando el score supera el umbral.
      // No vuelve a ARQUIMEDES — solo avanza o queda quieto.
      if (!dwellCumplido) break;

      if (score >= SCORE_ENTRADA_CONVERGENCIA) {
        proximo = 'CONVERGENCIA';
        score = Math.max(score, 0.6);
      }
      break;
    }

    case 'CONVERGENCIA': {
      // Estado FINAL e irreversible: una vez alcanzado, no se sale.
      // El score solo puede subir.
      score = Math.min(1, score + SCORE_SUBIDA_CONVERGENCIA * dt);
      // proximo permanece en 'CONVERGENCIA' siempre — no hay condición de salida
      break;
    }
  }

  return { estado: proximo, score: limitarScore(score), reiniciar: false };
}

function limitarScore(v) {
  return Math.max(0, Math.min(1, v));
}

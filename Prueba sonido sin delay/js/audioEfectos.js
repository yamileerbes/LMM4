// Efectos de audio por interlocutor: distorsión, filtro y panning.
// Cada interlocutor tiene su "cadena": fuente → distorsión → filtro → directa → panner → compresor.
// La voz viaja al otro lado SIEMPRE por la rama directa (sin delay, sin cortes);
// el panning es quien decide a qué auricular llega. La rama con delay quedó
// muda: el "eco" es ahora un recurso puramente visual (anillos + fantasmas).

/** Genera la curva del WaveShaper. cantidad=0 → lineal (sin distorsión). */
function crearCurvaDistorsion(cantidad) {
  const n = 44100;
  const curva = new Float32Array(n);
  if (cantidad <= 0) {
    for (let i = 0; i < n; i++) curva[i] = (i * 2) / n - 1;
    return curva;
  }
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curva[i] = ((3 + cantidad) * x * 20 * (Math.PI / 180)) / (Math.PI + cantidad * Math.abs(x));
  }
  return curva;
}

/** Construye la cadena de procesamiento para un interlocutor. */
function construirCadena(ctx, stream, panInicial, compresor, curvas) {
  const fuente = ctx.createMediaStreamSource(stream);

  // Analizador como hoja: solo para leer amplitud, no procesa la señal
  const analizador = ctx.createAnalyser();
  analizador.fftSize = 256;
  fuente.connect(analizador);

  const distorsion = ctx.createWaveShaper();
  distorsion.curve = curvas[0];
  distorsion.oversample = '4x';

  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 20000;

  const delay = ctx.createDelay(3.0);
  delay.delayTime.value = 0.4;

  const gananciaEco = ctx.createGain();
  gananciaEco.gain.value = 0;

  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(panInicial, ctx.currentTime);
  panner.connect(compresor);

  // Rama procesada con delay: queda conectada pero MUDA (gananciaEco = 0 y
  // nada vuelve a subirla). El delay hacía que la voz llegara tarde al otro
  // lado y con cortes al abrirse/cerrarse por estado.
  fuente.connect(distorsion);
  distorsion.connect(filtro);
  filtro.connect(delay);
  delay.connect(gananciaEco);
  gananciaEco.connect(panner);

  // Rama directa: la voz SIEMPRE llega al otro lado, constante y sin delay.
  // Toma la señal después del filtro/distorsión para conservar la textura por
  // estado (saturación en conflicto, voz lejana en convergencia) sin latencia.
  const gananciaDirecta = ctx.createGain();
  gananciaDirecta.gain.value = 0.8;
  filtro.connect(gananciaDirecta);
  gananciaDirecta.connect(panner);

  return { analizador, distorsion, filtro, delay, gananciaEco, gananciaDirecta, panner };
}

/** Configura distorsión/filtro/delay según el estado de la experiencia. */
function aplicarEfectoEstado(ctx, cadenaA, cadenaB, curvas, estado, esUnico) {
  if (!ctx || !cadenaA) return;
  const t = ctx.currentTime;
  // Constantes de tiempo largas → la textura sonora cruza de un estado a otro
  // de forma gradual, sin saltos. (setTargetAtTime: ~3·tau para asentar.)
  const TAU = 0.55;
  const TAU_PAN = 0.45;

  const aplicar = (cadena, panBase) => {
    switch (estado) {
      case 'SILENCIO':
        cadena.distorsion.curve = curvas[0];
        cadena.filtro.frequency.setTargetAtTime(20000, t, TAU);
        cadena.gananciaEco.gain.setTargetAtTime(0, t, TAU);
        cadena.panner.pan.setTargetAtTime(panBase, t, TAU_PAN);
        break;
      case 'VOZ_UNICA':
        cadena.distorsion.curve = curvas[0];
        cadena.filtro.frequency.setTargetAtTime(20000, t, TAU);
        cadena.panner.pan.setTargetAtTime(panBase, t, TAU_PAN);
        break;
      case 'CLOTOIDE':
      case 'FERMAT':
        // Conflicto: voz saturada y filtrada (sin delay: la voz sigue directa)
        cadena.distorsion.curve = curvas[40];
        cadena.filtro.frequency.setTargetAtTime(5000, t, TAU);
        break;
      case 'LOGARITMICA':
      case 'ARQUIMEDES':
        cadena.distorsion.curve = curvas[0];
        cadena.filtro.frequency.setTargetAtTime(20000, t, TAU);
        cadena.panner.pan.setTargetAtTime(panBase, t, TAU_PAN);
        break;
      case 'CONVERGENCIA':
        // Convergencia: voz lejana (filtro), pero inmediata — sin delay
        cadena.distorsion.curve = curvas[0];
        cadena.filtro.frequency.setTargetAtTime(1400, t, TAU);
        cadena.panner.pan.setTargetAtTime(panBase, t, TAU_PAN);
        break;
    }
  };

  aplicar(cadenaA, esUnico ? 0 : 0.8);
  if (cadenaB) aplicar(cadenaB, -0.8);
}

/**
 * Eco: ahora es SOLO visual (anillos y espirales fantasma en main.js).
 * La versión audible usaba la rama con delay y hacía que la voz llegara
 * tarde al otro lado — se eliminó. La función queda como no-op para no
 * romper a los llamadores.
 */
function aplicarEco(ctx, cadenaA, cadenaB, ecoA, ecoB) {
  // sin efecto de audio
}

/** Posiciona cada voz en el campo estéreo [-1 izquierda .. +1 derecha]. */
function aplicarPanning(ctx, cadenaA, cadenaB, panA, panB) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (cadenaA) cadenaA.panner.pan.setTargetAtTime(panA, t, 0.08);
  if (cadenaB) cadenaB.panner.pan.setTargetAtTime(panB, t, 0.08);
}

/**
 * (Eliminado el "monitor" que abría/cerraba la rama directa por estado: esa
 * compuerta era la causa de que la voz se escuchara con cortes del otro lado.
 * La rama directa queda siempre abierta desde construirCadena.)
 */

// Captura de micrófonos y análisis de amplitud/tono en tiempo real.
//
// Tres modos de entrada:
//   'unico'   — un solo mic; la amplitud B espeja la A (se separa con teclas PTT)
//   'dual'    — dos dispositivos USB independientes
//   'estereo' — un dispositivo estéreo (ej: receptor DJI): canal L = Int.1, R = Int.2
//
// El filtrado de señal usa GestorSenial (EMA — filtro de paso bajo exponencial)
// en lugar del RMS crudo. Elimina ruidos cortos (roces, golpes de cable) y
// deja pasar solo la voz sostenida. Un gestor por interlocutor.

// ── GestorSenial ─────────────────────────────────────────────────────────
// Adaptado del original p5.js: reemplaza map/constrain por equivalentes
// vanilla JS para no depender del contexto del sketch en el loop de audio.

const GESTOR_ANCHO = 312;   // muestras que guarda el historial (ancho del canvas debug)
const GESTOR_ALTO  = 48;    // alto del canvas debug en px

class GestorSenial {
  /**
   * @param {number} minimo  valor mínimo esperado de la entrada (para mapear a 0)
   * @param {number} maximo  valor máximo esperado de la entrada (para mapear a 1)
   * @param {number} f       factor de suavizado EMA [0..1]. Más alto = más suave.
   *                         0.80 = 80% pasado, 20% nueva muestra.
   */
  constructor(minimo = 0, maximo = 1, f = 0.80) {
    this.minimo = minimo;
    this.maximo = maximo;
    this.f = f;

    this.puntero   = 0;
    this.cargado   = 0;
    this.mapeada   = new Float32Array(GESTOR_ANCHO);
    this.filtrada  = 0;
    this.anterior  = 0;
    this.derivada  = 0;
    this.histFiltrada = new Float32Array(GESTOR_ANCHO);
    this.histDerivada = new Float32Array(GESTOR_ANCHO);
    this.amplificadorDerivada = 15.0;
  }

  /** Procesa una muestra cruda y actualiza el historial. */
  actualizar(entrada) {
    // Mapear al rango [0..1] y clampear
    let v = (entrada - this.minimo) / (this.maximo - this.minimo);
    v = Math.max(0, Math.min(1, v));
    this.mapeada[this.puntero] = v;

    // Filtro EMA
    this.filtrada = this.filtrada * this.f + v * (1 - this.f);
    this.histFiltrada[this.puntero] = this.filtrada;

    // Derivada (velocidad de cambio de la señal)
    this.derivada = (this.filtrada - this.anterior) * this.amplificadorDerivada;
    this.histDerivada[this.puntero] = this.derivada;
    this.anterior = this.filtrada;

    this.puntero++;
    if (this.puntero >= GESTOR_ANCHO) this.puntero = 0;
    this.cargado = Math.max(this.cargado, this.puntero);
  }

  /**
   * Dibuja el historial en un canvas 2D (no p5.js).
   * Blanco  = señal cruda mapeada
   * Verde   = señal filtrada (EMA)
   * Amarillo = derivada (velocidad de cambio)
   * Rojo    = puntero de escritura actual
   */
  dibujar(ctx2d, x, y, dibujarDerivada = false) {
    const w = GESTOR_ANCHO;
    const h = GESTOR_ALTO;

    ctx2d.fillStyle = '#000';
    ctx2d.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx2d.lineWidth = 0.5;
    ctx2d.strokeRect(x, y, w, h);
    ctx2d.fillRect(x, y, w, h);

    for (let i = 1; i < this.cargado; i++) {
      const x1 = x + i - 1;
      const x2 = x + i;

      // Señal cruda — blanco sutil
      const cr1 = y + h - this.mapeada[i - 1] * h;
      const cr2 = y + h - this.mapeada[i]     * h;
      ctx2d.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath(); ctx2d.moveTo(x1, cr1); ctx2d.lineTo(x2, cr2); ctx2d.stroke();

      // Señal filtrada — verde
      const cf1 = y + h - this.histFiltrada[i - 1] * h;
      const cf2 = y + h - this.histFiltrada[i]     * h;
      ctx2d.strokeStyle = '#22dd66';
      ctx2d.lineWidth = 1.5;
      ctx2d.beginPath(); ctx2d.moveTo(x1, cf1); ctx2d.lineTo(x2, cf2); ctx2d.stroke();

      // Derivada — amarillo (opcional)
      if (dibujarDerivada) {
        const mapDeriv = (v) => y + h - ((v + 1) / 2) * h;
        const cd1 = mapDeriv(this.histDerivada[i - 1]);
        const cd2 = mapDeriv(this.histDerivada[i]);
        ctx2d.strokeStyle = '#ffee44';
        ctx2d.lineWidth = 1;
        ctx2d.beginPath(); ctx2d.moveTo(x1, cd1); ctx2d.lineTo(x2, cd2); ctx2d.stroke();
      }
    }

    // Línea roja: puntero actual (borde de escritura)
    ctx2d.strokeStyle = '#ff3333';
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(x + this.puntero, y);
    ctx2d.lineTo(x + this.puntero, y + h);
    ctx2d.stroke();
  }
}

// ── Analizador principal ──────────────────────────────────────────────────

function crearAnalizador() {
  let ctx = null;
  let cadenaA = null;
  let cadenaB = null;
  let modo = 'unico';
  let tonoMaster = null;
  const curvas = {};

  // Un GestorSenial por interlocutor.
  // La señal RMS del micrófono oscila entre 0 y ~0.3 en condiciones normales;
  // el maximo=0.4 deja margen sin saturar. Ajustar si el mic es muy sensible.
  const gestorA = new GestorSenial(0, 0.4, 0.80);
  const gestorB = new GestorSenial(0, 0.4, 0.80);

  const estado = {
    amplitudA: 0,
    amplitudB: 0,
    ampCrudaA: 0,   // RMS sin filtrar — solo para mostrar en debug
    ampCrudaB: 0,
    tono: 0,
    streamA: null,
    streamB: null,
    iniciado: false,
    // Exponer los gestores para que panelDebug pueda dibujarlos
    gestorA,
    gestorB,
  };

  async function listarDispositivos() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const dispositivos = await navigator.mediaDevices.enumerateDevices();
      return dispositivos.filter(d => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  async function crearContexto() {
    curvas[0]  = crearCurvaDistorsion(0);
    curvas[40] = crearCurvaDistorsion(40);

    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    if (ctx.state === 'suspended') await ctx.resume();

    const compresor = ctx.createDynamicsCompressor();
    compresor.connect(ctx.destination);

    construirTonoColgado(compresor);
    return compresor;
  }

  function construirTonoColgado(compresor) {
    tonoMaster = ctx.createGain();
    tonoMaster.gain.value = 0;
    tonoMaster.connect(compresor);

    const tonoGate = ctx.createGain();
    tonoGate.gain.value = 0;
    tonoGate.connect(tonoMaster);

    for (const f of [480, 620]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(tonoGate);
      osc.start();
    }

    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 1.25;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.5;
    const lfoOffset = ctx.createConstantSource();
    lfoOffset.offset.value = 0.5;
    lfo.connect(lfoDepth);
    lfoDepth.connect(tonoGate.gain);
    lfoOffset.connect(tonoGate.gain);
    lfo.start();
    lfoOffset.start();
  }

  /** RMS del dominio temporal — valor crudo [0..~1] antes del filtrado. */
  function leerRMS(analizador, buf) {
    analizador.getByteTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += Math.abs(buf[i] - 128);
    return s / (buf.length * 128);
  }

  /**
   * Loop de lectura a 60fps.
   * Flujo: RMS crudo → GestorSenial.actualizar() → GestorSenial.filtrada
   * El valor filtrado es el que usa el resto del sistema (VAD, estados, eco).
   */
  function iniciarLectura() {
    const largo = cadenaA.analizador.frequencyBinCount;
    const bufA    = new Uint8Array(largo);
    const bufB    = new Uint8Array(largo);
    const bufFrec = new Uint8Array(largo);

    const leer = () => {
      if (!ctx || !cadenaA) return;

      // Leer RMS crudo
      const crudaA = leerRMS(cadenaA.analizador, bufA);
      const crudaB = cadenaB ? leerRMS(cadenaB.analizador, bufB) : crudaA;

      // Pasar por el gestor de señal (filtra ruido corto)
      gestorA.actualizar(crudaA);
      gestorB.actualizar(crudaB);

      // Exponer al sistema: valor filtrado en vez del crudo
      estado.amplitudA  = gestorA.filtrada;
      estado.amplitudB  = gestorB.filtrada;
      estado.ampCrudaA  = crudaA;   // guardado solo para el debug
      estado.ampCrudaB  = crudaB;

      // Tono: centroide espectral de la cadena A (sin filtrar — es estable)
      cadenaA.analizador.getByteFrequencyData(bufFrec);
      let suma = 0, sumaPesada = 0;
      for (let i = 0; i < largo; i++) { suma += bufFrec[i]; sumaPesada += bufFrec[i] * i; }
      estado.tono = suma > 0 ? (sumaPesada / suma) / largo : 0;

      requestAnimationFrame(leer);
    };
    leer();
  }

  const restricciones = (id) => ({
    audio: {
      deviceId: id ? { exact: id } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: true,
    },
  });

  async function iniciar(dispositivoA = '', dispositivoB = '') {
    const compresor = await crearContexto();
    const esDual = !!(dispositivoA && dispositivoB && dispositivoA !== dispositivoB);
    modo = esDual ? 'dual' : 'unico';

    const rawA = await navigator.mediaDevices.getUserMedia(restricciones(dispositivoA));
    estado.streamA = rawA;
    cadenaA = construirCadena(ctx, rawA, 0.8, compresor, curvas);

    if (esDual) {
      const rawB = await navigator.mediaDevices.getUserMedia(restricciones(dispositivoB));
      estado.streamB = rawB;
      cadenaB = construirCadena(ctx, rawB, -0.8, compresor, curvas);
    }

    estado.iniciado = true;
    iniciarLectura();
  }

  async function iniciarEstereoDividido(dispositivo = '') {
    const compresor = await crearContexto();
    modo = 'estereo';

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: dispositivo ? { exact: dispositivo } : undefined,
        channelCount: { ideal: 2, min: 1 },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const fuente  = ctx.createMediaStreamSource(stream);
    const divisor = ctx.createChannelSplitter(2);
    fuente.connect(divisor);

    const destinoA = ctx.createMediaStreamDestination();
    const destinoB = ctx.createMediaStreamDestination();
    divisor.connect(destinoA, 0, 0);
    divisor.connect(destinoB, 1, 0);

    estado.streamA = destinoA.stream;
    estado.streamB = destinoB.stream;
    cadenaA = construirCadena(ctx, destinoA.stream, 0.8, compresor, curvas);
    cadenaB = construirCadena(ctx, destinoB.stream, -0.8, compresor, curvas);

    estado.iniciado = true;
    iniciarLectura();
  }

  return {
    estado,
    listarDispositivos,
    iniciar,
    iniciarEstereoDividido,
    get modo()    { return modo; },
    get esUnico() { return modo === 'unico'; },
    setEfectoEstado: (e) => aplicarEfectoEstado(ctx, cadenaA, cadenaB, curvas, e, modo === 'unico'),
    setEco:          (a, b) => aplicarEco(ctx, cadenaA, cadenaB, a, b),
    setPanning:      (a, b) => aplicarPanning(ctx, cadenaA, cadenaB, a, b),
    setTonoColgado: (activo) => {
      if (!tonoMaster) return;
      tonoMaster.gain.setTargetAtTime(activo ? 0.06 : 0, ctx.currentTime, 0.4);
    },
  };
}

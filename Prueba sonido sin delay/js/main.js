// Punto de entrada de la experiencia.
// Pantalla de inicio → audio + reconocimiento → loop principal:
// detección de voz → máquina de estados → efectos → render de flujos de texto.
//
// Esta versión corre con DOBLE CLIC en index.html — sin Node, sin npm.

const app = document.getElementById('app');

// Precargar la tipografía serif local antes de que arranque el sketch
if (document.fonts) {
  document.fonts.load('16px "EB Garamond"').catch(() => {});
  document.fonts.load('italic 16px "EB Garamond"').catch(() => {});
}

montarPantallaInicio();

// ───────────────────────────────────────────────────────────────────────────
// Pantalla de inicio
// ───────────────────────────────────────────────────────────────────────────

function montarPantallaInicio() {
  const claveGuardada = localStorage.getItem('clave_openai') || '';

  app.innerHTML = `
    <style>
      .inicio { height: 100%; display: flex; flex-direction: column; align-items: center;
                justify-content: center; gap: 28px; }
      .inicio h1 { font-size: 22px; letter-spacing: -1px; color: rgba(255,255,255,0.9); }
      .inicio .sub { font-size: 11px; color: rgba(255,255,255,0.25); }
      .inicio .form { display: flex; flex-direction: column; gap: 16px; width: 300px; }
      .inicio label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px;
                      color: rgba(255,255,255,0.4); }
      .inicio .modos { display: flex; gap: 6px; }
      .inicio .modos button { flex: 1; padding: 8px 0; font: 9px 'Courier New', monospace;
        text-transform: uppercase; letter-spacing: 1px; background: none; cursor: pointer;
        border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.3); }
      .inicio .modos button.activo { border-color: rgba(255,255,255,0.5); color: white;
        background: rgba(255,255,255,0.05); }
      .inicio select, .inicio input[type=password] { background: #111;
        border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7);
        font: 11px 'Courier New', monospace; padding: 8px 10px; width: 100%; }
      .inicio .nota { font-size: 9px; color: rgba(255,255,255,0.2); line-height: 1.5; }
      .inicio .check { display: flex; align-items: center; gap: 8px; cursor: pointer;
        font-size: 10px; color: rgba(255,255,255,0.35); }
      .inicio .iniciar { padding: 14px 0; background: none; cursor: pointer;
        border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.4);
        font: 10px 'Courier New', monospace; letter-spacing: 3px; }
      .inicio .iniciar:hover { border-color: rgba(255,255,255,0.5); color: white; }
    </style>
    <div class="inicio">
      <div style="text-align: center;">
        <h1>ESPIRALES DEL SILENCIO</h1>
        <div class="sub">instalación interactiva</div>
      </div>
      <div class="form">
        <div>
          <label>Modo de entrada</label>
          <div class="modos" id="modos">
            <button data-modo="unico" class="activo">Único</button>
            <button data-modo="dual">Dual USB</button>
            <button data-modo="estereo">Estéreo L/R</button>
          </div>
          <div class="nota" id="nota-modo">Un mic. Teclas [A] / [B] para hablar.</div>
        </div>
        <div>
          <label>Micrófono 1</label>
          <select id="disp-a"><option value="">Por defecto</option></select>
        </div>
        <div id="cont-disp-b" style="display: none;">
          <label>Micrófono 2</label>
          <select id="disp-b"><option value="">Por defecto</option></select>
        </div>
        <div>
          <label class="check">
            <input type="checkbox" id="whisper-check" ${claveGuardada ? 'checked' : ''}>
            Transcripción Whisper (texto preciso cada 3s)
          </label>
          <input type="password" id="whisper-key" placeholder="sk-proj-..." value="${claveGuardada}"
                 style="margin-top: 6px; ${claveGuardada ? '' : 'display:none;'}">
        </div>
        <button class="iniciar" id="btn-iniciar">INICIAR EXPERIENCIA</button>
        <div class="nota">Durante la experiencia: [A]/[B] = hablar · [D] = panel de debug.</div>
      </div>
    </div>
  `;

  const notas = {
    unico: 'Un mic. Teclas [A] / [B] para hablar.',
    dual: 'Dos receptores USB independientes.',
    estereo: 'Receptor estéreo: L = Interlocutor 1, R = Interlocutor 2.',
  };

  let modoSeleccionado = 'unico';
  document.getElementById('modos').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    modoSeleccionado = btn.dataset.modo;
    document.querySelectorAll('#modos button').forEach(b =>
      b.classList.toggle('activo', b === btn));
    document.getElementById('nota-modo').textContent = notas[modoSeleccionado];
    document.getElementById('cont-disp-b').style.display =
      modoSeleccionado === 'dual' ? 'block' : 'none';
  });

  document.getElementById('whisper-check').addEventListener('change', (e) => {
    document.getElementById('whisper-key').style.display = e.target.checked ? 'block' : 'none';
  });

  const analizador = crearAnalizador();
  analizador.listarDispositivos().then(dispositivos => {
    for (const id of ['disp-a', 'disp-b']) {
      const sel = document.getElementById(id);
      for (const d of dispositivos) {
        const op = document.createElement('option');
        op.value = d.deviceId;
        op.textContent = d.label || ('Mic (' + d.deviceId.slice(0, 10) + '…)');
        sel.appendChild(op);
      }
    }
  });

  document.getElementById('btn-iniciar').addEventListener('click', async () => {
    const dispA = document.getElementById('disp-a').value;
    const dispB = document.getElementById('disp-b').value;
    const usarWhisper = document.getElementById('whisper-check').checked;
    const apiKey = document.getElementById('whisper-key').value.trim();

    if (usarWhisper && apiKey) localStorage.setItem('clave_openai', apiKey);

    try {
      if (modoSeleccionado === 'estereo') await analizador.iniciarEstereoDividido(dispA);
      else await analizador.iniciar(dispA, modoSeleccionado === 'dual' ? dispB : '');
    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      alert('No se pudo acceder al micrófono. Revisá los permisos del navegador.');
      return;
    }

    app.innerHTML = '';
    iniciarExperiencia(analizador, usarWhisper ? apiKey : '');
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Experiencia principal
// ───────────────────────────────────────────────────────────────────────────

function iniciarExperiencia(analizador, apiKeyWhisper) {
  const particulas = crearParticulas();

  // ── Flujos de texto ──
  // flujoCompartido: una sola cinta con segmentos de ambos (ola + VOZ_UNICA)
  // flujoA / flujoB: cintas individuales (CLOTOIDE y CONVERGENCIA)
  const flujoCompartido = crearFlujo();
  const flujoA = crearFlujo();
  const flujoB = crearFlujo();
  const flujosDe = (h) => [flujoCompartido, h === 'A' ? flujoA : flujoB];

  // ── Estado mutable de la experiencia ──
  const ex = {
    estado: 'SILENCIO',
    score: 0,
    estadoForzado: null,

    textoA: '', textoB: '',   // copia para el panel de debug
    antoA: '', antoB: '',
    fadeA: 0, fadeB: 0,

    tiempoA: 0, tiempoB: 0,
    tiempoSolape: 0,
    nivelSolape: 0,        // presión de solape (acumulador con fuga)
    calidadDialogo: 0,     // calidad de alternancia sostenida [0..1]
    silencios: [],
    inicioSilencio: null,
    ultimoHablante: null,
    intercambios: 0,

    // Histéresis / cooldown de la máquina de estados
    tiempoEnEstado: 0,
    estadoAnterior: 'SILENCIO',
    colapsoConv: 0,        // s continuos de calidad colapsada (para salir de CONVERGENCIA)

    ultimaVezA: null, ultimaVezB: null,
    ultimaVozA: null, ultimaVozB: null,  // último frame sobre umbral (para hangover)
    ecoA: false, ecoB: false,
    ecoPrevA: false, ecoPrevB: false,

    // Voces implícitas: el antónimo de la última palabra de CADA hablante.
    // Flotan como satélites en el hemisferio de su voz; cuando ambas
    // coinciden, se funden en el centro (fusión) y suman score.
    antoDe: {
      A: { palabra: null, anto: null, desde: 0 },
      B: { palabra: null, anto: null, desde: 0 },
    },
    fusion: null,        // { palabra, desde, bonoAplicado }
    choque: null,        // { clave, desde, hecho } — antónimos opuestos entre sí
    comunes: [],         // palabras comunes latentes [{palabra, desde}]
    bonoPendiente: 0,    // score extra (±) a consumir por la máquina de estados
    bonoPorSilencio: 0,  // score acumulado por pausas de escucha genuina
    tiempoEscucha: 0,    // segundos contabilizados de escucha activa (debug)

    rotacion: 0,
    velRotSuave: VELOCIDADES_ROTACION.SILENCIO,  // velocidad de giro con easing
    sacudidaSuave: 0,    // jitter con easing entre estados
    trailSuave: 0.16,    // alfa de estela del fondo con easing
    estadoOrigen: 'SILENCIO',
    estadoDestino: 'SILENCIO',
    blend: 1,
    dominanciaA: 0.5,

    etiquetaCambiadaEn: 0,
  };

  const panelDebug = crearPanelDebug(ex, (estado) => { ex.estadoForzado = estado; }, analizador);
  const teclado = crearTeclado(
    () => panelDebug.alternar(),
    () => { ex.estadoForzado = ex.estadoForzado === 'CONVERGENCIA' ? null : 'CONVERGENCIA'; },
    // Tecla [R]: reinicio completo — vuelve a SILENCIO y borra toda la sesión
    () => {
      ex.estado = 'SILENCIO';
      ex.score = 0;
      ex.estadoForzado = null;
      ex.tiempoEnEstado = 0;
      ex.estadoAnterior = 'SILENCIO';
      ex.estadoOrigen = 'SILENCIO';
      ex.estadoDestino = 'SILENCIO';
      ex.blend = 1;
      ex.rotacion = 0;
      ex.sacudidaSuave = 0;
      ex.trailSuave = 0.16;
      ex.etiquetaCambiadaEn = 0;
      reiniciarSesion();
    }
  );

  function reiniciarSesion() {
    ex.tiempoA = 0; ex.tiempoB = 0;
    ex.tiempoSolape = 0;
    ex.nivelSolape = 0;
    ex.calidadDialogo = 0;
    ex.colapsoConv = 0;
    ex.silencios = [];
    ex.intercambios = 0;
    ex.ultimoHablante = null;
    ex.ultimaVezA = null; ex.ultimaVezB = null;
    ex.ultimaVozA = null; ex.ultimaVozB = null;
    ex.antoDe = {
      A: { palabra: null, anto: null, desde: 0 },
      B: { palabra: null, anto: null, desde: 0 },
    };
    ex.fusion = null;
    ex.choque = null;
    ex.comunes = [];
    ex.bonoPendiente = 0;
    ex.bonoPorSilencio = 0;
    ex.tiempoEscucha = 0;
    ex.dominanciaA = 0.5;
    flujoCompartido.limpiar();
    flujoA.limpiar();
    flujoB.limpiar();
  }

  // ── Texto en vivo: segmentos por hablante ──
  // El interim de Web Speech reescribe el segmento activo; Whisper lo
  // reemplaza con la versión precisa y lo cierra; una pausa >1s lo cierra.
  let ultimoTranscript = '';
  let baseLen = 0;
  let hablanteVoz = null;

  function escribirSegmento(h, texto, cerrar = false) {
    if (!texto) return;
    for (const flujo of flujosDe(h)) {
      if (cerrar) flujo.reemplazarYCerrar(h, texto);
      else flujo.reescribirActivo(h, texto);
    }
    if (h === 'A') ex.fadeA = Math.max(ex.fadeA, 0.9);
    else ex.fadeB = Math.max(ex.fadeB, 0.9);
    ex.ultimoHablante = h;

    // Voz implícita del hablante: renovar si su última palabra-con-antónimo cambió
    const flujoPropio = h === 'A' ? flujoA : flujoB;
    const ultima = flujoPropio.ultimaPalabraConAntonimo();
    if (ultima && ultima.orig !== ex.antoDe[h].palabra) {
      ex.antoDe[h] = { palabra: ultima.orig, anto: ultima.anto, desde: performance.now() };
    }
  }

  function cerrarSegmentos() {
    for (const flujo of [flujoCompartido, flujoA, flujoB]) {
      flujo.cerrarActivo('A');
      flujo.cerrarActivo('B');
    }
    baseLen = ultimoTranscript.length;
    hablanteVoz = null;
  }

  iniciarReconocimiento((transcripcion) => {
    if (!transcripcion) return;

    const esParaA = analizador.esUnico
      ? (teclado.estado.teclaA || (!teclado.estado.teclaB && ex.ultimoHablante !== 'B'))
      : (analizador.estado.amplitudA >= analizador.estado.amplitudB);
    const h = esParaA ? 'A' : 'B';

    // Cambio de hablante: cerrar lo del anterior, el nuevo arranca segmento
    if (hablanteVoz && hablanteVoz !== h) {
      cerrarSegmentos();
    }
    hablanteVoz = h;

    if (transcripcion.length < baseLen) baseLen = 0; // el reconocedor se reinició
    const textoSegmento = transcripcion.slice(baseLen).trim();
    ultimoTranscript = transcripcion;
    if (textoSegmento) escribirSegmento(h, textoSegmento);
  });

  if (apiKeyWhisper) {
    iniciarWhisper(
      analizador.estado.streamA, analizador.estado.streamB, apiKeyWhisper,
      (texto) => { escribirSegmento('A', texto, true); baseLen = ultimoTranscript.length; ex.fadeA = 1; },
      (texto) => { escribirSegmento('B', texto, true); baseLen = ultimoTranscript.length; ex.fadeB = 1; }
    );
  }

  // ── Hooks de prueba (también útiles para el equipo) ──
  window.__flujos = { compartido: flujoCompartido, A: flujoA, B: flujoB };
  window.__ex = ex;
  window.__simularHabla = (h, texto) => {
    escribirSegmento(h, texto, true);
    if (h === 'A') { ex.fadeA = 1; ex.ultimaVezA = performance.now(); ex.tiempoA += 1; }
    else { ex.fadeB = 1; ex.ultimaVezB = performance.now(); ex.tiempoB += 1; }
  };

  // Estado inicial: la obra arranca en SILENCIO. El bloque de cambio de estado
  // solo dispara en transiciones, así que el arranque se fija a mano: tono de
  // llamada cortada en ambos auriculares y sin monitor de voz propia.
  analizador.setTonoColgado(true);

  // ── Sketch ──
  const sketch = (p) => {
    let ultimoMs = performance.now();
    // Gradiente de viñeta cacheado (recrearlo por frame es costoso)
    let vinetaCache = null;
    let vinetaClave = '';

    p.setup = () => {
      // densidad 1: en pantallas retina evita renderizar 4x los píxeles
      p.pixelDensity(1);
      p.createCanvas(window.innerWidth, window.innerHeight);
      p.background(COLOR_FONDO);
      window.__p5 = p; // referencia para pruebas (redraw manual, debugging)
    };

    p.windowResized = () => p.resizeCanvas(window.innerWidth, window.innerHeight);

    p.draw = () => {
      const ahora = performance.now();
      const dt = Math.min((ahora - ultimoMs) / 1000, 0.05);
      ultimoMs = ahora;

      // ── 1. Quién habla (con hangover: estabiliza el RMS crudo) ──
      const teclaA = teclado.estado.teclaA;
      const teclaB = teclado.estado.teclaB;
      const ampCrudaA = analizador.estado.amplitudA;
      const ampCrudaB = analizador.estado.amplitudB;
      // La voz se mantiene "activa" VAD_HANGOVER segundos tras caer bajo el
      // umbral: un micro-dip de un frame ya no rompe la detección de solape.
      if (ampCrudaA > UMBRAL_VAD) ex.ultimaVozA = ahora;
      if (ampCrudaB > UMBRAL_VAD) ex.ultimaVozB = ahora;
      const vozA = ex.ultimaVozA !== null && (ahora - ex.ultimaVozA) / 1000 < VAD_HANGOVER;
      const vozB = ex.ultimaVozB !== null && (ahora - ex.ultimaVozB) / 1000 < VAD_HANGOVER;
      const hablaA = teclaA || vozA;
      const hablaB = teclaB || vozB;
      const ampA = teclaA ? Math.max(ampCrudaA, 0.08) : ampCrudaA;
      const ampB = teclaB ? Math.max(ampCrudaB, 0.08) : ampCrudaB;
      const amplitud = Math.max(ampA, ampB);
      const tono = analizador.estado.tono;

      // ── 2. Tiempos, solape, turnos, silencios ──
      if (hablaA) { ex.tiempoA += dt; ex.ultimaVezA = ahora; }
      if (hablaB) { ex.tiempoB += dt; ex.ultimaVezB = ahora; }
      // Solape con fuga: sube mientras ambos hablan, decae lento si no.
      // Reemplaza el reset duro que impedía acumular solape en estéreo.
      if (hablaA && hablaB) ex.nivelSolape = Math.min(3, ex.nivelSolape + dt);
      else ex.nivelSolape = Math.max(0, ex.nivelSolape - dt * (1 / TIEMPO_FUGA_SOLAPE));
      ex.tiempoSolape = (hablaA && hablaB) ? ex.tiempoSolape + dt : 0; // (debug)

      if (!hablaA && !hablaB) {
        if (ex.inicioSilencio === null) ex.inicioSilencio = ahora;
      } else if (ex.inicioSilencio !== null) {
        const dur = (ahora - ex.inicioSilencio) / 1000;
        if (dur > 0.1) {
          ex.silencios.push(dur);
          if (ex.silencios.length > 8) ex.silencios.shift();
        }
        ex.inicioSilencio = null;
        const hablante = hablaA ? 'A' : 'B';
        if (ex.ultimoHablante && ex.ultimoHablante !== hablante) ex.intercambios++;
        ex.ultimoHablante = hablante;
      }

      const segundosSinVoz = ex.inicioSilencio === null ? 0 : (ahora - ex.inicioSilencio) / 1000;

      // Calidad de diálogo (acumulador con fuga): sube con alternancia
      // balanceada y pausas; baja lento si se degrada (monólogo, solape).
      {
        const balance = Math.min(ex.tiempoA, ex.tiempoB) / (Math.max(ex.tiempoA, ex.tiempoB) || 1);
        const silProm = ex.silencios.length > 0
          ? ex.silencios.reduce((a, b) => a + b, 0) / ex.silencios.length : 0;
        const buenDialogo =
          balance > UMBRAL_BALANCE &&
          silProm > PAUSA_MIN &&
          ex.intercambios >= MIN_INTERCAMBIOS &&
          ex.nivelSolape < ENTRAR_SOLAPE;
        ex.calidadDialogo = Math.max(0, Math.min(1, ex.calidadDialogo +
          (buenDialogo ? CALIDAD_SUBE : -CALIDAD_BAJA) * dt));
      }

      // ── Silencios como puntaje ──
      // Un silencio entre turnos es escucha activa y suma score.
      // Umbral mínimo: 0.5s (antes 0.8s).
      // El bono se ACUMULA — nunca se resetea a 0 entre frames mientras
      // dure el silencio, y solo se consume (pasa a actualizarEstado) al
      // final del bloque. El score resultante nunca puede bajar.
      {
        const ambosHanHablado = ex.tiempoA > TIEMPO_MIN_HABLA && ex.tiempoB > TIEMPO_MIN_HABLA;
        const esEscucha = !hablaA && !hablaB &&
          segundosSinVoz >= SILENCIO_MIN_ESCUCHA &&
          segundosSinVoz < SILENCIO_MAX_ESCUCHA &&
          ambosHanHablado &&
          (ex.estado === 'ARQUIMEDES' || ex.estado === 'CLOTOIDE' || ex.estado === 'CONVERGENCIA');

        if (esEscucha) {
          const tasa = ex.estado === 'CONVERGENCIA'
            ? SCORE_POR_SILENCIO_CONV : SCORE_POR_SILENCIO;
          ex.bonoPorSilencio += tasa * dt;
          ex.tiempoEscucha += dt;
        }
        // Nota: ya NO se resetea bonoPorSilencio a 0 aquí.
        // Se consume en el paso 6 (actualizarEstado) y se limpia allí.
      }

      // ── Puntaje por voz única en CLOTOIDE ──
      // Cuando en CLOTOIDE habla solo uno (el otro escucha sin interrumpir),
      // se suma score a ritmo bajo. Refuerza la escucha activa sin solapamiento.
      if (ex.estado === 'CLOTOIDE') {
        const soloUno = (hablaA && !hablaB) || (hablaB && !hablaA);
        if (soloUno) {
          ex.bonoPendiente += SCORE_VOZ_UNICA_CLOTOIDE * dt;
        }
      }

      // Palabras comunes NO triviales (los saludos no cuentan para converger)
      const comunesValidos = ex.comunes.filter(
        (c) => !PALABRAS_TRIVIALES.has((c.palabra || '').toLowerCase())
      ).length;

      // Colapso de convergencia: segundos continuos con calidad baja
      if (ex.estado === 'CONVERGENCIA' && ex.calidadDialogo < CALIDAD_COLAPSO_CONV) {
        ex.colapsoConv += dt;
      } else {
        ex.colapsoConv = 0;
      }

      // Pausa >1s: cerrar segmentos activos (la próxima frase es un segmento nuevo)
      if (segundosSinVoz > 1.0 && hablanteVoz !== null) cerrarSegmentos();

      // ── 3. Eco ──
      const desdeA = ex.ultimaVezA === null ? Infinity : (ahora - ex.ultimaVezA) / 1000;
      const desdeB = ex.ultimaVezB === null ? Infinity : (ahora - ex.ultimaVezB) / 1000;

      if (ex.estado === 'VOZ_UNICA') {
        ex.ecoA = hablaA;
        ex.ecoB = hablaB;
      } else {
        if (hablaA && !hablaB && ex.ultimaVezB !== null && desdeB > UMBRAL_ECO) ex.ecoA = true;
        if (hablaB && !hablaA && ex.ultimaVezA !== null && desdeA > UMBRAL_ECO) ex.ecoB = true;
        if (hablaB && ex.ecoA) ex.ecoA = false;
        if (hablaA && ex.ecoB) ex.ecoB = false;
        if (!hablaA && !hablaB) {
          if (ex.ecoA && desdeA > 5) ex.ecoA = false;
          if (ex.ecoB && desdeB > 5) ex.ecoB = false;
        }
      }
      if (ex.ecoA !== ex.ecoPrevA || ex.ecoB !== ex.ecoPrevB) {
        analizador.setEco(ex.ecoA, ex.ecoB);
        ex.ecoPrevA = ex.ecoA;
        ex.ecoPrevB = ex.ecoB;
      }

      // ── 4. Dominancia (espiral compartida) ──
      if (hablaA) ex.dominanciaA = Math.min(1, ex.dominanciaA + dt * 2.5);
      else if (hablaB) ex.dominanciaA = Math.max(0, ex.dominanciaA - dt * 2.5);

      // ── 5. Fusión y choque de antónimos ──
      // Fusión: ambos evitan la MISMA palabra → convergen en lo no-dicho:
      // las palabras viajan al centro, se funden en dorado, suman score y
      // la palabra común queda LATENTE (memoria de los encuentros).
      // Choque: los antónimos son OPUESTOS entre sí (uno evita "bueno", el
      // otro "malo") → los pensamientos implícitos colisionan y restan.
      {
        const aA = ex.antoDe.A, aB = ex.antoDe.B;
        const edadA = (ahora - aA.desde) / 1000;
        const edadB = (ahora - aB.desde) / 1000;
        const vigentes = aA.anto && aB.anto &&
          edadA < VENTANA_FUSION && edadB < VENTANA_FUSION;

        const coinciden = vigentes && aA.anto === aB.anto;
        const opuestos = vigentes && aA.anto !== aB.anto &&
          (palabraAntonima(aA.anto) === aB.anto || palabraAntonima(aB.anto) === aA.anto);

        if (coinciden && (!ex.fusion || ex.fusion.palabra !== aA.anto)) {
          ex.fusion = { palabra: aA.anto, desde: ahora, bonoAplicado: false };
        }
        if (ex.fusion) {
          const tFusion = (ahora - ex.fusion.desde) / 1000;
          // El bono se otorga cuando las palabras terminan de fundirse (1s)
          if (tFusion >= 1 && !ex.fusion.bonoAplicado) {
            ex.bonoPendiente += BONO_FUSION;
            ex.fusion.bonoAplicado = true;
            // Guardar la palabra común — sigue latente en la escena
            if (!ex.comunes.some(c => c.palabra === ex.fusion.palabra)) {
              ex.comunes.push({ palabra: ex.fusion.palabra, desde: ahora });
              if (ex.comunes.length > MAX_COMUNES) ex.comunes.shift();
            }
          }
          if (tFusion > 8) ex.fusion = null; // la revelación se disipa
        }

        const claveChoque = opuestos ? [aA.anto, aB.anto].sort().join('|') : null;
        if (opuestos && (!ex.choque || ex.choque.clave !== claveChoque)) {
          ex.choque = { clave: claveChoque, desde: ahora, hecho: false };
        }
        if (ex.choque) {
          const tChoque = (ahora - ex.choque.desde) / 1000;
          // Impacto a los 0.6s: estallido + castigo de score
          if (tChoque >= 0.6 && !ex.choque.hecho) {
            // El choque ya no resta score — solo dispara el efecto visual
            particulas.explotar(p.width / 2, p.height / 2, 14, '#FFFFFF');
            ex.choque.hecho = true;
          }
          if (tChoque > 2.2) ex.choque = null;
        }
      }

      // ── 6. Máquina de estados ──
      ex.tiempoEnEstado += dt;
      const bono = ex.bonoPendiente;
      ex.bonoPendiente = 0;
      const silencioBonoFrame = ex.bonoPorSilencio;
      ex.bonoPorSilencio = 0;   // se consumió: se lo pasamos a actualizarEstado
      const resultado = actualizarEstado({
        hablaA, hablaB, dt,
        tiempoA: ex.tiempoA, tiempoB: ex.tiempoB,
        nivelSolape: ex.nivelSolape,
        calidadDialogo: ex.calidadDialogo,
        comunesValidos,
        segundosSinVoz,
        tiempoEnEstado: ex.tiempoEnEstado,
        colapsoConv: ex.colapsoConv,
        estado: ex.estado, score: ex.score,
        estadoForzado: ex.estadoForzado,
        bonoScore: bono,
        bonoPorSilencio: silencioBonoFrame,
      });

      if (resultado.reiniciar) reiniciarSesion();
      if (resultado.estado !== ex.estado) {
        ex.estadoAnterior = ex.estado;
        ex.tiempoEnEstado = 0;
        ex.colapsoConv = 0;
        analizador.setEfectoEstado(resultado.estado);
        // Tono de "llamada cortada" solo mientras la obra está en reposo.
        analizador.setTonoColgado(resultado.estado === 'SILENCIO');
        ex.etiquetaCambiadaEn = ahora;
        if (resultado.estado === 'CONVERGENCIA') {
          const audio = new Audio("./sonidos/Convergencia.mp3");
          audio.volume = 0.8;
          audio.play().catch(() => {});
        }
      }
      ex.estado = resultado.estado;
      ex.score = resultado.score;

      // ── 6. Morph entre formas ──
      if (ex.estado !== ex.estadoDestino) {
        ex.estadoOrigen = ex.estadoDestino;
        ex.estadoDestino = ex.estado;
        ex.blend = 0;
      }
      if (ex.blend < 1) ex.blend = Math.min(1, ex.blend + dt * VELOCIDAD_BLEND);

      // ── 7. Fades por hablante ──
      const decay = ex.estado === 'CONVERGENCIA' ? 0.05 : 0.30;
      if (hablaA) ex.fadeA = Math.min(1, ex.fadeA + dt * 6.0);
      else ex.fadeA = Math.max(ex.estado === 'CONVERGENCIA' ? 0.2 * ex.score : 0, ex.fadeA - dt * decay * (hablaB ? 2.5 : 1));
      if (hablaB) ex.fadeB = Math.min(1, ex.fadeB + dt * 6.0);
      else ex.fadeB = Math.max(ex.estado === 'CONVERGENCIA' ? 0.2 * ex.score : 0, ex.fadeB - dt * decay * (hablaA ? 2.5 : 1));

      // El texto de la ola se limpia cuando ya nadie lo sostiene
      if (ex.fadeA < 0.04 && ex.fadeB < 0.04 && !flujoCompartido.vacio() && segundosSinVoz > 2) {
        flujoCompartido.limpiar();
        flujoA.limpiar();
        flujoB.limpiar();
      }

      // Giro suave: la velocidad persigue la del estado con easing, así la
      // espiral acelera/frena gradualmente en vez de saltar al cambiar.
      const velObjetivo = VELOCIDADES_ROTACION[ex.estado] !== undefined ? VELOCIDADES_ROTACION[ex.estado] : 0.1;
      ex.velRotSuave += (velObjetivo - ex.velRotSuave) * Math.min(1, dt * 1.5);
      ex.rotacion += dt * ex.velRotSuave;

      // ── 8. Blend semántico ──
      const ratioSolape = Math.min(1, ex.nivelSolape / UMBRAL_CLOTOIDE);

      // ── 9. Panning ──
      if (ex.estado === 'CLOTOIDE') {
        // En conflicto: panning oscilante para marcar la tensión
        const pan = Math.sin(ahora * 0.009);
        analizador.setPanning(pan, -pan);
      } else if (ex.estado === 'CONVERGENCIA') {
        // En convergencia: voces se acercan al centro a medida que sube el score
        const centro = 0.8 * (1 - ex.score * 0.6);
        analizador.setPanning(centro, -centro);
      } else if (analizador.esUnico) {
        if (hablaA && !hablaB) analizador.setPanning(0.8, 0.8);
        else if (hablaB && !hablaA) analizador.setPanning(-0.8, -0.8);
        else analizador.setPanning(0, 0);
      } else {
        analizador.setPanning(0.8, -0.8);
      }

      // ════════════════════════ RENDER ════════════════════════
      // Todo se compone dentro del círculo del marco físico.

      const cx0 = p.width / 2;
      const cy0 = p.height / 2;
      const RADIO = Math.min(p.width, p.height) / 2 - MARGEN_MARCO;
      const radioMax = RADIO * FACTOR_ESPIRAL;

      // Jitter suave: solo en CLOTOIDE (conflicto)
      const sacudidaObjetivo = ex.estado === 'CLOTOIDE' ? 10.0 * amplitud : 0;
      ex.sacudidaSuave += (sacudidaObjetivo - ex.sacudidaSuave) * Math.min(1, dt * 4.0);
      const sacudida = ex.sacudidaSuave;

      // Fondo con estela compensada por framerate
      const trailObjetivo = ex.estado === 'CLOTOIDE' ? 0.09 : 0.16;
      ex.trailSuave += (trailObjetivo - ex.trailSuave) * Math.min(1, dt * 2.0);
      const alfaFondoBase = ex.trailSuave;
      const factorDt = Math.min(4, dt / 0.0167);
      p.noStroke();
      p.fill(0, 0, 0, 255 * Math.min(0.6, alfaFondoBase * factorDt));
      p.rect(0, 0, p.width, p.height);

      particulas.actualizar(p, cx0, cy0, hablaA, hablaB, ex.estado === 'CLOTOIDE', amplitud, tono);

      // Viñeta (gradiente cacheado: solo se recrea al cambiar el tamaño)
      const ctx2d = p.drawingContext;
      const claveVineta = p.width + 'x' + p.height;
      if (vinetaClave !== claveVineta) {
        vinetaCache = ctx2d.createRadialGradient(cx0, cy0, radioMax * 1.4, cx0, cy0, radioMax * 2.2);
        vinetaCache.addColorStop(0, 'rgba(0,0,0,0)');
        vinetaCache.addColorStop(1, 'rgba(0,0,0,1)');
        vinetaClave = claveVineta;
      }
      ctx2d.fillStyle = vinetaCache;
      ctx2d.fillRect(0, 0, p.width, p.height);

      // ── Fondo de CONVERGENCIA: degradé radial de verdes ──
      // La intensidad escala con el score: empieza sutil y crece a medida
      // que la conversación se profundiza. Los silencios de escucha lo alimentan.
      if (ex.estado === 'CONVERGENCIA' && ex.score > 0.02) {
        const s = ex.score;
        // Capa 1: verde oscuro denso en el centro, se expande con el score
        const gvCentro = ctx2d.createRadialGradient(cx0, cy0, 0, cx0, cy0, radioMax * (0.5 + s * 0.6));
        gvCentro.addColorStop(0,   `rgba(67, 11, 92, ${(s * 0.72).toFixed(3)})`);
        gvCentro.addColorStop(0.4, `rgba(105, 25, 140, ${(s * 0.45).toFixed(3)})`);
        gvCentro.addColorStop(1,   'rgba(0, 0, 0, 0)');
        ctx2d.fillStyle = gvCentro;
        ctx2d.fillRect(0, 0, p.width, p.height);

        // Capa 2: jade claro en el anillo medio (aparece a partir de score > 0.4)
        if (s > 0.4) {
          const fJade = (s - 0.4) / 0.6;
          const gvJade = ctx2d.createRadialGradient(cx0, cy0, radioMax * 0.25, cx0, cy0, radioMax * 0.85);
          gvJade.addColorStop(0,   'rgba(0, 0, 0, 0)');
          gvJade.addColorStop(0.5, `rgba(105, 25, 140, ${(fJade * 0.22).toFixed(3)})`);
          gvJade.addColorStop(1,   'rgba(0, 0, 0, 0)');
          ctx2d.fillStyle = gvJade;
          ctx2d.fillRect(0, 0, p.width, p.height);
        }

        // Capa 3: glow esmeralda muy sutil en el borde exterior (score > 0.7)
        if (s > 0.7) {
          const fEsm = (s - 0.7) / 0.3;
          const gvEsm = ctx2d.createRadialGradient(cx0, cy0, radioMax * 0.7, cx0, cy0, radioMax * 1.1);
          gvEsm.addColorStop(0,   'rgba(0, 0, 0, 0)');
          gvEsm.addColorStop(0.6, `rgba(105, 25, 140, ${(fEsm * 0.12).toFixed(3)})`);
          gvEsm.addColorStop(1,   'rgba(0, 0, 0, 0)');
          ctx2d.fillStyle = gvEsm;
          ctx2d.fillRect(0, 0, p.width, p.height);
        }
      }

      // Tinte rojo suave en conflicto (CLOTOIDE)
      if (ex.estado === 'CLOTOIDE') {
        p.fill(226, 75, 74, 255 * 0.07);
        p.rect(0, 0, p.width, p.height);
      }

      dibujarIndicadorHablante(p, cx0, cy0, hablaA, hablaB);
      dibujarIndicadorPTT(p, cx0, cy0, RADIO, teclaA, teclaB);
      dibujarEtiquetaEstado(p, cx0, cy0, RADIO, ex.estado, ex.etiquetaCambiadaEn, ahora);
      const pulsoEco = dibujarAnillosEco(p, cx0, cy0, radioMax, ex.ecoA, ex.ecoB, ahora);

      // Fade de morph: el texto baja a ~0.55 en mitad de la transición de forma
      // y vuelve a 1, para enmascarar el reacomodo de glifos. 1 sin morph.
      const fadeMorph = 0.55 + 0.45 * Math.abs(2 * ex.blend - 1);

      // ── Contexto del frame ──
      const frame = {
        estado: ex.estado,
        estadoOrigen: ex.estadoOrigen,
        blend: ex.blend,
        radioMax, amplitud, dt,
        cx: cx0, cy: cy0,
        jitter: sacudida,
        fadeMorph,
      };
      const fades = { A: ex.fadeA, B: ex.fadeB };

      // Cuerda del círculo (la comparten la línea y el texto que la reemplaza)
      const radioOla = RADIO - 6;
      const ampOla = 30 + amplitud * 140;
      const faseOla = ahora * 0.0014;
      const camino = (x) => caminoOla(x, cx0, cy0, radioOla, ampOla, faseOla);
      const xIzqOla = cx0 - radioOla;
      const xDerOla = cx0 + radioOla;

      // ── Flujos según estado ──
      if (ex.estado === 'SILENCIO' || ex.estado === 'VOZ_UNICA') {
        // La cuerda. Al hablar, las palabras la van reemplazando desde la derecha.
        const xCorte = dibujarFlujoOla(p, frame, flujoCompartido, {
          caminoOla: camino,
          xIzq: xIzqOla,
          xDer: xDerOla,
          fades,
        });
        dibujarOla(p, cx0, cy0, radioOla, amplitud, ahora, xCorte);

      } else if (ex.estado === 'ARQUIMEDES') {
        // Espiral compartida: lo nuevo entra por afuera y empuja lo anterior al centro
        const vieneDeOla = !esEstadoEspiral(ex.estadoOrigen) && ex.blend < 1;
        dibujarFlujoEspiral(p, frame, flujoCompartido, {
          estadoForma: 'ARQUIMEDES',
          rotGlobal: ex.rotacion,
          fades,
          origenOla: vieneDeOla ? { camino, xIzq: xIzqOla, xDer: xDerOla } : null,
        });

      } else if (ex.estado === 'CLOTOIDE') {
        // Cruz: la S de A y la S de B perpendiculares — ideas que se cruzan sin converger
        const vieneDeOla = !esEstadoEspiral(ex.estadoOrigen) && ex.blend < 1;
        dibujarFlujoEspiral(p, frame, flujoA, {
          estadoForma: 'CLOTOIDE', rotGlobal: ex.rotacion, fades,
          origenOla: vieneDeOla ? { camino, xIzq: xIzqOla, xDer: xDerOla } : null,
        });
        dibujarFlujoEspiral(p, frame, flujoB, {
          estadoForma: 'CLOTOIDE', rotGlobal: ex.rotacion + Math.PI / 2, fades,
        });

      } else if (ex.estado === 'CONVERGENCIA') {
        // Espiral doble entrelazada: el texto de ambos NACE EN EL CENTRO y
        // crece hacia afuera — los dos brazos se conectan en el medio.
        dibujarFlujoEspiral(p, frame, flujoA, {
          estadoForma: 'CONVERGENCIA', rotGlobal: ex.rotacion, fades,
          desdeCentro: true,
        });
        dibujarFlujoEspiral(p, frame, flujoB, {
          estadoForma: 'CONVERGENCIA', rotGlobal: ex.rotacion + Math.PI, fades,
          desdeCentro: true,
        });
      }

      // Fantasmas de eco (solo en estados de espiral)
      if (esEstadoEspiral(ex.estado)) {
        if (ex.ecoA) {
          dibujarFlujoEspiral(p, frame, flujoA, {
            estadoForma: ex.estado, rotGlobal: ex.rotacion - 0.2,
            fades, alphaGlobal: 0.25 * pulsoEco,
          });
        }
        if (ex.ecoB) {
          dibujarFlujoEspiral(p, frame, flujoB, {
            estadoForma: ex.estado, rotGlobal: ex.rotacion + Math.PI + 0.2,
            fades, alphaGlobal: 0.25 * pulsoEco,
          });
        }
      }

      // ── Voces implícitas: satélites de antónimos por hablante ──
      // Cada palabra evitada flota en el hemisferio de su voz (A derecha,
      // B izquierda, como el panning). Si ambos evitan la misma palabra,
      // los satélites viajan al centro y se funden en dorado.
      {
        const tFusion = ex.fusion ? (ahora - ex.fusion.desde) / 1000 : -1;
        const tChoque = ex.choque ? (ahora - ex.choque.desde) / 1000 : -1;

        // Palabras comunes LATENTES: los encuentros pasados siguen en escena,
        // tenues, orbitando el anillo externo — memoria de lo convergido.
        for (let i = 0; i < ex.comunes.length; i++) {
          const com = ex.comunes[i];
          if (ex.fusion && ex.fusion.palabra === com.palabra) continue; // está en el centro
          const angCom = i * 2.39996 + ahora * 0.00004; // ángulo áureo + deriva lentísima
          const rCom = RADIO * 0.82;
          const alfaCom = 0.15 + 0.04 * Math.sin(ahora * 0.001 + i * 1.3);
          dibujarSatelite(p, com.palabra.toUpperCase(), COLOR_FUSION,
            cx0 + Math.cos(angCom) * rCom, cy0 + Math.sin(angCom) * rCom, alfaCom, ahora);
        }

        const posSatelite = (h) => {
          const lado = h === 'A' ? 0 : Math.PI; // hemisferio derecho / izquierdo
          const faseSat = h === 'A' ? 0 : 2.1;
          const ang = lado + Math.sin(ahora * 0.00019 + faseSat) * 0.85;
          const orbita = RADIO * (0.60 + 0.10 * Math.sin(ahora * 0.00031 + faseSat * 1.7));
          return { x: cx0 + Math.cos(ang) * orbita, y: cy0 + Math.sin(ang) * orbita };
        };

        for (const h of ['A', 'B']) {
          const a = ex.antoDe[h];
          if (!a.anto) continue;
          const edad = (ahora - a.desde) / 1000;
          // Fade-in 0.4s, vigencia hasta VENTANA_FUSION con fundido final
          let alfaSat = Math.min(1, edad / 0.4) *
            Math.max(0, Math.min(1, 1 - (edad - (VENTANA_FUSION - 1.5)) / 1.5)) * 0.85;

          let pos = posSatelite(h);
          if (ex.fusion && ex.fusion.palabra === a.anto && tFusion >= 0) {
            // Fusión: viaje al centro durante 1s; el satélite se apaga al fundirse
            const k = Math.min(1, tFusion);
            const suave = k * k * (3 - 2 * k);
            pos = { x: pos.x + (cx0 - pos.x) * suave, y: pos.y + (cy0 - pos.y) * suave };
            alfaSat *= (1 - suave);
          } else if (ex.choque && tChoque >= 0) {
            // Choque: aceleran uno contra el otro, impactan y rebotan
            const k = tChoque < 0.6
              ? Math.pow(tChoque / 0.6, 2) * 0.92          // se lanzan (casi al centro)
              : Math.max(0, 0.92 * (1 - (tChoque - 0.6) / 1.0)); // rebote amortiguado
            pos = { x: pos.x + (cx0 - pos.x) * k, y: pos.y + (cy0 - pos.y) * k };
            // Temblor en el momento del impacto
            if (tChoque >= 0.5 && tChoque < 1.0) {
              pos.x += (Math.random() - 0.5) * 7;
              pos.y += (Math.random() - 0.5) * 7;
            }
          }

          const color = h === 'A' ? COLOR_ANTONIMO_A : COLOR_ANTONIMO_B;
          dibujarSatelite(p, a.anto.toUpperCase(), color, pos.x, pos.y, alfaSat, ahora);
        }

        // Onda del impacto: anillo rojo que se expande desde el choque
        if (ex.choque && tChoque >= 0.6) {
          const f = Math.min(1, (tChoque - 0.6) / 0.9);
          p.noFill();
          p.stroke(226, 75, 74, 255 * (1 - f) * 0.7);
          p.strokeWeight(1.5);
          p.circle(cx0, cy0, 24 + f * 240);
          p.noStroke();
        }

        // La palabra fundida: una sola, dorada, en el centro
        if (ex.fusion && tFusion >= 1) {
          dibujarFusion(p, ex.fusion.palabra.toUpperCase(), cx0, cy0,
            tFusion - 1, ahora, ex.estado === 'CONVERGENCIA');
        }
      }

      // ── Máscara del marco circular: nada vive fuera del círculo ──
      dibujarMascaraCircular(p, cx0, cy0, RADIO);

      // ── Datos para el panel de debug ──
      if (panelDebug.visible && p.frameCount % 6 === 0) {
        ex.textoA = flujoCompartido.textoDe('A');
        ex.textoB = flujoCompartido.textoDe('B');
        ex.antoA = fraseAntonima(ex.textoA).slice(-90);
        ex.antoB = fraseAntonima(ex.textoB).slice(-90);
      }
      panelDebug.actualizar(ampCrudaA, ampCrudaB);
    };
  };

  new p5(sketch, app);
}

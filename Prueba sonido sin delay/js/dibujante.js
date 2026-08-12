// El "flujo": modelo de texto de la experiencia.
//
// Cada flujo es una cinta de segmentos {hablante, palabras}. Lo último dicho
// entra por el extremo EXTERNO de la espiral (grande) y empuja lo anterior
// hacia el centro, donde se achica hasta desaparecer. La distribución es por
// LONGITUD DE ARCO con kerning real (textWidth), legible como un poema en
// espiral.
//
// La espiral muestra SIEMPRE la transcripción original. Cada palabra guarda
// además su antónimo (si existe en el diccionario): la última palabra con
// antónimo alimenta la "voz implícita" que se dibuja en el centro — lo que
// el hablante evita decir mientras dice lo que dice.

function crearFlujo() {
  const flujo = {
    segmentos: [],          // [{hablante, palabras:[{orig, anto, tieneAnto}], cerrado}]
    activos: { A: null, B: null },
    anchoTotal: 0,          // ancho total dibujado el frame anterior (px de arco)
    anchoSuave: 0,          // versión con easing → deslizamiento suave
    _glifosCache: null,     // arreglo aplanado de glifos, reutilizado entre frames
    _glifosSucio: true,     // se reconstruye solo cuando cambia el contenido
  };

  function _construirPalabras(texto) {
    return texto.trim().split(/\s+/).filter(Boolean).map((orig) => {
      const anto = palabraAntonima(orig);
      return { orig, anto: anto || orig, tieneAnto: !!anto };
    });
  }

  flujo.reescribirActivo = (hablante, texto) => {
    let seg = flujo.activos[hablante];
    if (!seg) {
      seg = { hablante, palabras: [], cerrado: false };
      flujo.segmentos.push(seg);
      flujo.activos[hablante] = seg;
    }
    seg.palabras = _construirPalabras(texto);
    flujo._podar();
    flujo._glifosSucio = true;
  };

  /** Última palabra dicha que tiene antónimo en el diccionario (o null). */
  flujo.ultimaPalabraConAntonimo = () => {
    for (let i = flujo.segmentos.length - 1; i >= 0; i--) {
      const seg = flujo.segmentos[i];
      for (let j = seg.palabras.length - 1; j >= 0; j--) {
        if (seg.palabras[j].tieneAnto) {
          return { orig: seg.palabras[j].orig, anto: seg.palabras[j].anto, hablante: seg.hablante };
        }
      }
    }
    return null;
  };

  flujo.cerrarActivo = (hablante) => {
    const seg = flujo.activos[hablante];
    if (seg) {
      seg.cerrado = true;
      if (seg.palabras.length === 0) {
        flujo.segmentos.splice(flujo.segmentos.indexOf(seg), 1);
      }
      flujo.activos[hablante] = null;
      flujo._glifosSucio = true;
    }
  };

  flujo.reemplazarYCerrar = (hablante, texto) => {
    flujo.reescribirActivo(hablante, texto);
    flujo.cerrarActivo(hablante);
  };

  flujo.limpiar = () => {
    flujo.segmentos = [];
    flujo.activos = { A: null, B: null };
    flujo.anchoTotal = 0;
    flujo.anchoSuave = 0;
    flujo._glifosCache = null;
    flujo._glifosSucio = true;
  };

  flujo.vacio = () =>
    flujo.segmentos.every(s => s.palabras.length === 0);

  flujo.textoDe = (hablante) =>
    flujo.segmentos.filter(s => s.hablante === hablante)
      .map(s => s.palabras.map(p => p.orig).join(' ')).join(' ').slice(-90);

  flujo._podar = () => {
    let total = 0;
    for (const s of flujo.segmentos) {
      for (const p of s.palabras) total += p.orig.length + 1;
    }
    while (total > MAX_CHARS_FLUJO && flujo.segmentos.length > 1) {
      const viejo = flujo.segmentos[0];
      if (viejo === flujo.activos.A || viejo === flujo.activos.B) break;
      for (const p of viejo.palabras) total -= p.orig.length + 1;
      flujo.segmentos.shift();
    }
  };

  return flujo;
}

// ── Glifos: aplana los segmentos en caracteres (siempre el texto original) ──

function _glifosDeFlujo(flujo) {
  // El contenido cambia en eventos de transcripción, no a 60 fps: reconstruir
  // el arreglo (y sus objetos) cada frame generaba miles de allocations y GC.
  // Se cachea y solo se rehace cuando _glifosSucio lo marca.
  if (!flujo._glifosSucio && flujo._glifosCache) return flujo._glifosCache;

  const glifos = [];
  for (const seg of flujo.segmentos) {
    for (const palabra of seg.palabras) {
      for (const c of palabra.orig) {
        glifos.push({ c, hablante: seg.hablante });
      }
      glifos.push({ c: ' ', hablante: seg.hablante });
    }
  }
  if (glifos.length > 0) glifos.pop(); // sin espacio final

  flujo._glifosCache = glifos;
  flujo._glifosSucio = false;
  return glifos;
}

// ── Color por hablante (precomputado) ─────────────────────────────────────
// En CONVERGENCIA ambas voces se funden en blanco: la distinción de quién
// habla se disuelve cuando el diálogo es genuino.
let _rgbA = null, _rgbB = null;
function _rgbHablante(p, hablante, estado) {
  if (estado === 'CONVERGENCIA') return [255, 255, 255];
  if (_rgbA === null) {
    const ca = p.color(COLOR_A); _rgbA = [p.red(ca), p.green(ca), p.blue(ca)];
    const cb = p.color(COLOR_B); _rgbB = [p.red(cb), p.green(cb), p.blue(cb)];
  }
  return hablante === 'B' ? _rgbB : _rgbA;
}

// ── Cache de anchos de carácter ──────────────────────────────────────────
// p.textWidth es costoso llamado cientos de veces por frame. Los anchos por
// (carácter, tamaño entero) no cambian: se miden una vez y se cachean.

const _cacheAvance = {};

function _avanceDe(p, c, tam) {
  const clave = tam + c;
  let a = _cacheAvance[clave];
  if (a === undefined) {
    a = p.textWidth(c) * FACTOR_KERNING || tam * 0.4;
    _cacheAvance[clave] = a;
  }
  return a;
}

// ── Perfiles por RADIO real ──────────────────────────────────────────────
// El tamaño y la opacidad dependen de la distancia REAL al centro, no del
// parámetro de la curva. Esto hace legible la logarítmica (donde t no es
// proporcional al radio) y unifica el criterio en todas las formas:
// grande afuera, muere en el centro.

function _tamanoPorRadio(rel) {
  return 0.5 + 2.7 * rel; // rel = r / radioMax ∈ [0..1]
}

function _alfaPorRadio(estado, rel) {
  if (estado === 'CLOTOIDE') {
    // La S cruza el centro: ahí baja pero no desaparece (la idea sigue viajando)
    return 0.40 + 0.60 * rel;
  }
  return Math.max(0, Math.min(1, (rel - 0.05) / 0.10));
}

// ── Render sobre espiral ─────────────────────────────────────────────────

/**
 * Dibuja un flujo sobre la espiral del estado actual.
 * @param {object} op
 *   estadoForma   — qué curva usar (suele ser frame.estado)
 *   rotGlobal     — rotación rígida de toda la curva (incluye offset de B)
 *   fades         — {A, B} opacidad por hablante
 *   alphaGlobal   — multiplicador general (fantasmas de eco: ~0.3)
 *   origenOla     — si la transición viene de la ola, mezclar desde ahí
 *   desdeCentro   — CONVERGENCIA: lo nuevo nace en el CENTRO y empuja lo
 *                   anterior hacia afuera — los dos brazos se conectan en
 *                   el medio (la espiral doble entrelazada)
 */
function dibujarFlujoEspiral(p, frame, flujo, op) {
  const glifos = _glifosDeFlujo(flujo);
  if (glifos.length === 0) { flujo.anchoTotal = 0; return; }

  const estadoForma = op.estadoForma || frame.estado;
  const tabla = tablaArco(estadoForma, frame.radioMax);
  const tablaOrigen = (frame.blend < 1 && !op.origenOla && esEstadoEspiral(frame.estadoOrigen))
    ? tablaArco(frame.estadoOrigen, frame.radioMax) : null;

  // El fade de morph (frame.fadeMorph) atenúa el texto durante la transición
  // de forma para enmascarar el reacomodo de glifos. 1 cuando no hay morph.
  const fadeMorph = frame.fadeMorph !== undefined ? frame.fadeMorph : 1;
  const alphaGlobal = (op.alphaGlobal !== undefined ? op.alphaGlobal : 1) * fadeMorph;
  const fades = op.fades || { A: 1, B: 1 };
  const base = Math.min(p.width, p.height) * TAM_TEXTO;
  const cosR = Math.cos(op.rotGlobal);
  const sinR = Math.sin(op.rotGlobal);

  // Easing del deslizamiento: el texto nuevo entra apenas adentro del borde
  // y se desliza hacia afuera; lo viejo se hunde suave en el centro.
  flujo.anchoSuave += (flujo.anchoTotal - flujo.anchoSuave) * Math.min(1, frame.dt * EASE_FLUJO);
  const retraso = Math.max(0, flujo.anchoTotal - flujo.anchoSuave);

  p.textFont(FUENTE_ESPIRAL);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();

  const desdeCentro = !!op.desdeCentro;
  let s = desdeCentro ? (6 + retraso) : (tabla.L - 4 - retraso);
  let ancho = 0;
  let tamPrevio = -1;

  const radioRef = frame.radioMax;

  // Normal: del más nuevo (afuera) al más viejo (hundiéndose al centro).
  // desdeCentro: del más nuevo (centro) al más viejo (creciendo hacia afuera).
  for (let i = glifos.length - 1; i >= 0; i--) {
    if (desdeCentro ? s >= tabla.L : s <= 0) break;
    const g = glifos[i];
    const pt = tabla.puntoEn(s);
    // Distancia real al centro (las tablas están centradas en 0,0)
    const rRaw = Math.hypot(pt.x, pt.y);
    // En convergencia el texto crece hacia afuera: una vez fuera del círculo
    // visible no queda nada más por dibujar (cota dura de performance).
    if (desdeCentro && rRaw > radioRef) break;
    const rel = Math.min(1, rRaw / radioRef);
    // En convergencia el texto nace pequeño en el centro pero SIEMPRE legible
    // (clampeado al piso); en el resto, lo ilegible directamente no existe.
    const factorTam = desdeCentro ? (0.7 + 2.2 * rel) : _tamanoPorRadio(rel);
    const tamIdeal = base * factorTam * (1 + frame.amplitud * 0.15);
    const legible = desdeCentro || tamIdeal >= TAM_LETRA_MIN;
    if (!legible && estadoForma !== 'CLOTOIDE') break;
    const tam = Math.round(Math.max(TAM_LETRA_MIN, tamIdeal));

    if (tam !== tamPrevio) { p.textSize(tam); tamPrevio = tam; }
    const avance = _avanceDe(p, g.c, tam);
    const sCentro = desdeCentro ? s + avance / 2 : s - avance / 2;
    if (desdeCentro ? sCentro >= tabla.L : sCentro <= 0) break;

    const alfa = (desdeCentro
      ? (0.55 + 0.45 * rel)
      : _alfaPorRadio(estadoForma, rel)) * fades[g.hablante] * alphaGlobal;
    if (legible && alfa > 0.015 && g.c !== ' ') {
      const ptC = tabla.puntoEn(sCentro);
      const ptS = tabla.puntoEn(Math.min(tabla.L, sCentro + 3));

      // Mezcla durante transiciones de forma
      let x1 = ptC.x, y1 = ptC.y, x2 = ptS.x, y2 = ptS.y;
      if (tablaOrigen) {
        const f = sCentro / tabla.L;
        const o1 = tablaOrigen.puntoEn(f * tablaOrigen.L);
        const o2 = tablaOrigen.puntoEn(Math.min(tablaOrigen.L, f * tablaOrigen.L + 3));
        x1 = o1.x + (x1 - o1.x) * frame.blend; y1 = o1.y + (y1 - o1.y) * frame.blend;
        x2 = o2.x + (x2 - o2.x) * frame.blend; y2 = o2.y + (y2 - o2.y) * frame.blend;
      }

      // Rotación rígida + traslación al centro de pantalla
      const rx1 = x1 * cosR - y1 * sinR + frame.cx;
      const ry1 = x1 * sinR + y1 * cosR + frame.cy;
      const rx2 = x2 * cosR - y2 * sinR + frame.cx;
      const ry2 = x2 * sinR + y2 * cosR + frame.cy;
      const ang = Math.atan2(ry2 - ry1, rx2 - rx1);

      // Mezcla desde la cuerda del círculo (transición VOZ_UNICA → espiral)
      let px = rx1, py = ry1, angulo = ang;
      if (op.origenOla && frame.blend < 1) {
        const f = sCentro / tabla.L;
        const ox = op.origenOla.xIzq + f * (op.origenOla.xDer - op.origenOla.xIzq);
        const oy = op.origenOla.camino(ox);
        px = ox + (px - ox) * frame.blend;
        py = oy + (py - oy) * frame.blend;
        angulo = ang * frame.blend;
      }

      // CONVERGENCIA: el glifo mira hacia el CENTRO (sentido −s). Así el texto,
      // leído de afuera hacia adentro (hacia el punto de convergencia), sale en
      // orden y legible en vez de espejado.
      if (desdeCentro) angulo += Math.PI;

      const rgb = _rgbHablante(p, g.hablante, frame.estado);
      p.fill(rgb[0], rgb[1], rgb[2], 255 * alfa);

      const ji = frame.jitter || 0;
      const jx = ji ? (Math.random() - 0.5) * ji : 0;
      const jy = ji ? (Math.random() - 0.5) * ji : 0;

      p.push();
      p.translate(px + jx, py + jy);
      p.rotate(angulo);
      p.text(g.c, 0, 0);
      p.pop();
    }

    s = desdeCentro ? s + avance : s - avance;
    ancho += avance;
  }

  // Ancho dibujado este frame: lo usa el easing del próximo frame
  flujo.anchoTotal = ancho;
}

function esEstadoEspiral(estado) {
  return estado !== 'SILENCIO' && estado !== 'VOZ_UNICA';
}

// ── Render sobre la ola ──────────────────────────────────────────────────

/**
 * Dibuja el flujo sobre la cuerda del círculo. Lo más nuevo entra por la
 * DERECHA del círculo (más grande) y empuja lo anterior hacia la izquierda,
 * donde se achica y desaparece. Devuelve la x donde comienza el texto: la
 * línea se dibuja solo hasta ahí (las palabras REEMPLAZAN a la línea).
 * op: { caminoOla(x)→y, xIzq, xDer, fades, alphaGlobal }
 */
function dibujarFlujoOla(p, frame, flujo, op) {
  const xIzq = op.xIzq;
  const xDer = op.xDer;
  const glifos = _glifosDeFlujo(flujo);
  if (glifos.length === 0) { flujo.anchoTotal = 0; return xDer; }

  const fades = op.fades || { A: 1, B: 1 };
  const base = Math.min(p.width, p.height) * TAM_TEXTO;
  const dominio = xDer - xIzq;

  flujo.anchoSuave += (flujo.anchoTotal - flujo.anchoSuave) * Math.min(1, frame.dt * EASE_FLUJO);
  const retraso = Math.max(0, flujo.anchoTotal - flujo.anchoSuave);

  p.textFont(FUENTE_ESPIRAL);
  p.textAlign(p.CENTER, p.CENTER);
  p.noStroke();

  let x = xDer - 22 - retraso;
  let ancho = 0;
  let tamPrevio = -1;
  let xMin = xDer;

  for (let i = glifos.length - 1; i >= 0 && x > xIzq; i--) {
    const g = glifos[i];
    // Más grande a la derecha (lo recién dicho), se achica hacia la izquierda
    const rel = Math.max(0, Math.min(1, (x - xIzq) / dominio));
    const tam = Math.round(Math.max(TAM_LETRA_MIN, base * (0.8 + 1.3 * rel)));

    if (tam !== tamPrevio) { p.textSize(tam); tamPrevio = tam; }
    const avance = _avanceDe(p, g.c, tam);
    const xC = x - avance / 2;

    // Se desvanece al acercarse al borde izquierdo del círculo
    const alfa = Math.max(0, Math.min(1, (xC - xIzq - 6) / 110)) * fades[g.hablante] * (op.alphaGlobal !== undefined ? op.alphaGlobal : 1);
    if (alfa > 0.015 && g.c !== ' ') {
      const y1 = op.caminoOla(xC);
      const y2 = op.caminoOla(xC + 4);
      const ang = Math.atan2(y2 - y1, 4);

      const rgb = _rgbHablante(p, g.hablante, frame.estado);
      p.fill(rgb[0], rgb[1], rgb[2], 255 * alfa);

      p.push();
      p.translate(xC, y1);
      p.rotate(ang);
      p.text(g.c, 0, 0);
      p.pop();

      if (xC < xMin) xMin = xC;
    }

    x -= avance;
    ancho += avance;
  }

  flujo.anchoTotal = ancho;
  return Math.max(xIzq, xMin - 14);
}

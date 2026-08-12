// Matemática de las espirales. Funciones puras: reciben todo por parámetro.
//
// Cada estado del diálogo tiene su forma:
//   VOZ_UNICA    → línea sinusoidal (el texto fluye sobre la ola)
//   ARQUIMEDES   → espiral de Arquímedes r = a·θ (vueltas equidistantes, diálogo estable)
//   LOGARITMICA  → espiral logarítmica r = e^(k·θ) (el solape acelera hacia afuera)
//   CLOTOIDE     → doble espiral de Cornu en S; A y B perpendiculares forman una cruz
//   FERMAT / CONVERGENCIA → espiral parabólica r = √θ (converge al mismo punto)

// Integrales de Fresnel por serie de Taylor (5 términos) — precisas hasta x ≈ 1.5
function fresnelS(x) {
  const x3 = Math.pow(x, 3), x7 = Math.pow(x, 7), x11 = Math.pow(x, 11),
    x15 = Math.pow(x, 15), x19 = Math.pow(x, 19);
  return x3 / 3 - x7 / 42 + x11 / 1320 - x15 / 75600 + x19 / 6842880;
}

function fresnelC(x) {
  const x5 = Math.pow(x, 5), x9 = Math.pow(x, 9), x13 = Math.pow(x, 13),
    x17 = Math.pow(x, 17);
  return x - x5 / 10 + x9 / 216 - x13 / 9360 + x17 / 685440;
}

/**
 * Devuelve el punto {x, y} sobre la espiral del estado dado.
 * @param {number} t          posición normalizada sobre la curva [0..1]
 * @param {string} estado     uno de los estados de la experiencia
 * @param {number} radioMax   radio máximo en píxeles
 * @param {number} offsetAngular  rotación aplicada (incluye el π/2 del interlocutor B en clotoide)
 * @param {number} rotacion   rotación global acumulada (para la fase de la ola)
 * @param {number} amplitud   amplitud combinada de voz [0..1] (modula la ola)
 */
function puntoEspiral(t, estado, radioMax, offsetAngular, rotacion, amplitud) {
  const radioMin = 8;
  const radioUtil = radioMax - radioMin;
  let r = 0;
  let theta = t * 500 * Math.PI;

  switch (estado) {
    case 'VOZ_UNICA': {
      // Línea sinusoidal. Usa la rotación global directamente (no el offset)
      // para que A y B compartan la misma ola sin volteo de π.
      const fraccionOla = 0.11 + amplitud * 0.40;
      const x = (t - 0.5) * radioMax * 2.2;
      const y = radioMax * fraccionOla * Math.sin(t * Math.PI * 5 + rotacion);
      return { x, y };
    }
    case 'ARQUIMEDES': {
      r = radioMin + radioUtil * t;
      break;
    }
    case 'LOGARITMICA': {
      // Crecimiento más suave y menos vueltas que las otras espirales:
      // evita el ovillo interno de letras ilegibles — la energía visual
      // queda en las 2-3 vueltas externas, legibles.
      const k = 2.4;
      theta = t * 5 * Math.PI;
      r = radioMin + radioUtil * (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
      break;
    }
    case 'CLOTOIDE': {
      // Doble espiral de Cornu completa (curva en S): t recorre de un rulo al otro
      // pasando por el centro. Las integrales de Fresnel son impares:
      // C(-x) = -C(x), S(-x) = -S(x) — el signo genera la mitad especular.
      // El interlocutor B entra con offset de π/2 → su S es perpendicular a la de A,
      // formando una cruz: las ideas se cruzan pero no convergen.
      const L = (t - 0.5) * 3.0;       // [-1.5 .. +1.5]
      const absL = Math.abs(L);
      const signo = L < 0 ? -1 : 1;
      const escala = radioMax / 1.1;
      const fx = signo * fresnelC(absL) * escala;
      const fy = signo * fresnelS(absL) * escala;
      const cosA = Math.cos(offsetAngular);
      const sinA = Math.sin(offsetAngular);
      return { x: fx * cosA - fy * sinA, y: fx * sinA + fy * cosA };
    }
    case 'FERMAT':
    case 'CONVERGENCIA': {
      r = radioMin + radioUtil * Math.sqrt(t);
      break;
    }
    default: {
      r = radioMin + radioUtil * t;
    }
  }

  const anguloFinal = theta + offsetAngular;
  return { x: Math.cos(anguloFinal) * r, y: Math.sin(anguloFinal) * r };
}

// ── Tabla de longitud de arco ─────────────────────────────────────────────
// El texto se distribuye por LONGITUD DE ARCO (kerning constante), no por
// parámetro t. La tabla muestrea la curva y permite mapear una posición de
// arco s ∈ [0, L] al punto correspondiente. Como la rotación global es
// rígida, la tabla se calcula sin rotación y el punto se rota al dibujar.

const _tablasArco = {};

/**
 * Devuelve {L, puntoEn(s)} para la espiral del estado dado.
 * puntoEn(s) → {x, y, t} con s medido desde el centro (s=0) al borde (s=L).
 * Cacheada por estado+radio (se regenera al cambiar el tamaño de pantalla).
 */
function tablaArco(estado, radioMax) {
  const clave = estado + '|' + Math.round(radioMax);
  if (_tablasArco[clave]) return _tablasArco[clave];

  const N = 240;
  const xs = new Float32Array(N + 1);
  const ys = new Float32Array(N + 1);
  const ts = new Float32Array(N + 1);
  const acum = new Float32Array(N + 1);

  let prev = puntoEspiral(0, estado, radioMax, 0, 0, 0);
  xs[0] = prev.x; ys[0] = prev.y; ts[0] = 0; acum[0] = 0;

  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const p = puntoEspiral(t, estado, radioMax, 0, 0, 0);
    xs[i] = p.x; ys[i] = p.y; ts[i] = t;
    acum[i] = acum[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }

  const L = acum[N];

  const tabla = {
    L,
    puntoEn(s) {
      if (s <= 0) return { x: xs[0], y: ys[0], t: 0 };
      if (s >= L) return { x: xs[N], y: ys[N], t: 1 };
      // Búsqueda binaria del segmento que contiene s
      let lo = 0, hi = N;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (acum[mid] <= s) lo = mid; else hi = mid;
      }
      const f = (s - acum[lo]) / ((acum[hi] - acum[lo]) || 1);
      return {
        x: xs[lo] + (xs[hi] - xs[lo]) * f,
        y: ys[lo] + (ys[hi] - ys[lo]) * f,
        t: ts[lo] + (ts[hi] - ts[lo]) * f,
      };
    },
  };

  // Cache acotado: al cambiar mucho el tamaño se descartan tablas viejas
  const claves = Object.keys(_tablasArco);
  if (claves.length > 24) delete _tablasArco[claves[0]];
  _tablasArco[clave] = tabla;
  return tabla;
}

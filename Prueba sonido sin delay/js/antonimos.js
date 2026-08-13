// Inversión semántica: cada palabra se reemplaza por su opuesto.
// Tres niveles de resolución, en orden:
//   1. Diccionario embebido (~300 pares, funciona offline)
//   2. Fallback morfológico (des-/in-/im- → raíz)
//   3. ConceptNet (API gratuita, oportunista: si responde se cachea en
//      localStorage; si está caída no pasa nada)

const ANTONIMOS = {
  "diablo": "dios", "dios": "diablo", "diablos": "Dioses",

  // Saludos y cortesía
  "hola": "adiós", "adiós": "hola",
  "chau": "hola", "buenas": "malas",
  "bienvenido": "expulsado", "bienvenida": "expulsada",
  "gracias": "reproches", "perdón": "culpa",
  "por": "sin",

  // Emociones
  "amor": "odio", "odio": "amor",
  "alegría": "tristeza", "tristeza": "alegría",
  "feliz": "triste", "triste": "feliz",
  "contento": "enojado", "enojado": "contento",
  "paz": "guerra", "guerra": "paz",
  "miedo": "valor", "valor": "miedo",
  "calma": "caos", "caos": "calma",
  "esperanza": "desesperación", "desesperación": "esperanza",
  "confianza": "desconfianza", "desconfianza": "confianza",
  "orgullo": "vergüenza", "vergüenza": "orgullo",
  "placer": "dolor", "dolor": "placer",
  "éxito": "fracaso", "fracaso": "éxito",
  "risa": "llanto", "llanto": "risa",
  "deseo": "rechazo", "rechazo": "deseo",

  // Tiempo
  "hoy": "mañana", "mañana": "ayer", "ayer": "mañana",
  "ahora": "después", "después": "antes", "antes": "después",
  "temprano": "tarde", "tarde": "temprano",
  "siempre": "nunca", "nunca": "siempre",
  "pronto": "tarde",
  "rápido": "lento", "lento": "rápido",
  "joven": "viejo", "viejo": "joven", "nuevo": "viejo",
  "antiguo": "moderno", "moderno": "antiguo",
  "pasado": "futuro", "futuro": "pasado",
  "presente": "ausente", "ausente": "presente",
  "inicio": "fin", "fin": "inicio",
  "principio": "final", "final": "principio",
  "primero": "último", "último": "primero",
  "empezar": "terminar", "terminar": "empezar",
  "empiezo": "termino", "termino": "empiezo",
  "empieza": "termina", "termina": "empieza",
  "nace": "muere", "muere": "nace",
  "nacer": "morir", "morir": "nacer",

  // Cantidad y comparación
  "todo": "nada", "nada": "todo",
  "todos": "nadie", "nadie": "todos",
  "algo": "nada", "alguien": "nadie",
  "mucho": "poco", "poco": "mucho",
  "muchos": "pocos", "pocos": "muchos",
  "más": "menos", "menos": "más",
  "mejor": "peor", "peor": "mejor",
  "mayor": "menor", "menor": "mayor",
  "máximo": "mínimo", "mínimo": "máximo",
  "demasiado": "insuficiente",
  "bastante": "apenas", "apenas": "bastante",
  "lleno": "vacío", "vacío": "lleno",
  "junto": "separado", "separado": "junto",
  "juntos": "separados", "separados": "juntos",

  // Afirmación / verdad
  "sí": "no", "no": "sí",
  "si": "no",
  "verdad": "mentira", "mentira": "verdad",
  "verdadero": "falso", "falso": "verdadero",
  "cierto": "falso",
  "real": "imaginario", "imaginario": "real",
  "razón": "error", "error": "acierto", "acierto": "error",
  "correcto": "incorrecto", "incorrecto": "correcto",
  "posible": "imposible", "imposible": "posible",
  "claro": "oscuro", "oscuro": "claro",
  "seguro": "inseguro", "inseguro": "seguro",
  "duda": "certeza", "certeza": "duda",

  // Espacio y dirección
  "luz": "oscuridad", "oscuridad": "luz",
  "día": "noche", "noche": "día",
  "sol": "luna", "luna": "sol",
  "cielo": "tierra", "tierra": "cielo",
  "infierno": "paraíso", "paraíso": "infierno",
  "arriba": "abajo", "abajo": "arriba",
  "dentro": "fuera", "fuera": "dentro",
  "adentro": "afuera", "afuera": "adentro",
  "cerca": "lejos", "lejos": "cerca",
  "aquí": "allá", "allá": "aquí",
  "acá": "allá",
  "norte": "sur", "sur": "norte",
  "este": "oeste", "oeste": "este",
  "izquierda": "derecha", "derecha": "izquierda",
  "delante": "detrás", "detrás": "delante",
  "adelante": "atrás", "atrás": "adelante",
  "encima": "debajo", "debajo": "encima",
  "interior": "exterior", "exterior": "interior",
  "horizonte": "centro", "centro": "horizonte",
  "alto": "bajo", "bajo": "alto",
  "subida": "bajada", "bajada": "subida",
  "llegada": "partida", "partida": "llegada",
  "entrada": "salida", "salida": "entrada",

  // Cualidades
  "bueno": "malo", "malo": "bueno",
  "bien": "mal", "mal": "bien",
  "grande": "pequeño", "pequeño": "grande",
  "enorme": "diminuto", "diminuto": "enorme",
  "fuerte": "débil", "débil": "fuerte",
  "duro": "blando", "blando": "duro",
  "pesado": "ligero", "ligero": "pesado",
  "limpio": "sucio", "sucio": "limpio",
  "fuego": "agua", "agua": "fuego",
  "caliente": "frío", "frío": "caliente",
  "calor": "frío",
  "seco": "mojado", "mojado": "seco",
  "dulce": "amargo", "amargo": "dulce",
  "suave": "áspero", "áspero": "suave",
  "bonito": "feo", "feo": "bonito",
  "lindo": "feo", "hermoso": "horrible", "horrible": "hermoso",
  "inteligente": "tonto", "tonto": "inteligente",
  "sabio": "ignorante", "ignorante": "sabio",
  "fácil": "difícil", "difícil": "fácil",
  "simple": "complejo", "complejo": "simple",
  "rico": "pobre", "pobre": "rico",
  "riqueza": "pobreza", "pobreza": "riqueza",
  "sano": "enfermo", "enfermo": "sano",
  "salud": "enfermedad", "enfermedad": "salud",
  "vivo": "muerto", "muerto": "vivo",
  "vida": "muerte", "muerte": "vida",
  "despierto": "dormido", "dormido": "despierto",
  "abierto": "cerrado", "cerrado": "abierto",
  "libre": "preso", "preso": "libre",
  "libertad": "encierro", "encierro": "libertad",
  "solo": "acompañado", "acompañado": "solo",
  "sola": "acompañada", "acompañada": "sola",
  "igual": "diferente", "diferente": "igual",
  "iguales": "distintos", "distintos": "iguales",
  "mismo": "otro", "otro": "mismo",
  "negro": "blanco", "blanco": "negro",
  "plano": "curvo", "curvo": "plano",
  "plana": "curva", "curva": "plana",
  "recto": "curvo", "recta": "curva",
  "natural": "artificial", "artificial": "natural",
  "visible": "invisible", "invisible": "visible",
  "concreto": "abstracto", "abstracto": "concreto",
  "individual": "colectivo", "colectivo": "individual",
  "humano": "máquina", "máquina": "humano",
  "orden": "caos", "justo": "injusto", "injusto": "justo",
  "normal": "raro", "raro": "normal",
  "común": "extraño", "extraño": "común",
  "ancho": "angosto", "angosto": "ancho",
  "gordo": "flaco", "flaco": "gordo",
  "largo": "corto", "corto": "largo",
  "profundo": "superficial", "superficial": "profundo",

  // Verbos frecuentes (infinitivo + conjugaciones clave)
  "hablar": "callar", "callar": "hablar",
  "hablo": "callo", "callo": "hablo",
  "habla": "calla", "calla": "habla",
  "hablas": "callas", "hablás": "callás",
  "decir": "callar", "digo": "callo", "dice": "calla",
  "escuchar": "ignorar", "ignorar": "escuchar",
  "escucho": "ignoro", "ignoro": "escucho",
  "escucha": "ignora", "ignora": "escucha",
  "oír": "desoír", "oigo": "desoigo",
  "ver": "ignorar", "veo": "ignoro",
  "miro": "evito", "mirar": "evitar",
  "reír": "llorar", "llorar": "reír",
  "río": "lloro", "lloro": "río",
  "subir": "bajar", "bajar": "subir",
  "subo": "bajo", "sube": "baja",
  "entrar": "salir", "salir": "entrar",
  "entro": "salgo", "salgo": "entro",
  "entra": "sale", "sale": "entra",
  "venir": "ir", "ir": "venir",
  "vengo": "voy", "voy": "vengo",
  "viene": "va", "va": "viene",
  "llegar": "irse", "llego": "me voy", "llega": "se va",
  "quedarse": "irse", "quedo": "parto",
  "ganar": "perder", "perder": "ganar",
  "gano": "pierdo", "pierdo": "gano",
  "gana": "pierde", "pierde": "gana",
  "comprar": "vender", "vender": "comprar",
  "compro": "vendo", "vendo": "compro",
  "abrir": "cerrar", "cerrar": "abrir",
  "abro": "cierro", "cierro": "abro",
  "abre": "cierra", "cierra": "abre",
  "recordar": "olvidar", "olvidar": "recordar",
  "recuerdo": "olvido", "olvido": "recuerdo",
  "recuerda": "olvida", "olvida": "recuerda",
  "amar": "odiar", "odiar": "amar",
  "amo": "odio", "quiero": "rechazo",
  "quiere": "rechaza", "querer": "rechazar",
  "dar": "quitar", "quitar": "dar",
  "doy": "quito", "da": "quita",
  "recibir": "dar", "recibo": "entrego",
  "preguntar": "responder", "responder": "preguntar",
  "pregunto": "respondo", "respondo": "pregunto",
  "pregunta": "respuesta", "respuesta": "pregunta",
  "construir": "destruir", "destruir": "construir",
  "construye": "destruye", "destruye": "construye",
  "unir": "separar", "separar": "unir",
  "une": "separa", "separa": "une",
  "creer": "dudar", "dudar": "creer",
  "creo": "dudo", "dudo": "creo",
  "cree": "duda",
  "confiar": "desconfiar", "desconfiar": "confiar",
  "confío": "desconfío", "confio": "dudo",
  "saber": "ignorar", "sé": "ignoro", "sabe": "ignora",
  "entender": "confundir", "entiendo": "confundo", "entiende": "confunde",
  "aparecer": "desaparecer", "desaparecer": "aparecer",
  "aparece": "desaparece", "desaparece": "aparece",
  "encontrar": "perder", "encuentro": "pierdo", "encuentra": "pierde",
  "buscar": "esconder", "busco": "escondo", "busca": "esconde",
  "aceptar": "rechazar", "rechazar": "aceptar",
  "acepto": "rechazo", "acepta": "rechaza",
  "permitir": "prohibir", "prohibir": "permitir",
  "permite": "prohíbe", "prohíbe": "permite",
  "atacar": "defender", "defender": "atacar",
  "dormir": "despertar", "despertar": "dormir",
  "duermo": "despierto", "duerme": "despierta",
  "vivir": "morir", "vivo": "muero", "vive": "muere",
  "trabajar": "descansar", "descansar": "trabajar",
  "trabajo": "descanso", "descanso": "trabajo",
  "tener": "carecer", "tengo": "pierdo", "tiene": "carece",
  "poder": "fallar", "puedo": "fallo", "puede": "falla",
  "pensar": "olvidar", "pienso": "olvido", "piensa": "olvida",
  "veriamos": "ignoraríamos", "ignoraríamos": "veriamos",
  "veríamos": "ignoraríamos",

  // Pronombres y deixis
  "yo": "vos", "vos": "yo",
  "tú": "yo", "usted": "yo",
  "mío": "tuyo", "tuyo": "mío",
  "mía": "tuya", "tuya": "mía",
  "nuestro": "ajeno", "ajeno": "propio", "propio": "ajeno",
  "esto": "aquello", "aquello": "esto",
  "éste": "aquél", "ese": "este",

  // Habla / percepción / cuerpo
  "silencio": "ruido", "ruido": "silencio",
  "voz": "silencio", "grito": "susurro", "susurro": "grito",
  "palabra": "silencio",
  "sonido": "silencio",
  "ojos": "mente", "mente": "ojos",
  "boca": "oídos", "oídos": "boca",
  "cuerpo": "alma", "alma": "cuerpo",
  "cabeza": "corazón", "corazón": "cabeza",
};

// Cache runtime de resultados remotos (se carga de localStorage una vez)
let _cacheRemoto = {};
try { _cacheRemoto = JSON.parse(localStorage.getItem('antonimos_cache') || '{}'); }
catch (err) { _cacheRemoto = {}; }

const _colaRemota = [];
let _buscandoRemoto = false;

function _limpiarPalabra(palabra) {
  return palabra.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()¿?¡"']/g, "");
}

/**
 * Devuelve el antónimo de una palabra o null si no se conoce.
 * Si no está en el diccionario, encola una búsqueda remota silenciosa
 * para enriquecer futuras apariciones.
 */
function palabraAntonima(palabra) {
  const limpia = _limpiarPalabra(palabra);
  if (!limpia || limpia.length < 2) return null;

  if (ANTONIMOS[limpia] !== undefined) return ANTONIMOS[limpia];
  if (_cacheRemoto[limpia] !== undefined) return _cacheRemoto[limpia] || null;

  // Fallback morfológico: el prefijo negador delata al opuesto
  if (limpia.length > 6 && limpia.startsWith('des')) return limpia.slice(3);
  if (limpia.length > 5 && (limpia.startsWith('in') || limpia.startsWith('im'))) {
    return limpia.slice(2);
  }

  // Enriquecimiento oportunista (no bloquea: el resultado sirve la próxima vez)
  if (typeof USAR_CONCEPTNET !== 'undefined' && USAR_CONCEPTNET) {
    _encolarBusquedaRemota(limpia);
  }
  return null;
}

/** Invierte una frase palabra a palabra. MAYÚSCULAS = texto invertido. */
function fraseAntonima(frase) {
  if (!frase) return "";
  return frase.toLowerCase().split(/\s+/)
    .map(p => palabraAntonima(p) || p)
    .join(" ").toUpperCase();
}

// ── ConceptNet: 1 request en vuelo, errores silenciosos, cache persistente ──

function _encolarBusquedaRemota(palabra) {
  if (_colaRemota.includes(palabra)) return;
  _colaRemota.push(palabra);
  if (_colaRemota.length > 30) _colaRemota.shift();
  _procesarColaRemota();
}

async function _procesarColaRemota() {
  return; // <--- AGREGÁ ESTA LÍNEA ACÁ PARA APAGAR LA BÚSQUEDA EXTERNA

  if (_buscandoRemoto || _colaRemota.length === 0) return;
  _buscandoRemoto = true;
  const palabra = _colaRemota.shift();

  try {
    const url = 'https://api.conceptnet.io/query?start=/c/es/' +
      encodeURIComponent(palabra) + '&rel=/r/Antonym&limit=3';
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      const arista = (data.edges || []).find(e =>
        e.end && e.end.language === 'es' && e.end.label);
      // Guardar también los fallos ('') para no repetir la consulta
      _cacheRemoto[palabra] = arista ? arista.end.label.toLowerCase() : '';
      try { localStorage.setItem('antonimos_cache', JSON.stringify(_cacheRemoto)); }
      catch (err) { /* storage lleno: seguir sin cache */ }
    }
  } catch (err) { /* API caída u offline: nada que hacer */ }

  _buscandoRemoto = false;
  if (_colaRemota.length > 0) setTimeout(_procesarColaRemota, 600);
}

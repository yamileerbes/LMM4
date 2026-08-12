// Configuración central de la experiencia.
// Estados activos: SILENCIO, VOZ_UNICA, ARQUIMEDES, CLOTOIDE, CONVERGENCIA

// ── Detección de voz ──────────────────────────────────────────────────────
const UMBRAL_VAD = 0.06;
const VAD_HANGOVER = 0.25;
const TIEMPO_MIN_HABLA = 1.0;
const PAUSA_MIN = 0.3;
const UMBRAL_BALANCE = 0.22;
const MIN_INTERCAMBIOS = 2;

// ── Solapamiento ──────────────────────────────────────────────────────────
const TIEMPO_FUGA_SOLAPE = 1.6;
const ENTRAR_SOLAPE = 0.45;
const SALIR_SOLAPE = 0.18;
const UMBRAL_CLOTOIDE = 1.4;

// ── Cooldowns ─────────────────────────────────────────────────────────────
const DWELL = {
  SILENCIO:     0.0,
  VOZ_UNICA:    1.0,
  ARQUIMEDES:   10.0,  // 10s mínimos antes de poder avanzar a CLOTOIDE
  CLOTOIDE:     5.0,
  CONVERGENCIA: 3.0,
};

// Score mínimo para entrar a CONVERGENCIA desde CLOTOIDE
const SCORE_ENTRADA_CONVERGENCIA = 1.0;

// ── Puntaje en CLOTOIDE ───────────────────────────────────────────────────
// Fusión de antónimos: suma más que los silencios (reconocimiento semántico)
const BONO_FUSION_CLOTOIDE = 0.15;    // por cada fusión en CLOTOIDE (antes era BONO_FUSION=0.12)
// Voz única (sin solapamiento, solo un hablante): recompensa la escucha del otro
const SCORE_VOZ_UNICA_CLOTOIDE = 0.010;  // por segundo de voz única en CLOTOIDE

// ── Calidad de diálogo ────────────────────────────────────────────────────
const CALIDAD_SUBE = 0.35;
const CALIDAD_BAJA = 0.10;
const CALIDAD_ENTRADA_CONV = 0.70;
const CALIDAD_COLAPSO_CONV = 0.25;
const COLAPSO_CONV_TIEMPO = 4.0;

// ── Silencios como puntaje ────────────────────────────────────────────────
const SILENCIO_MIN_ESCUCHA = 0.5;    // antes 0.8 — pausa mínima para contar como escucha
const SILENCIO_MAX_ESCUCHA = 6.0;
const SCORE_POR_SILENCIO = 0.03;
const SCORE_POR_SILENCIO_CONV = 0.03;

// ── Inactividad ───────────────────────────────────────────────────────────
const UMBRAL_REINICIO = 6.0;
const UMBRAL_OLVIDO = 15.0;

// ── Eco ───────────────────────────────────────────────────────────────────
const UMBRAL_ECO = 4.0;
const ECO_DELAY = 1.5;
const ECO_FEEDBACK = 0.65;

// ── Progresión hacia la convergencia ─────────────────────────────────────
const SCORE_SUBIDA_CONVERGENCIA = 0.06;
const SCORE_DECAY_CONVERGENCIA = 0.012;

// ── Requisito semántico ───────────────────────────────────────────────────
const MIN_COMUNES_CONVERGENCIA = 2;
const PALABRAS_TRIVIALES = new Set([
  'adiós', 'adios', 'hola', 'chau', 'buenas', 'hello', 'chao', 'bienvenido',
]);

// ── Transiciones visuales ─────────────────────────────────────────────────
const VELOCIDAD_BLEND = 1.3;

const VELOCIDADES_ROTACION = {
  SILENCIO:     0.06,
  VOZ_UNICA:    1.40,
  ARQUIMEDES:   0.20,
  CLOTOIDE:     0.40,
  CONVERGENCIA: 0.28,
};

// ── Composición circular ──────────────────────────────────────────────────
const MARGEN_MARCO = 14;
const FACTOR_ESPIRAL = 0.97;      // antes 0.90 — espiral más grande, llena el círculo
const MOSTRAR_BORDE = true;

// ── Tipografía del flujo de texto ─────────────────────────────────────────
const FUENTE_ESPIRAL = "'EB Garamond', 'Palatino Linotype', Georgia, serif";
const FACTOR_KERNING = 1.12;
const TAM_TEXTO = 0.020;          // antes 0.014 — letras más grandes y legibles
const TAM_LETRA_MIN = 9;          // antes 7 — piso mínimo más alto
const EASE_FLUJO = 6.0;
const MAX_CHARS_FLUJO = 260;

// ── Antónimos ─────────────────────────────────────────────────────────────
const USAR_CONCEPTNET = true;

// ── Colores ───────────────────────────────────────────────────────────────
const COLOR_A = '#FF6B4E';
const COLOR_B = '#2DE2E2';
const COLOR_ANTONIMO_A = '#E08CFF';
const COLOR_ANTONIMO_B = '#8C9EFF';
const COLOR_FUSION = '#FFE2A0';
const COLOR_FONDO = '#070707';

// Degradé violeta para CONVERGENCIA
const CONV_COLOR_CENTRO = 'rgba(55, 20, 90, 0.92)';    // violeta oscuro profundo
const CONV_COLOR_MEDIO  = 'rgba(100, 40, 160, 0.55)';  // violeta medio
const CONV_COLOR_BORDE  = 'rgba(30, 10, 50, 0.0)';     // transparente en el borde

// ── Antónimos: fusión y choque ────────────────────────────────────────────
const BONO_FUSION = 0.10;
const VENTANA_FUSION = 8.0;
const MAX_COMUNES = 6;
const CASTIGO_CHOQUE = 0.04;

// ── Whisper ───────────────────────────────────────────────────────────────
const WHISPER_CHUNK_MS = 3000;
const WHISPER_MIN_BYTES = 1500;

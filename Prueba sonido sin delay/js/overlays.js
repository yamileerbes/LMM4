// Capas sobre el canvas: indicador de hablante, teclas PTT, etiqueta de
// estado, anillos de eco, voces implícitas (satélites de antónimos),
// fusión de antónimos y máscara circular del marco.

/** Punto central que indica quién habla (naranja=A, teal=B, rojo=ambos). */
function dibujarIndicadorHablante(p, cx, cy, hablaA, hablaB) {
  if (!hablaA && !hablaB) return;
  p.noStroke();
  if (hablaA && hablaB) p.fill(226, 75, 74);
  else if (hablaA) p.fill(216, 90, 48);
  else p.fill(29, 158, 117);
  p.circle(cx, cy, 5);
}

/** Indicador de PTT por teclado — banda inferior INTERNA del círculo. */
function dibujarIndicadorPTT(p, cx, cy, radio, teclaA, teclaB) {
  if (!teclaA && !teclaB) return;
  const y = cy + radio - 26;
  p.textFont('monospace');
  p.textSize(9);
  p.textAlign(p.CENTER, p.BOTTOM);
  p.textStyle(p.NORMAL);
  p.noStroke();

  p.fill(255, 107, 78, teclaA ? 190 : 30);
  p.text('[A] Int.1', cx - 44, y);
  p.fill(45, 226, 226, teclaB ? 190 : 30);
  p.text('[B] Int.2', cx + 44, y);
}

/** Etiqueta del estado actual — banda superior INTERNA del círculo. */
function dibujarEtiquetaEstado(p, cx, cy, radio, estado, cambiadoEn, ahora) {
  const edad = (ahora - cambiadoEn) / 1000;
  if (edad >= 2.5) return;
  const alfa = Math.max(0, 1 - edad / 2.5) * 0.40;
  p.textFont('monospace');
  p.textSize(8);
  p.textAlign(p.CENTER, p.TOP);
  p.textStyle(p.NORMAL);
  p.noStroke();
  p.fill(255, 255, 255, 255 * alfa);
  p.text(estado, cx, cy - radio + 18);
}

/**
 * Voz implícita satelital: el antónimo de la última palabra de un hablante,
 * flotando en su hemisferio (A derecha, B izquierda — espeja el panning).
 * Pensamientos no dichos que rondan la conversación sin entrar en ella.
 */
function dibujarSatelite(p, palabra, color, x, y, alfa, ahora) {
  if (!palabra || alfa <= 0.02) return;
  const pulso = 1 + 0.04 * Math.sin(ahora * 0.0022);
  const tam = Math.min(p.width, p.height) * TAM_TEXTO * 1.7 * pulso;

  p.textFont(FUENTE_ESPIRAL);
  p.textStyle(p.ITALIC);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(tam);
  p.noStroke();

  const c = p.color(color);
  // Halo sutil para despegarla del texto de la espiral
  p.fill(p.red(c), p.green(c), p.blue(c), 255 * alfa * 0.18);
  p.text(palabra, x, y + 1);
  p.fill(p.red(c), p.green(c), p.blue(c), 255 * alfa);
  p.text(palabra, x, y);

  p.textStyle(p.NORMAL);
}

/**
 * Fusión: cuando ambos interlocutores evitan la MISMA palabra, ese antónimo
 * compartido se vuelve una sola palabra dorada en el centro con un anillo
 * expandiéndose — el único lugar donde estas dos voces convergen es en lo
 * que ninguna dice.
 * @param {number} progreso  segundos desde que se completó la fusión
 */
function dibujarFusion(p, palabra, cx, cy, progreso, ahora, enConvergencia) {
  const alfa = Math.max(0, Math.min(1, 1 - (progreso - 5) / 1.5));
  if (alfa <= 0.02) return;

  // Anillo de la revelación: se expande durante los primeros 2.5s
  const faseAnillo = Math.min(1, progreso / 2.5);
  if (faseAnillo < 1) {
    p.noFill();
    p.stroke(255, 226, 160, 255 * (1 - faseAnillo) * 0.7);
    p.strokeWeight(1.5);
    p.circle(cx, cy, 30 + faseAnillo * 280);
    p.noStroke();
  }

  // Glow dorado-verde si la fusión sucede dentro de la convergencia
  if (enConvergencia) {
    const ctx = p.drawingContext;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 130);
    glow.addColorStop(0, 'rgba(190,220,140,' + (0.10 * alfa) + ')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 130, cy - 130, 260, 260);
  }

  const pulso = 1 + 0.05 * Math.sin(ahora * 0.003);
  const tam = Math.min(p.width, p.height) * TAM_TEXTO * 2.6 * pulso;

  p.textFont(FUENTE_ESPIRAL);
  p.textStyle(p.ITALIC);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(tam);
  p.noStroke();

  const c = p.color(COLOR_FUSION);
  p.fill(p.red(c), p.green(c), p.blue(c), 255 * alfa * 0.25);
  p.text(palabra, cx, cy + 1.5);
  p.fill(p.red(c), p.green(c), p.blue(c), 255 * alfa);
  p.text(palabra, cx, cy);

  p.textStyle(p.NORMAL);
}

/**
 * Anillos pulsantes de eco. Devuelve el pulso [1→0] para que el llamador
 * dibuje las copias fantasma del texto con la misma fase.
 */
function dibujarAnillosEco(p, cx, cy, radioMax, ecoA, ecoB, ahora) {
  const fase = (ahora % (ECO_DELAY * 1000)) / (ECO_DELAY * 1000);
  const pulso = Math.max(0, 1 - fase);

  if (!ecoA && !ecoB) return pulso;

  const color = ecoA ? [216, 90, 48] : [29, 158, 117];
  p.noFill();

  // Anillo expandiéndose al ritmo del delay
  p.stroke(color[0], color[1], color[2], 255 * pulso * 0.5);
  p.strokeWeight(1.5);
  p.circle(cx, cy, 2 * (radioMax * 0.3 + (1 - pulso) * radioMax * 0.5));

  // Segundo anillo desfasado
  p.stroke(color[0], color[1], color[2], 255 * pulso * 0.25);
  p.strokeWeight(0.7);
  p.circle(cx, cy, 2 * (radioMax * 0.15 + (1 - pulso) * radioMax * 0.4));

  p.noStroke();
  return pulso;
}

/**
 * Máscara del marco físico: pinta de negro todo lo exterior al círculo.
 * Se dibuja al FINAL de cada frame — nada se proyecta fuera del marco.
 */

function dibujarMascaraCircular(p, cx, cy, radio) {
  const ctx = p.drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, p.width, p.height);
  ctx.arc(cx, cy, radio, 0, Math.PI * 2, true); // sentido inverso = agujero

 // --- INICIO DEGRADÉ INTERIOR (COLORES PUROS) ---

  if (typeof window.colorActual === 'undefined') {
      window.colorActual = { r: 0, g: 0, b: 0 }; 
  }

  let tiempoSilencio = window.segundosSinVozGlobal || 0;
  let estadoActual = window.estadoActualGlobal || 'SILENCIO';
  let detectaAudio = window.estanHablandoGlobal || false;
  
  let target = { r: 0, g: 0, b: 0 }; 

  // 1. REGLA DE VICTORIA
  if (estadoActual === 'CONVERGENCIA') {
      target = { r: 120, g: 40, b: 220 }; 
  } 
  // 2. REGLA DE AUDIO CON INERCIA: 
  // Se pone violeta si detecta audio, O si el silencio lleva menos de 1.5 segundos.
  // Esto cubre los micro-silencios entre palabras para que no se apague al hablar.
  else if (detectaAudio || tiempoSilencio < 1.5) {
      target = { r: 120, g: 40, b: 220 }; 
  } 
  // 3. REGLAS DE ALERTA:
  // Si pasaron 3 segundos de silencio absoluto, te avisa en rojo.
  else if (tiempoSilencio >= 3.0) {
      target = { r: 255, g: 0, b: 0 }; 
  } 
  // 4. TRANSICIÓN A NEGRO:
  // Si el silencio está entre 1.5 y 3.0 segundos, se va apagando a negro suavemente.
  else {
      target = { r: 0, g: 0, b: 0 }; 
  }

  let velocidad = 0.2; 

  window.colorActual.r += (target.r - window.colorActual.r) * velocidad;
  window.colorActual.g += (target.g - window.colorActual.g) * velocidad;
  window.colorActual.b += (target.b - window.colorActual.b) * velocidad;

  let r = Math.round(window.colorActual.r);
  let g = Math.round(window.colorActual.g);
  let b = Math.round(window.colorActual.b);

  let centroDegX = ctx.canvas.width / 2;
  let centroDegY = ctx.canvas.height / 2;
  let radioDeg = Math.min(centroDegX, centroDegY);

  let degrade = ctx.createRadialGradient(centroDegX, centroDegY, 0, centroDegX, centroDegY, radioDeg);

  degrade.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.45)`); 
  degrade.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // --- FIN DEGRADÉ INTERIOR ---

  // Máscara exterior original (esto tapa las esquinas con negro puro)
  ctx.fillStyle = '#000000';
  ctx.fill('evenodd');
  ctx.restore();

  // Borde de referencia para alinear el marco físico (apagar en obra)
  if (typeof MOSTRAR_BORDE !== 'undefined' && MOSTRAR_BORDE) {
    p.noFill();
    p.stroke(255, 255, 255, 20);
    p.strokeWeight(1);
    p.circle(cx, cy, radio * 2);
    p.noStroke();
  }
}

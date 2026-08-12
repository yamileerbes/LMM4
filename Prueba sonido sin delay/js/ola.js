// La ola: UNA sola línea blanca, inscripta en el círculo del marco.
// Es una cuerda vibrante: nace y muere exactamente en el borde del círculo
// gracias a la envolvente semicircular sqrt(1-u²). Cuando alguien habla,
// sus palabras la van reemplazando desde la derecha.

/**
 * Trayectoria de la ola dentro del círculo.
 * @param {number} x       posición horizontal absoluta
 * @param {number} cx, cy  centro del círculo
 * @param {number} radio   radio del marco (la cuerda va de cx-radio a cx+radio)
 * @param {number} amplitudOla  amplitud máxima en el centro
 * @param {number} fase    fase temporal de la onda
 */
function caminoOla(x, cx, cy, radio, amplitudOla, fase) {
  const u = (x - cx) / radio;                        // -1 .. +1
  if (u <= -1 || u >= 1) return cy;
  const envolvente = Math.sqrt(1 - u * u);           // semicírculo: muere en los bordes
  return cy + amplitudOla * envolvente * Math.sin(x * 0.018 + fase);
}

/**
 * Dibuja la cuerda desde el borde izquierdo del círculo hasta xCorte
 * (donde empiezan las palabras), con fundido corto en la unión.
 */
function dibujarOla(p, cx, cy, radio, amplitud, ahora, xCorte) {
  const fase = ahora * 0.0014;
  const pulso = 0.6 + 0.4 * Math.sin(ahora * 0.0018);
  const ampOla = 30 + amplitud * 140;
  const x0 = cx - radio;
  const limite = Math.min(cx + radio, xCorte);
  const zonaFundido = 70; // px donde la línea se disuelve al encontrar el texto

  if (limite <= x0) return;

  p.noFill();
  p.strokeWeight(1.5);

  // Tramo sólido
  const finSolido = Math.max(x0, limite - zonaFundido);
  p.stroke(255, 255, 255, 255 * 0.46 * pulso);
  p.beginShape();
  for (let x = x0; x <= finSolido; x += 4) {
    p.vertex(x, caminoOla(x, cx, cy, radio, ampOla, fase));
  }
  p.endShape();

  // Fundido hacia el texto: la línea se deshace donde nacen las palabras
  for (let x = finSolido; x < limite; x += 4) {
    const f = 1 - (x - finSolido) / zonaFundido;
    p.stroke(255, 255, 255, 255 * 0.46 * pulso * f);
    p.line(
      x, caminoOla(x, cx, cy, radio, ampOla, fase),
      x + 4, caminoOla(x + 4, cx, cy, radio, ampOla, fase)
    );
  }

  p.noStroke();
}

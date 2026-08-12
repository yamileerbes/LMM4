// Sistema de partículas: emanan del centro cuando alguien habla
// y son atraídas de vuelta lentamente. El color indica quién habla.

function crearParticulas() {
  let particulas = [];
  const MAX_PARTICULAS = 130; // tope: evita acumulación que degrade el framerate

  /**
   * Estallido puntual (ej: choque de antónimos opuestos).
   */
  function explotar(x, y, cantidad, color) {
    for (let i = 0; i < cantidad && particulas.length < MAX_PARTICULAS; i++) {
      const ang = Math.random() * Math.PI * 2;
      const vel = 3 + Math.random() * 9;
      particulas.push({
        x, y,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel,
        vida: 1.0,
        color,
      });
    }
  }

  /**
   * Emite (a veces) una partícula nueva y actualiza/dibuja todas.
   * conflicto=true en CLOTOIDE: emite aunque nadie hable.
   */
  function actualizar(p, cx, cy, hablaA, hablaB, conflicto, amplitud, tono) {
    if ((hablaA || hablaB || conflicto) && Math.random() > 0.45 &&
        particulas.length < MAX_PARTICULAS) {
      particulas.push({
        x: cx, y: cy,
        vx: (Math.random() - 0.5) * 8 * (1 + amplitud * 4),
        vy: (Math.random() - 0.5) * 8 * (1 + amplitud * 4),
        vida: 1.0,
        color: hablaA ? COLOR_A : (hablaB ? COLOR_B : '#FFFFFF'),
      });
    }

    particulas = particulas.filter(pt => pt.vida > 0.01);

    p.noStroke();
    for (const pt of particulas) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      // Atracción suave hacia el centro
      pt.vx += (cx - pt.x) * 0.001;
      pt.vy += (cy - pt.y) * 0.001;
      pt.vida -= 0.014;

      const c = p.color(pt.color);
      p.fill(p.red(c), p.green(c), p.blue(c), 255 * Math.max(0, pt.vida));
      p.circle(pt.x, pt.y, 2 * (1 + tono * 3) * pt.vida);
    }
  }

  return { actualizar, explotar };
}

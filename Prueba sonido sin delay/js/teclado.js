// Teclas de la experiencia:
//   [A] / [B] — PTT (push-to-talk) de cada interlocutor.
//   [D]       — muestra/oculta el panel de debug.
//   [C]       — fuerza/des-fuerza CONVERGENCIA (para testear el estado final).
//   [R]       — reinicia la experiencia desde el principio (vuelve a SILENCIO).

function crearTeclado(alAlternarDebug, alAlternarConvergencia, alReiniciar) {
  const estado = {
    teclaA: false,
    teclaB: false,
  };

  function alPresionar(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === 'a') estado.teclaA = true;
    if (k === 'b') estado.teclaB = true;
    if (k === 'd' && alAlternarDebug) alAlternarDebug();
    if (k === 'c' && alAlternarConvergencia) alAlternarConvergencia();
    if (k === 'r' && alReiniciar) alReiniciar();
  }

  function alSoltar(e) {
    const k = e.key.toLowerCase();
    if (k === 'a') estado.teclaA = false;
    if (k === 'b') estado.teclaB = false;
  }

  window.addEventListener('keydown', alPresionar);
  window.addEventListener('keyup', alSoltar);

  return {
    estado,
    destruir() {
      window.removeEventListener('keydown', alPresionar);
      window.removeEventListener('keyup', alSoltar);
    },
  };
}

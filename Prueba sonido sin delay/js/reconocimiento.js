// Reconocimiento de voz en tiempo real (Web Speech API).
// Entrega resultados parciales (interim) mientras se habla — es lo que permite
// ver las palabras escribirse en vivo sobre la espiral.
// Nota: solo disponible en Chrome/Edge; requiere conexión a internet.

/**
 * Inicia el reconocimiento continuo en español.
 * @param {(texto: string) => void} alTranscribir  recibe la transcripción acumulada
 * @returns {{ detener: () => void } | null}  null si el navegador no lo soporta
 */
function iniciarReconocimiento(alTranscribir) {
  const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
  if (!SR) {
    console.warn('Web Speech API no disponible en este navegador');
    return null;
  }

  let activo = true;
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'es-AR';

  rec.onresult = (e) => {
    let texto = '';
    for (let i = 0; i < e.results.length; i++) texto += e.results[i][0].transcript;
    alTranscribir(texto);
  };

  rec.onerror = () => {};

  // El navegador corta el reconocimiento cada tanto — reiniciar siempre
  rec.onend = () => {
    if (!activo) return;
    try { rec.start(); }
    catch (err) { setTimeout(() => { if (activo) rec.start(); }, 1000); }
  };

  rec.start();

  return {
    detener() {
      activo = false;
      try { rec.stop(); } catch (err) { /* ya detenido */ }
    },
  };
}

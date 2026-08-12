// Transcripción precisa por Whisper (API de OpenAI).
// Graba chunks de 3 segundos por interlocutor y los envía a la API.
// Complementa al reconocimiento en vivo: este texto reemplaza al parcial
// con la versión correcta en español.
//
// La API key se pega en la pantalla de inicio y queda guardada en localStorage.

const URL_WHISPER = 'https://api.openai.com/v1/audio/transcriptions';

async function enviarChunkWhisper(blob, mimeType, apiKey) {
  const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
  const form = new FormData();
  form.append('file', blob, 'chunk.' + ext);
  form.append('model', 'whisper-1');
  form.append('language', 'es');
  form.append('prompt', 'conversación entre dos personas');

  const res = await fetch(URL_WHISPER, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey },
    body: form,
  });

  if (!res.ok) {
    console.warn('Whisper error ' + res.status);
    return null;
  }

  const data = await res.json();
  return data.text ? data.text.trim() : null;
}

function iniciarCicloWhisper(stream, apiKey, alTranscribir) {
  const vivo = { v: true };
  const preferidos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  const mimeType = preferidos.find(t => MediaRecorder.isTypeSupported(t)) || '';

  const ciclo = () => {
    if (!vivo.v) return;

    const chunks = [];
    let rec;
    try { rec = new MediaRecorder(stream, mimeType ? { mimeType } : {}); }
    catch (err) { rec = new MediaRecorder(stream); }

    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: rec.mimeType });
      // Chunks muy chicos son ruido de fondo — no gastar la API
      if (blob.size > WHISPER_MIN_BYTES && vivo.v) {
        const texto = await enviarChunkWhisper(blob, rec.mimeType, apiKey).catch(() => null);
        if (texto && vivo.v) alTranscribir(texto);
      }
      if (vivo.v) ciclo();
    };

    rec.start();
    setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, WHISPER_CHUNK_MS);
  };

  ciclo();
  return { detener: () => { vivo.v = false; } };
}

/** Transcripción Whisper para ambos interlocutores. */
function iniciarWhisper(streamA, streamB, apiKey, alTranscribirA, alTranscribirB) {
  const ciclos = [];
  if (streamA && apiKey) ciclos.push(iniciarCicloWhisper(streamA, apiKey, alTranscribirA));
  if (streamB && apiKey) ciclos.push(iniciarCicloWhisper(streamB, apiKey, alTranscribirB));
  return { detener: () => ciclos.forEach(c => c.detener()) };
}

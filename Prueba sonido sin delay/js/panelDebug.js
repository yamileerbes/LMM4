// Panel de debug como overlay sobre el canvas (tecla [D] para mostrar/ocultar).

const COLORES_ESTADO_DEBUG = {
  SILENCIO:     '#6b7280',
  VOZ_UNICA:    '#f59e0b',
  ARQUIMEDES:   '#06b6d4',
  CLOTOIDE:     '#ef4444',
  CONVERGENCIA: '#10b981',
};

const DESCRIPCIONES_ESTADO = {
  SILENCIO:     'Silencio — ola sinusoidal en reposo',
  VOZ_UNICA:    'Voz única — texto sobre ola + eco inmediato',
  ARQUIMEDES:   'Arquímedes — espiral compartida, diálogo estable',
  CLOTOIDE:     'Clotoides en cruz — ideas que se cruzan sin converger',
  CONVERGENCIA: 'Convergencia — diálogo genuino · fondo violeta',
};

/**
 * Crea el overlay (oculto). Llamar a actualizar() en cada frame visible
 * y alternar() con la tecla [D].
 * @param {object} ex          objeto de estado de la experiencia (lectura directa)
 * @param {(estado: string|null) => void} alForzarEstado
 * @param {object} analizador  instancia del analizador — para acceder a los gestores
 */
function crearPanelDebug(ex, alForzarEstado, analizador) {
  const panel = document.createElement('div');
  panel.id = 'panel-debug';
  panel.style.cssText = `
    position: fixed; top: 12px; left: 12px; z-index: 1000; display: none;
    width: 340px; padding: 14px; border-radius: 6px;
    background: rgba(7,7,7,0.90); border: 1px solid rgba(255,255,255,0.12);
    font: 10px/1.6 'Courier New', monospace; color: rgba(255,255,255,0.7);
    backdrop-filter: blur(4px);
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
      <span style="font-size:9px; letter-spacing:2px; color:rgba(255,255,255,0.3);">
        DEBUG — tecla [D] cierra
      </span>
    </div>

    <!-- Estado y score -->
    <div style="margin-bottom:10px;">
      <span id="pd-estado" style="font-size:20px; font-weight:bold; letter-spacing:2px;">—</span>
      <div id="pd-desc" style="font-size:9px; color:rgba(255,255,255,0.35);"></div>
      <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; margin-top:6px; overflow:hidden;">
        <div id="pd-score" style="height:100%; width:0%; transition: width 0.1s;"></div>
      </div>
      <div style="font-size:9px; color:rgba(255,255,255,0.3);">
        score <span id="pd-score-num">0%</span>
      </div>
    </div>

    <!-- Amplitudes por interlocutor -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
      <div>
        <div style="color:rgba(255,107,78,0.85); font-size:9px;">
          INT.1 <span id="pd-ecoA"></span>
        </div>
        <div id="pd-ampA" style="font-size:10px;">fil: 0.0000</div>
        <div id="pd-ampA-cruda" style="font-size:9px; color:rgba(255,255,255,0.35);">raw: 0.0000</div>
        <div id="pd-textoA" style="font-size:9px; color:rgba(255,255,255,0.55);
             max-height:3em; overflow:hidden; word-break:break-word;"></div>
        <div id="pd-antoA"  style="font-size:8px; color:rgba(255,200,180,0.45);
             max-height:2.5em; overflow:hidden; word-break:break-word;"></div>
      </div>
      <div>
        <div style="color:rgba(45,226,226,0.85); font-size:9px;">
          INT.2 <span id="pd-ecoB"></span>
        </div>
        <div id="pd-ampB" style="font-size:10px;">fil: 0.0000</div>
        <div id="pd-ampB-cruda" style="font-size:9px; color:rgba(255,255,255,0.35);">raw: 0.0000</div>
        <div id="pd-textoB" style="font-size:9px; color:rgba(255,255,255,0.55);
             max-height:3em; overflow:hidden; word-break:break-word;"></div>
        <div id="pd-antoB"  style="font-size:8px; color:rgba(180,255,255,0.45);
             max-height:2.5em; overflow:hidden; word-break:break-word;"></div>
      </div>
    </div>

    <!-- Visualización GestorSenial INT.1 -->
    <div style="margin-bottom:6px;">
      <div style="font-size:8px; color:rgba(255,107,78,0.6); margin-bottom:2px;">
        SEÑAL INT.1 &nbsp;
        <span style="color:rgba(255,255,255,0.25);">━</span> cruda &nbsp;
        <span style="color:#22dd66;">━</span> filtrada
      </div>
      <canvas id="pd-canvas-a" width="312" height="48"
              style="display:block; border:1px solid rgba(255,255,255,0.08);"></canvas>
    </div>

    <!-- Visualización GestorSenial INT.2 -->
    <div style="margin-bottom:10px;">
      <div style="font-size:8px; color:rgba(45,226,226,0.6); margin-bottom:2px;">
        SEÑAL INT.2 &nbsp;
        <span style="color:rgba(255,255,255,0.25);">━</span> cruda &nbsp;
        <span style="color:#22dd66;">━</span> filtrada
      </div>
      <canvas id="pd-canvas-b" width="312" height="48"
              style="display:block; border:1px solid rgba(255,255,255,0.08);"></canvas>
    </div>

    <!-- Estadísticas -->
    <div id="pd-stats"   style="font-size:9px; color:rgba(255,255,255,0.4); margin-bottom:4px;"></div>
    <div id="pd-escucha" style="font-size:9px; color:rgba(80,220,120,0.55); margin-bottom:10px;"></div>

    <!-- Botones de estado forzado -->
    <div id="pd-botones" style="display:flex; flex-wrap:wrap; gap:4px;"></div>
  `;
  document.body.appendChild(panel);

  const $ = (id) => document.getElementById(id);

  // Contextos 2D de los canvas de señal
  const ctxA = $('pd-canvas-a').getContext('2d');
  const ctxB = $('pd-canvas-b').getContext('2d');

  // Botones de estados forzados
  const botones = [];
  const crearBoton = (etiqueta, valor) => {
    const btn = document.createElement('button');
    btn.textContent = etiqueta;
    btn.style.cssText = `
      background:none; border:1px solid rgba(255,255,255,0.15); cursor:pointer;
      color:rgba(255,255,255,0.4); font:8px 'Courier New',monospace;
      padding:3px 6px; border-radius:3px;
    `;
    btn.onclick = () => {
      alForzarEstado(valor);
      botones.forEach(b => {
        const activo = b.valor === valor;
        b.el.style.borderColor = activo ? 'white' : 'rgba(255,255,255,0.15)';
        b.el.style.color       = activo ? 'white' : 'rgba(255,255,255,0.4)';
      });
    };
    $('pd-botones').appendChild(btn);
    botones.push({ el: btn, valor });
  };
  LISTA_ESTADOS.forEach(e => crearBoton(e, e));
  crearBoton('AUTO', null);

  let visible = false;

  return {
    alternar() {
      visible = !visible;
      panel.style.display = visible ? 'block' : 'none';
    },
    get visible() { return visible; },

    /**
     * Llamar en cada frame del sketch mientras el panel esté visible.
     * amplitudA/B son los valores FILTRADOS que ya usa el sistema.
     */
    actualizar(amplitudA, amplitudB) {
      if (!visible) return;

      const color = COLORES_ESTADO_DEBUG[ex.estado] || '#fff';
      $('pd-estado').textContent    = ex.estado;
      $('pd-estado').style.color    = color;
      $('pd-desc').textContent      = DESCRIPCIONES_ESTADO[ex.estado] || '';
      $('pd-score').style.width     = (ex.score * 100) + '%';
      $('pd-score').style.backgroundColor = color;
      $('pd-score-num').textContent = (ex.score * 100).toFixed(0) + '%';

      // Amplitud filtrada (la que usa el sistema) + cruda (referencia)
      const crudaA = analizador ? analizador.estado.ampCrudaA : amplitudA;
      const crudaB = analizador ? analizador.estado.ampCrudaB : amplitudB;
      $('pd-ampA').textContent       = 'fil: ' + amplitudA.toFixed(4) + (amplitudA > UMBRAL_VAD ? ' ▶' : '');
      $('pd-ampA-cruda').textContent = 'raw: ' + crudaA.toFixed(4);
      $('pd-ampB').textContent       = 'fil: ' + amplitudB.toFixed(4) + (amplitudB > UMBRAL_VAD ? ' ▶' : '');
      $('pd-ampB-cruda').textContent = 'raw: ' + crudaB.toFixed(4);

      $('pd-textoA').textContent = ex.textoA || '—';
      $('pd-textoB').textContent = ex.textoB || '—';
      $('pd-antoA').textContent  = ex.antoA  || '—';
      $('pd-antoB').textContent  = ex.antoB  || '—';
      $('pd-ecoA').textContent   = ex.ecoA ? '● ECO' : '';
      $('pd-ecoB').textContent   = ex.ecoB ? '● ECO' : '';

      $('pd-stats').textContent =
        `turnos ${ex.intercambios} · solape ${ex.tiempoSolape.toFixed(1)}s · ` +
        `A ${ex.tiempoA.toFixed(1)}s · B ${ex.tiempoB.toFixed(1)}s · ` +
        `cal ${(ex.calidadDialogo * 100).toFixed(0)}%`;

      $('pd-escucha').textContent = ex.tiempoEscucha > 0
        ? `escucha acumulada: ${ex.tiempoEscucha.toFixed(1)}s` : '';

      // Dibujar gestores de señal si están disponibles
      if (analizador && analizador.estado.gestorA) {
        analizador.estado.gestorA.dibujar(ctxA, 0, 0);
      }
      if (analizador && analizador.estado.gestorB) {
        analizador.estado.gestorB.dibujar(ctxB, 0, 0);
      }
    },
  };
}

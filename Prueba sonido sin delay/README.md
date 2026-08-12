# Espirales del Silencio — versión vanilla

Instalación interactiva: dos interlocutores hablan por teléfono y el diálogo
se proyecta como espirales que mutan según la calidad de la conversación.
**Todo se compone dentro de un círculo** (la pantalla está enmarcada por un
círculo físico; `MARGEN_MARCO` y `MOSTRAR_BORDE` en `config.js` ayudan a alinearlo).

La espiral muestra la transcripción real de cada voz. Las **voces implícitas**
— el antónimo de la última palabra de cada interlocutor — flotan como satélites
violetas en el hemisferio de su hablante: lo que cada uno evita decir.

- **Fusión**: si ambos evitan la **misma** palabra, los satélites viajan al
  centro y se funden en una palabra dorada. Esa palabra común queda **latente**
  orbitando la escena (memoria de los encuentros) y suma score.
- **Choque**: si los antónimos son **opuestos entre sí** (uno evita "bueno",
  el otro "malo"), los pensamientos implícitos colisionan en el centro:
  impacto, onda roja, rebote — y el score retrocede.
- **Condición de convergencia**: además del diálogo balanceado con silencios
  alternados, se necesita **al menos una palabra común** (una fusión). Sin ese
  punto de encuentro implícito, el diálogo orbita el umbral sin poder cruzarlo.
- En **CONVERGENCIA** el texto de ambos nace **en el centro** y crece hacia
  afuera: los dos brazos de la espiral doble se conectan en el medio.

## Cómo correr — SIN INSTALAR NADA

1. Abrir **`index.html`** con **Chrome** o **Edge** (doble clic).
2. Tocar **INICIAR EXPERIENCIA** y dar permiso al micrófono.

Eso es todo. No hace falta Node, npm, ni ningún programa extra.
La carpeta entera se puede copiar a un pendrive o compartir por Drive.

### Teclas

| Tecla | Función |
|---|---|
| **A** (mantener) | Habla el Interlocutor 1 (naranja) |
| **B** (mantener) | Habla el Interlocutor 2 (teal) |
| **D** | Muestra/oculta el panel de debug |
| **C** | Fuerza/des-fuerza CONVERGENCIA (para testear el estado final) |

Las teclas [A]/[B] marcan QUIÉN habla (sirven para recorrer los estados sin
micrófono), pero el texto en pantalla sale solo de la transcripción real.
Para simular texto sin hablar, en la consola del navegador:
`__simularHabla('A', 'hola quiero decir algo')`.

### Transcripción Whisper (opcional)

En la pantalla de inicio, activar la casilla y pegar la API key de OpenAI.
Queda guardada en el navegador para las próximas sesiones. Sin la key, la
transcripción en vivo usa la Web Speech API del navegador (requiere internet).

## Estados de la experiencia

| Estado | Forma | Cuándo |
|---|---|---|
| `SILENCIO` | Ola sinusoidal sutil | Nadie habla |
| `VOZ_UNICA` | Texto sobre la ola | Una sola voz; eco inmediato (sidetone) |
| `ARQUIMEDES` | Espiral de Arquímedes compartida | Diálogo: las palabras de uno reemplazan las del otro |
| `LOGARITMICA` | Espiral logarítmica | Solape iniciando: los antónimos emergen gradualmente |
| `CLOTOIDE` | **Dos clotoides en cruz** (una por interlocutor, perpendiculares) | Solape sostenido ≥2s: las ideas se cruzan pero no convergen; texto 100% invertido |
| `FERMAT` | Parabólica transitoria (~2s) | Silencio después del conflicto |
| `CONVERGENCIA` | Parabólica convergente | Diálogo balanceado con pausas |

**Reinicio automático**: si nadie habla durante 6 segundos, la experiencia
vuelve a SILENCIO y se resetea — lista para los próximos visitantes.

## Mapa de archivos y roles

```
espirales-vanilla/
├── index.html        Punto de entrada (carga los scripts en orden)
├── libs/p5.min.js    p5.js local — no necesita internet
└── js/
    ├── config.js          Todas las constantes ajustables
    ├── antonimos.js       Diccionario de inversión semántica
    ├── espirales.js       Matemática de las curvas (funciones puras)
    ├── estados.js         Máquina de estados (función pura)
    ├── audioEfectos.js    Eco, panning, distorsión (Web Audio)
    ├── audioAnalizador.js Captura de mics, amplitud, tono
    ├── reconocimiento.js  Web Speech API (texto en vivo)
    ├── whisper.js         Whisper API (texto preciso cada 3s)
    ├── dibujante.js       Texto sobre espirales (el corazón visual)
    ├── ola.js             Olas de fondo
    ├── particulas.js      Sistema de partículas
    ├── overlays.js        Indicadores, etiquetas, anillos de eco
    ├── teclado.js         Teclas [A]/[B]/[D]
    ├── panelDebug.js      Panel de monitoreo (overlay)
    └── main.js            Pantalla de inicio + loop principal
```

### Roles sugeridos para el equipo

| Área | Archivos | Qué se puede hacer sin tocar el resto |
|---|---|---|
| **Audio** | `audioEfectos.js`, `audioAnalizador.js` | Cambiar efectos por estado, ajustar el eco |
| **Semántica** | `antonimos.js`, `whisper.js`, `reconocimiento.js` | Ampliar el diccionario, mejorar transcripción |
| **Visual** | `dibujante.js`, `espirales.js`, `ola.js`, `particulas.js`, `overlays.js` | Formas, tipografía, colores, partículas |
| **Dinámica** | `estados.js`, `config.js` | Umbrales, transiciones, velocidades, tiempos |
| **Herramientas** | `panelDebug.js` | Mejorar el panel de monitoreo |

Importante: los archivos se cargan como scripts clásicos en el orden definido
en `index.html`. Si se agrega un archivo nuevo, hay que sumarlo ahí respetando
las dependencias (ej: todo lo que use `config.js` va después de él).

## Modos de entrada

- **Único**: un micrófono; las teclas [A]/[B] definen quién habla.
- **Dual USB**: dos receptores independientes (uno por interlocutor).
- **Estéreo L/R**: un receptor estéreo (ej. DJI Mic); canal izquierdo =
  Interlocutor 1, derecho = Interlocutor 2.

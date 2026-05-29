let adjetivosMasc = [
  "basado", "disociado", "tóxico", "hiperfijado", "funado",
  "skibidi", "sigma", "aesthetic", "cringe", "hater"
];

let adjetivosFem = [
  "basada", "disociada", "tóxica", "hiperfijada", "funada",
  "SixSeven", "alfa", "aesthetic", "cringe", "narcisista"
];

let sustantivosMasc = [
  "brainrot", "shitpost", "algoritmo", "lore", "déficit de atención",
  "feed", "stalkeo", "gaslighting", "fake", "feed"
];

let sustantivosFem = [
  "dopamina", "red flag", "percepción de la realidad", "fyp",
  "crisis existencial", "ansiedad social", "vibra"
];

let adverbios = [
  "irónicamente", "compulsivamente", "literalmente",
  "algorítmicamente", "sin contexto", "disociadamente"
];

let verbos = [
  "ghostea", "skipea", "sobrepiensa", "cancela", "farmea",
  "stalkea", "retuitea", "ignora"
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  generarYMostrarCarta();
}

function mousePressed() {
  generarYMostrarCarta();
}

function generarYMostrarCarta() {
  background(198, 240, 255);
  fill(50);
  textSize(18);
  textFont('Georgia');
  textWrap(WORD);

  let carta = generarCartaDeAmor();

  // fondo decorativo primero
  push();
  translate(width / 2 + 40, height / 2);
  rectMode(CENTER); 
  fill(20, 20, 20, 20);
  rect(0, 0, 650, 350);
  pop();

  // el texto encima
  push();
  textAlign(CENTER, CENTER);
  translate(width / 3, height / 4);
  text(carta, 0, 0, 500, 300);
  pop();

  console.log(carta);
}

function generarCartaDeAmor() {
  let cuerpo = "";

  for (let i = 0; i < 5; i++) {
    let tipoDeFrase = floor(random(3));

    // Primer conjunto adjetivo + sustantivo
    let numeroAleatorio1 = random();
    let esMasc1;
    let adj1;
    let sust1;

    // Se decide el género
    if (numeroAleatorio1 < 0.5) {
      esMasc1 = true;
    } else {
      esMasc1 = false;
    }

    // Asigna las palabras según el resultado anterior
    if (esMasc1 === true) {
      adj1 = random(adjetivosMasc);
      sust1 = random(sustantivosMasc);
    } else {
      adj1 = random(adjetivosFem);
      sust1 = random(sustantivosFem);
    }

    // Segundo conjunto adjetivo + sustantivo
    let numeroAleatorio2 = random();
    let esMasc2;
    let adj2;
    let sust2;

    // Se decide el género
    if (numeroAleatorio2 < 0.5) {
      esMasc2 = true;
    } else {
      esMasc2 = false;
    }

    // Asigna las palabras
    if (esMasc2 === true) {
      adj2 = random(adjetivosMasc);
      sust2 = random(sustantivosMasc);
    } else {
      adj2 = random(adjetivosFem);
      sust2 = random(sustantivosFem);
    }

    // No dependen del género
    let adv = random(adverbios);
    let verbo = random(verbos);

    let frase = "";

    // Estructura original
    if (tipoDeFrase === 0) {
      frase = `Mi ${adj1} ${sust1} ${adv} ${verbo} tu ${adj2} ${sust2}.`;
    } else if (tipoDeFrase === 1) {
      frase = `Eres mi ${adj1} ${sust1}.`;
    } else {
      frase = `Mi ${adj1} ${sust1} se aferra a tu ${adj2} ${sust2}.`;
    }

    cuerpo += frase + " ";
  }


  return `Usuario/a,\n\n${cuerpo.trim()}\n\nSin contexto,\nTu Algoritmo`;
}

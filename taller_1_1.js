function setup() {
  createCanvas(500, 320);
  noLoop();
  colorMode(HSB, 360, 100, 100, 1);
}

function draw() {
  background(10); 
  
  let CE = 359;
  
  for (let x = 1; x <= 800; x = (x * 1.01) + 0.5) {
    
    // el valor se reinicia a 0 al llegar a 360. gira el círculo cromático
    let matizIterativo = (x * 3.5) % 360; 
    
    // seno oscila entre -1 y 1.
    let pulsoBrillo = map(sin(x * 0.15), -1, 1, 40, 100);

    stroke(matizIterativo, 90, pulsoBrillo, 0.8);
    strokeWeight(1.5);
    // -------------------------------
    
    let posX1 = (8 * CE) / x;
    let posX2 = (CE / 2) - ((10 * CE) / x);
    
    dibujarV(posX1, x);
    dibujarV(posX2, x);
  }
}

function dibujarV(posX, posY) {
  push(); 
  translate(posX, posY); 
  line(0, 0, 0, 42);       
  line(0, 42, 42, -21);    
  pop();
}

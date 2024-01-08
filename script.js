const requestAnimFrame = (function (w) {
  return w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.mozRequestAnimationFrame;
})(window);

const RandomStack = function (length) {
  this._data = new Array(length);
  this.length = 0;

  this.push = function (e) {
    this._data[this.length++] = e;
  };

  this.pop = function () {
    if (this.length == 0) {
      return null;
    }
    let idx = Math.floor(Math.random() * this.length);
    let e = this._data[idx];
    this._data[idx] = this._data[--this.length];
    return e;
  }
};

const Stack = function (length) {
  this._data = new Array(length);
  this.length = 0;

  this.push = function (e) {
    this._data[this.length] = e;
    this.length++;
  };

  this.pop = function () {
    this.length--;
    return this._data[this.length];
  }
};

const ADJACENT = [ {x: -1, y: 0}, {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1} ];

const DOM = {
  canvas: null,
  ctx: null,
  fileInput: document.getElementById("file_input"),
  result: document.getElementById("result"),
  original: document.getElementById("original_image"),
  generated: document.getElementById("generated_image"),
};

const ENV = {
  imageData: null,
  markovPainting: null,
  pointStack: null,
  isBusy: null,
  isPainting: null,
  now: null,
  then: null
};

const CONFIG = {
  width: window.innerWidth,
  height: window.innerHeight,
  initialPoints: 1,
  drawingSpeed: 0.05
};

window.onload = function () {
  initDOM();
  initENV();
}

function initDOM() {
  DOM.canvas = document.getElementById("canvas");
  DOM.canvas.width = CONFIG.width;
  DOM.canvas.height = CONFIG.height;
  DOM.ctx = DOM.canvas.getContext("2d");

  DOM.fileInput.addEventListener("change", function () {
    let file = DOM.fileInput.files[0];
    if (!!file && file.type.includes("image")) {
      let reader = new FileReader();
      reader.addEventListener("load", function () {
        loadImage(reader.result);
      }, false);
      reader.readAsDataURL(file);
    }
  });
}

function initENV() {
  ENV.markovPainting = new MarkovPainting();
  ENV.isBusy = false;
  ENV.then = 0;
  ENV.now = 0;
}

function readFile(file) {
  if (!ENV.isBusy && !!file && file.type.includes("image")) {
    setBusy(true);
    let reader = new FileReader();
    reader.addEventListener("load", function () {
      loadImage(reader.result);
    }, false);
    reader.readAsDataURL(file);
  }
}

function loadImage(src) {
  let image = new Image();
  image.setAttribute("crossOrigin", "anonymous");
  image.src = src;

  image.onload = function () {
    DOM.original.src = image.src;
    initMarkovChain(image);
  }
}

function initMarkovChain(image) {
  setBusy(true);
  ENV.markovPainting.reset();
  let canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  let context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  let imageData = context.getImageData(0, 0, image.width, image.height);
  ENV.markovPainting.feedImageData(imageData);

  let newImageData = ENV.markovPainting.createImageData(DOM.canvas.width, DOM.canvas.height);
  ENV.imageData = DOM.ctx.createImageData(DOM.canvas.width, DOM.canvas.height);
  for (let i = 0; i < ENV.imageData.data.length; i++) {
    ENV.imageData.data[i] = newImageData[i];
  }
  DOM.ctx.putImageData(ENV.imageData, 0, 0);
  DOM.generated.src = DOM.canvas.toDataURL();
  startPainting();
  setBusy(false);
}

function startPainting() {
  DOM.canvas.classList.remove("hidden");
  ENV.pointStack = new RandomStack();
  ENV.imageData = DOM.ctx.createImageData(DOM.canvas.width, DOM.canvas.height);

  let point = {
    x: Math.floor(Math.random() * DOM.canvas.width),
    y: Math.floor(Math.random() * DOM.canvas.height)
  }
  let color = ENV.markovPainting.getRandomColor();
  setPixelColor(ENV.imageData, point, color);
  ENV.pointStack.push(point);

  ENV.then = Date.now();
  loop();
}

function loop() {
  ENV.now = Date.now();
  let drawing = draw();
  DOM.ctx.putImageData(ENV.imageData, 0, 0);
  if (drawing) {
    ENV.then = ENV.now;
    requestAnimFrame(loop);
  }
}

function draw() {
  let dt = ENV.now - ENV.then;
  let iterations = CONFIG.drawingSpeed * dt * ENV.pointStack.length;
  let point = null, color = null;
  let x = 0, y = 0, nextPoint = null, nextColor = null;

  if (ENV.pointStack.length === 0) { 
    setTimeout(function () {
      DOM.canvas.classList.add("hidden");
    }, 2000);
    return false; 
  }

  for (let i = 0; i < iterations; i++) {
    point = ENV.pointStack.pop();
    color = getPixelColor(ENV.imageData, point);
    for (adj of ADJACENT) {
      x = point.x + adj.x,
      y = point.y + adj.y
      if(x >= 0 && y >= 0 && x < ENV.imageData.width && y < ENV.imageData.height) {
        nextPoint = { x: x, y: y };
        nextColor = getPixelColor(ENV.imageData, nextPoint);
        if (nextColor.a == 0) {
          nextColor = ENV.markovPainting.getNextColor(color);
          setPixelColor(ENV.imageData, nextPoint, nextColor);
          ENV.pointStack.push(nextPoint);
        }
      }
    }
  }
  return true;
}

function setPixelColor(imageData, point, color) {
  let idx = (point.x + point.y * imageData.width) << 2;
  imageData.data[idx] = color.r;
  imageData.data[idx+1] = color.g;
  imageData.data[idx+2] = color.b;
  imageData.data[idx+3] = 255;
}

function getPixelColor(imageData, point) {
  let idx = (point.x + point.y * imageData.width) << 2;
  return {
    r: imageData.data[idx],
    g: imageData.data[idx+1],
    b: imageData.data[idx+2],
    a: imageData.data[idx+3]
  }
}

function setBusy(b) {
  ENV.isBusy = b;
  DOM.result.classList.toggle("hidden", b);
  DOM.result.innerText = b ? "Loading..." : "";
}
(function (root, factory) {
  if (typeof define === "function" && define.amd) { define([], factory); }
  else if (typeof module === "object" && module.exports) { module.exports = factory(); }
  else { root.MarkovPainting = factory(); }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  let ADJACENT = [
    {x: -1, y: 0},
    {x: 0, y: -1},
    {x: 1, y: 0},
    {x: 0, y: 1}
  ];

  let RandomStack = function (length) {
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

  function getColor(imgData, index) {
    return {
      r: imgData[index],
      g: imgData[index+1],
      b: imgData[index+2]
    };
  }

  function setColor(imgData, index, color) {
    imgData[index] = color.r;
    imgData[index+1] = color.g;
    imgData[index+2] = color.b;
    imgData[index+3] = 255;
  }

  function compressColor(color, compression) {
    return {
      r: Math.floor(color.r / compression) * compression,
      g: Math.floor(color.g / compression) * compression,
      b: Math.floor(color.b / compression) * compression
    };
  }

  function encode(color) {
    return (color.r << 16) + (color.g << 8) + color.b;
  }

  function decode(key) {
    return {
      r: key >> 16,
      g: key >> 8 & 255,
      b: key & 255
    };
  }

  let MarkovPainting = function () {
    this._model = {};
    this.compression = 1;
  };

  MarkovPainting.prototype = {
    reset: function () {
      this._model = {};
    },

    addColorTransition: function (color1, color2) {
      let c1 = compressColor(color1, this.compression);
      let c2 = compressColor(color2, this.compression);
      let key1 = encode(c1);
      let key2 = encode(c2);
      if (this._model.hasOwnProperty(key1)) {
        this._model[key1].push(key2);
      }
      else {
        this._model[key1] = [key2];
      }
    },

    getNextColor: function (color) {
      let key = encode(color);
      if (this._model.hasOwnProperty(key)) {
        let random = Math.floor(Math.random() * this._model[key].length);
        return decode(this._model[key][random]);
      }
      return null;
    },

    getRandomColor: function () {
      let keys = Object.keys(this._model);
      if (keys.length) {
        let random = Math.floor(Math.random() * keys.length);
        return decode(keys[random]);
      }
      return null;
    },

    feedImageData: function (imageData) {
      let x = 0, y = 0, idx = 0, color = null;
      let x_ = 0, y_ = 0, idx_ = 0, color_ = null;
      for (x = 0; x < imageData.width; x++) {
        for (y = 0; y < imageData.height; y++) {
          idx = (x + y * imageData.width) << 2;
          color = getColor(imageData.data, idx);
          for (let k = 0; k < ADJACENT.length; k++) {
            x_ = x + ADJACENT[k].x;
            y_ = y + ADJACENT[k].y;
            if (x_ >= 0 && x_ < imageData.width && y_ >= 0 && y_ < imageData.height) {
              idx_ = (x_ + y_ * imageData.width) << 2;
              color_ = getColor(imageData.data, idx_);
              this.addColorTransition(color, color_);
            }
          }
        }
      }
    },

    feedColorMatrix: function (matrix) {
      let rows = matrix.length, columns = matrix[0].length;
      let r = 0, c = 0, color = null;
      let r_ = 0, c_ = 0, color_ = null;
      for (r = 0; r < rows; r++) {
        for (c = 0; c < columns; c++) {
          color = matrix[r][c];
          for (adj of ADJACENT) {
            r_ = r + adj.y;
            c_ = c + adj.x;
            if (r_ >= 0 && r_ < rows && c_ >= 0 && c_ < columns) {
              color_ = matrix[r_][c_];
              this.addColorTransition(color, color_);
            }
          }
        }
      }
    },

    createImageData: function (width, height) {
      let imageData = new Uint8ClampedArray((width * height) << 2);
      let stack = new RandomStack();

      let point = {
        x: Math.floor(Math.random() * width),
        y: Math.floor(Math.random() * height)
      };
      let index = (point.x + point.y * width) << 2;
      setColor(imageData, index, this.getRandomColor());
      stack.push(point);

      let x = 0, y = 0, color = null, nextColor = null;
      while (stack.length > 0) {
        point = stack.pop();
        index = (point.x + point.y * width) << 2;
        color = getColor(imageData, index);
        for (let adj of ADJACENT) {
          x = point.x + adj.x;
          y = point.y + adj.y;
          if (x >= 0 && x < width && y >= 0 && y < height) {
            index = (x + y * width) << 2;
            if (imageData[index+3] == 0) {
              nextColor = this.getNextColor(color);
              setColor(imageData, index, nextColor);
              stack.push({x: x, y: y });
            }
          }
        }
      }
      return imageData;
    }
  };

  return MarkovPainting;
}));
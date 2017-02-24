"use strict";

var _ = require("underscore");

var options = {};
var data = {};

module.exports = {

  init: function(o) {
    options = o;

    data.base = o.base;
    data.title = o.title;
    data.time = [];
  },
  add: function(o) {
    data.time.push(o);
    return data.time.length;
  },

  remove: function(o) {
    var pos = _.findLastIndex(data.time, {id: o.id});

    if (pos == -1) {
      return -1;
    }
    else {
      data.time.splice(pos, 1);
      return data.time.length;
    }
  },
  length: function() {
    return data.time.length;
  },
  getBase: function() {
    return data.base;
  },
  getData: function() {
    return data;
  }

};


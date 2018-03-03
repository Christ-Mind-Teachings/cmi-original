"use strict";

var _ = require("underscore");

var options = {};
var data = {};

//true when an existing timing is being edited
var edit = false;

/*
 * update existing data point or insert in place
 */
function update(o) {
  var pos = _.findIndex(data.time, {id: o.id});

  //remove the 'p' and convert to integer
  var pointIndex = parseInt(o.id.substr(1), 10);

  //existing data point found
  if (pos > -1) {
    o.prevTime = data.time[pos].seconds;
    data.time[pos] = o;
    console.log("capture: %s updated from %s to %s", o.id, o.prevTime, o.seconds);
  }
  else if (pointIndex > 0 && pointIndex < data.time.length) {
    data.time.splice(pointIndex, 0, o);
    console.log("capture: %s inserted at %s", o.id, o.seconds);
  }
  else {
    data.time.push(o);
    console.log("capture: %s added to end at %s", o.id, o.seconds);
  }
}

module.exports = {

  init: function(o) {
    options = o;

    data.base = o.base;
    data.title = o.title;

    // existing times can be set by initAudioTimes() before this code
    // is called
    if (!data.time) {
      data.time = [];
    }

    console.log("capture init: ", data);
  },
  initAudioTimes: function(t) {
    edit = true;
    data.time = t;
    console.dir(data);
  },
  add: function(o) {
    var pos;

    if (edit) {
      update(o);
    }
    else {
      data.time.push(o);
    }
    return data.time.length;
  },

  remove: function(o) {
    var pos = _.findLastIndex(data.time, {id: o.id});

    if (pos === -1) {
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


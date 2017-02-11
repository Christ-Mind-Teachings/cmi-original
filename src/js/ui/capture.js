
"use strict";

var kb = require("keyboardjs");
var _ = require("underscore");
var capture = [0];
var jPlayer;

var recordRequested = false;
var clearRequested = false;

//if tString contains ':' indicates minutes and or hours
function convertTime(tString) {
  var t = tString.split(":");
  var seconds, minutes, hours;
  var total;

  switch(t.length) {
    case 1:
      total = Number.parseFloat(t[0], 10);
      break;
    case 2:
      seconds = Number.parseFloat(t[1], 10);
      minutes = Number.parseFloat(t[0], 10) * 60;
      total = minutes + seconds;
      break;
    case 3:
      seconds = Number.parseFloat(t[2], 10);
      minutes = Number.parseFloat(t[1], 10) * 60;
      hours = Number.parseFloat(t[2], 10) * 3600;
      total = hours + minutes + seconds;
      break;
  }

  return _.isNaN(total) ? -1 : total;
}

function cancelClear() {
  clearRequested = false;
  console.log('clear request timeout');
}

module.exports = {

  initialize: function(player) {

    jPlayer = player;

    //m: indicates to store current audio play time
    kb.bind('m', function(e) {
      recordRequested = true;
    });

    //d: delete most recent audio play time
    kb.bind('d', function(e) {
      var t;

      //don't delete the first item, (has a time of zero)
      if (capture.length > 1) {
        var t = capture.pop();

        if (typeof t !== "undefined") {
          console.log('deleted: %s', t);
        }
      }
    });

    //l: list timing object
    kb.bind('l', function(e) {
      if (capture.length > 1) {
        console.log(capture);
      }
      else {
        console.log("no data captured")
      }
    });

    //s: seek to a specific time, prompt user for time
    kb.bind('s', function(e0) {
      var tString = prompt("Play at specified time");
      var t;
      if (tString !== null) {
        t = convertTime(tString);
        console.log("Input: %s, time: %s", tString, t);

        if (t > -1) {
          if (typeof jPlayer !== "undefined") {
            jPlayer.jPlayer("play", t);
          }
          else {
            console.log("jPlayer is not defined in capture.js");
          }
        }
      }
    });

    //c: clear array
    kb.bind('c', function(e) {
      if (clearRequested) {
        capture = [0];
        console.log("cleared");
        clearRequested = false;
      }
      else {
        if (capture.length > 1) {
          clearRequested = true;
          console.log('clear: requested, press "c" again to actually do it.')
          setTimeout(cancelClear, 2000);
        }
      }
    });
  },

  currentTime: function(t) {
    if (recordRequested) {
      capture.push(t);
      console.log('captured: %s', t);
      recordRequested = false;
    }
  }

};

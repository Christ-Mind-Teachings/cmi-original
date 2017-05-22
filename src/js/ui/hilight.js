/*
 * NOTE:
 *
 * Declared globally: cmiAudioTimingData
 */

"use strict";

var scroll = require("scroll-into-view");
var _ = require("underscore");

//default class to highlight transcript paragraphs during audio playback
var hilightClass = "hilite";
var player;
var enabled = false;
var seeking = false;
var seekSnap = false;

//real or test data
var timingData;

//paragraph timing pointers
var locptr = -1;
var prevptr = -1;

function processSeek(time) {

  console.log("seek requested to: ", time);

  //we don"t know if seeked time is earlier or later than
  //the current time so we look through the timing array
  locptr = _.findIndex(timingData.time, function(t) {
    return t.seconds >= time;
  });

  if (locptr === -1) {
    locptr++;
    console.log("adjusted index: %s", locptr);
    console.log("seek time: %s > %s (last ptime)", time,
        timingData.time[timingData.time.length - 1].seconds);
  }

  console.log("[ptr:%s] seeking to %s which begins at %s", 
    locptr, timingData.time[locptr].id, timingData.time[locptr].seconds);

  //check if we"ve found a beginning of the paragraph
  // - if so, don"t need to snap
  console.log("snap time diff=%s", Math.abs(time - timingData.time[locptr].seconds));
  //if (time === timingData.time[locptr].seconds) {
  if (Math.abs(time - timingData.time[locptr].seconds) < 1) {
    showNscroll(locptr);
    seeking = false;
  }
  else {
    //snap play to start time of paragraph
    console.log("snapping from requested %s to %s",
                time, timingData.time[locptr].seconds);
    seekSnap = true;
    player.setCurrentTime(timingData.time[locptr].seconds);
  }
}

function processSeekSnap(time) {

  console.log("snap complete: snap time: %s, ptime: %s", time, timingData.time[locptr].seconds);
  showNscroll(locptr);

  console.log("-------------------------");

  seekSnap = false;
  seeking = false;
}

function removeCurrentHilight() {
  if (prevptr > -1) {
    $("#" + timingData.time[prevptr].id).removeClass(hilightClass);
  }
}

function showNscroll(idx) {
  var tinfo = timingData.time[idx];

  //scroll into view
  scroll(document.getElementById(tinfo.id));

  if (prevptr > -1) {
    $("#" + timingData.time[prevptr].id).removeClass(hilightClass);
  }

  $("#" + tinfo.id).addClass(hilightClass);
  prevptr = idx;
}

function getTime(idx) {
  if (idx < 0 || idx >= timingData.time.length ) {
    return 60 * 60 *24; //return a big number
  }

  return timingData.time[idx].seconds;
}

function getTimeInfo(idx) {
  if (idx < 0 || idx >= timingData.time.length ) {
    return {id: "xx", seconds: 0};
  }

  return timingData.time[idx];
}

//audio is playing: play time at arg: current
function processCurrentTime(current) {
  if (locptr === -1 || current > getTime(locptr + 1)) {
    debugPlayPosition("hilight event", current);
    locptr++;
    showNscroll(locptr);
  }
}

function debugPlayPosition(msg, time) {
  var now = time || "?.?";
  var prev = getTimeInfo(locptr - 1),
      current = getTimeInfo(locptr),
      next = getTimeInfo(locptr + 1);

  console.log("%s [%s:%s]: p:%s/%s, c:%s/%s, n:%s/%s", msg, time, locptr, prev.id, prev.seconds, current.id, current.seconds, next.id, next.seconds);

}

module.exports = {
  //hilight.js

  //highlight supported when timing data available
  initialize: function(cssClass) {
    var rc = {};

    if (typeof window.cmiAudioTimingData !== "undefined") {
      console.log("timing data available");

      timingData = cmiAudioTimingData;
      rc.startTime = timingData.time[0].seconds;

      //indicate timing data available
      enabled = true;
    }

    if (typeof cssClass !== "undefined") {
      hilightClass = cssClass;
    }

    rc.enabled = enabled;
    return rc;
  },

  setAudioPlayer: function(p) {
    //we need this to adjust seeking
    player = p;
  },

  //don"t process time event when seeking
  updateTime: function(time) {
    if (!enabled || seeking) {
      return;
    }
    processCurrentTime(time);
  },
  play: function(time) {
    console.log("play pressed at %s", time);
  },
  pause: function(time) {
    console.log("pause pressed at %s", time);
  },
  seeking: function(time) {
    if (!enabled) {
      return;
    }
    //console.log("%s seeking", time);

    //disable hilight event handling
    seeking = true;
  },
  seeked: function(time) {
    if (!enabled) {
      return;
    }

    //seek is a two step process
    //1. user initiated, seeks to arbitrary time
    //2. snap: adjust to start of paragraph seeked to
    if (!seekSnap) {
      processSeek(time);
    }
    else {
      processSeekSnap(time);
    }

  },
  ended: function(time) {
    console.log("play ended at: %s", time);

    if (!enabled) {
      return;
    }

    //remove hilight
    removeCurrentHilight();

    //reset pointers
    locptr = -1;
    prevptr = -1;
  },

  //get start time for paragraph p
  getTime: function(p) {
    var pTime = 0;
    var info = _.find(timingData.time, function(item) {
      return item.id === p;
    });

    if (info) {
      pTime = info.seconds;
    }
    else {
      console.error("hilight.getTime(%s) failed to get paragraph start time.", p);
    }
    return pTime;
  }

};


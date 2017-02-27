/*
 * NOTE:
 *
 * Declared globally: cmi_audio_timing_data
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
var timing_data;

//paragraph timing pointers
var locptr = -1;
var prevptr = -1;

function processSeek(time) {

  console.log("seek requested to: ", time);

  //we don't know if seeked time is earlier or later than
  //the current time so we look through the timing array
  locptr = _.findIndex(timing_data.time, function(t) {
    return t.seconds >= time;
  });


  if (locptr == -1) {
    locptr++
    console.log("adjusted index: %s", locptr);
  }

  console.log("[ptr:%s] seeking to %s which begins at %s", 
    locptr, timing_data.time[locptr].id, timing_data.time[locptr].seconds);

  //check if we've found a beginning of the paragraph
  // - if so, don't need to snap
  if (time === timing_data.time[locptr].seconds) {
    showNscroll(locptr);
    seeking = false;
  }
  else {
    //snap play to start time of paragraph
    console.log("snapping from requested %s to %s",
                time, timing_data.time[locptr].seconds);
    seekSnap = true;
    player.setCurrentTime(timing_data.time[locptr].seconds);
  }
}

function processSeekSnap(time) {

  console.log("snap complete: snap time: %s, ptime: %s", time, timing_data.time[locptr].seconds);
  showNscroll(locptr);

  console.log("-------------------------");

  seekSnap = false;
  seeking = false;
}

function showNscroll(idx) {
  var tinfo = timing_data.time[idx];

  if (prevptr > -1) {
    $("#" + timing_data.time[prevptr].id).removeClass(hilightClass);
  }

  $("#" + tinfo.id).addClass(hilightClass);
  prevptr = idx;

  //scroll into view
  scroll(document.getElementById(tinfo.id));
}

function getTime(idx) {
  if (idx < 0 || idx >= timing_data.time.length ) {
    return 60 * 60 *24; //return a big number
  }

  return timing_data.time[idx].seconds;
}

function getTimeInfo(idx) {
  if (idx < 0 || idx >= timing_data.time.length ) {
    return {id: "xx", seconds: 0}
  }

  return timing_data.time[idx];
}

//audio is playing: play time at arg: current
function processCurrentTime(current) {
  if (locptr == -1 || current > getTime(locptr + 1)) {
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

  //highlight supported when timing data available
  initialize: function(css_class) {
    var rc = {};
    var diff;

    if (typeof window.cmi_audio_timing_data !== "undefined") {
      console.log("timing data available");

      timing_data = cmi_audio_timing_data;

      //adjust start time if necessary
      // - this is needed because the start time at capture
      //   differs from the start time during non capture playback.
      // sheesh!
      if (timing_data.adjustedStartTime) {
        diff = timing_data.adjustedStartTime - timing_data.time[0].seconds;
        //console.log("adjusting start time by %s seconds", diff);
        timing_data.time = _.map(cmi_audio_timing_data.time, function(o) {
          var recordedTime = o.seconds;

          o.seconds += this.timeDiff;
          //console.log("%s adjusted to %s", recordedTime, o.seconds);
          return o;
        }, {timeDiff: diff});
      }

      rc.startTime = timing_data.time[0].seconds;

      //indicate timing data available
      enabled = true;

      //define id's for each paragraph in the narrative div
      // - these id's are referenced by the timing data
      $('.narrative p').each(function(idx) {
        $(this).attr('id', 'p' + idx);
      });
    }

    if (typeof css_class !== "undefined") {
      hilightClass = css_class;
    }

    rc.enabled = enabled;
    return rc;
  },

  setAudioPlayer: function(p) {
    //we need this to adjust seeking
    player = p;
  },

  //enable hilight for test data collected by the user
  // - called by module capture.js
  capture_test: {
    begin: function(test_data) {
      enabled = true;
      timing_data = test_data;
    },
    end: function() {
      enabled = false;
    }
  },
  //don't process time event when seeking
  update_time: function(time) {
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

    //reset pointers
    locptr = -1;
    prevptr = -1;
  }

};


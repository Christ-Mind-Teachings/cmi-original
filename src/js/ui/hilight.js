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
var enabled = false;

//real or test data
var timing_data;

//paragraph timing pointers
var locptr = -1;
var prevptr = -1;

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

//audio is playing: play time at arg: current
function processCurrentTime(current) {
  if (locptr == -1 || current > getTime(locptr + 1)) {
    console.log("hilight event at: %s", current);
    locptr++;
    showNscroll(locptr);
  }
}

module.exports = {

  //highlight supported when timing data available
  initialize: function(css_class) {
    var rc = {};

    if (typeof window.cmi_audio_timing_data !== "undefined") {
      console.log("timing data available");

      //do this so we can assign test data when
      //cmi_audio_timing_data is not present
      timing_data = cmi_audio_timing_data;
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
  update_time: function(time) {
    if (!enabled) {
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
  seeked: function(time) {
    console.log("seeked event at %s", time);

    if (!enabled) {
      return;
    }

    //we don't know if seeked time is earlier or later than
    //the current time so we look through the timing array
    locptr = _.findIndex(timing_data.time, function(t) {
      return time > t.seconds;
    });

    if (locptr != -1) {
      console.log("locptr now at time %s", timing_data.time[locptr].seconds);
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


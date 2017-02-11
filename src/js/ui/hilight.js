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

//paragraph timing pointers
var locptr = -1;
var prevptr = -1;

function showNscroll(idx) {
  var tinfo = cmi_audio_timing_data.time[idx];

  if (prevptr > -1) {
    $("#" + cmi_audio_timing_data.time[prevptr].id).removeClass(hilightClass);
  }

  $("#" + tinfo.id).addClass(hilightClass);
  prevptr = idx;

  //scroll into view
  scroll(document.getElementById(tinfo.id));
}

function getTime(idx) {
  if (idx < 0 || idx >= cmi_audio_timing_data.time.length ) {
    return 60 * 60 *24; //return a big number
  }

  return cmi_audio_timing_data.time[idx].seconds;
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
  enabled: false,

  //highlight supported when timing data available
  initialize: function(css_class) {

    if (typeof window.cmi_audio_timing_data !== "undefined") {
      console.log("timing data available");

      //indicate timing data available
      this.enabled = true;

      //define id's for each paragraph in the narrative div
      // - these id's are referenced by the timing data
      $('.narrative p').each(function(idx) {
        $(this).attr('id', 'p' + idx);
      });
    }

    if (typeof css_class !== "undefined") {
      hilightClass = css_class;
    }

    return this.enabled;
  },

  update_time: function(time) {
    if (!this.enabled) {
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

    if (!this.enabled) {
      return;
    }

    //we don't know if seeked time is earlier or later than
    //the current time so we look through the timing array
    locptr = _.findIndex(cmi_audio_timing_data.time, function(t) {
      return time > t.seconds;
    });

    if (locptr != -1) {
      console.log("locptr now at time %s", cmi_audio_timing_data.time[locptr].seconds);
    }
  },
  ended: function(time) {
    console.log("play ended at: %s", time);

    if (!this.enabled) {
      return;
    }

    //reset pointers
    locptr = -1;
    prevptr = -1;
  }

};


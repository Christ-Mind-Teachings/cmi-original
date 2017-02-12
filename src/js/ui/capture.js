
"use strict";

var kb = require("keyboardjs");
var _ = require("underscore");
var modal = require("./modal");
//var Clipboard = require("clipboard");

var jPlayer;
var clipboard;
var capture = [0];

var audio_playing = false;
var recordRequested = false;
var captureRequested = false;
var captureId = "";

function markAsCaptured(id) {
  $('#' + id).children('i').removeClass("fa-bullseye").addClass("fa-check");
}

//add option to sidebar to capture audio play time
function enableSidebarTimeCapture() {

  //show sidebar menu option
  $('.pmarker-wrapper').css("display", "block");

  //toggle display of paragraph markers used
  //to record audio playback time
  console.log('setting up .pmarker-toggle listener');
  $('.pmarker-toggle').on('click', function(e) {
    e.preventDefault();
    toggleMarkers();
  });

  $('.time-lister').on('click', function(e) {
    var data;
    e.preventDefault();

    if (capture.length < 2) {
      data = "No data captured yet.";
    }
    else {
      data = JSON.stringify(capture);
    }

    $('#captured-audio-data').html(data);
    $('#modal-1').trigger('click');
  });

  //initialize modal window
  modal.initialize("#modal-1");

  console.log("clipboard support");
  console.log("clipboard isSupported: %s", Clipboard.isSupported());
  clipboard = new Clipboard(".clipboard-btn");

  clipboard.on('error', function(e) {
    console.error('Action:', e.action);
    console.error('Trigger:', e.trigger);
    alert("Error copying to clipboard - sorry");
  });

  clipboard.on('success', function(e) {
    console.info('Action:', e.action);
    console.info('Text:', e.text);
    console.info('Trigger:', e.trigger);

    e.clearSelection();
  });

}

//create listeners for each paragraph
function createListener() {
  $('.narrative p i.fa').each(function(idx) {
    $(this).on('click', function(e) {
      e.preventDefault();
      if (audio_playing) {
        console.log("captureRequested %s", e.target.parentElement.id);
        captureRequested = true;
        captureId = e.target.parentElement.id;
      }
      else {
        console.log("capture enabled when audio is playing");
        alert("capture enabled when audio is playing");
      }
    });
  })
}

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

function toggleMarkers() {
  var ids = $('.narrative p').attr('id');
  var fa = $('.narrative p i.fa');

  //create markers is not on page
  //- do markers exist?
  if (fa.length != 0) {
    //yes - toggle display
    $('.narrative p i.fa').toggle();
  }
  else if (typeof ids !== "undefined") {
    //console.log("paragraph id's already defined, adding marker");
    $('.narrative p').each(function(idx) {
      if (idx > 0) {
        $(this).prepend('<i class="fa fa-2x fa-border fa-pull-left fa-bullseye"></i>');
      }
    });

    createListener();
  }
  else {
    //define id's for each paragraph in the narrative div
    // - these id's are referenced by the timing data
    $('.narrative p').each(function(idx) {
      $(this).attr('id', 'p' + idx);

      if (idx > 0) {
        $(this).prepend('<i class="fa fa-2x fa-border fa-pull-left fa-bullseye"></i>');
      }
    });

    createListener();
  }
}

function listShortCuts() {
  console.log('m: record current audio playback time');
  console.log('d: delete last recorded playback time');
  console.log('l: list recorded playback times');
  console.log('cl: clear recorded playback times');
  console.log('s: seek audio playback to given time (mm:ss.sss)');
  console.log('x: show/hide paragraph markers');
  console.log('?: show this list');
}

module.exports = {

  initialize: function(player) {

    jPlayer = player;

    //?: list keyboard shortcuts
    kb.bind('?', function(e) {
      listShortCuts();
    });

    //x: add markers
    kb.bind('x', function(e) {
      toggleMarkers();
    });

    //m: indicates to store current audio play time
    kb.bind('m', function(e) {
      if (audio_playing) {
        recordRequested = true;
      }
      else {
        console.log("capture enabled when audio is playing");
      }
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
      var time;
      if (capture.length > 1) {
        time = JSON.stringify(capture);
        console.log(time);
        alert(time);
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
    kb.bind('c + l', function(e) {
      capture = [0];
      console.log("cleared");
    });
  },

  play: function(t) {
    audio_playing = true;
  },

  pause: function(t) {
    audio_playing = false;
  },

  ended: function(t) {
    audio_playing = false;
  },

  //the audio player calls this every 250ms with the
  //current play time
  currentTime: function(t) {

    //recordRequested comes from the keyboard
    // ** doesn't make sense to record time from both click
    //    and keyboard
    if (recordRequested) {
      capture.push(t);
      console.log('captured: %s', t);
      recordRequested = false;
    }

    //captureRequested comes from a paragraph click
    // ** doesn't make sense to record time from both click
    //    and keyboard
    if (captureRequested) {
      capture.push({
        id: captureId,
        seconds: t
      });
      markAsCaptured(captureId);
      console.log('captured: %s', t);
      captureRequested = false;
    }
  },

  //show sidebar menu option to enable time capture
  enableSidebarTimeCapture: enableSidebarTimeCapture

};

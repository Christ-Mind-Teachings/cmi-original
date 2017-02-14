
"use strict";

//var kb = require("keyboardjs");
var _ = require("underscore");
var modal = require("./modal");

var jPlayer;
var currentPlayTime = 0;
var capture;

var audio_playing = false;
var captureRequested = false;
var captureId = "";

var increaseSpeed = true;

//initialize capture object
function initCaptureArray() {
  capture = {
    base: window.location.pathname,
    title: $('.post-title').text(),
    time: [{id: "p0", seconds: 0}]
  };
}

function deleteException(message) {
  this.message = message;
  this.name = "deleteException";
}

function stateException(message) {
  this.message = message;
  this.name = "stateException";
}

//called only when captureRequested == true
function markParagraph(o) {
  var pi = $('#' + o.id).children('i');
  var pos;

  //mark as captured
  if (pi.hasClass("fa-bullseye")) {
    pi.removeClass("fa-bullseye").addClass("fa-check");
    capture.time.push(o);
    console.log("%s captured at %s", o.id, o.seconds);
  }
  //user clicked a captured paragraph, mark for delete
  else if (pi.hasClass("fa-check")) {
    pi.removeClass("fa-check").addClass("fa-bullseye");
    pos = _.findLastIndex(capture.time, {id: o.id});
    if (pos == -1) {
      throw new deleteException("can't find id to delete in capture array");
    }
    else {
      capture.time.splice(pos, 1);
      console.log("%s deleted at %s", o.id, o.seconds);
    }
  }
  else {
    throw new stateException("unknown paragraph state for: %s", o.id);
  }

  captureRequested = false;
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

    if (capture.time.length < 2) {
      data = "No data captured yet.";
    }
    else {
      data = JSON.stringify(capture);
    }

    $('#audio-data-form').attr('action', capture.base);
    $('#captured-audio-data').html(data);
    $('.submit-message').html("");
    $('#modal-1').trigger('click');
  });

  //initialize modal window
  modal.initialize("#modal-1");

  //submit time submit form in modal window
  $("#audio-data-form").submit(function(e) {
    e.preventDefault();

    //if no data yet captured, cancel submit
    if (capture.time.length < 2) {
      $('.submit-message').html("No data captured yet!");
      return;
    }

    var $form = $(this);
    $.post($form.attr("action"), $form.serialize())
      //.then(function() {
      .done(function() {
        alert("Thank you!");
        $(".modal-close").trigger("click");
      })
      .fail(function(e) {
        $('.submit-message').html("Drat! Your submit failed.");
      });
  });
}

//create listeners for each paragraph and
//show rewind and speed player controls
function createListener() {
  $('.narrative p i.fa').each(function(idx) {
    $(this).on('click', function(e) {
      e.preventDefault();
      captureRequested = true;
      captureId = e.target.parentElement.id;

      if (!audio_playing) {
        //notify user action won't happen until audio plays
        //and only the last action is honored
      }
    });
  });

  //enable rewind and faster buttons on audio player
  //console.log("showing cmi audio controls");
  $('.cmi-audio-controls').removeClass('hide-cmi-controls');

  //set rewind control
  $('.audio-rewind').on('click', function(e) {
    e.preventDefault();
    var skipAmt = 8;
    var newTime = currentPlayTime - skipAmt;
    if (newTime <= 0) {
      newTime = 0;
    }
    console.log('rewinding playback to %s from %s', newTime, currentPlayTime);
    jPlayer.jPlayer("play", newTime);

  });

  //set playbackRate control
  $('.audio-faster').on('click', function(e) {
    var currentRate = jPlayer.jPlayer("option", "playbackRate");
    var newRate, displayRate;
    e.preventDefault();

    //normal = 0, slow = -1 and -2, fast = +1 and +2
    switch (currentRate) {
      case 0.8:
        increaseSpeed = true;
        newRate = 0.9;
        displayRate = "-1";
        break;
      case 0.9:
        newRate = increaseSpeed? 1: 0.8;
        displayRate = increaseSpeed? " 0": "-2";
        break;
      case 1:
        newRate = increaseSpeed? 2: 0.9;
        displayRate = increaseSpeed? "+1": "-1";
        break;
      case 2:
        newRate = increaseSpeed? 3: 1;
        displayRate = increaseSpeed? "+2": " 0";
        break;
      case 3:
        increaseSpeed = false;
        newRate = 2;
        displayRate = "+1";
        break;
    }

    jPlayer.jPlayer("option", "playbackRate", newRate);
    $(this).html(displayRate);
  });
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

module.exports = {

  initialize: function(player) {
    jPlayer = player;
    initCaptureArray();
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
    //store current time
    currentPlayTime = t;

    if (captureRequested) {
      markParagraph({
        id: captureId,
        seconds: t
      });
    }
  },

  //show sidebar menu option to enable time capture
  enableSidebarTimeCapture: enableSidebarTimeCapture

};

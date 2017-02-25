
"use strict";

//var kb = require("keyboardjs");
var _ = require("underscore");
var modal = require("./modal");
var hilight = require("./hilight");
var capture = require("../ds/capture");
var ays = require("../util/are-you-sure");

var jPlayer;
var currentPlayTime = 0;

var audio_playing = false;
var captureRequested = false;
var captureId = "";

var increaseSpeed = true;

var timeTest = (function() {
  var enabled = false;

  return {
    enable: function() {
      if (enabled) {
        return;
      }
      //show time test menu option
      console.log("state enabled");
      $(".time-tester-wrapper").css("display", "block");
      enabled = true;
    },
    disable: function() {
      if (!enabled) {
        return;
      }
      //hide time test menu option
      console.log("state disabled");
      $(".time-tester-wrapper").css("display", "none");
      enabled = false;
    }
  };
})();

function deleteException(message) {
  this.message = message;
  this.name = "deleteException";
}

function stateException(message) {
  this.message = message;
  this.name = "stateException";
}

//when we know audio times, they can be automatically
//captured calling autoCapture()
//- this is true for p0 which we default to time: 0 but it
//  may actually start later in the recording. We can use this
//  info to jump to the p0 time so user doesn't have to listen
//  to dead space
function autoCapture(o) {
  captureRequested = true;
  markParagraph(o);
}

//called only when captureRequested == true
function markParagraph(o) {
  var pi = $('#' + o.id).children('i');
  var captureLength;

  if (!captureRequested) {
    return;
  }

  //mark as captured
  if (pi.hasClass("fa-bullseye")) {
    pi.removeClass("fa-bullseye").addClass("fa-check");
    capture.add(o);
    timeTest.enable();
    console.log("%s captured at %s", o.id, o.seconds);
  }
  //user clicked a captured paragraph, mark for delete
  else if (pi.hasClass("fa-check")) {
    pi.removeClass("fa-check").addClass("fa-bullseye");

    captureLength = capture.remove(o);
    if (captureLength == -1) {
      throw new deleteException("can't find id to delete in capture array");
    }
    else {
      console.log("%s deleted at %s", o.id, o.seconds);
      if (captureLength < 2) {
        timeTest.disable();
      }
    }
  }
  else {
    throw new stateException("unknown paragraph state for: %s", o.id);
  }

  captureRequested = false;

  //keep track if captured timing data needs to be submitted and 
  //warn user if they attempt to leave the page without having 
  //submitted the data
  ays.dataEvent(capture.length() - 1);
}

//add option to sidebar to capture audio play time
function enableSidebarTimeCapture() {

  if (!transcript_format_complete) {
    console.log("Formatting for this transcript is incomplete, capture disabled");
    return;
  }

  //show sidebar menu option
  $('.pmarker-wrapper').css("display", "block");

  //toggle display of paragraph markers used
  //to record audio playback time
  console.log('setting up .pmarker-toggle listener');
  $('.pmarker-toggle').on('click', function(e) {
    e.preventDefault();
    toggleMarkers();
  });

  //init unsubmitted data warning
  ays.init();

  $('.time-lister').on('click', function(e) {
    var data;
    e.preventDefault();

    if (capture.length() < 2) {
      data = "No data captured yet.";
    }
    else {
      data = JSON.stringify(capture.getData());
      data = "var cmi_audio_timing_data = " + data + ";";
    }

    $('#audio-data-form').attr('action', capture.getBase());
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
    if (capture.length() < 2) {
      $('.submit-message').html("No data captured yet!");
      return;
    }

    var $form = $(this);
    $.post($form.attr("action"), $form.serialize())
      //.then(function() {
      .done(function() {
        alert("Thank you!");
        $(".modal-close").trigger("click");

        //signal data submitted
        ays.dataEvent(0);
      })
      .fail(function(e) {
        $('.submit-message').html("Drat! Your submit failed.");
      });
  });

  //time-tester menu option listener
  $('.time-tester').on('click', function(e) {
    e.preventDefault();

    if ($(this).children('i').hasClass('fa-play')) {
      //run the tester
      $(this).children('i').removeClass('fa-play').addClass('fa-stop');

      //if capture on turn it off
      var style = $('#p2 > i').attr('style');
      if (typeof style == "undefined" || style.length == 0) {
        toggleMarkers();
      }

      //setup test
      console.log("capture test starting");
      hilight.capture_test.begin(capture.getData());

      //stop the player
      jPlayer.jPlayer("stop");

      //set playback rate to 1
      jPlayer.jPlayer("option", "playbackRate", 1);
      $('.audio-faster').html(" 0");
      increaseSpeed = true; //reset speed direction

      //scroll to top of page
      $('html, body').animate({ scrollTop: 0 }, 'fast');

      //start player
      jPlayer.jPlayer("play", capture.getData().time[0].seconds);
    }
    else {
      //stop the tester
      $(this).children('i').removeClass('fa-stop').addClass('fa-play');
      console.log("capture test ending");
      hilight.capture_test.end();

      //stop the player
      jPlayer.jPlayer("stop");

      //scroll to top of page
      $('html, body').animate({ scrollTop: 0 }, 'fast');
    }
  });

}

//create listeners for each paragraph and
//show rewind and speed player controls
function createListener() {
  $('.transcript p i.fa').each(function(idx) {
    $(this).on('click', function(e) {
      e.preventDefault();
      captureRequested = true;
      captureId = e.target.parentElement.id;

      if (!audio_playing) {
        //notify user action won't happen until audio plays
        //and only the last action is honored
        alert("action pending until audio playback begins");
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
  var ids = $('.transcript p').attr('id');
  var fa = $('.transcript p i.fa');

  //create markers is not on page
  //- do markers exist?
  if (fa.length != 0) {
    //yes - toggle display
    $('.transcript p i.fa').toggle();
    if ($(".transcript").hasClass("capture")) {
      $(".transcript").removeClass("capture");
    }
    else {
      $(".transcript").addClass("capture");
    }
  }
  else if (typeof ids !== "undefined") {
    console.log("paragraph id's already defined, adding marker");
    $('.transcript p').each(function(idx) {
      $(this).prepend("<i class='fa fa-2x fa-border fa-pull-left fa-bullseye'></i>");
    });

    //automatically record a time of 0 for paragraph 0. This allows user to change
    //the p0 time when it doesn't start at 0.
    autoCapture({id: "p0", seconds: 0});

    $(".transcript").addClass("capture");
    createListener();
  }
  else {
    //define id's for each paragraph in the narrative div
    // - these id's are referenced by the timing data
    console.log("adding marker to .transcript p");
    $('.transcript p').each(function(idx) {
      $(this).attr('id', 'p' + idx);
      $(this).prepend("<i class='fa fa-2x fa-border fa-pull-left fa-bullseye'></i>");
    });

    //automatically record a time of 0 for paragraph 0. This allows user to change
    //the p0 time when it doesn't start at 0.
    autoCapture({id: "p0", seconds: 0});
    $(".transcript").addClass("capture");
    createListener();
  }
}

module.exports = {

  initialize: function(player) {
    var captureOptions = {
      base: window.location.pathname,
      title: $('.post-title').text()
    };

    jPlayer = player;
    capture.init(captureOptions);
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

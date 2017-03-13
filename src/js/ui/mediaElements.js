"use strict";

var hilight = require("./hilight");
var capture = require("./capture");

var player;
var playing = false;
var audioStartTime = 0;

function createPlayerDisplayToggle(config) {
  // setup "display player" toggle
  $(config.audioToggle).on("click", function(e) {
    e.preventDefault();
    //$(config.hidePlayer).toggle();
    if ($(".audio-player-wrapper").hasClass("hide-player")) {
      $(".audio-player-wrapper").removeClass("hide-player");
    }
    else {
      $(".audio-player-wrapper").addClass("hide-player");
    }
  });
}

function initPlayer(config) {
  var initialized = false;
  var audioUrl;
  var audioElement = $("audio.mejs-player");
  var features;

  if (audioElement.length !== 0) {
    //setup toggle for player display
    createPlayerDisplayToggle(config);

    //configure player
    audioUrl = $(config.audioToggle).attr("href");
    audioElement.attr("src", audioUrl);

    //player controls when we have timing data
    if (typeof window.cmi_audio_timing_data !== "undefined") {
      features = ["playpause", "stop", "progress", "current"];
    }
    //if we don"t allow time capture
    else if (!transcriptFormatComplete) {
      features = ["playpause", "stop", "progress", "current"];
    }
    //when user may capture time
    else {
      features = ["playpause", "stop", "current", "skipback", "jumpforward", "speed"];
    }

    $("#cmi-audio-player").mediaelementplayer({
      pluginPath: "/public/js/lib/mediaelement/build/",
      skipBackInterval: 15,
      jumpForwardInterval: 15,
      features: features,
      success: function(mediaElement, originalNode) {

        //hilight supported when paragraph timing data is loaded
        // - returns object indicating whether enabled and audio start time
        var hinfo = hilight.initialize(config.hilightClass);

        //if we don"t have timing data enable support to get it
        if (!hinfo.enabled) {
          capture.enableSidebarTimeCapture();
        }
        else {
          audioStartTime = hinfo.startTime;
        }
      }
    });

    var playerId = $("#cmi-audio-player").closest(".mejs__container").attr("id");
    player = mejs.players[playerId];
    hilight.setAudioPlayer(player);

    //get play time updates from player
    player.media.addEventListener("timeupdate", function(e) {
      var time = this.getCurrentTime();
      if (!playing) {
        return;
      }

      if (time < audioStartTime) {
        console.log("adjusting play time: ct: %s/%s", time, audioStartTime);
        this.setCurrentTime(audioStartTime);
      }
      else {
        //console.log("playing: %s, current time %s", playing, time);
        hilight.updateTime(time);
        capture.currentTime(time);
      }
    });

    //get notified when player is playing
    player.media.addEventListener("playing", function(e) {
      playing = true;
      $(".audio-player-wrapper").addClass("player-fixed");
      capture.play(this.getCurrentTime);
    });

    //get notified when player is paused
    player.media.addEventListener("paused", function(e) {
      //this doesn"t get called
      console.log("type: %s, player paused", e.type);
    });

    //get notified when media play has ended
    player.media.addEventListener("ended", function(e) {
      playing = false;
      $(".audio-player-wrapper").removeClass("player-fixed");
      capture.ended(this.getCurrentTime);
    });

    //get notified when seek start
    player.media.addEventListener("seeking", function(e) {
      var time = this.getCurrentTime();
      hilight.seeking(time);
    });

    //get notified when seek ended
    player.media.addEventListener("seeked", function(e) {
      var time = this.getCurrentTime();
      hilight.seeked(time);
    });

    //set event listener for click on player stop button
    $(".mejs__stop-button").on("click", function(e) {
      $(".audio-player-wrapper").removeClass("player-fixed");
    });

    capture.initialize(player);
    initialized = true;
  }

  return initialized;
}

function init(config) {
  if (typeof jQuery === "undefined") {
    console.log("jQuery not installed");
    return false;
  }

  return initPlayer(config);
}

module.exports = {
  initialize: function(config) {
    return init(config);
  }

};

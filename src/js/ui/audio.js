var hilight = require("./hilight");
var capture = require("./capture");

var jPlayer;

//start time for audio playback, can be modified by
//time[0] of timing data - returned from hilite.init()
var audioStartTime = 0;

//initialize jQuery plugin "jPlayer"
function initialize(config) {
  var url, type, media, options;

  //check if jQuery installed - if not the audio player (jPlayer) should
  //not be on the page.
  if (typeof jQuery === "undefined") {
    return "jQuery not installed";
  }

  //get the jPlayer node
  jPlayer = $(config.playerId);

  //exit if no jPlayer HTML is on the page
  if (jPlayer.length === 0) {
    return "no jPlayer HTML on page";
  }

  // setup "display player" toggle
  $(config.audioToggle).on("click", function(e) {
    e.preventDefault();
    $(config.hidePlayer).toggle();
  });

  //player config options
  options = {
    ready: function() {
      var hinfo;
      $(this).jPlayer("setMedia", media);

      //hilight supported when paragraph timing data is loaded
      // - returns object indicating whether enabled and audio start time
      hinfo = hilight.initialize(config.hilightClass);

      //if we don"t have timing data enable support to get it
      if (!hinfo.enabled) {
        capture.enableSidebarTimeCapture();
      }
      else {
        audioStartTime = hinfo.startTime;
      }
    },
    timeupdate: function(e) {
      var status = e.jPlayer.status;
      console.log("rs:%s, wfl:%s, wfp:%s, paused:%s, ct:%s, rem:%s, dur:%s", 
                  status.readyState,
                  status.waitForLoad,
                  status.waitForPlay,
                  status.paused,
                  status.currentTime,
                  status.remaining,
                  status.duration
                 );
      if (status.readyState !== 4) {
        return;
      }
      //console.log("jPlayer event obj: ", e.jPlayer);
      if (status.currentTime < audioStartTime) {
        console.log("adjust play time from %s to %s", status.currentTime, audioStartTime);
        jPlayer.jPlayer("pause", audioStartTime);
      }
      else {
        hilight.update_time(status.currentTime);
        capture.currentTime(status.currentTime);
      }
    },
    play: function(e) {
      console.log("setting player-fixed");
      $("#jp_container_audio_1").addClass("player-fixed");
      hilight.play(e.jPlayer.status.currentTime);
      capture.play(e.jPlayer.status.currentTime);
    },
    pause: function(e) {
      hilight.pause(e.jPlayer.status.currentTime);
      capture.pause(e.jPlayer.status.currentTime);
    },
    seeked: function(e) {
      hilight.seeked(e.jPlayer.status.currentTime);
      if (e.jPlayer.status.currentTime === 0.0) {
        console.log("removing player-fixed");
        $("#jp_container_audio_1").removeClass("player-fixed");
      }
    },
    ended: function(e) {
      console.log("removing player-fixed");
      $("#jp_container_audio_1").removeClass("player-fixed");
      hilight.ended(e.jPlayer.status.currentTime);
      capture.ended(e.jPlayer.status.currentTime);
    },
    cssSelectorAncestor: config.skinWrapper,
    swfPath: "/public/js/lib/jPlayer",
    solution: "html,flash",
    useStateClassSkin: true,
    autoBlur: false,
    smoothPlayBar: true,
    keyEnabled: false,
    remainingDuration: true,
    toggleDuration: true
  };

  media = {title: $(config.audioToggle).attr("data-audio-title")};
  url = $(config.audioToggle).attr("href");
  type = url.substr(-3);

  switch(type) {
    case "mp3":
      media.mp3 = url;
      options.supplied = "mp3";
      break;
    default:
      return "unknown audio type";
  }

  //init player
  jPlayer.jPlayer(options);
  capture.initialize(jPlayer);

  return "player initialized";
}

module.exports = {

  initialize: function(config) {
    return initialize(config);
  }

};


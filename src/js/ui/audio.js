var hilight = require("./hilight");
var capture = require("./capture");

var jPlayer;

//initialize jQuery plugin 'jPlayer'
function initialize(config) {
  var url, type, media, options;
  var hilight_supported = false;

  //check if jQuery installed - if not the audio player (jPlayer) should
  //not be on the page.
  if (typeof jQuery == "undefined") {
    return "jQuery not installed";
  }

  //get the jPlayer node
  jPlayer = $(config.playerId);

  //exit if no jPlayer HTML is on the page
  if (jPlayer.length == 0) {
    return "no jPlayer HTML on page";
  }

  // setup 'display player' toggle
  $(config.audioToggle).on('click', function(e) {
    e.preventDefault();
    $(config.hidePlayer).toggle();
  });

  //player config options
  options = {
    ready: function() {
      $(this).jPlayer("setMedia", media);

      hilight_supported = hilight.initialize(config.hilightClass);
    },
    timeupdate: function(e) {
      hilight.update_time(e.jPlayer.status.currentTime);
      capture.currentTime(e.jPlayer.status.currentTime);
    },
    play: function(e) {
      hilight.play(e.jPlayer.status.currentTime);
    },
    pause: function(e) {
      hilight.pause(e.jPlayer.status.currentTime);
    },
    seeked: function(e) {
      hilight.seeked(e.jPlayer.status.currentTime);
    },
    ended: function(e) {
      hilight.ended(e.jPlayer.status.currentTime);
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
      media["mp3"] = url;
      options.supplied = "mp3";
      break;
    default:
      return "unknown audio type";
      break;
  }

  //init player
  jPlayer.jPlayer(options);

  //keyboard bindings to capture audio paragraph timings
  capture.initialize(jPlayer);

  return "player initialized";
}

module.exports = {

  initialize: function(config) {
    return initialize(config);
  }

};


/*
  Groups: test=3Pj4aGiy
*/

"use strict";

var url = require("./util/url");
var wrap = require("./h/wrap");
var scroll = require("scroll-into-view");
var audio = require("./ui/mediaElements");
//var audio = require("./ui/audio");

var unwrap;

function removeHighlight() {
  unwrap.unwrap();
}

/*
 * check if url parm 'id' is present and attempt to highlight the
 * annotation with that id on the page.
 */
function showRequestedAnnotation() {
  var auth = "6879-22a8900b365e8885a6e44d9d711839fb";
  var id = url.getQueryString("id");

  if (id) {
    wrap.showOne(id, auth, function(error, hl) {
      if (error) {
        console.log("error: %s", error);
      }
      else {
        unwrap = hl;
        // console.log("unwrap: ", unwrap);
        scroll(unwrap.nodes[0]);

        setTimeout(removeHighlight, 3000);
      }
    });
  }
}

//initialize javascript on page when loaded
document.addEventListener("DOMContentLoaded", function() {
  var audio_message;

  //display hypothes.is annotation if url contains: id=<annotation id>
  showRequestedAnnotation();

  //init the audio player
  audio.initialize({
    playerId: "#jquery_jplayer_audio_1",
    skinWrapper: "#jp_container_audio_1",
    audioToggle: ".audio-toggle",
    hidePlayer: ".hide-player",
    hilightClass: "hilite"
  });

});


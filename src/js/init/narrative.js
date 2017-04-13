"use strict";

var audio = require("../ui/mediaElements");
var bookmark = require("../ui/bookmark");
var search = require("../search/search");
var url = require("../util/url");
var wrap = require("../h/wrap");
var share = require("../ui/share");
var scroll = require("scroll-into-view");

var unwrap;

function removeHighlight() {
  unwrap.unwrap();
}

/*
 * check if url parm "id" is present and attempt to highlight the
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

module.exports = {
  initialize: function() {
    var transcriptParagraphs;

    //assign id's to all paragraphs in div.transcript
    transcriptParagraphs = $(".transcript p");
    transcriptParagraphs.each(function(idx) {
      if (!$(this).hasClass("omit")) {
        $(this).attr("id", "p" + idx);
      }
    });

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

    search.initialize(audio.setStartTime);

    //init bookmarks feature
    bookmark.initialize(audio.setStartTime);

    //init share feature
    share.initialize();

    //not sure why I have to do this, previously the page would scroll
    //to the hash id when loaded but it doesn't do that anymore. Could be
    //because the hash id is created after the page is loaded.
    if (location.hash) {
      location.href = location.hash;
    }
  }
};

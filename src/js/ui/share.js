"use strict";

//Not working with require but it is by loading the js by <script>
//var WebClip = require("webclip");

var notify = require("toastr");
var Clipboard = require("clipboard");
var annotation = require("./annotation");
var indexApi = require("../api/cmiapi");

var clipboard;
var clipText = "not initialized";

function initClipboard() {
  clipboard = new Clipboard(".clipboard-copy", {
    text: function(trigger) {
      return clipText;
    }
  });
  clipboard.on("success", function(e) {
    notify.info("Selection copied to clipboard.");
  });
  clipboard.on('error', function(e) {
    console.error("clipboard error: ", e);
  });
}

function copyToClipboard(text) {
  clipText = text;
  $(".clipboard-copy").trigger("click");
}

module.exports = {
  //ui/share.js

  initialize: function() {
    var clip;
    var parts = location.pathname.split("/");
    var transcript = document.querySelector(".transcript");

    //setup sharing feature
    if (transcript) {
      console.log("share init");
      clip = new WebClip(transcript);
      initClipboard();

      var search = {
        name: "Search",
        description: "Search this site",
        icon: "search",
        action: function(value) {
          location.href = "/search/?q=" + value + "&s=" + parts[1];
        }
      };

      var clipboard = {
        name: "Clipboard",
        description: "Copy to Clipboard",
        icon: "clipboard",
        action: function(value, range) {
          var ann;
          var link;

          ann = annotation.getAnnotation(range);
          indexApi.storeAnnotation(ann).then(function(response) {
            console.log("indexApi.storeAnnotation(%s): ", response.data.id);
          });
          link = location.origin + location.pathname + "?idx=" +  ann.id;
          copyToClipboard(value + "\n" + link);
        }
      };

      clip.use([search, clipboard]);
    }
  }
};


"use strict";

var notify = require("toastr");

//Not working with require but it is by loading the js by <script>
//var WebClip = require("webclip");

module.exports = {
  //ui/share.js

  initialize: function() {
    var clip;
    var transcript = document.querySelector(".transcript");

    //setup sharing feature
    if (transcript) {
      console.log("share init");
      clip = new WebClip(transcript);

      var search = {
        name: "Search",
        description: "Search this site",
        icon: "search",
        action: function(value) {
          location.href = "/search/?q=" + value;
        }
      };

      var mail = {
        name: "Mail",
        description: "Email a friend",
        icon: "share",
        action: function(value, range) {
          var link;
          if (range.startContainer.parentNode !== range.endContainer.parentNode) {
            notify.error("Please restrict selection to one paragraph.");
          }
          else {
            link = location.href + "?q=" + range.startContainer.parentNode.id + ":" +
              range.startOffset + ":" + range.endOffset;

            console.log("text: %s", value);
            console.log("url: %s", link);
          }
        }
      };

      clip.use([search, mail]);
    }
  }
};


"use strict";

var isDirty = false;
var message = "Please submit your timing data before leaving the page! To do so, " +
  "open the side bar menu and click on the 'send icon' next to the 'capture' option.";

module.exports = {
  //utilare-you-sure.js

  init: function() {
    window.onload = function() {
      window.addEventListener("beforeunload", function (e) {
        if (!isDirty) {
          return undefined;
        }

        (e || window.event).returnValue = message; //Gecko + IE
        return message; //Gecko + Webkit, Safari, Chrome etc.
      });
    };
  },

  //we alert the user only if data has been collected and not submitted
  dataEvent: function(size) {
    isDirty = false;
    if (size > 0) {
      isDirty = true;
    }
  }
};

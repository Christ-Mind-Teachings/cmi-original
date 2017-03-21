"use strict";

var bookmark = require("../ui/bookmark");

function initPage() {
  switch(location.pathname) {
    case "/wom/intro/questions/":
      console.log("init: /wom/intro/questions/");
      require("../refills/accordion_tabs")();
      break;
  }
}

module.exports = {
  initialize: function() {
    bookmark.initialize();
    initPage();
  }
};



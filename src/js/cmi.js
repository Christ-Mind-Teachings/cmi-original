"use strict";

var config = require("./config/config");

//initialize javascript on page when loaded
document.addEventListener("DOMContentLoaded", function() {

  //initialize application configuration
  config.initialize(function(err, message) {
    if (err) {
      console.log("error in config.initialize: ", err);
      return;
    }
    console.log("config from %s", message);

    if ($(".transcript").length) {
      require("./init/narrative").initialize();
    }
    else if ($("#main > .cmi-search").length) {
      require("./init/search").initialize();
    }
    else if (location.pathname === "/about/") {
      require("./init/about").initialize();
    }
    else if (location.pathname.startsWith("/profile/")) {
      require("./init/profile").initialize();
    }
    else {
      require("./init/common").initialize();
    }
  });
});


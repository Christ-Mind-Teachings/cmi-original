"use strict";

var config = require("./config/config");
var store = require("store");
var bookmark = require("./ui/bookmark");

document.addEventListener("DOMContentLoaded", function() {
  var data = store.get("search");

  //initialize application configuration
  config.initialize(function(err, message) {
    if (err) {
      console.log("error in config.initialize: ", err);
      return;
    }
    else {
      console.log("config from %s", message);
    }

    //setup site document search
    bookmark.initialize();
  });

});


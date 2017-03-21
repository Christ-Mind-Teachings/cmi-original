"use strict";

var search = require("../search/site_search");
var bookmark = require("../ui/bookmark");
var store = require("store");

module.exports = {
  initialize: function() {
    var data = store.get("search");

    search.init(data);
    bookmark.initialize();
  }
};


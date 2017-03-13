"use strict";

var search = require("./search/site_search");
var store = require("store");

document.addEventListener("DOMContentLoaded", function() {
  var data = store.get("search");

  //setup site document search
  search.init(data);

});


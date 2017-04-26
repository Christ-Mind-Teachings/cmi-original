"use strict";

//var store = require("store");
var url = require("../util/url");
var scroll = require("scroll-into-view");
var indexApi = require("../api/cmiapi");
var annotation = require("./annotation");

module.exports = {
  initialize: function() {
    var query = url.getQueryString("idx");

    if (query) {
      indexApi.getAnnotation(query)
      .then(function(response) {
        if (response.data.pid) {
          //console.log("getAnnotation response: ", response);
          var el = document.getElementById(response.data.pid);
          annotation.highlight(response.data);
          scroll(el);
        }
        else {
          console.log("idx:%s not found", query);
        }
      });
    }
  }
};


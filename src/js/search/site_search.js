"use strict";

var url = require("../util/url");
var axios = require("axios");
var store = require("store");
var runtime = require("pug-runtime");
var config = require("../config/config");
var templates = require("../pug/templates");

var searchApi = config.getApiEndpoint();
var msgField;

function doSearch(queryInfo) {
  console.log("queryInfo: ", queryInfo);
  return axios.post(searchApi, queryInfo);
}

function processSearchResults(queryInfo, response) {
  displayMessage("Search of " + queryInfo.source.toUpperCase() + " for <em>"
     + queryInfo.query + "</em> found "
     + response.count + " matches.");

  //console.log("search results: ", response);
  if (response.count > 0) {
    saveResults(response);
    showSearchResults(response);
  }
}

function reportSearchError(queryInfo) {
  displayMessage("Search of " + queryInfo.source.toUpperCase() + " for <em>"
     + queryInfo.query + "</em> ended with an error.");
}

//combine book specific arrays into one to simplify navigation on
//transcript pages - then store results
function saveResults(data) {
  var books = config.getBidArray(data.source);
  //console.log("bidArray: ", books);
  var all = [];
  for (var i = 0; i < books.length; i++) {
    var book = books[i];

    //if an array starts with a digit put an 'a' in front of it
    if (/^\d/.test(book)) {
      book = "a" + book;
    }
    if (data[book]) {
      all = all.concat(data[book]);
    }
  }

  //add concatenated array to results and save
  data.all = all;
  store.set("search", data);

  //console.log("saving results: ", data);
}

function showSearchResults(data) {
  console.log("showSearchResults(): ", data);
  var html;

  // searchResults is a function created by pug
  //var html = searchResults(data);
  if (data.source === "wom") {
    console.log("applying wom template");
    html = templates.search(data);
  }
  else if (data.source === "nwffacim") {
    console.log("applying nwffacim template");
    html = templates.nwffacim(data);
  }
  else if (data.source === "acim") {
    console.log("applying acim template");
    html = templates.acim(data);
  }
  var resultsDiv = document.getElementById("search-results");
  resultsDiv.innerHTML = html;
}

function displayMessage(message, spinner) {
  var showSpinner = spinner || false;
  var p = "<p>";

  if (showSpinner) {
    p = "<p><i class='fa fa-spinner fa-spin'></i>&nbsp";
  }

  msgField.innerHTML = p+message+"</p>";
}

function clearMessage() {
  msgField.innerHTML = "";
}

module.exports = {
  //search/site-search.js
  init: function(data) {
    msgField = document.getElementById("search-message");
    var submit = document.querySelector("form.search-bar");

    submit.addEventListener("submit", function(e) {
      e.preventDefault();
      //console.log("submit event handler");
      var query = document.querySelector(".requested-search-string");
      var source = $(".search-options").val();

      if (query.value === "") {
        //console.log("query value is empty");
        return;
      }

      //console.log("calling API with search: %s", query.value);
      //console.log("searching %s", source);

      var queryInfo = {
        source: source,
        query: query.value,
        width: 30
      };

      displayMessage("Please wait...", true);
      doSearch(queryInfo).then(function(response) {
        //console.log("query count: %s", response.data.count);
        processSearchResults(queryInfo, response.data);
        query.value = "";
      }).catch(function(error) {
        console.log("Error calling search API: %s", error.message);
        reportSearchError(queryInfo, error);
      })
    });

    var source = url.getQueryString("s");

    //check if source specified as a url parameter and set search
    //source accordingly
    if (source) {
      $("#option-select-" + source).prop("selected", true);
    }

    var q = url.getQueryString("q");
    var query;

    //check if query specified as a url parameter
    if (q) {
      query = document.querySelector(".requested-search-string");
      query.value = decodeURI(q);

      $("#option-select-" + source).prop("selected", true);
    }

    //init select2
    $(".search-options").select2({
      theme: "classic"
    });

    //when page loads, display results from last search if present
    if (data) {
      displayMessage("Search of " + data.source.toUpperCase() + " for <em>"
          + data.query + "</em> found "
          + data.count + " matches.");
      showSearchResults(data);
    }
    else {
      displayMessage("Welcome...");
    }
  }
};


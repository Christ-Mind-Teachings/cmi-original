"use strict";

var axios = require("axios");
var store = require("store");
var runtime = require("pug-runtime");
var config = require("../config/cmi");

var searchApi = "https://1fm3r0drnl.execute-api.us-east-1.amazonaws.com/latest/search";
var requestApi = "https://1fm3r0drnl.execute-api.us-east-1.amazonaws.com/latest/search";
var msgField;

//combine book specific arrays into one to simplify navigation on
//transcript pages - then store results
function saveResults(data) {
  var books = config[data.source].books;
  var all = [];
  for (var i = 0; i < books.length; i++) {
    var book = books[i];
    if (data[book]) {
      all = all.concat(data[book]);
    }
  }

  //add concatenated array to results and save
  data.all = all;
  store.set("search", data);

  console.log("saving results: ", data);
}

function showSearchResults(data) {
  console.log("showSearchResults(): ", data);

  // searchResults is a function created by pug
  var html = searchResults(data);
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
  init: function(data) {
    msgField = document.getElementById("search-message");

    var submit = document.querySelector("form.search-bar");
    submit.addEventListener("submit", function(e) {
      e.preventDefault();
      console.log("submit event handler");
      var query = document.querySelector("form.search-bar > input");

      if (query.value === "") {
        console.log("query value is empty");
        return;
      }

      console.log("calling API with search: %s", query.value);

      displayMessage("Please wait...", true);
      axios.post(searchApi, {
        source:"wom",
        query:query.value,
        width: 30
      })
      .then(function(response) {
        displayMessage("Search for <em>" + query.value + "</em> found "
                + response.data.count + " matches.");
        query.value = "";

        if (response.data.count > 0) {
          saveResults(response.data);
          showSearchResults(response.data);
        }
      })
      .catch(function(error) {
        console.error(error);
        displayMessage("Search error: " + error);
      });
    });

    //when page loads, display results from last search if present
    if (data) {
      displayMessage("Search for <em>" + data.query + "</em> found "
              + data.count + " matches.");
      showSearchResults(data);
    }
  }
};

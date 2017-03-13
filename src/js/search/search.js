"use strict";

var store = require("store");
var url = require("../util/url");
var config = require("../config/cmi");
var _ = require("underscore");

var searchResults;
var currentMatchIndex = 0;
var matchArray = [];

function setSearchDocument(data) {
  $(".search-header > .search-document").
    html("<p>" + config.getTitle(data.source,
                 matchArray[currentMatchIndex].book,
                 matchArray[currentMatchIndex].unit) + "</p>");
}

function setSearchTitle(query) {
  $(".search-header > .search-info").html("<p>Search <em>"+query+"</em> ("
     +(currentMatchIndex + 1)+" of "+ matchArray.length + ")</p>");
}

function getPageInfo(data, thisBook, thisUnit) {
  var i;
  var urlInfo = {};
  var idx = _.findIndex(data.all, function(item) {
    return item.book === this.book && item.unit === this.unit;
  }, {book: thisBook, unit: thisUnit});

  //this should never happen
  if (idx === -1) {
    return urlInfo;
  }

  //console.log("findIndex for %s, %s: found idx: %s, ", thisBook, thisUnit, idx, data.all[idx]);

  //find next
  for (i=idx; i < data.all.length; i++) {
    //console.log("looking for next: i: %s, book: %s, unit: %s", i, data.all[i].book, data.all[i].unit);
    if (data.all[i].unit !== thisUnit || data.all[i].book !== thisBook) {
      urlInfo.next = data.all[i].base + "?s=show" + data.all[i].location;
      break;
    }
  }

  //find prev
  for (i=idx; i >= 0; i--) {
    if (data.all[i].unit !== thisUnit || data.all[i].book !== thisBook) {
      urlInfo.prev = data.all[i].base + "?s=show" + data.all[i].location;
      break;
    }
  }

  //console.log("urlInfo: ", urlInfo);
  return urlInfo;
}

// get array for all search hits on the page
function getHitArray(data, book, unit) {
  var nextBook;
  var prevBook;
  var pageHits = [];
  var bookHits = [];

  var i;

  switch(book) {
    case "woh":
      nextBook = "wot";
      prevBook = "wok";
      bookHits = data.woh;
      break;
    case "wot":
      nextBook = "wok";
      prevBook = "woh";
      bookHits = data.wot;
      break;
    case "wok":
      nextBook = "woh";
      prevBook = "wot";
      bookHits = data.wok;
      break;
    default:
      break;
  }

  for(i = 0; i < bookHits.length; i++) {
    if (bookHits[i].unit === unit) {
      pageHits.push(bookHits[i]);
    }
  }

  return {matches: pageHits};
}

//hilight terms on page for current search
function markSearchHits(searchHits, searchData, state) {
  var mark;
  var i;

  //Note: this regex wont find a string within a string - only finds
  //matches that begin and end on word boundaries
  var regex = new RegExp("(?:^|\\b)(" + searchData.query + ")(?:$|\\b)", "gim");
  for (i = 0; i < searchHits.length; i++) {
    var id = searchHits[i].location.substr(1);
    var el = document.getElementById(id);
    var content = el.innerHTML;

    //remove newline chars in content - they can prevent the
    //query string from being highlighted
    content = content.replace(/[\r\n]/gm," ");
    if (state === "show") {
      el.innerHTML = content.replace(regex, "<mark class='show-mark'>$1</mark>");
    }
    else {
      el.innerHTML = content.replace(regex, "<mark class='hide-mark'>$1</mark>");
    }

    //test if query was highlighted
    if (el.innerHTML === content) {
      console.log("Regex did not match: \"%s\" for %s", searchData.query, id);
    }
  }
}

//show hilight terms on page for current search
function showSearchHits() {
  var i;

  $("mark").each(function(idx, el) {
    $(el).removeClass("hide-mark").addClass("show-mark");
  });
}

//hide hilight terms on page for current search
function hideSearchHits() {
  var i;

  $("mark").each(function(idx, el) {
    $(el).removeClass("show-mark").addClass("hide-mark");
  });
}

function initializeNavigator(data) {
  var path = location.pathname.split("/");
  var hash = location.hash;
  var thisBook = path[2];
  var thisUnit = path[3];
  var matchIndex;

  //get array of search matches on the page
  var hitInfo = getHitArray(data, thisBook, thisUnit);

  //no hits for this page
  if (hitInfo.matches.length === 0) {
    return hitInfo;
  }
  hitInfo.showPlayer = true;

  //set global matchArray
  matchArray = hitInfo.matches;

  //find the index in hitInfo.matches for location.hash - that's
  //the "current" match
  if (hash) {
    matchIndex = _.findIndex(hitInfo.matches, function(val) {
      return val.location === this.hash;
    }, {hash: hash});

    if (matchIndex > -1) {
      currentMatchIndex = matchIndex;
    }
    else {
      console.log("Error: could not find location.hash in search result array");
    }
  }

  //one hit - change arrow to 'splat' so user can easily navigate to 
  //search hit
  if (hitInfo.matches.length === 1) {
    $(".search-prev-match").addClass("hide-player");

    $(".search-next-match > i").removeClass("fa-arrow-down").addClass("fa-asterisk");
  }
  else {
    //add event handlers for matches on page
    $(".search-prev-match").on("click", function(e) {
      e.preventDefault();
      currentMatchIndex = currentMatchIndex - 1;
      if (currentMatchIndex < 0) {
        currentMatchIndex = matchArray.length - 1;
      }
      location.href = matchArray[currentMatchIndex].location;
      setSearchTitle(searchResults.query);
    });
  }

  $(".search-next-match").on("click", function(e) {
    e.preventDefault();
    currentMatchIndex = currentMatchIndex + 1;
    if (currentMatchIndex > matchArray.length - 1) {
      currentMatchIndex = 0;
    }
    location.href = matchArray[currentMatchIndex].location;
    setSearchTitle(searchResults.query);
  });

  //get next/prev page urls
  var pageUrl = getPageInfo(data, thisBook, thisUnit);

  if (pageUrl.next) {
    $(".search-next-page").attr("href", pageUrl.next);
  }
  else {
    $(".search-next-page").addClass("hide-player");
  }

  if (pageUrl.prev) {
    $(".search-prev-page").attr("href", pageUrl.prev);
  }
  else {
    $(".search-prev-page").addClass("hide-player");
  }

  //create navigator 'close' event handler
  $(".search-dialog-close").on("click", function(e) {
    e.preventDefault();
    console.log("search-dialog-close clicked");
    hideSearchHits();
    $(".search-results-wrapper").addClass("hide-player");
  });

  return hitInfo;
}

module.exports = {
  initialize: function() {
    var searchMatchInfo;
    var s;

    //if there are no search results hide 'search navigator' sidebar option
    searchResults = store.get("search");

    //if no search data don't show the 'Search Navigator' sidebar option
    if (!searchResults) {
      $(".search-navigator").addClass("hide-player");
      return;
    }

    //init navigator - continue initialization if array.length > 0
    console.log("initializeNavigator");
    searchMatchInfo = initializeNavigator(searchResults);
    if (searchMatchInfo.matches.length > 0) {
      s = url.getQueryString("s");

      //if url contains ?s=show then mark search terms on page and
      //show the navigator
      if (s) {
        markSearchHits(searchMatchInfo.matches, searchResults, "show");

        //don't show navigator if search has only one match, there is
        //no where to navigate to
        if (searchMatchInfo.showPlayer) {
          $(".search-results-wrapper").removeClass("hide-player");
        }
      }
      else {
        markSearchHits(searchMatchInfo.matches, searchResults, "hide");
      }

      //setup navigator show/hide event listener
      setSearchTitle(searchResults.query);
      setSearchDocument(searchResults);
      $(".search-navigator").on("click", function(e) {
        e.preventDefault();
        console.log("search-navigator clicked");
        if ($(".search-results-wrapper").hasClass("hide-player")) {
          $(".search-results-wrapper").removeClass("hide-player");
          showSearchHits();
        }
        else {
          $(".search-results-wrapper").addClass("hide-player");
          hideSearchHits();
        }
      });
    }
    else {
      $(".search-navigator").addClass("hide-player");
    }
  }
};

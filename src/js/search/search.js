"use strict";

var notify = require("toastr");
var store = require("store");
var url = require("../util/url");
var config = require("../config/config");
var _ = require("underscore");
var setStartTime = function(p) {
  console.error("search.setStartTime(%s) - function not initialized", p);
};

var searchResults;
var currentMatchIndex = 0;
var matchArray = [];
var markFailure = 0;
var notifyMarkFailure = false;

function showMessage(msg) {
  notify.info(msg);
}

//display document info on search navigator
function setSearchDocument(data) {
  $(".search-header > .search-document").html(
    "<p>" +
      config.getTitle(data.source,
      matchArray[currentMatchIndex].book,
      matchArray[currentMatchIndex].unit) +
    "</p>"
  );
}

//display search result info on search navigator
function setSearchTitle(query) {
  $(".search-header > .search-info").html(
    "<p>Search <em>" + query + "</em> (" +
    (currentMatchIndex + 1) + " of " +
    matchArray.length + ")</p>"
  );
}

function getPageInfo(data, thisBook, thisUnit) {
  var i;
  var urlInfo = {};
  var idx = _.findIndex(data.all, function(item) {
    return item.book === this.book && item.unit === this.unit;
  }, {book: thisBook, unit: thisUnit});

  //this should never happen
  if (idx === -1) {
    console.error("getPageInfo() error: Can't find search hit for this page in search results.");
    return urlInfo;
  }

  //console.log("findIndex for %s, %s: found idx: %s, ", thisBook, thisUnit, idx, data.all[idx]);

  //find next page with search results
  for (i=idx; i < data.all.length; i++) {
    //console.log("looking for next: i: %s, book: %s, unit: %s", i, data.all[i].book, data.all[i].unit);
    if (data.all[i].unit !== thisUnit || data.all[i].book !== thisBook) {
      urlInfo.next = data.all[i].base + "?s=show" + data.all[i].location;
      break;
    }
  }

  //find prev page with search results
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
  var pageHits = [];
  var bookHits = [];

  var i;

  bookHits = data[book];

  if (bookHits) {
    for(i = 0; i < bookHits.length; i++) {
      if (bookHits[i].unit === unit) {
        pageHits.push(bookHits[i]);
      }
    }
  }

  return {matches: pageHits};
}

//hilight terms on page for current search
function markSearchHits(searchHits, searchData, state) {
  var mark;
  var i;

  //Note: this regex wont find a string within a string - only finds
  //matches that begin on a word boundary
  //var regex = new RegExp("(?:^|\\b)(" + searchData.query + ")(?:$|\\b)", "gim");
  var regex = new RegExp("(?:^|\\b)(" + searchData.query + ")(?:$|\\b|)", "gim");
  for (i = 0; i < searchHits.length; i++) {
    var id = searchHits[i].location.substr(1);
    var el = document.getElementById(id);

    // a data error is indicated by el == null
    if (!el) {
      markFailure++;
      continue;
    }
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
      markFailure++;
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

  //true for sparkly acim pages
  if (path.length === 6) {
    thisUnit = thisUnit + "/" + path[4];
  }

  console.log("thisUnit: %s", thisUnit);

  //for nwffacim study group books, the array of search hits is prefixed
  //with an 'a'. If we are processing an study group page we adjust the array name
  //accordingly
  var bookArrayName = thisBook;

  //the search result array for acim books starts with an 'a' but
  //the api returns an array identified by year, ie 2002, 2003, so
  //we add an to the 'book' portion of the uri to get the data from
  //the search result set
  if (/^\d/.test(thisBook)) {
    bookArrayName = "a" + thisBook;
  }

  //get array of search matches on the page
  var hitInfo = getHitArray(data, bookArrayName, thisUnit);

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
      console.error("Error: could not find location.hash in search result array");
    }
  }

  //one hit - change arrow to 'splat' so user can easily navigate to 
  //search hit
  if (hitInfo.matches.length === 1) {
    $(".search-prev-match").addClass("hide-player");

    $(".search-next-match > i").removeClass("fa-arrow-down").addClass("fa-asterisk");

    $(".search-next-match").on("click", function(e) {
      e.preventDefault();
      location.href = matchArray[currentMatchIndex].location;
    });
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

    $(".search-next-match").on("click", function(e) {
      e.preventDefault();
      currentMatchIndex = currentMatchIndex + 1;
      if (currentMatchIndex > matchArray.length - 1) {
        currentMatchIndex = 0;
      }
      location.href = matchArray[currentMatchIndex].location;
      setSearchTitle(searchResults.query);
    });
  }

  //listener to play audio at hit location
  if (hitInfo.matches.length > 0) {
    if (typeof window.cmiAudioTimingData !== "undefined") {
      $(".play-this-match").on("click", function(e) {
        e.preventDefault();
        console.log("play: ", matchArray[currentMatchIndex].location.substr(1));
        setStartTime(matchArray[currentMatchIndex].location.substr(1))
      });
    }
    else {
      $(".play-this-match").addClass("hide-player");
    }
  }

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
  //search/search.js
  initialize: function(setStartTimeFunc) {
    var searchMatchInfo;
    var s;

    //if there are no search results hide 'search navigator' sidebar option
    searchResults = store.get("search");

    //if no search data just return
    if (!searchResults) {
      return;
    }

    $(".search-navigator").removeClass("hide-player");

    //init navigator - continue initialization if array.length > 0
    console.log("initializeNavigator");
    searchMatchInfo = initializeNavigator(searchResults);
    if (searchMatchInfo.matches.length > 0) {
      s = url.getQueryString("s");

      //if url contains ?s=show then mark search terms on page and
      //show the navigator
      if (s) {
        markSearchHits(searchMatchInfo.matches, searchResults, "show");

        if (searchMatchInfo.showPlayer) {
          $(".search-results-wrapper").removeClass("hide-player");

          //notify user some search hits failed to be highlighted
          if (markFailure > 0) {
            showMessage("Failed to highlight " + markFailure + " search matche(s)");
            notifyMarkFailure = true;
          }
        }
      }
      else {
        markSearchHits(searchMatchInfo.matches, searchResults, "hide");
      }

      if (setStartTimeFunc) {
        setStartTime = setStartTimeFunc;
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

          if (markFailure > 0 && !notifyMarkFailure) {
            showMessage("Failed to highlight " + markFailure + " search matche(s)");
            notifyMarkFailure = true;
          }
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

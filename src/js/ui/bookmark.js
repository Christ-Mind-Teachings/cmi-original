/* eslint no-unreachable: off */

"use strict";

var store = require("store");
var templates = require("../pug/templates");
var _ = require("underscore");

//cmi sources - add to this when new soures are added to cmi
var sources = ["wom", "nwffacim"];

function getBookName(book) {
  var name;
  switch(book) {
    case "woh":
      name = "Way of the Heart";
      break;
    case "wot":
      name = "Way of Transformation";
      break;
    case "wok":
      name = "Way of Knowing";
      break;
    case "early":
      name = "The Early Years";
      break;
    case "questions":
      name = "Way of Mastery Questions";
      break;
    case "yaa":
      name = "You Are the Answer";
      break;
    case "grad":
      name = "Graduation";
      break;
    case "acim":
      name = "ACIM Study Group";
      break;
    default:
      name = "Unknown";
      break;
  }
  return name;
}

function getSourceName(source) {
  var name;
  switch(source) {
    case "wom":
      name = "Way of Mastery";
      break;
    case "nwffacim":
      name = "Northwest Foundation for ACIM";
      break;
    default:
      name = "Unknown";
      break;
  }
  return name;
}

function identifySource(source) {
  var id;
  switch(source) {
    case "wom":
      id = 1;
      break;
    case "nwffacim":
      id = 2;
      break;
    default:
      id = 0;
      break;
  }
  return id;
}

//calculate a sort key for bookmarks
function calcKey(source, book) {
  var sid = identifySource(source);
  var bid;
  switch(book) {
    case "woh":
    case "yaa":
      bid = 1;
      break;
    case "wot":
    case "grad":
      bid = 2;
      break;
    case "wok":
    case "acim":
      bid = 3;
      break;
    case "early":
      bid = 4;
      break;
    case "questions":
      bid = 5;
      break;
    default:
      bid = 0;
      break;
  }

  return sid * 10 + bid;
}

// filter bookmarks
function filter(key, value, arrayToFilter) {
  var arr = _.filter(arrayToFilter, function(item) {
    return item[this.key] === this.value;
  }, {key: key, value: value});

  return arr;
}

//sort and organize bookmarks for display
function formatBookmarks(data) {
  var formatted = [];
  var info;
  var item;
  var i;

  for (i = 0; i < data.location.length; i++) {
    info = data.location[i].page.split("/");
    item = {};
    item.page = data.location[i].page;
    item.source = getSourceName(info[1]);
    item.book = getBookName(info[2]);
    item.key = calcKey(info[1], info[2]);
    if (info[2] === "acim") {
      item.part = info[3];
      item.unit = info[4];
    }
    else {
      item.unit = info[3];
    }
    item.mark = data.location[i].mark;

    formatted.push(item);
  }

  //sort array
  formatted.sort(function(a,b) {
    var aUnit = a.unit;
    var bUnit = b.unit;
    if (a.key === b.key) {
      aUnit = Number.parseInt(a.unit.replace(/[a-z]+/,""),10);
      bUnit = Number.parseInt(b.unit.replace(/[a-z]+/,""),10);
    }
    return aUnit - bUnit;
  });

  //creat an array for each source
  var sourceArray = [];
  sources.forEach(function(val) {
    sourceArray.push(filter("source", val, formatted));
  });

  //console.log("reformatted bookmark data: ", formatted);
  console.log("sourceArray: ", sourceArray);
  return sourceArray;

}

function addBookmarkDialogCloseListener() {
  $(".bookmark-close").on("click", function(e) {
    e.preventDefault();
    $(".bookmark-dialog").addClass("hide-player");
  });
}

function showBookmarkDialog() {
  var data = store.get("bookmarks");
  console.log("showBookmarks(): ", data);
  var bookmarks = formatBookmarks(data);

  // generateBookmarkList is a function created by pug
  //var html = templates.bookmark({source: bookmarks});
  //console.log("html: ", html);

  //var list = document.getElementById("bookmark-list");
  //list.innerHTML = html;
  //$(".bookmark-dialog").removeClass("hide-player");
}

//the sidebar 'Bookmark' option - toggles display of
//paragraph bookmarks
function addBookmarkToggleListener() {
  $(".bookmark").on("click", function(e) {
    e.preventDefault();
    $(".transcript p i.bkmark").each(function(idx) {
      if ($(this).hasClass("bkmark-hide")) {
        $(this).removeClass("bkmark-hide");
      }
      else {
        //don't hide set bookmarks
        if ($(this).hasClass("fa-bookmark-o")) {
          $(this).addClass("bkmark-hide");
        }
      }
    });
  });

  $(".list-bookmarks").on("click", function(e) {
    e.preventDefault();
    showBookmarkDialog();
  });
}

function addBookMarkers() {
  $(".transcript p").each(function(idx) {
    $(this).prepend("<i class='bkmark bkmark-hide fa fa-pull-left fa-bookmark-o'></i>");
  });
}

function showBookmarks() {
  var bookmarks = store.get("bookmarks");
  var page;
  var id;
  var i;

  if (!bookmarks) {
    return;
  }

  page = _.findIndex(bookmarks.location, function(val) {
    return val.page === this.pathname;
  }, {pathname: location.pathname});

  if (page === -1) {
    return;
  }

  for(i = 0; i < bookmarks.location[page].mark.length; i++) {
    id = bookmarks.location[page].mark[i];
    $("#"+id+" i.bkmark").removeClass("fa-bookmark-o").addClass("fa-bookmark").removeClass("bkmark-hide");
  }

}

function storeBookmark(id) {
  console.log("storeBookmark: %s", id);
  var bookmarks = store.get("bookmarks");
  var page = 0;

  if (!bookmarks) {
    console.log("Adding first bookmark");
    bookmarks = { location: [{
        page: location.pathname,
        mark: [id]
      }]
    };
  }
  else {
    page = _.findIndex(bookmarks.location, function(val) {
      return val.page === this.pathname;
    }, {pathname: location.pathname});

    //bookmark for new page
    if (page === -1) {
      bookmarks.location.push({page: location.pathname, mark: [id]});
      page = bookmarks.location.length - 1;
    }
    else {
      bookmarks.location[page].mark.push(id);
    }
  }

  store.set("bookmarks", bookmarks);
  console.log("Page has %s bookmarks", bookmarks.location[page].mark.length);
  //console.log(bookmarks);
}

function removeBookmark(id) {
  console.log("removeBookmark: %s", id);
  var bookmarks = store.get("bookmarks");
  var page = 0;
  var mark;

  if (!bookmarks) {
    console.log("No bookmarks to remove");
  }
  else {
    page = _.findIndex(bookmarks.location, function(val) {
      return val.page === this.pathname;
    }, {pathname: location.pathname});

    if (page === -1) {
      console.log("page has no bookmarks to remove");
      return;
    }
    else {
      mark = _.findIndex(bookmarks.location[page].mark, function(val) {
        return val === this.id;
      }, {id: id});

      if (mark === -1) {
        console.log("bookmark %s not set on page");
        return;
      }
      else {
        bookmarks.location[page].mark.splice(mark, 1);
      }
    }
  }

  store.set("bookmarks", bookmarks);
  console.log("Page has %s bookmarks", bookmarks.location[page].mark.length);
  //console.log(bookmarks);
}
function addBookmarkListener() {
  $(".transcript p i.bkmark").each(function(idx) {
    $(this).on("click", function(e) {
      var id;
      e.preventDefault();
      if ($(this).hasClass("fa-bookmark-o")) {
        $(this).removeClass("fa-bookmark-o").addClass("fa-bookmark");
        id = $(this).parent().attr("id");
        storeBookmark(id);
      }
      else {
        $(this).removeClass("fa-bookmark").addClass("fa-bookmark-o");
        id = $(this).parent().attr("id");
        removeBookmark(id);
      }
    });
  });
}

module.exports = {
  initialize: function() {
    //not ready for prime time
    return;
    addBookMarkers();
    showBookmarks();
    addBookmarkListener();
    addBookmarkToggleListener();
    addBookmarkDialogCloseListener();
  }
};


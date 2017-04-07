/* eslint no-alert: off, no-unreachable: off */
/* ui/bookmark.js */

"use strict";

var notify = require("toastr");
var store = require("store");
var _ = require("underscore");
var config = require("../config/config");
var templates = require("../pug/templates");
var setStartTime = function(p) {
  console.error("bookmark.setStartTime(%s) - function not initialized", p);
};

function showMessage(msg) {
  notify.info(msg);
}

function addBookmarkDialogCloseListener() {
  $(".bookmark-close").on("click", function(e) {
    e.preventDefault();
    $(".bookmark-dialog").addClass("hide-player");
    $(".audio-from-here").off();
  });
}

function prepareBookmarks(bm) {
  var i;

  for (i = 0; i < bm.length; i++) {
    bm[i].title = config.getPageTitle(bm[i].page);
    bm[i].key = config.getKey(bm[i].page);
    bm[i].audio = config.getAudio(bm[i].page);
  }

  bm.sort(function(a,b) {
    return a.key - b.key;
  });

  return bm;
}

function showBookmarkDialog() {
  var data;
  var bmarks;
  var html;

  //dialog is aleady open - close it
  if (!$(".bookmark-dialog").hasClass("hide-player")) {
    $(".bookmark-dialog").addClass("hide-player");
    return;
  }

  data = store.get("bookmarks");
  if (!data || data.location.length === 0) {
    showMessage("You don't have any bookmarks");
    return;
  }

  bmarks = prepareBookmarks(data.location);
  //console.log("bmarks: ", bmarks);

  // generateBookmarkList is a function created by pug
  //html = template({
  html = templates.bookmark({
    thisPageUrl: location.pathname,
    bookmarks: bmarks
  });

  var list = document.getElementById("bookmark-list");
  list.innerHTML = html;

  //set event handler for audio-from-here that
  //allows playing audio starting from bookmark position
  // ** handler is removed when the dialog is closed
  $(".audio-from-here").on("click", function(e) {
    e.preventDefault();
    var p = $(this).attr("href");
    console.log("Play audio-from-here requested for %s", p);
    if (!setStartTime(p)) {
      showMessage("Failed to set audio start time to bookmark");
    }
    else {
      //close dialog box
      $(".bookmark-close").trigger("click");
    }
  });

  $(".bookmark-dialog").removeClass("hide-player");
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
}

function addShowBookmarkDialogListener() {
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

        //if page has no more bookmarks then remove page from bookmarks
        if (bookmarks.location[page].mark.length === 0) {
          bookmarks.location.splice(page,1);
        }
      }
    }
  }

  store.set("bookmarks", bookmarks);
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
  //bookmark.js
  initialize: function(audioStartTimeFunc) {
    console.log("bookmark init");

    if ($(".transcript").length > 0) {
      setStartTime = audioStartTimeFunc;
      addBookMarkers();
      showBookmarks();
      addBookmarkListener();
      addBookmarkToggleListener();
    }
    else {
      //hide sidebar bookmark option
      $(".sidebar-nav-item.bookmark").addClass("hide-player");
    }
    addShowBookmarkDialogListener();
    addBookmarkDialogCloseListener();
  }
};



"use strict";

var _ = require("underscore");
var wrap = require("wrap-range-text");
var TextQuoteAnchor = require("dom-anchor-text-quote");
var api = require("./api");

/*
 * return the array element from the selectorList containing
 * the specified key.
 *
 * Args: 
 *  selectorList: array of selectors from an annotation
 *  key: the search key
 */
function getSelectorWith(selectorList, key) {
  for (var i=0; i < selectorList.length; i++) {
    if ( selectorList[i].hasOwnProperty(key) ) {
      return selectorList[i];
    }
  }
  return null;
}

/*
 * Find the annotations 'TextQuoteSelector'
 *
 * arg: selectorList is an array of selector objects from an annotation
 * returns the selector object containing the key 'exact'
 */
function getTextQuoteSelector(selectorList) {
  return getSelectorWith(selectorList, "exact");
}

/*
 * Find the annotations 'TextPositionSelector'
 *
 * arg: selectorList is an array of selector objects from an annotation
 * returns the selector object containing the key 'start'
 */
function getTextPositionSelector(selectorList) {
  return getSelectorWith(selectorList, "start");
}

/*
 * Extract data from array of annotations needed for highlighting on a page
 *
 * Args:
 *  dataArray: an array of annotations
 *
 * Returns:
 *  Array of extracted data items from input. Each element can be passed to attach() to 
 *  highlight the annotation on the page
 */
function parse(dataArray) {
  var extract;

  //parse each annotation in the array
  extract = _.map(dataArray, function(item) {
    //
    //get hypothes.is user name
    var user = item.user.replace("acct:","").replace("@hypothes.is","");

    //get the selector array
    var selectorList = item.target[0].selector;

    //get the TextQuoteSelector object from the array
    var textQuoteSelector = getTextQuoteSelector(selectorList);

    //return an empty object if selector not found
    if ( textQuoteSelector === null ) {
      return {
        payload: "",
        message: "Failed to find TextQuoteSelector",
        error: true,
        anno: {
          id: item.id,
          url: item.uri,
          user: user
        }
      };
    }
    else {
      return {
        payload: user + "\n\n" + item.tags.join(", ") + "\n\n" + item.text + "\n\n",
        message: "",
        error: false,
        anno: {
          id: item.id,
          user: user,
          url: item.uri,
          exact: textQuoteSelector.exact,
          prefix: textQuoteSelector.prefix,
          text: item.text,
          tags: item.tags
        }
      };
    }

  });

  return extract;
}

/*
 * Highlight the annotation of the page
 *
 * Args:
 *  item: data for a single annotation from extract()
 *
 * Returns:
 *  value.unwrap() to unwrap what was wrapped
 */
function attach(item) {
  var anno = item.anno;
  var payload = item.payload;

  //check for parse error
  if (item.error) {
    console.log("Error attaching annotation: %s, message: %s", anno.id, item.message);
    return;
  }

  //check if annotation came from current page
  if (! anno.url.endsWith(window.location.pathname)) {
    console.log("Annotation: %s, from a different url: %s", anno.id, item.url);
    return;
  }

  var range = TextQuoteAnchor.toRange(document.body, anno, {prefix: anno.prefix});

  var highlight = document.createElement("mark");
  highlight.setAttribute("data-hypothesis", anno.id);

  // highlight.title = payload;
  // highlight.id = anno.id;
  // highlight.className = bounds + " hypothesis_annotation";

  //return value can be used to unwrap the wrap
  // wrap.unrap()
  return wrap(highlight, range);
}

/*
 * Display a single annotation on the page
 *
 * Args: 
 *  id: annotation id
 *  auth: api token - needed for private group annotations
 *  cb: callback
 */
function showOne(id, auth, cb) {
  var pageUrl;

  // query annotations for current page
  // adjust url for development testing
  if (window.location.origin.search("localhost:4000")) {
    pageUrl = "http://christmind.info" + window.location.pathname;
  }
  else {
    pageUrl = window.location.origin + window.location.pathname;
  }

  //query hypothes.is for all annotations on the current page
  //  - current limitation prevents query by annotation id
  var xhr = api.search("uri=" + pageUrl, auth);

  //handle error
  xhr.addEventListener("error", function() {
    console.log("hypothes.is query Failed: ", this.statusText);
    console.log("query was for page: %s", pageUrl);
    cb(this.statusText);
  });

  // query successful
  xhr.addEventListener("load", function(e) {
    var annotation;
    var queryResult = JSON.parse(this.responseText);
    console.log("queryResult: ", queryResult);

    //look for requested annotation in returned results
    annotation = _.find(queryResult.rows, function(a) {
      return a.id === id;
    });

    // did we find the requested annotation?
    if (annotation) {

      // extractInfo requires an array argument
      var extract = parse([annotation]);

      // check for extraction error
      if (!extract[0].error) {
        cb(null,attach(extract[0]));
      }
      else {
        console.log("Can't display annotation: ", annotation);
        cb(extract[0].message);
      }
    }
    else {
      console.log("Annotation Id: %s was not found", id);
      cb("Annotation id: " + id + " was not found");
    }
  });
}

module.exports = {
  showOne: showOne,
  parse: parse,
  wrap: wrap
};


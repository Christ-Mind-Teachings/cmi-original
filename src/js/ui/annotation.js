
//these are used for highlight
var textPosition = require("dom-anchor-text-position");
var textQuote = require('dom-anchor-text-quote');
var wrapRange = require("wrap-range-text");
var uuid = require("uuid/v4");

function highlight(annotation) {
  //const anno_id = "anno-" + btoa(annotation.id);
  var anno_id = annotation.id;
  if (annotation.target.source) {
    var selectors = annotation.target.selector;
    for (var i = 0 ; i < selectors.length ; i++) {
      var selector = selectors[i];
      var type = selector.type;
      switch (type) {
        case "TextPositionSelector":
          // skip existing marks
          var existing_marks = document.querySelectorAll("[data-annotation-id='"+anno_id + "']");
          if (existing_marks.length === 0) {
            var mark = document.createElement("mark");
            mark.dataset["annotationId"] = anno_id;
            mark.classList.add("page-notes");
            var range = textPosition.toRange(document.body, selector);
            wrapRange(mark, range);
          }
          break;
      }
    }
  }
}

function getAnnotation(range) {
  var pathArray = location.pathname.split("/");
  if (range.collapsed) return;

  var textPositionSelector = textPosition.fromRange(document.body, range);
  Object.assign(textPositionSelector, {type: 'TextPositionSelector'});

  var textQuoteSelector = textQuote.fromRange(document.body, range);
  Object.assign(textQuoteSelector, {type: 'TextQuoteSelector'});

  var annotation = {
    type: 'Annotation',
    id: uuid(),
    url: location.origin + location.pathname,
    pid: range.startContainer.parentNode.id,
    source: pathArray[1],
    book: pathArray[2],
    unit: pathArray[3],
    target: {
      type: 'SpecificResource',
      source: window.location.href,
      selector: [
        textPositionSelector,
        textQuoteSelector,
      ]
    }
  };


  return annotation;
}

module.exports = {
  getAnnotation: getAnnotation,
  highlight: highlight
};


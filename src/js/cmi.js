/*
  Groups: test=3Pj4aGiy
*/

"use strict";

var url = require("./util/url");
var wrap = require("./h/wrap");
var scroll = require("scroll-into-view");

var unwrap;

function removeHighlight() {
  unwrap.unwrap();
}

document.addEventListener("DOMContentLoaded", function() {
  var auth = "6879-22a8900b365e8885a6e44d9d711839fb";

  /*
   * check if url parm 'id' is present and attempt to highlight the
   * annotation with that id on the page.
  */

  var id = url.getQueryString("id");
  if (id) {
    wrap.showOne(id, auth, function(error, hl) {
      if (error) {
        console.log("error: %s", error);
      }
      else {
        unwrap = hl;
        // console.log("unwrap: ", unwrap);
        scroll(unwrap.nodes[0]);

        setTimeout(removeHighlight, 3000);
      }
    });
  }

});


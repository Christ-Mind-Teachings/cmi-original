"use strict";

var Appbase = require('appbase-js');

var appbaseRef = new Appbase({
  url: "https://scalr.api.appbase.io",
  appname: "christmind.info",
  username: "b1MGpr4Um",
  password: "f6bb1139-0491-470d-8fa5-462c7f906dd3"
});

function store(type, source, book, unit, pid, text) {
  var id = `${source}:${book}:${unit}:${pid}`;
  var doc = {
    source: source,
    book: book,
    unit: unit,
    p: pid,
    text: text
  };

  appbaseRef.index({type: type, id: id, body: doc})
  .on("data", function(response) {
    console.log("%s success: ", id, response);
  })
  .on("error", function(error) {
    console.log("%s failed: ", id, error);
  });
}

store("wom", "wom", "woh", "l01", "p01", "Now we begin");



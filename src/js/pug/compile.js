var pug = require("pug");
var fs = require("fs");

var search = pug.compileFileClient("./search.pug", {name: "searchResults"});
var bookmark = pug.compileFileClient("./bookmark.pug", {name: "generateBookmarkList"});

fs.writeFileSync("templates.js", search + bookmark);



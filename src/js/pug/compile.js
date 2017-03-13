var pug = require("pug");
var fs = require("fs");

var fnString = pug.compileFileClient("./search.pug", {name: "searchResults"});

fs.writeFileSync("templates.js", fnString);



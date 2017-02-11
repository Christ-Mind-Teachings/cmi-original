
var json = require("jsonfile");
var util = require("util");
var moment = require("moment");
var _ = require("underscore");

if (process.argv.length < 3) {
  console.log("Missing input file name");
  process.exit(1);
}

var fn = process.argv[2];

//console.log("fn: %s", fn);

//input data
var data = json.readFileSync(fn);

//output data
var obj = {};

if (!data.outfile || !data.time || !data.title ) {
  console.log("%s syntax error", fn);
  console.log("missing outfile, time, and/or title attributes");
  process.exit(1);
}

//console.log("Conversion starting");

var outfile = data.outfile;
var id = data.id;

//copy attributes to obj
_.each(data, function(value, key) {
  if (key != "time" && key != "id" && key != "outfile") {
    this.obj[key] = value;
  }
}, {obj:obj});

obj.time = _.map(data.time, function(value, index) {
  var t = value.split(":");
  var seconds, minutes, hours;
  var total;

  switch(t.length) {
    case 1:
      total = Number.parseFloat(t[0], 10);
      break;
    case 2:
      seconds = Number.parseFloat(t[1], 10);
      minutes = Number.parseFloat(t[0], 10) * 60;
      total = minutes + seconds;
      break;
    case 3:
      seconds = Number.parseFloat(t[2], 10);
      minutes = Number.parseFloat(t[1], 10) * 60;
      hours = Number.parseFloat(t[2], 10) * 3600;
      total = hours + minutes + seconds;
      break;
  }
  return {id: "p" + index, seconds: total};
});

//console.log("obj: ", obj);
//console.log("writing: %s", outfile);

console.log(util.inspect(obj, false, null));
//json.writeFileSync(outfile, obj, {spaces: 2});


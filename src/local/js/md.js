/*
 * Convert data.json to CMI Jekyll data file format. Next/prev url's are generated
 * so navigation can proceed sequentially through the list.
 *
 * data.json: The json file pages array contains files in sequential order.
 *
 * fields:
 *  id: identifies the procedure used to convert the file.
 *    "acim", and "yaa" are supported procedures, "acim" is the default
 *
 *  year: optional, used by "acim" procedure and required by "acim"
 *
 *  outfile: name of output file
 *    optional for "acim", required by "yaa"
 *
 * -------- YAA Format ---------
 {
  "id": "yaa",
  "outfile": "yaa.json",
  "base": "/nwffacim/yaa/",
  "pages": [
    "yaa",
    ...,
    "ack",
    "022682a",
    "022682b",
    "022682c",
    "022782",
    "022882",
    "afterword"
  ]
 }
 *
 * -------- ACIM Format ---------
 {
   "year": 2002,
   "pages": [
     "2002",
     "061202",
     "073102",
      ...
     "121202",
     "121902"
   ]
 }
 *
 *
 */

var json = require("jsonfile");
var util = require("util");
var moment = require("moment");
var _ = require("underscore");

// acim procedure for json file conversion
function acim(item, idx, arr) {
  var page = {};
  var d = moment(item, "MMDDYY");

  page.url = util.format("%s/", item);
  page.idx = idx;
  page.title = d.format("MMM D, YYYY");

  if (arr.length > 1) {

    //we're at the last element
    if (idx === arr.length - 1) {
      page.next = util.format("%s/", arr[0]);
      page.prev = util.format("%s/", arr[idx-1]);
    }
    else if (idx === 0) {
      page.next = util.format("%s/", arr[idx+1]);
      page.prev = util.format("%s/", arr[arr.length - 1]);
    }
    else {
      page.next = util.format("%s/", arr[idx+1]);
      page.prev = util.format("%s/", arr[idx-1]);
    }
  }
  else {
    page.next = util.format("%s/", item);
    page.prev = util.format("%s/", item);
  }

  return page;
}

// yaa procedure for json file conversion
function yaa(item, idx, arr) {
  var page = {};
  var d;

  // item is not a date
  if (item[0].search(/\d/) === -1) {
    page.title = item.charAt(0).toUpperCase() + item.substr(1);
  }
  // item is a date but last char is not
  else if (item[item.length - 1].search(/\d/) === -1) {
    d = moment(item.substr(0, item.length-1), "MMDDYY");
    page.title = d.format("MMM D, YYYY");
  }
  // item is a date
  else {
    d = moment(item, "MMDDYY");
    page.title = d.format("MMM D, YYYY");
  }

  d = moment(item, "MMDDYY");
  page.url = util.format("%s/", item);
  page.idx = idx;

  if (arr.length > 1) {

    //we're at the last element
    if (idx === arr.length - 1) {
      page.next = util.format("%s/", arr[0]);
      page.prev = util.format("%s/", arr[idx-1]);
    }
    else if (idx === 0) {
      page.next = util.format("%s/", arr[idx+1]);
      page.prev = util.format("%s/", arr[arr.length - 1]);
    }
    else {
      page.next = util.format("%s/", arr[idx+1]);
      page.prev = util.format("%s/", arr[idx-1]);
    }
  }
  else {
    page.next = util.format("%s/", item);
    page.prev = util.format("%s/", item);
  }

  return page;
}

var yml = {};
var data = json.readFileSync("data.json");

var outfile;
var id = "acim";

if (data.id) {
  id = data.id;
}

if (id === "acim" && !data.year) {
  console.log("data.year required for 'acim' conversion, or you need to specify data.id if not 'acim'");
  process.exit(1);
}

console.log("Conversion procedure: %s", id);

switch (id) {
  case "acim":
    yml.base = "/nwffacim/acim/" + data.year + "/";
    yml.page = _.map(data.pages, acim);
    outfile = data.year + ".json";
    break;
  case "yaa":
    yml.base = data.base;
    yml.page = _.map(data.pages, yaa);
    outfile = data.outfile;
    break;
}

//json.writeFileSync(data.year + ".json", yml, {spaces: 2});
json.writeFileSync(outfile, yml, {spaces: 2});


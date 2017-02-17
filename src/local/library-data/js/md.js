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

var example = {
  id: "wom",
  base: "/wom/woh/",
  outfile: "output.filename",
  domain: {
    rtf: "rtf.domain.com",
    pdf: "pdf.domain.com",
    etc: "etc"
  },
  pages: [
    "file1",
    {
      fid: "file2",
      desc: "desc",
      "...": "etc"
    },
    "file3",
    "...",
    "in sequential order"
  ]
};

var json = require("jsonfile");
var util = require("util");
var moment = require("moment");
var _ = require("underscore");

/*
 * 'item' might be an object. When it is item.fid is data to return
 */
function getItem(item) {
  var fid = item;
  if (_.isObject(item)) {
    fid = item.fid;
  }

  return fid;
}

function copyObj(page, item) {
  var fid = item;

  if (_.isObject(item)) {
    page = _.extend(page, item);
    fid = item.fid;
  }

  if (typeof fid === "undefined") {
    console.log("Missing 'fid:' in array object");
    process.exit(1);
  }

  return fid;
}

//common between all types
function next_prev(page, arr, info) {
  var idx = page.idx;
  var next, prev;

  if (arr.length > 1) {
    //we're at the last element
    if (idx === arr.length - 1) {
      next = getItem(arr[0]);
      prev = getItem(arr[idx-1]);
    }
    else if (idx === 0) {
      next = getItem(arr[idx+1]);
      prev = getItem(arr[arr.length - 1]);
    }
    else {
      next = getItem(arr[idx+1]);
      prev = getItem(arr[idx-1]);
    }
  }
  else {
    next = getItem(arr[0]);
    prev = getItem(arr[0]);
  }

  //intro page
  if (next.charAt(0) === "*") {
    page.next = util.format("%s%s/", info.intro, next.substr(1));
  }
  else {
    page.next = util.format("%s%s/", info.base, next);
  }

  if (prev.charAt(0) === "*") {
    page.prev = util.format("%s%s/", info.intro, prev.substr(1));
  }
  else {
    page.prev = util.format("%s%s/", info.base, prev);
  }
}

// acim contents procedure for json file conversion
function acimc(item, idx, arr) {
  var page = {};
  var fid = copyObj(page, item);

  var introPage = false;
  if (fid.charAt(0) === "*") {
      introPage = true;
  }

  if (fid === "*acim") {
    page.title = "About ACIM Study Group ";
    page.url = util.format("%s%s/", this.intro, fid.substr(1));
  }
  else {
    page.title = "About Year " + introPage?fid.substr(1):fid;
    page.url = util.format("%s%s/", introPage?this.intro:this.base, introPage?fid.substr(1):fid);
  }
  page.idx = idx;

  next_prev(page, arr, {base: this.base, intro: this.intro});

  if (introPage) {
    page.fid = fid.substr(1);
  }
  else {
    page.fid = fid;
  }

  //append '/' to simplify workig with Jekyll Liquid
  page.fid = page.fid + '/';

  return page;
}

// acim procedure for json file conversion
function acim(item, idx, arr) {
  var page = {};
  var fid = copyObj(page, item);
  var d = moment(fid, "MMDDYY");

  var introPage = false;
  if (fid.charAt(0) === "*") {
    introPage = true;
    page.intro = true;
  }
  else {
    page.intro = false;
  }

  page.url = util.format("%s%s/", introPage?this.intro:this.base, introPage?fid.substr(1):fid);
  page.idx = idx;
  page.title = d.format("MMM D, YYYY");

  if (page.title === "Invalid date") {
    page.title = "About";
    if (this.year) {
      page.title = "About " + this.year + " Transcripts";
    }
  }
  next_prev(page, arr, {base: this.base, intro: this.intro});

  if (fid.charAt(0) === "*") {
    page.fid = fid.substr(1);
  }
  else {
    page.fid = fid;
  }

  //append '/' to simplify workig with Jekyll Liquid
  page.fid = page.fid + '/';

  return page;
}

// yaa procedure for json file conversion
function yaa(item, idx, arr) {
  var page = {};
  var fid = copyObj(page, item);
  var d;

  var introPage = false;
  if (fid.charAt(0) === "*") {
      introPage = true;
  }

  // item is not a date
  if (introPage) {
    page.title = "Introduction";
  }
  else if (fid[0].search(/\d/) === -1) {
    page.title = fid.charAt(0).toUpperCase() + fid.substr(1);
  }
  // item is a date but last char is not
  else if (fid[fid.length - 1].search(/\d/) === -1) {
    d = moment(fid.substr(0, fid.length-1), "MMDDYY");
    page.title = d.format("MMM D, YYYY");
  }
  // item is a date
  else {
    d = moment(fid, "MMDDYY");
    page.title = d.format("MMM D, YYYY");
  }

  if (introPage) {
    page.url = util.format("%s%s/", this.intro, fid.substr(1));
  }
  else {
    page.url = util.format("%s%s/", this.base, fid);
  }

  if (fid.charAt(0) === "*") {
    page.fid = fid.substr(1);
  }
  else {
    page.fid = fid;
  }

  //append '/' to simplify workig with Jekyll Liquid
  page.fid = page.fid + '/';

  page.idx = idx;

  next_prev(page, arr, {base: this.base, intro: this.intro});

  return page;
}

// grad procedure for json file conversion
function grad(_item, idx, arr) {
  var page = {};
  var fid = copyObj(page, _item);
  var item;
  var d;

  var introPage = false;
  if (fid.charAt(0) === "*") {
      introPage = true;
  }

  //remove the 'g'
  if (introPage) {
    item = fid.substr(2);
  }
  else {
    item = fid.substr(1);
  }

  // filter non-date values
  switch(item) {
    case "rad":
      page.title = "Introduction";
      break;
    case "000001":
      page.title = "Title Page";
      break;
    case "000002":
      page.title = "Author's Note";
      break;
    case "000003":
      page.title = "Foreword";
      break;
    default:
      d = moment(item, "MMDDYY");
      page.title = d.format("MMM D, YYYY");
      break;
  }

  //restore item to argument value
  item = fid;
  if (introPage) {
    page.url = util.format("%s%s/", this.intro, item.substr(1));
  }
  else {
    page.url = util.format("%s%s/", this.base, item);
  }
  page.idx = idx;

  next_prev(page, arr, {base: this.base, intro: this.intro});

  if (item.charAt(0) === "*") {
    page.fid = item.substr(1);
  }
  else {
    page.fid = item;
  }

  //append '/' to simplify workig with Jekyll Liquid
  page.fid = page.fid + '/';

  return page;
}

// wom (woh, t, k)  procedure for json file conversion
function wom(item, idx, arr) {
  var page = {};
  var fid = copyObj(page, item);
  var lesson = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

  var introPage = false;
  if (fid.charAt(0) === "*") {
      introPage = true;
  }

  //Assign title
  if ((!introPage && fid.charAt(0) === "w") || (introPage && fid.charAt(1) === "w")) {
    page.title = "About";
  }
  else {
    page.title = "Lesson " + lesson[Number.parseInt(fid.substr(1), 10)];
  }

  if (introPage) {
    page.url = util.format("%s%s/", this.intro, fid.substr(1));
  }
  else {
    page.url = util.format("%s%s/", this.base, fid);
  }
  page.idx = idx;

  next_prev(page, arr, {base: this.base, intro: this.intro});

  if (page.fid.charAt(0) === "*") {
    page.fid = page.fid.substr(1);
  }

  //append '/' to simplify workig with Jekyll Liquid
  page.fid = page.fid + '/';

  return page;
}

// wom (early years)  procedure for json file conversion
function early(item, idx, arr) {
  var page = {};

  if (item.fid.charAt(0) === "*") {
    page.url = util.format("%s%s/", this.intro, item.fid.substr(1));
  }
  else {
    page.url = util.format("%s%s/", this.base, item.fid);
  }

  page.title = item.title;
  page.idx = idx;

  next_prev(page, arr, {base: this.base, intro: this.intro});

  if (item.fid.charAt(0) === "*") {
    page.fid = item.fid.substr(1);
  }
  else {
    page.fid = item.fid;
  }

  //append '/' to simplify workig with Jekyll Liquid
  page.fid = page.fid + '/';
  return page;
}

//input data
var data = json.readFileSync("data.json");

//output data
var yml = {};

var outfile;
var id = "acim";

if (data.id) {
  id = data.id;
}

if (id === "acim" && !data.year) {
  console.log("data.year required for 'acim' conversion, or you need to specify data.id if not 'acim'");
  process.exit(1);
}

if (id != "acim" && (!data.outfile || !data.base || !data.pages || !data.outfile )) {
  console.log("data.json syntax error: ");
  console.log("-- example format: ", example);
  process.exit(1);
}

console.log("Conversion procedure: %s", id);

var domain = _.pick(data, "domain");
if (!_.isEmpty(domain)) {
  yml = domain;
}

switch (id) {
  //acim contents by year
  case "acimc":
    yml.base = data.base;
    yml.intro = data.intro;
    yml.page = _.map(data.pages, acimc, {base: yml.base, intro: yml.intro});
    outfile = data.outfile;
    break;
  //acim contents for a given year
  case "acim":
    yml.base = "/nwffacim/acim/" + data.year + "/";
    yml.intro = data.intro;
    yml.page = _.map(data.pages, acim, {year: data.year, base: yml.base, intro: yml.intro});
    outfile = data.year + ".json";
    break;
  case "yaa":
    yml.base = data.base;
    yml.intro = data.intro;
    yml.page = _.map(data.pages, yaa, {base: yml.base, intro: yml.intro});
    outfile = data.outfile;
    break;
  case "grad":
    yml.base = data.base;
    yml.intro = data.intro;
    yml.page = _.map(data.pages, grad, {base: yml.base, intro: yml.intro});
    outfile = data.outfile;
    break;
  case "wom":
    yml.base = data.base;
    yml.intro = data.intro;
    yml.page = _.map(data.pages, wom, {base: yml.base, intro: yml.intro});
    outfile = data.outfile;
    break;
  case "early":
    yml.base = data.base;
    yml.intro = data.intro;
    yml.page = _.map(data.pages, early, {base: yml.base, intro: yml.intro});
    outfile = data.outfile;
    break;
  default:
    console.log("Unknown identifier, use either 'acmi', 'yaa', 'grad', 'early', or 'wom' [for woh, wot, wok]");
    process.exit(1);
}

//console.log(util.inspect(yml, false, null));
//json.writeFileSync(data.year + ".json", yml, {spaces: 2});
console.log("writing: %s", outfile);
json.writeFileSync(outfile, yml, {spaces: 2});


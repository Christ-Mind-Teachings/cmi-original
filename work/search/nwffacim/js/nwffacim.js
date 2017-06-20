"use strict";

var yaaData = require("./yaa");
var gradData = require("./grad");
var acimData = require("./acim");

var TEN_MILLION = 10000000;
var ONE_THOUSAND = 1000;

function calcKey(bid, uid, pid) {
  var key;

  if (!pid) {
    key = (bid * TEN_MILLION) + (uid * ONE_THOUSAND);
  }
  else {
    key = (bid * TEN_MILLION) + (uid * ONE_THOUSAND) + pid;
  }

  return key;
}

function decodeUnitId(bid, unitId) {
  var uid;
  var year;

  switch(bid) {
    case 1:
      uid = yaaData.decodeUnitId(unitId);
      break;
    case 2:
      uid = gradData.decodeUnitId(unitId);
      break;
    default:
      year = acimData.getYear(bid);
      uid = acimData.decodeUnitId(unitId);
      uid = uid + year.substr(2,2);
      break;
  }

  return uid;
}

function parseKey(key) {
  var bid;
  var uid;
  var pid;
  var unit;
  var unitId;

  key = Number.parseInt(key, 10);
  bid = Number.parseInt(key / TEN_MILLION, 10);
  unit = key % TEN_MILLION;
  unitId = Number.parseInt(unit / ONE_THOUSAND, 10);
  pid = unit % ONE_THOUSAND;

  uid = decodeUnitId(bid, unitId);

  return {
    key: key,
    bid: bid,
    uid: uid,
    pid: pid
  };
}

function getKeyYaa(unitIdx) {
  var bid = yaaData.getBookId();
  var uid = 0;

  if (unitIdx) {
    uid = yaaData.getUnitId(unitIdx);
  }
  return calcKey(bid, uid);
}

function getKeyGrad(unitIdx) {
  var bid = gradData.getBookId();
  var uid = 0;

  if (unitIdx) {
    uid = gradData.getUnitId(unitIdx);
  }
  return calcKey(bid, uid);
}

function getKeyAcim(book, unitIdx) {
  var yidx = acimData.getBookIndex(book);
  var bid;
  var uid = 0;

  if (yidx === -1) {
    return {book: "", bid: 0, first: 0, last: 0};
  }

  bid = acimData.getBookId(yidx);

  if (unitIdx) {
    uid = acimData.getUnitId(yidx, unitIdx);
  }

  return calcKey(bid, uid);
}

module.exports = {
  books: [
    "yaa", "grad", "2002", "2003", "2004", "2005", "2006", "2007",
    "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015",
    "2016"
  ],
  getAlphaOmega: function(book, uidx) {
    var keyFirst;
    var keyLast;
    var bid;
    var unit = "";

    if (book === "yaa") {
      bid = yaaData.bid;
      if (!uidx) {
        keyFirst = getKeyYaa();
        keyLast = getKeyYaa(yaaData.unit.length - 1) + 999;
      }
      else {
        unit = yaaData.unit[uidx];
        keyFirst = getKeyYaa(uidx);
        keyLast = keyFirst + 999;
      }
    }
    else if (book === "grad") {
      bid = gradData.bid;
      if (!uidx) {
        keyFirst = getKeyGrad();
        keyLast = getKeyGrad(gradData.unit.length - 1) + 999;
      }
      else {
        unit = gradData.unit[uidx];
        keyFirst = getKeyGrad(uidx);
        keyLast = keyFirst + 999;
      }
    }
    else {
      var yidx = acimData.getBookIndex(book);
      bid = acimData.year[yidx].bid;
      if (!uidx) {
        keyFirst = getKeyAcim(book);
        keyLast = getKeyAcim(book, acimData.year[yidx].unit.length - 1) + 999;
      }
      else {
        unit = acimData.year[yidx].unit[uidx];
        keyFirst = getKeyAcim(book, uidx);
        keyLast = keyFirst + 999;
      }
    }

    return {
      bid: bid,
      book: book,
      unit: unit,
      first: keyFirst,
      last: keyLast
    };
  },

  getKey(bid, uid, pid) {
    var b = Number.parseInt(bid, 10);
    var u = Number.parseInt(uid, 10);
    var p = Number.parseInt(pid, 10);

    return calcKey(b, u, p);
  },

  parseKey: parseKey,

  getUnitArray(book) {
    var yidx;
    if (book === "yaa") {
      return yaaData.unit;
    }
    else if (book === "grad") {
      return gradData.unit;
    }
    else {
      yidx = acimData.getBookIndex(book);
      return acimData.year[yidx].unit;
    }
  }

};



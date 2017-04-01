module.exports = {
  source: "nwffacim",
  book: "yaa",
  bid: 1,
  unit: [
    "foreword", "020782", "020882", "020982", "021082", "021182a", "021182b",
    "021282", "021382", "021482", "021682", "021782", "021882a", "021882b",
    "021882c", "021982", "022082", "022182a", "022182b", "022382a", "022382b",
    "022382c", "022482", "022582", "022682a", "022682b", "022682c", "022782",
    "022882", "030182a", "030182b", "030282", "030382", "030482a", "030482b",
    "030582a", "030582b", "030682a", "030682b", "030682c", "030682d", "030682e",
    "030882", "030982", "031082a", "031082b", "031082c", "031182", "031382",
    "031582", "031982", "032982", "033082", "042782", "042882", "042982",
    "043082", "050182", "050282", "050382", "050782", "050982", "051082a",
    "051082b", "051082c", "051182", "051582", "051782", "052882", "053082",
    "060382", "061082", "061282", "061482", "061982", "062182", "afterword"
  ],
  getBookId: function() {
    return this.bid;
  },
  decodeUnitId: function(unitId) {
    var partArray = ["","a","b","c","d","e","f"];
    var unit = unitId;
    var mm;
    var dd;
    var remainder;

    if (unitId === 1) {
      unit = "foreword";
    }
    else if (unitId === 7000) {
      unit = "afterword";
    }
    else {
      mm = Number.parseInt(unitId / 1000, 10);
      remainder = unitId % 1000;
      dd = Number.parseInt(remainder / 10, 10);
      remainder = remainder % 10;

      if (mm < 10) {
        mm = "0" + mm;
      }
      else {
        mm = "" + mm;
      }
      if (dd < 10) {
        dd = "0" + dd;
      }
      else {
        dd = "" + dd;
      }

      unit = mm + dd + + "82" + partArray[remainder];
    }

    return unit;
  },
  getUnitId: function(idx) {
    var letters = "0abcdefghij";
    var mm;
    var dd;
    var pos = 0;

    if (idx === 0) {
      uid = 1;
    }
    else if (idx === this.unit.length - 1) {
      uid = 7000;
    }
    else {
      mm = Number.parseInt(this.unit[idx].substr(0, 2), 10);
      dd = Number.parseInt(this.unit[idx].substr(2, 2), 10);

      //all values are 6 digit dates in mmddyy format
      // - the exception is for dates with multiple parts, they are indicated
      //   by a trailing letter
      if (this.unit[idx].length === 7) {
        pos = letters.search(this.unit[idx][6]);
      }

      uid = (mm * 1000) + (dd * 10) + pos;
    }

    return uid;
  }
};



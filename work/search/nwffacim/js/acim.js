var _ = require("underscore");

module.exports = {
  source: "nwffacim",
  year: [
    {
      book: "2002",
      bid: 3,
      unit: [
        "061202", "073102", "080702", "081402", "082802",
        "090402", "091102", "091802", "092502", "100202",
        "101002", "101702", "102402", "103102", "110702",
        "112102", "120502", "121202", "121902"
      ]
    },
    {
      book: "2003",
      bid: 4,
      unit: []
    },
    {
      book: "2004",
      bid: 5,
      unit: []
    },
    {
      book: "2005",
      bid: 6,
      unit: []
    },
    {
      book: "2006",
      bid: 7,
      unit: []
    },
    {
      book: "2007",
      bid: 8,
      unit: []
    },
    {
      book: "2008",
      bid: 9,
      unit: []
    },
    {
      book: "2009",
      bid: 10,
      unit: []
    },
    {
      book: "2010",
      bid: 11,
      unit: []
    },
    {
      book: "2011",
      bid: 12,
      unit: []
    },
    {
      book: "2012",
      bid: 13,
      unit: []
    },
    {
      book: "2013",
      bid: 14,
      unit: []
    },
    {
      book: "2014",
      bid: 15,
      unit: []
    },
    {
      book: "2015",
      bid: 16,
      unit: []
    },
    {
      book: "2016",
      bid: 17,
      unit: []
    },
    {
      book: "2017",
      bid: 18,
      unit: []
    }
  ],
  getYear: function(bid) {
    var i;
    var year = "0000";

   for (i = 0; i < this.year.length; i++) {
     if (this.year[i].bid === bid) {
       year = this.year[i].book;
       break;
     }
   }

   return year;
  },
  getBookId: function(yidx) {
    return this.year[yidx].bid;
  },
  decodeUnitId: function(unitId) {
    var unit = unitId;
    var mm;
    var dd;
    var remainder;

    mm = unitId / 100;
    dd = unitId % 100;

    if (mm < 10) {
      mm = "0" + mm;
    }

    if (dd < 10) {
      dd = "0" + dd;
    }

    return mm + dd;
  },
  getUnitId: function(yidx, uidx) {
    var mm;
    var dd;

    if (this.year[yidx].unit.length === 0) {
      return 0;
    }

    mm = Number.parseInt(this.year[yidx].unit[uidx].substr(0, 2), 10);
    dd = Number.parseInt(this.year[yidx].unit[uidx].substr(2, 2), 10);

    uid = (mm * 100) + dd;
    return uid;
  },
  getBookIndex: function(book) {
    var idx = _.findIndex(this.year, function(item) {
      if (item.book === this.book) {
        return true;
      }
    }, {book: book});

    return idx;
  }
  /*
  calcKey: function(yidx, uidx) {
    //if no uidx arg passed return the key for the book
    if (!uidx) {
      return this.year[yidx].bid * 10000000;
    }

    var uid = this.calcUid(yidx, uidx);
    return (this.year[yidx].bid * 10000000) + (uid * 1000);
  },
  getAlphaOmega(yidx, uidx) {
    var ao = {
      book: this.year[yidx].book,
      bid: this.year[yidx].bid,
      first: 0, last: 0
    };

    //not all years are ready yet
    if (this.year[yidx].unit.length === 0) {
      return ao;
    }

    //return first and last keys for the book
    if (!uidx) {
      ao.first = this.calcKey(yidx);
      ao.last = this.calcKey(yidx, this.year[yidx].unit.length - 1) + 999;
    }
    //return first and last for the unit
    else {
      ao.first = this.calcKey(yidx, this.year[yidx].unit[uidx]);
      ao.last = ao.first + 999;
    }

    return ao;
  },
  */
};


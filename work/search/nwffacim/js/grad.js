module.exports = {
  source: "nwffacim",
  book: "grad",
  bid: 2,
  unit: [
    "g000002", "g000003", "g010491", "g010591", "g011491", "g011591",
    "g011691", "g011891", "g012091", "g012591", "g012791", "g020291",
    "g020591", "g020691", "g021291", "g021391", "g021491", "g022091",
    "g022591", "g030291", "g030891", "g031491", "g031991", "g032091",
    "g032191", "g032291", "g032591", "g032991"
  ],
  getBookId: function() {
    return this.bid;
  },
  decodeUnitId: function(unitId) {
    var unit = unitId;
    var mm;
    var dd;
    var remainder;

    if (unitId === 1) {
      unit = "AuthorNotes";
    }
    else if (unitId === 2) {
      unit = "foreword";
    }
    else {
      mm = unitId / 100;
      remainder = unitId % 100;
    }

    return "" + unitId;
  },
  getUnitId: function(idx) {
    var mm;
    var dd;

    if (idx === 0) {
      uid = 1;
    }
    else if (idx === 1) {
      uid = 2;
    }
    else {
      mm = Number.parseInt(this.unit[idx].substr(1, 2), 10);
      dd = Number.parseInt(this.unit[idx].substr(3, 2), 10);

      uid = (mm * 100) + dd;
    }

    return uid;
  }
};


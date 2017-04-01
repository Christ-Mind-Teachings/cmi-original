var AWS = require("aws-sdk");
var program = require("commander");
var nwffacim = require("./js/nwffacim");

var local = "http://localhost:8000";
var remote = "https://dynamodb.us-east-1.amazonaws.com";

var awsConfig = {
  region: "us-east-1"
};

program
  .version('0.0.1')
  .option('-e, --endpoint <dblocation>', "Db location, either local or remote")
  .parse(process.argv);

if (!program.endpoint) {
  console.log("specify endpoint of either '-e local' or '-e remote'");
  process.exit(1);
}

if (program.endpoint === "remote") {
  awsConfig.endpoint = remote;
}
else {
  awsConfig.endpoint = local;
}

AWS.config.update(awsConfig);
var dynamodb = new AWS.DynamoDB();

var params = {
  TableName: "nwffacim",
  KeyConditionExpression: "bid = :book and #kee BETWEEN :first AND :last",
  ExpressionAttributeNames: {
    "#kee": "key"
  },
  Select: "COUNT"
};

var parms;
var values;

for (var i = 0; i < nwffacim.books.length; i++) {
  values = {};
  parms = nwffacim.getAlphaOmega(nwffacim.books[i]);
  //console.log("parms: ", parms);

  values[":book"] = {"N": parms.bid.toString()};
  values[":first"] = {"N": parms.first.toString()};
  values[":last"] = {"N": parms.last.toString()};

  params.ExpressionAttributeValues = values;

  var callback = count.bind(parms);
  dynamodb.query(params, callback);

  var units = nwffacim.getUnitArray(nwffacim.books[i]);
  for (var u = 0; u < units.length; u++) {
    values = {};
    parms = nwffacim.getAlphaOmega(nwffacim.books[i], u);
    //console.log("parms: ", parms);

    values[":book"] = {"N": parms.bid.toString()};
    values[":first"] = {"N": parms.first.toString()};
    values[":last"] = {"N": parms.last.toString()};

    params.ExpressionAttributeValues = values;

    var callback = count.bind(parms);
    dynamodb.query(params, callback);
  }
}

function count(err, data) {
  if (err) {
    console.log("error: ", err);
    return;
  }

  console.log("%s(%s): %s", this.book, this.unit, data.Count);
}



var AWS = require("aws-sdk");
var program = require("commander");

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

/*
  ExpressionAttributeValues: {
    ":first": {"N": "101000"},
    ":last" : {"N": "102000"},
    ":book" : {"N": "1"}
  },
  KeyConditionExpression: "bid = :book and #kee BETWEEN :first AND :last",
*/

var params = {
  TableName: "wom",
  KeyConditionExpression: "bid = :book and #kee BETWEEN :first AND :last",
  ExpressionAttributeNames: {
    "#kee": "key"
  },
  Select: "COUNT"
};

var dynamodb = new AWS.DynamoDB();

function getParms(book, lesson) {
  var info = {};

  info.bid = book;

  if (lesson) {
    info.lesson = lesson<10?"0"+lesson:""+lesson;
  }
  else {
    info.lesson = "00";
  }
  switch(book) {
    case 1:
      info.book = "woh1";
      break;
    case 2:
      info.book = "wot2";
      break;
    case 3:
      info.book = "wok3";
      break;
    case 4:
      info.book = "tjl4";
      break;
    case 5:
      info.book = "wos5";
      break;
    default:
      info.book = "???6";
      break;
  }

  if (lesson) {
    info.first = (info.bid * 10000000) + (lesson * 1000);
    info.last = (info.bid * 10000000) + (lesson * 1000) + 999;
  }
  else {
    info.first = (info.bid * 10000000) + 1000;
    info.last = (info.bid * 10000000) + 12999;
  }

  return info;
}

var parms;
var values;

for (var i=1; i < 6; i++) {
  values = {};
  parms = getParms(i);

  values[":book"] = {"N": parms.bid.toString()};
  values[":first"] = {"N": parms.first.toString()};
  values[":last"] = {"N": parms.last.toString()};

  params.ExpressionAttributeValues = values;

  var callback = count.bind(parms);
  dynamodb.query(params, callback);

  for (var l=1; l < 13; l++) {
    if (i === 3 && l === 12) {
      continue;
    }
    if (i === 5 && l > 4) {
      continue;
    }
    values = {};
    parms = getParms(i, l);

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

  console.log("%s%s=%s", this.book, this.lesson, data.Count);
}



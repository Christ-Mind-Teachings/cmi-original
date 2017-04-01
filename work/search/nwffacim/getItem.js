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
  .option('-k, --key [key]', "Keys supplied as args rather than <bid uid pid>")
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

var key;
var info = {};

AWS.config.update(awsConfig);
var dynamodb = new AWS.DynamoDB();

//user will provide <bid> <uid> [pid] as input and key8 will be calculated
if (!program.key) {
  if (program.args.length < 2) {
    console.log("specify query key as: <bid> <uid> [pid]");
    process.exit(1);
  }

  var  bid = program.args[0];
  var  uid = program.args[1];
  var pid = 0;

  if (program.args.length > 2) {
    pid = program.args[2];
  }

  info.bid = bid;
  info.uid = uid;
  info.pid = pid;

  key = nwffacim.getKey(bid, uid, pid);

  info.key = key;

  getItem(info);
}
else {
  // user supplying keys
  program.args.forEach(function(key) {
    var info = nwffacim.parseKey(key);
    getItem(info);
  });
}

function getItem(info) {
  var params = {
    TableName: "nwffacim",
    Key: {
      "bid": {
        N: info.bid.toString()
      },
      "key": {
        N: info.key.toString()
      }
    }
  };

  //var callback = cb.bind(info);
  dynamodb.getItem(params, cb);
}

function cb(err, data) {
  if (err) {
    console.log("error: ", err);
    return;
  }

  console.log(data);
}



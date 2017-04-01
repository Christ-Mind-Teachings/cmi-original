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

var dynamodb = new AWS.DynamoDB();

/*
var params = {
    TableName : "wom",
    KeySchema: [
        { AttributeName: "book", KeyType: "HASH"},  //Partition key
        { AttributeName: "key", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "book", AttributeType: "S" },
        { AttributeName: "key", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};
*/

var params = {
    TableName : "nwffacim",
    KeySchema: [
        { AttributeName: "bid", KeyType: "HASH"},  //Partition key
        { AttributeName: "key", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "bid", AttributeType: "N" },
        { AttributeName: "key", AttributeType: "N" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

/*
var params = {
    TableName : "wom",
    KeySchema: [
        { AttributeName: "key", KeyType: "HASH" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "key", AttributeType: "N" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};
*/

dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});


/*global require, module*/

var ApiBuilder = require("claudia-api-builder");
var AWS = require("aws-sdk");
var api = new ApiBuilder();
var dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports = api;
var tables = ["wom"];

//lower case and remove all punctuation
function prepareQueryString(query) {
  "use strict";
  var result = query.toLowerCase();
  return result.replace(/[^\w\s]/, "");
}

function getContext(qt, query, text) {
  "use strict";
  var context_size = 30;
  var start, end;
  var start_pos = text.indexOf(qt);
  var end_pos = start_pos + qt.length;
  var context;

  //this "cannot be" but test for it anyway
  if (start_pos == -1) {
    return text;
  }

  start = start_pos - context_size;
  if (start < 0) {
    start = 0;
  }

  end = end_pos + context_size;
  if (end > text.length) {
    end = text.length;
  }

  //if query is at the end of 'text' add more context to beginning
  if (end_pos == text.length) {
    start = start - context_size;
    if (start < 0) {
      start = 0;
    }
  }

  context = text.substr(start, end - start);
  //return "(" + context.length + "):" + context;

  return context.replace(qt, "<em>"+query+"</em>");
}

// use {} for dynamic path parameters
api.post("/search", function (request) {
  "use strict";

  var result = {
    domain: "https://www.christmind.info",
    message: "OK",
    match: []
  };

  console.log("api.post starting");
  if (request.body == null || typeof request.body == "undefined") {
    result.message = "request missing body";
    return result;
  }

  console.log("api.post checking if tableName is specified");
  var tableName = request.body.tableName;
  if (typeof tableName === "undefined") {
    result.message = "Error: body.tableName missing";
    return result;
  }

  console.log("api.post checking if query is specified");
  var query = request.body.query;
  if (typeof query === "undefined") {
    result.message = "Error: body.query not specified";
    return result;
  }

  console.log("api.post checking if startKey is specified");
  var startKey = request.body.startKey;
  if (typeof startKey !== "undefined") {
    if (!startKey.key || !startKey.book) {
      result.message = "Error: startKey must contain both 'key' and 'book' attributes";
      return result;
    }
  }

  var query_transformed = prepareQueryString(query);
  var validTableName = false;
  var i;

  result.query = query;
  result.query_transformed = query_transformed;

  console.log("api.post checking if valid tableName given");

  //check if requested table is valid
  for(i = 0; i < tables.length; i++) {
    if (tables[i] === tableName) {
      validTableName = true;
      break;
    }
  }

  if (!validTableName) {
    result.message = "Error: INVALID-TABLE-NAME: " + tableName;
    return result;
  }

  console.log("POST /search: ", request.body);

  var params = {
    TableName: tableName,
    ProjectionExpression: "book, #unt, pid, #txt",
    FilterExpression: "contains(#txt, :v_qs)",
    ExpressionAttributeNames: {
      "#unt": "unit",
      "#txt": "text"
    },
    ExpressionAttributeValues: {
      ":v_qs": query_transformed
    }
  };

  if (typeof startKey !== "undefined") {
    console.log("api.post assigning startKey to params.ExclusiveStartKen");
    params.ExclusiveStartKey = startKey;
  }

  console.log("api.post calling dynamoDb");
  return dynamoDb.scan(params).promise().then(function(response) {
    var i;
    console.log("api.post-scan returned, processing results");

    for (i = 0; i < response.Items.length; i++) {
      var info = {};
      var item = response.Items[i];

      info.base = "/" + tableName + "/" + item.book + "/" + item.unit + "/";
      info.location = "#" + item.pid;
      info.context = getContext(query_transformed, query, item.text);
      result.match.push(info);
    }

    result.message = "Found " + result.match.length + " matches."
    if (typeof response.LastEvaluatedKey != "undefined") {
      result.startKey = response.LastEvaluatedKey;
      result.message += " Use result.startKey to request more results.";
    }

    console.log("api.post-scan returning result set to caller");
    console.dir(result);
    return result;
  }, function(err) {
    console.log("dynamoDb error", err);
    result.message = "Database error",
    result.error = err;
    return result;
  });

});


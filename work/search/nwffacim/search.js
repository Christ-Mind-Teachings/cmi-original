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

if (program.args.length === 0) {
  console.log("enter name of json file in ./scan directory containing query");
  process.exit(1);
}

AWS.config.update(awsConfig);
var dynamoDb = new AWS.DynamoDB();
//var dynamoDb = new AWS.DynamoDB.DocumentClient();

var query = require("./scan/" + program.args[0]);
console.log("query: ", query);

search(query);

function sortResults(result) {
  var key;

  console.log("sort search results");
  for (key in result) {
    if (Array.isArray(result[key])) {
      console.log("sorting %s", key);
      result[key].sort(function(a,b) {
        return a.key - b.key;
      });
    }
  }
}

function nwffacimProcessing(result, book, info) {
  switch(book) {
    case "yaa":
      if (!result.yaa) {
        result.yaa = [];
      }
      result.yaa.push(info);
      break;
    case "grad":
      if (!result.grad) {
        result.grad = [];
      }
      result.grad.push(info);
      break;
    case "2002":
      if (!result.a2002) {
        result.a2002 = [];
      }
      result.a2002.push(info);
      break;
    default:
      if (!result.unknown) {
        result.unknown = [];
      }
      result.unknown.push(info);
      break;
  }
}

function womProcessing(result, book, info) {
  switch(book) {
    case "woh":
      if (!result.woh) {
        result.woh = [];
      }
      result.woh.push(info);
      break;
    case "wot":
      if (!result.wot) {
        result.wot = [];
      }
      result.wot.push(info);
      break;
    case "wok":
      if (!result.wok) {
        result.wok = [];
      }
      result.wok.push(info);
      break;
    case "early":
      if (!result.early) {
        result.early = [];
      }
      result.early.push(info);
      break;
    default:
      if (!result.unknown) {
        result.unknown = [];
      }
      result.unknown.push(info);
      break;
  }
}

function performSourceProcessing(result, source, book, info) {
  switch(source) {
    case "nwffacim":
      nwffacimProcessing(result, book, info);
      break;
    case "wom":
      womProcessing(result, book, info);
      break;
    default:
      break;
  }
}

//lower case and remove all punctuation
function prepareQueryString(query) {
  "use strict";
  var result = query.toLowerCase();
  return result.replace(/[^\w\s]/, "");
}

/*
 * filter result set
 *
 * Default filter: all matches must start at word boundary, filter all the rest
 */
function filter(request, query, text) {
  var pos;
  var result = false;

  //don't filter result set if 'filter' passed to request
  if (request.filter) {
    result = false;
  }
  else {
    //default filter: query term must start at a word boundary
    pos = text.indexOf(query);

    if (pos === -1) {
      //this should never happen
      console.log("Yikes!! filter(): query string not found in text");
    }
    else if (pos > 0) {
      if (/\w/.test(text.charAt(pos-1))) {
        console.log("filtered paragraph(%s): ", pos, text);
        result = true;
      }
    }
  }

  return result;
}

/*
 * args: qt: query string transformed to remove punctuation and upper case chars
 *       query: original query string
 *       text: text containing the query
 *       width: width of context to return
 *         - length is: <width>query<width>
 *
 *  Return query hit in context of surrounding text
 */
function getContext(qt, query, text, width) {
  "use strict";
  var contextSize = width;
  var start, end;
  var startPos = text.indexOf(qt);
  var endPos = startPos + qt.length;
  var context;

  //this "cannot be" but test for it anyway
  if (startPos === -1) {
    return text;
  }

  //don't trim the matched text when contextSize == 0
  if (contextSize === 0) {
    start = 0;
    end = text.length;
  }
  else {
    start = startPos - contextSize;
    if (start < 0) {
      start = 0;
    }

    end = endPos + contextSize;
    if (end > text.length) {
      end = text.length;
    }

    //if query is at the end of 'text' add more context to beginning
    if (endPos === text.length) {
      start = start - contextSize;
      if (start < 0) {
        start = 0;
      }
    }

    //decrease 'start' so we don't return partial words at the beginning of match
    while (start > 0 && text.charAt(start) !== " ") {
      start--;
    }

    //increase 'end' so we don't return partial words at the end of match
    while(end < text.length - 1 && text.charAt(end) !== " ") {
      end++;
    }
  }

  context = text.substr(start, end - start);

  //delimit query within the string
  return context.replace(qt, "<em>"+query+"</em>");
}

function search(request) {
  "use strict";

  var tables = ["wom", "nwffacim"];
  var result = {
    domain: "https://www.christmind.info",
    message: "OK"
  };

  //console.log("api.post starting");
  if (request.body === null || typeof request.body === "undefined") {
    result.message = "request missing body";
    return result;
  }

  var userRequest = request.body;

  //console.log("api.post checking if source is specified");
  var source = userRequest.source;
  if (typeof source === "undefined") {
    result.message = "Error: body.source missing";
    return result;
  }

  result.source = source;

  //console.log("api.post checking if query is specified");
  var query = userRequest.query;
  if (typeof query === "undefined") {
    result.message = "Error: body.query not specified";
    return result;
  }

  //console.log("api.post checking if startKey is specified");
  var startKey = userRequest.startKey;
  if (typeof startKey !== "undefined") {
    if (!startKey.key || !startKey.bid) {
      result.message = "Error: startKey must contain both 'key' and 'bid' attributes";
      return result;
    }
  }

  var width = 30;
  if (typeof userRequest.width !== "undefined") {
    width = Number.parseInt(userRequest.width, 10);
    if (Number.isNaN(width) || width < 0) {
      width = 30;
    }
  }

  result.width = width;

  var queryTransformed = prepareQueryString(query);
  var validTableName = false;
  var i;

  result.query = query;
  result.queryTransformed = queryTransformed;

  //check if requested table is valid
  for(i = 0; i < tables.length; i++) {
    if (tables[i] === source) {
      validTableName = true;
      break;
    }
  }

  if (!validTableName) {
    result.message = "Error: INVALID-TABLE-NAME: " + source;
    return result;
  }

  console.log("POST /search: ", request.body);

  var params = {
    TableName: source,
    ProjectionExpression: "book, bid, #kee, #unt, pid, #txt",
    FilterExpression: "contains(#txt, :v_qs)",
    ExpressionAttributeNames: {
      "#unt": "unit",
      "#txt": "text",
      "#kee": "key"
    },
    ExpressionAttributeValues: {
      ":v_qs": {
        S: queryTransformed
      }
    }
  };

  if (typeof startKey !== "undefined") {
    console.log("api.post assigning startKey to params.ExclusiveStartKen");
    params.ExclusiveStartKey = startKey;
  }

  console.log("api.post calling dynamoDb");
  return dynamoDb.scan(params,function(err, response) {
    if (err) {
      console.log("scan failed: ", err);
      return;
    }

    var i;
    var filteredCount = 0;
    console.log("api.post-scan returned, processing results");

    for (i = 0; i < response.Items.length; i++) {
      var info = {};
      var item = response.Items[i];

      //console.log("item: ", item);

      //filter matches from result set returned to user to
      //user specified terms or default to word boundaries
      if (filter(userRequest, queryTransformed, item.text.S)) {
        //console.log("key: %s filtered from result set", item.key);
        continue;
      }

      filteredCount++;
      info.table = source;
      info.book = item.book.S;
      info.unit = item.unit.S;
      info.location = "#p" + item.pid.N;
      info.key = item.key.N;
      info.base = "/" + source + "/" + item.book.S + "/" + item.unit.S + "/";
      info.context = getContext(queryTransformed, query, item.text.S, width);

      performSourceProcessing(result, source, item.book.S, info);

    }

    result.count = filteredCount;
    sortResults(result);

    if (typeof response.LastEvaluatedKey !== "undefined") {
      result.startKey = response.LastEvaluatedKey;
    }

    console.log("result: ", result);
    return result;

  });
}


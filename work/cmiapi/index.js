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

function filter(request, query, text) {
  var pos;
  var result = false;

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

api.post("/request", function(request) {
  return request;
});

// use {} for dynamic path parameters
api.post("/search", function (request) {
  "use strict";

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
      ":v_qs": queryTransformed
    }
  };

  if (typeof startKey !== "undefined") {
    console.log("api.post assigning startKey to params.ExclusiveStartKen");
    params.ExclusiveStartKey = startKey;
  }

  console.log("api.post calling dynamoDb");
  return dynamoDb.scan(params).promise().then(function(response) {
    var i;
    var filteredCount = 0;
    console.log("api.post-scan returned, processing results");

    for (i = 0; i < response.Items.length; i++) {
      var info = {};
      var item = response.Items[i];

      //filter matches from result set returned to user to
      //user specified terms or default to word boundaries
      if (filter(userRequest, queryTransformed, item.text)) {
        //console.log("key: %s filtered from result set", item.key);
        continue;
      }

      filteredCount++;
      info.table = source;
      info.book = item.book;
      info.unit = item.unit;
      info.location = "#p" + item.pid;
      info.key = item.key;
      info.base = "/" + source + "/" + item.book + "/" + item.unit + "/";
      info.context = getContext(queryTransformed, query, item.text, width);

      //organize results by book to simplify access by client
      switch(item.book) {
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
        default:
          if (!result.unknown) {
            result.unknown = [];
          }
          result.unknown.push(info);
          break;
      }
    }

    result.count = filteredCount;
    /*
    console.log("total hits: %s", result.count);
    if (result.woh) {
      console.log("total from woh: ", result.woh.length);
    }
    if (result.wot) {
      console.log("total from wot: ", result.wot.length);
    }
    if (result.wok) {
      console.log("total from wok: ", result.wok.length);
    }
   */

    //sort result arrays
    if (result.woh) {
      result.woh.sort(function(a,b) {
        return a.key - b.key;
      });
    }
    if (result.wot) {
      result.wot.sort(function(a,b) {
        return a.key - b.key;
      });
    }
    if (result.wok) {
      result.wok.sort(function(a,b) {
        return a.key - b.key;
      });
    }

    if (typeof response.LastEvaluatedKey !== "undefined") {
      result.startKey = response.LastEvaluatedKey;
    }

    return result;

  }, function(err) {
    console.log("dynamoDb error", err);
    result.message = "Database error",
    result.error = err;
    return result;
  });

});


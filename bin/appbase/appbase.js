"use strict";

var Appbase = require('appbase-js');

var appbaseRef;

function bulk(type, arr, cb) {
  appbaseRef.bulk({type: type, body: arr})
  .on("data", function(response) {
    if (cb) cb("success", response);
    else console.log("%s success", id);
  })
  .on("error", function(error) {
    if (cb) cb("error", error);
    else console.log("%s error: %s", id, error);
  });
}

function remove(type, id, cb) {
  appbaseRef.delete({type: type, id: id})
  .on("data", function(response) {
    if (cb) {
      cb("success", response);
    }
    else {
      console.log("%s success", id);
    }
  })
  .on("error", function(error) {
    if (cb) {
      cb("error", error);
    }
    else {
      console.log("%s error: %s", id, error);
    }
  });
}

function index(type, id, body, cb) {
  appbaseRef.index({type: type, id: id, body: body})
  .on("data", function(response) {
    if (cb) {
      cb("success", response);
    }
    else {
      console.log("%s success", id);
    }
  })
  .on("error", function(error) {
    if (cb) {
      cb("error", error);
    }
    else {
      console.log("%s error: %s", id, error);
    }
  });
}

module.exports = {
  init: function(appname, username, password) {
    appbaseRef = new Appbase({
      url: "https://scalr.api.appbase.io",
      appname: appname,
      username: username,
      password: password
    });
  },

  remove: function(body) {
    var id = `${body.book}:${body.unit}:${body.pid}`;
    remove(body.source, id, function(status, response) {
      if (status === "success") {
        console.log("deleted: ", response);
      }
      else {
        console.log("error: ", response);
      }
    });
  },

  put: function(body) {
    var id = `${body.book}:${body.unit}:${body.pid}`;

    //console.log("type: %s, id: %s", body.source, id);
    index(body.source, id, body, function(status, response) {
      if (status === "success") {
        console.log("type: %s, id: %s, created: %s",
          response._type, response._id, response.created);
      }
      else {
        console.log("%s: error: ", id, response);
      }
    });
  },

  bulk_put: function(type, bArr) {
    var body = [];
    for(var i=0; i<bArr.length; i++) {
      body.push({index: {_id: `${bArr[i].book}:${bArr[i].unit}:${bArr[i].pid}`}});
      body.push(bArr[i]);
    }
    bulk(type, body, function(status, response) {
      if (status === "success") {
        console.log("successful bulk index, took: %s, errors: %s", response.took, response.errors);
      }
      else {
        console.log("bulk index error: ", response);
      }
    });
  }
};


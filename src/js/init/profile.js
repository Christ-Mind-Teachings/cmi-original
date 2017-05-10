"use strict";

var bookmark = require("../ui/bookmark");
var notify = require("toastr");
var store = require("store");

var registered = false;
var userInfo;

module.exports = {
  initialize: function() {
    bookmark.initialize();

    userInfo = store.get("userInfo");
    console.log("userInfo: ", userInfo);
    if (userInfo) {
      registered = true;
      $("#name").val(userInfo.name);
      $("#userId").val(userInfo.uid);
      $("#email").val(userInfo.email);
    }
    else {
      userInfo = {};
    }

    //setup contact form submit handler
    $("#user-form").submit(function(e) {
      e.preventDefault();

      var form = $(this);
      userInfo.name = $("#name").val();
      userInfo.uid = $("#userId").val();
      userInfo.email = $("#email").val();
      console.log("id: %s, name: %s, email: %s", userInfo.uid, userInfo.name, userInfo.email);

      store.set("userInfo", userInfo);

      $.post(form.attr("action"), form.serialize())
        .done(function() {
          if (registered) {
            notify.success("Profile Updated");
          }
          else {
            notify.success("Profile Created");
          }
          form[0].reset();
        })
        .fail(function(e) {
          if (registered) {
            notify.error("Drat! Failed to update your profile.");
          }
          else {
            notify.error("Drat! Failed to create your profile.");
          }
        });
    });
  }
};


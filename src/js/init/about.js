"use strict";

var bookmark = require("../ui/bookmark");
var notify = require("toastr");

module.exports = {
  initialize: function() {
    bookmark.initialize();

    //setup contact form submit handler
    $("#contact-form").submit(function(e) {
      e.preventDefault();

      var form = $(this);
      var message = $("#contact-form #message").eq(0).val().replace(/\s+/, "");
      if (message.length === 0) {
        notify.error("Don't forget to fill out the message field.");
        return false;
      }

      $.post(form.attr("action"), form.serialize())
        .done(function() {
          notify.success("Thank you!");
          form[0].reset();
        })
        .fail(function(e) {
          notify.error("Drat! Your messaged failed to send.");
        });
    });

    //setup subscribe form submit handler
    $("#subscribe-form").submit(function(e) {
      e.preventDefault();

      var form = $(this);

      $.post(form.attr("action"), form.serialize())
        .done(function() {
          notify.success("Thank you!");
          form[0].reset();
        })
        .fail(function(e) {
          notify.error("Drat! Your subscription failed to send.");
        });
    });

  }
};


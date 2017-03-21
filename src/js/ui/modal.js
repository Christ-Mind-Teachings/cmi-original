"use strict";

module.exports = {
  //ui/modal.js

  initialize: function(trigger) {

    //$("#modal-1").on("change", function() {
    $(trigger).on("change", function() {
      if ($(this).is(":checked")) {
        $("body").addClass("modal-open");
      }
      else {
        $("body").removeClass("modal-open");
      }
    });

    $(".modal-fade-screen, .modal-close").on("click", function() {
      $(".modal-state:checked").prop("checked", false).change();
    });

    $(".modal-inner").on("click", function(e) {
      e.stopPropagation();
    });
  }

};


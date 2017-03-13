function load() {
  if (!window.annotator) {
    // create a script tag
    var scriptTag = document.createElement("script");

    // find the first script tag in the document
    var firstScriptTag = document.getElementsByTagName("script")[0];

    // set the source of the script to your script
    scriptTag.src = "https://hypothes.is/embed.js";

    // append the script to the DOM
    firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);
  }
  else {
    console.log("hypothes.is already loaded");
  }
}

function unload() {
  if (window.annotator) {
    window.annotator.destroy();
    delete window.annotator;
  }
}


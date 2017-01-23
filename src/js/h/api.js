/*
 * Query hypothes.is API
 *
 * See docs at https://h.readthedocs.io/en/latest/api/
*/

"use strict";

/*
 * call the hypothes.is search API
 *
 * Args: 
 *  query: search parameters for API
 *  auth: API Token from https://hypothes.is/account/developer (when logged in)
 *
 *  'auth' is optional and needed when requesting group annotations
 */
function search(query, auth) {
  var searchAPI = "https://hypothes.is/api/search?";
  var xhr = new XMLHttpRequest();
  xhr.open("GET", searchAPI + query);

  if (auth) {
    xhr.setRequestHeader("Authorization", "Bearer " + auth);
  }

  xhr.send();
  return xhr;
}

/*
 * call the hypothes.is annotations API
 *
 * ARGS:
 *  id: identifier of annotation to return
 *  auth: API Token from https://hypothes.is/account/developer (when logged in)
 *
 *  'auth' is optional and needed when requesting group annotations
 */
function annotations(id, auth) {
  var api = "https://hypothes.is/api/annotations/";
  var xhr = new XMLHttpRequest();

  console.log("get Annotation API: ", api + id);
  xhr.open("GET", api + id);

  //auth required if annotation is in a group
  if (auth) {
    xhr.setRequestHeader("Authorization", auth);
  }

  xhr.send();
  return xhr;
}

module.exports = {
  search: search,
  annotations: annotations
};



var axios = require("axios");
var config = require("../bundle/config/config");
var indexApi = config.getIdxEndpoint();

function storeAnnotation(annotation) {
  return axios.post(indexApi, annotation);
}

function getAnnotation(id) {
  var getApi = indexApi + "/" + id;
  return axios.get(getApi);
}

module.exports = {
  storeAnnotation: storeAnnotation,
  getAnnotation: getAnnotation
};


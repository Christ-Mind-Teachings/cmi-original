(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = parents

function parents(node, filter) {
  var out = []

  filter = filter || noop

  do {
    out.push(node)
    node = node.parentNode
  } while(node && node.tagName && filter(node))

  return out.slice(1)
}

function noop(n) {
  return true
}

},{}],2:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":4}],3:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var buildURL = require('./../helpers/buildURL');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');
var btoa = (typeof window !== 'undefined' && window.btoa && window.btoa.bind(window)) || require('./../helpers/btoa');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();
    var loadEvent = 'onreadystatechange';
    var xDomain = false;

    // For IE 8/9 CORS support
    // Only supports POST and GET calls and doesn't returns the response headers.
    // DON'T do this for testing b/c XMLHttpRequest is mocked, not XDomainRequest.
    if (process.env.NODE_ENV !== 'test' &&
        typeof window !== 'undefined' &&
        window.XDomainRequest && !('withCredentials' in request) &&
        !isURLSameOrigin(config.url)) {
      request = new window.XDomainRequest();
      loadEvent = 'onload';
      xDomain = true;
      request.onprogress = function handleProgress() {};
      request.ontimeout = function handleTimeout() {};
    }

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for ready state
    request[loadEvent] = function handleLoad() {
      if (!request || (request.readyState !== 4 && !xDomain)) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        // IE sends 1223 instead of 204 (https://github.com/mzabriskie/axios/issues/201)
        status: request.status === 1223 ? 204 : request.status,
        statusText: request.status === 1223 ? 'No Content' : request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED'));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      var cookies = require('./../helpers/cookies');

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
          cookies.read(config.xsrfCookieName) :
          undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        if (request.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

}).call(this,require('_process'))
},{"../core/createError":10,"./../core/settle":13,"./../helpers/btoa":17,"./../helpers/buildURL":18,"./../helpers/cookies":20,"./../helpers/isURLSameOrigin":22,"./../helpers/parseHeaders":24,"./../utils":26,"_process":59}],4:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(utils.merge(defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"./cancel/Cancel":5,"./cancel/CancelToken":6,"./cancel/isCancel":7,"./core/Axios":8,"./defaults":15,"./helpers/bind":16,"./helpers/spread":25,"./utils":26}],5:[function(require,module,exports){
'use strict';

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;

},{}],6:[function(require,module,exports){
'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./Cancel":5}],7:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],8:[function(require,module,exports){
'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge({
      url: arguments[0]
    }, arguments[1]);
  }

  config = utils.merge(defaults, this.defaults, { method: 'get' }, config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;

},{"./../defaults":15,"./../helpers/combineURLs":19,"./../helpers/isAbsoluteURL":21,"./../utils":26,"./InterceptorManager":9,"./dispatchRequest":11}],9:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":26}],10:[function(require,module,exports){
'use strict';

var enhanceError = require('./enhanceError');

/**
 * Create an Error with the specified message, config, error code, and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 @ @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, response);
};

},{"./enhanceError":12}],11:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/isCancel":7,"../defaults":15,"./../utils":26,"./transformData":14}],12:[function(require,module,exports){
'use strict';

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 @ @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.response = response;
  return error;
};

},{}],13:[function(require,module,exports){
'use strict';

var createError = require('./createError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  // Note: status is not exposed by XDomainRequest
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response
    ));
  }
};

},{"./createError":10}],14:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};

},{"./../utils":26}],15:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');

var PROTECTION_PREFIX = /^\)\]\}',?\n/;
var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Content-Type');
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      data = data.replace(PROTECTION_PREFIX, '');
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMehtodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this,require('_process'))
},{"./adapters/http":3,"./adapters/xhr":3,"./helpers/normalizeHeaderName":23,"./utils":26,"_process":59}],16:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],17:[function(require,module,exports){
'use strict';

// btoa polyfill for IE<10 courtesy https://github.com/davidchambers/Base64.js

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function E() {
  this.message = 'String contains an invalid character';
}
E.prototype = new Error;
E.prototype.code = 5;
E.prototype.name = 'InvalidCharacterError';

function btoa(input) {
  var str = String(input);
  var output = '';
  for (
    // initialize result and counter
    var block, charCode, idx = 0, map = chars;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = '=', idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)
  ) {
    charCode = str.charCodeAt(idx += 3 / 4);
    if (charCode > 0xFF) {
      throw new E();
    }
    block = block << 8 | charCode;
  }
  return output;
}

module.exports = btoa;

},{}],18:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      }

      if (!utils.isArray(val)) {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":26}],19:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '');
};

},{}],20:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
  (function standardBrowserEnv() {
    return {
      write: function write(name, value, expires, path, domain, secure) {
        var cookie = [];
        cookie.push(name + '=' + encodeURIComponent(value));

        if (utils.isNumber(expires)) {
          cookie.push('expires=' + new Date(expires).toGMTString());
        }

        if (utils.isString(path)) {
          cookie.push('path=' + path);
        }

        if (utils.isString(domain)) {
          cookie.push('domain=' + domain);
        }

        if (secure === true) {
          cookie.push('secure');
        }

        document.cookie = cookie.join('; ');
      },

      read: function read(name) {
        var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return (match ? decodeURIComponent(match[3]) : null);
      },

      remove: function remove(name) {
        this.write(name, '', Date.now() - 86400000);
      }
    };
  })() :

  // Non standard browser env (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return {
      write: function write() {},
      read: function read() { return null; },
      remove: function remove() {}
    };
  })()
);

},{"./../utils":26}],21:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

},{}],22:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
  (function standardBrowserEnv() {
    var msie = /(msie|trident)/i.test(navigator.userAgent);
    var urlParsingNode = document.createElement('a');
    var originURL;

    /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
    function resolveURL(url) {
      var href = url;

      if (msie) {
        // IE needs attribute set twice to normalize properties
        urlParsingNode.setAttribute('href', href);
        href = urlParsingNode.href;
      }

      urlParsingNode.setAttribute('href', href);

      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                  urlParsingNode.pathname :
                  '/' + urlParsingNode.pathname
      };
    }

    originURL = resolveURL(window.location.href);

    /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
    return function isURLSameOrigin(requestURL) {
      var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
      return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
    };
  })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return function isURLSameOrigin() {
      return true;
    };
  })()
);

},{"./../utils":26}],23:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":26}],24:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  });

  return parsed;
};

},{"./../utils":26}],25:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],26:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  typeof document.createElement -> undefined
 */
function isStandardBrowserEnv() {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object' && !isArray(obj)) {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim
};

},{"./helpers/bind":16}],27:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],28:[function(require,module,exports){

},{}],29:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],30:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (value instanceof ArrayBuffer) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || string instanceof ArrayBuffer) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

},{"base64-js":27,"ieee754":55}],31:[function(require,module,exports){
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['module', 'select'], factory);
    } else if (typeof exports !== "undefined") {
        factory(module, require('select'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod, global.select);
        global.clipboardAction = mod.exports;
    }
})(this, function (module, _select) {
    'use strict';

    var _select2 = _interopRequireDefault(_select);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
    } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
    };

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var ClipboardAction = function () {
        /**
         * @param {Object} options
         */
        function ClipboardAction(options) {
            _classCallCheck(this, ClipboardAction);

            this.resolveOptions(options);
            this.initSelection();
        }

        /**
         * Defines base properties passed from constructor.
         * @param {Object} options
         */


        _createClass(ClipboardAction, [{
            key: 'resolveOptions',
            value: function resolveOptions() {
                var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

                this.action = options.action;
                this.emitter = options.emitter;
                this.target = options.target;
                this.text = options.text;
                this.trigger = options.trigger;

                this.selectedText = '';
            }
        }, {
            key: 'initSelection',
            value: function initSelection() {
                if (this.text) {
                    this.selectFake();
                } else if (this.target) {
                    this.selectTarget();
                }
            }
        }, {
            key: 'selectFake',
            value: function selectFake() {
                var _this = this;

                var isRTL = document.documentElement.getAttribute('dir') == 'rtl';

                this.removeFake();

                this.fakeHandlerCallback = function () {
                    return _this.removeFake();
                };
                this.fakeHandler = document.body.addEventListener('click', this.fakeHandlerCallback) || true;

                this.fakeElem = document.createElement('textarea');
                // Prevent zooming on iOS
                this.fakeElem.style.fontSize = '12pt';
                // Reset box model
                this.fakeElem.style.border = '0';
                this.fakeElem.style.padding = '0';
                this.fakeElem.style.margin = '0';
                // Move element out of screen horizontally
                this.fakeElem.style.position = 'absolute';
                this.fakeElem.style[isRTL ? 'right' : 'left'] = '-9999px';
                // Move element to the same position vertically
                var yPosition = window.pageYOffset || document.documentElement.scrollTop;
                this.fakeElem.style.top = yPosition + 'px';

                this.fakeElem.setAttribute('readonly', '');
                this.fakeElem.value = this.text;

                document.body.appendChild(this.fakeElem);

                this.selectedText = (0, _select2.default)(this.fakeElem);
                this.copyText();
            }
        }, {
            key: 'removeFake',
            value: function removeFake() {
                if (this.fakeHandler) {
                    document.body.removeEventListener('click', this.fakeHandlerCallback);
                    this.fakeHandler = null;
                    this.fakeHandlerCallback = null;
                }

                if (this.fakeElem) {
                    document.body.removeChild(this.fakeElem);
                    this.fakeElem = null;
                }
            }
        }, {
            key: 'selectTarget',
            value: function selectTarget() {
                this.selectedText = (0, _select2.default)(this.target);
                this.copyText();
            }
        }, {
            key: 'copyText',
            value: function copyText() {
                var succeeded = void 0;

                try {
                    succeeded = document.execCommand(this.action);
                } catch (err) {
                    succeeded = false;
                }

                this.handleResult(succeeded);
            }
        }, {
            key: 'handleResult',
            value: function handleResult(succeeded) {
                this.emitter.emit(succeeded ? 'success' : 'error', {
                    action: this.action,
                    text: this.selectedText,
                    trigger: this.trigger,
                    clearSelection: this.clearSelection.bind(this)
                });
            }
        }, {
            key: 'clearSelection',
            value: function clearSelection() {
                if (this.target) {
                    this.target.blur();
                }

                window.getSelection().removeAllRanges();
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                this.removeFake();
            }
        }, {
            key: 'action',
            set: function set() {
                var action = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'copy';

                this._action = action;

                if (this._action !== 'copy' && this._action !== 'cut') {
                    throw new Error('Invalid "action" value, use either "copy" or "cut"');
                }
            },
            get: function get() {
                return this._action;
            }
        }, {
            key: 'target',
            set: function set(target) {
                if (target !== undefined) {
                    if (target && (typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' && target.nodeType === 1) {
                        if (this.action === 'copy' && target.hasAttribute('disabled')) {
                            throw new Error('Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute');
                        }

                        if (this.action === 'cut' && (target.hasAttribute('readonly') || target.hasAttribute('disabled'))) {
                            throw new Error('Invalid "target" attribute. You can\'t cut text from elements with "readonly" or "disabled" attributes');
                        }

                        this._target = target;
                    } else {
                        throw new Error('Invalid "target" value, use a valid Element');
                    }
                }
            },
            get: function get() {
                return this._target;
            }
        }]);

        return ClipboardAction;
    }();

    module.exports = ClipboardAction;
});
},{"select":63}],32:[function(require,module,exports){
(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['module', './clipboard-action', 'tiny-emitter', 'good-listener'], factory);
    } else if (typeof exports !== "undefined") {
        factory(module, require('./clipboard-action'), require('tiny-emitter'), require('good-listener'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod, global.clipboardAction, global.tinyEmitter, global.goodListener);
        global.clipboard = mod.exports;
    }
})(this, function (module, _clipboardAction, _tinyEmitter, _goodListener) {
    'use strict';

    var _clipboardAction2 = _interopRequireDefault(_clipboardAction);

    var _tinyEmitter2 = _interopRequireDefault(_tinyEmitter);

    var _goodListener2 = _interopRequireDefault(_goodListener);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    var Clipboard = function (_Emitter) {
        _inherits(Clipboard, _Emitter);

        /**
         * @param {String|HTMLElement|HTMLCollection|NodeList} trigger
         * @param {Object} options
         */
        function Clipboard(trigger, options) {
            _classCallCheck(this, Clipboard);

            var _this = _possibleConstructorReturn(this, (Clipboard.__proto__ || Object.getPrototypeOf(Clipboard)).call(this));

            _this.resolveOptions(options);
            _this.listenClick(trigger);
            return _this;
        }

        /**
         * Defines if attributes would be resolved using internal setter functions
         * or custom functions that were passed in the constructor.
         * @param {Object} options
         */


        _createClass(Clipboard, [{
            key: 'resolveOptions',
            value: function resolveOptions() {
                var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

                this.action = typeof options.action === 'function' ? options.action : this.defaultAction;
                this.target = typeof options.target === 'function' ? options.target : this.defaultTarget;
                this.text = typeof options.text === 'function' ? options.text : this.defaultText;
            }
        }, {
            key: 'listenClick',
            value: function listenClick(trigger) {
                var _this2 = this;

                this.listener = (0, _goodListener2.default)(trigger, 'click', function (e) {
                    return _this2.onClick(e);
                });
            }
        }, {
            key: 'onClick',
            value: function onClick(e) {
                var trigger = e.delegateTarget || e.currentTarget;

                if (this.clipboardAction) {
                    this.clipboardAction = null;
                }

                this.clipboardAction = new _clipboardAction2.default({
                    action: this.action(trigger),
                    target: this.target(trigger),
                    text: this.text(trigger),
                    trigger: trigger,
                    emitter: this
                });
            }
        }, {
            key: 'defaultAction',
            value: function defaultAction(trigger) {
                return getAttributeValue('action', trigger);
            }
        }, {
            key: 'defaultTarget',
            value: function defaultTarget(trigger) {
                var selector = getAttributeValue('target', trigger);

                if (selector) {
                    return document.querySelector(selector);
                }
            }
        }, {
            key: 'defaultText',
            value: function defaultText(trigger) {
                return getAttributeValue('text', trigger);
            }
        }, {
            key: 'destroy',
            value: function destroy() {
                this.listener.destroy();

                if (this.clipboardAction) {
                    this.clipboardAction.destroy();
                    this.clipboardAction = null;
                }
            }
        }], [{
            key: 'isSupported',
            value: function isSupported() {
                var action = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : ['copy', 'cut'];

                var actions = typeof action === 'string' ? [action] : action;
                var support = !!document.queryCommandSupported;

                actions.forEach(function (action) {
                    support = support && !!document.queryCommandSupported(action);
                });

                return support;
            }
        }]);

        return Clipboard;
    }(_tinyEmitter2.default);

    /**
     * Helper function to retrieve attribute value.
     * @param {String} suffix
     * @param {Element} element
     */
    function getAttributeValue(suffix, element) {
        var attribute = 'data-clipboard-' + suffix;

        if (!element.hasAttribute(attribute)) {
            return;
        }

        return element.getAttribute(attribute);
    }

    module.exports = Clipboard;
});
},{"./clipboard-action":31,"good-listener":54,"tiny-emitter":76}],33:[function(require,module,exports){
var DOCUMENT_NODE_TYPE = 9;

/**
 * A polyfill for Element.matches()
 */
if (Element && !Element.prototype.matches) {
    var proto = Element.prototype;

    proto.matches = proto.matchesSelector ||
                    proto.mozMatchesSelector ||
                    proto.msMatchesSelector ||
                    proto.oMatchesSelector ||
                    proto.webkitMatchesSelector;
}

/**
 * Finds the closest parent that matches a selector.
 *
 * @param {Element} element
 * @param {String} selector
 * @return {Function}
 */
function closest (element, selector) {
    while (element && element.nodeType !== DOCUMENT_NODE_TYPE) {
        if (element.matches(selector)) return element;
        element = element.parentNode;
    }
}

module.exports = closest;

},{}],34:[function(require,module,exports){
var closest = require('./closest');

/**
 * Delegates event to a selector.
 *
 * @param {Element} element
 * @param {String} selector
 * @param {String} type
 * @param {Function} callback
 * @param {Boolean} useCapture
 * @return {Object}
 */
function delegate(element, selector, type, callback, useCapture) {
    var listenerFn = listener.apply(this, arguments);

    element.addEventListener(type, listenerFn, useCapture);

    return {
        destroy: function() {
            element.removeEventListener(type, listenerFn, useCapture);
        }
    }
}

/**
 * Finds closest match and invokes callback.
 *
 * @param {Element} element
 * @param {String} selector
 * @param {String} type
 * @param {Function} callback
 * @return {Function}
 */
function listener(element, selector, type, callback) {
    return function(e) {
        e.delegateTarget = closest(e.target, selector);

        if (e.delegateTarget) {
            callback.call(element, e);
        }
    }
}

module.exports = delegate;

},{"./closest":33}],35:[function(require,module,exports){
'use strict'

/**
 * Diff Match and Patch
 *
 * Copyright 2006 Google Inc.
 * http://code.google.com/p/google-diff-match-patch/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Computes the difference between two texts to create a patch.
 * Applies the patch onto another text, allowing for errors.
 * @author fraser@google.com (Neil Fraser)
 */

/**
 * Class containing the diff, match and patch methods.
 * @constructor
 */
function diff_match_patch() {

  // Defaults.
  // Redefine these in your program to override the defaults.

  // Number of seconds to map a diff before giving up (0 for infinity).
  this.Diff_Timeout = 1.0;
  // Cost of an empty edit operation in terms of edit characters.
  this.Diff_EditCost = 4;
  // At what point is no match declared (0.0 = perfection, 1.0 = very loose).
  this.Match_Threshold = 0.5;
  // How far to search for a match (0 = exact location, 1000+ = broad match).
  // A match this many characters away from the expected location will add
  // 1.0 to the score (0.0 is a perfect match).
  this.Match_Distance = 1000;
  // When deleting a large block of text (over ~64 characters), how close do
  // the contents have to be to match the expected contents. (0.0 = perfection,
  // 1.0 = very loose).  Note that Match_Threshold controls how closely the
  // end points of a delete need to match.
  this.Patch_DeleteThreshold = 0.5;
  // Chunk size for context length.
  this.Patch_Margin = 4;

  // The number of bits in an int.
  this.Match_MaxBits = 32;
}


//  DIFF FUNCTIONS


/**
 * The data structure representing a diff is an array of tuples:
 * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
 * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
 */
var DIFF_DELETE = -1;
var DIFF_INSERT = 1;
var DIFF_EQUAL = 0;

/** @typedef {{0: number, 1: string}} */
diff_match_patch.Diff;


/**
 * Find the differences between two texts.  Simplifies the problem by stripping
 * any common prefix or suffix off the texts before diffing.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean=} opt_checklines Optional speedup flag. If present and false,
 *     then don't run a line-level diff first to identify the changed areas.
 *     Defaults to true, which does a faster, slightly less optimal diff.
 * @param {number} opt_deadline Optional time when the diff should be complete
 *     by.  Used internally for recursive calls.  Users should set DiffTimeout
 *     instead.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 */
diff_match_patch.prototype.diff_main = function(text1, text2, opt_checklines,
    opt_deadline) {
  // Set a deadline by which time the diff must be complete.
  if (typeof opt_deadline == 'undefined') {
    if (this.Diff_Timeout <= 0) {
      opt_deadline = Number.MAX_VALUE;
    } else {
      opt_deadline = (new Date).getTime() + this.Diff_Timeout * 1000;
    }
  }
  var deadline = opt_deadline;

  // Check for null inputs.
  if (text1 == null || text2 == null) {
    throw new Error('Null input. (diff_main)');
  }

  // Check for equality (speedup).
  if (text1 == text2) {
    if (text1) {
      return [[DIFF_EQUAL, text1]];
    }
    return [];
  }

  if (typeof opt_checklines == 'undefined') {
    opt_checklines = true;
  }
  var checklines = opt_checklines;

  // Trim off common prefix (speedup).
  var commonlength = this.diff_commonPrefix(text1, text2);
  var commonprefix = text1.substring(0, commonlength);
  text1 = text1.substring(commonlength);
  text2 = text2.substring(commonlength);

  // Trim off common suffix (speedup).
  commonlength = this.diff_commonSuffix(text1, text2);
  var commonsuffix = text1.substring(text1.length - commonlength);
  text1 = text1.substring(0, text1.length - commonlength);
  text2 = text2.substring(0, text2.length - commonlength);

  // Compute the diff on the middle block.
  var diffs = this.diff_compute_(text1, text2, checklines, deadline);

  // Restore the prefix and suffix.
  if (commonprefix) {
    diffs.unshift([DIFF_EQUAL, commonprefix]);
  }
  if (commonsuffix) {
    diffs.push([DIFF_EQUAL, commonsuffix]);
  }
  this.diff_cleanupMerge(diffs);
  return diffs;
};


/**
 * Find the differences between two texts.  Assumes that the texts do not
 * have any common prefix or suffix.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean} checklines Speedup flag.  If false, then don't run a
 *     line-level diff first to identify the changed areas.
 *     If true, then run a faster, slightly less optimal diff.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_compute_ = function(text1, text2, checklines,
    deadline) {
  var diffs;

  if (!text1) {
    // Just add some text (speedup).
    return [[DIFF_INSERT, text2]];
  }

  if (!text2) {
    // Just delete some text (speedup).
    return [[DIFF_DELETE, text1]];
  }

  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  var i = longtext.indexOf(shorttext);
  if (i != -1) {
    // Shorter text is inside the longer text (speedup).
    diffs = [[DIFF_INSERT, longtext.substring(0, i)],
             [DIFF_EQUAL, shorttext],
             [DIFF_INSERT, longtext.substring(i + shorttext.length)]];
    // Swap insertions for deletions if diff is reversed.
    if (text1.length > text2.length) {
      diffs[0][0] = diffs[2][0] = DIFF_DELETE;
    }
    return diffs;
  }

  if (shorttext.length == 1) {
    // Single character string.
    // After the previous speedup, the character can't be an equality.
    return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
  }

  // Check to see if the problem can be split in two.
  var hm = this.diff_halfMatch_(text1, text2);
  if (hm) {
    // A half-match was found, sort out the return data.
    var text1_a = hm[0];
    var text1_b = hm[1];
    var text2_a = hm[2];
    var text2_b = hm[3];
    var mid_common = hm[4];
    // Send both pairs off for separate processing.
    var diffs_a = this.diff_main(text1_a, text2_a, checklines, deadline);
    var diffs_b = this.diff_main(text1_b, text2_b, checklines, deadline);
    // Merge the results.
    return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
  }

  if (checklines && text1.length > 100 && text2.length > 100) {
    return this.diff_lineMode_(text1, text2, deadline);
  }

  return this.diff_bisect_(text1, text2, deadline);
};


/**
 * Do a quick line-level diff on both strings, then rediff the parts for
 * greater accuracy.
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_lineMode_ = function(text1, text2, deadline) {
  // Scan the text on a line-by-line basis first.
  var a = this.diff_linesToChars_(text1, text2);
  text1 = a.chars1;
  text2 = a.chars2;
  var linearray = a.lineArray;

  var diffs = this.diff_main(text1, text2, false, deadline);

  // Convert the diff back to original text.
  this.diff_charsToLines_(diffs, linearray);
  // Eliminate freak matches (e.g. blank lines)
  this.diff_cleanupSemantic(diffs);

  // Rediff any replacement blocks, this time character-by-character.
  // Add a dummy entry at the end.
  diffs.push([DIFF_EQUAL, '']);
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete >= 1 && count_insert >= 1) {
          // Delete the offending records and add the merged ones.
          diffs.splice(pointer - count_delete - count_insert,
                       count_delete + count_insert);
          pointer = pointer - count_delete - count_insert;
          var a = this.diff_main(text_delete, text_insert, false, deadline);
          for (var j = a.length - 1; j >= 0; j--) {
            diffs.splice(pointer, 0, a[j]);
          }
          pointer = pointer + a.length;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
    pointer++;
  }
  diffs.pop();  // Remove the dummy entry at the end.

  return diffs;
};


/**
 * Find the 'middle snake' of a diff, split the problem in two
 * and return the recursively constructed diff.
 * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisect_ = function(text1, text2, deadline) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  var max_d = Math.ceil((text1_length + text2_length) / 2);
  var v_offset = max_d;
  var v_length = 2 * max_d;
  var v1 = new Array(v_length);
  var v2 = new Array(v_length);
  // Setting all elements to -1 is faster in Chrome & Firefox than mixing
  // integers and undefined.
  for (var x = 0; x < v_length; x++) {
    v1[x] = -1;
    v2[x] = -1;
  }
  v1[v_offset + 1] = 0;
  v2[v_offset + 1] = 0;
  var delta = text1_length - text2_length;
  // If the total number of characters is odd, then the front path will collide
  // with the reverse path.
  var front = (delta % 2 != 0);
  // Offsets for start and end of k loop.
  // Prevents mapping of space beyond the grid.
  var k1start = 0;
  var k1end = 0;
  var k2start = 0;
  var k2end = 0;
  for (var d = 0; d < max_d; d++) {
    // Bail out if deadline is reached.
    if ((new Date()).getTime() > deadline) {
      break;
    }

    // Walk the front path one step.
    for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      var k1_offset = v_offset + k1;
      var x1;
      if (k1 == -d || (k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1])) {
        x1 = v1[k1_offset + 1];
      } else {
        x1 = v1[k1_offset - 1] + 1;
      }
      var y1 = x1 - k1;
      while (x1 < text1_length && y1 < text2_length &&
             text1.charAt(x1) == text2.charAt(y1)) {
        x1++;
        y1++;
      }
      v1[k1_offset] = x1;
      if (x1 > text1_length) {
        // Ran off the right of the graph.
        k1end += 2;
      } else if (y1 > text2_length) {
        // Ran off the bottom of the graph.
        k1start += 2;
      } else if (front) {
        var k2_offset = v_offset + delta - k1;
        if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
          // Mirror x2 onto top-left coordinate system.
          var x2 = text1_length - v2[k2_offset];
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }

    // Walk the reverse path one step.
    for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      var k2_offset = v_offset + k2;
      var x2;
      if (k2 == -d || (k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1])) {
        x2 = v2[k2_offset + 1];
      } else {
        x2 = v2[k2_offset - 1] + 1;
      }
      var y2 = x2 - k2;
      while (x2 < text1_length && y2 < text2_length &&
             text1.charAt(text1_length - x2 - 1) ==
             text2.charAt(text2_length - y2 - 1)) {
        x2++;
        y2++;
      }
      v2[k2_offset] = x2;
      if (x2 > text1_length) {
        // Ran off the left of the graph.
        k2end += 2;
      } else if (y2 > text2_length) {
        // Ran off the top of the graph.
        k2start += 2;
      } else if (!front) {
        var k1_offset = v_offset + delta - k2;
        if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
          var x1 = v1[k1_offset];
          var y1 = v_offset + x1 - k1_offset;
          // Mirror x2 onto top-left coordinate system.
          x2 = text1_length - x2;
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }
  }
  // Diff took too long and hit the deadline or
  // number of diffs equals number of characters, no commonality at all.
  return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
};


/**
 * Given the location of the 'middle snake', split the diff in two parts
 * and recurse.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} x Index of split point in text1.
 * @param {number} y Index of split point in text2.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisectSplit_ = function(text1, text2, x, y,
    deadline) {
  var text1a = text1.substring(0, x);
  var text2a = text2.substring(0, y);
  var text1b = text1.substring(x);
  var text2b = text2.substring(y);

  // Compute both diffs serially.
  var diffs = this.diff_main(text1a, text2a, false, deadline);
  var diffsb = this.diff_main(text1b, text2b, false, deadline);

  return diffs.concat(diffsb);
};


/**
 * Split two texts into an array of strings.  Reduce the texts to a string of
 * hashes where each Unicode character represents one line.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {{chars1: string, chars2: string, lineArray: !Array.<string>}}
 *     An object containing the encoded text1, the encoded text2 and
 *     the array of unique strings.
 *     The zeroth element of the array of unique strings is intentionally blank.
 * @private
 */
diff_match_patch.prototype.diff_linesToChars_ = function(text1, text2) {
  var lineArray = [];  // e.g. lineArray[4] == 'Hello\n'
  var lineHash = {};   // e.g. lineHash['Hello\n'] == 4

  // '\x00' is a valid character, but various debuggers don't like it.
  // So we'll insert a junk entry to avoid generating a null character.
  lineArray[0] = '';

  /**
   * Split a text into an array of strings.  Reduce the texts to a string of
   * hashes where each Unicode character represents one line.
   * Modifies linearray and linehash through being a closure.
   * @param {string} text String to encode.
   * @return {string} Encoded string.
   * @private
   */
  function diff_linesToCharsMunge_(text) {
    var chars = '';
    // Walk the text, pulling out a substring for each line.
    // text.split('\n') would would temporarily double our memory footprint.
    // Modifying text would create many large strings to garbage collect.
    var lineStart = 0;
    var lineEnd = -1;
    // Keeping our own length variable is faster than looking it up.
    var lineArrayLength = lineArray.length;
    while (lineEnd < text.length - 1) {
      lineEnd = text.indexOf('\n', lineStart);
      if (lineEnd == -1) {
        lineEnd = text.length - 1;
      }
      var line = text.substring(lineStart, lineEnd + 1);
      lineStart = lineEnd + 1;

      if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) :
          (lineHash[line] !== undefined)) {
        chars += String.fromCharCode(lineHash[line]);
      } else {
        chars += String.fromCharCode(lineArrayLength);
        lineHash[line] = lineArrayLength;
        lineArray[lineArrayLength++] = line;
      }
    }
    return chars;
  }

  var chars1 = diff_linesToCharsMunge_(text1);
  var chars2 = diff_linesToCharsMunge_(text2);
  return {chars1: chars1, chars2: chars2, lineArray: lineArray};
};


/**
 * Rehydrate the text in a diff from a string of line hashes to real lines of
 * text.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {!Array.<string>} lineArray Array of unique strings.
 * @private
 */
diff_match_patch.prototype.diff_charsToLines_ = function(diffs, lineArray) {
  for (var x = 0; x < diffs.length; x++) {
    var chars = diffs[x][1];
    var text = [];
    for (var y = 0; y < chars.length; y++) {
      text[y] = lineArray[chars.charCodeAt(y)];
    }
    diffs[x][1] = text.join('');
  }
};


/**
 * Determine the common prefix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the start of each
 *     string.
 */
diff_match_patch.prototype.diff_commonPrefix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerstart = 0;
  while (pointermin < pointermid) {
    if (text1.substring(pointerstart, pointermid) ==
        text2.substring(pointerstart, pointermid)) {
      pointermin = pointermid;
      pointerstart = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine the common suffix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of each string.
 */
diff_match_patch.prototype.diff_commonSuffix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 ||
      text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerend = 0;
  while (pointermin < pointermid) {
    if (text1.substring(text1.length - pointermid, text1.length - pointerend) ==
        text2.substring(text2.length - pointermid, text2.length - pointerend)) {
      pointermin = pointermid;
      pointerend = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine if the suffix of one string is the prefix of another.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of the first
 *     string and the start of the second string.
 * @private
 */
diff_match_patch.prototype.diff_commonOverlap_ = function(text1, text2) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  // Eliminate the null case.
  if (text1_length == 0 || text2_length == 0) {
    return 0;
  }
  // Truncate the longer string.
  if (text1_length > text2_length) {
    text1 = text1.substring(text1_length - text2_length);
  } else if (text1_length < text2_length) {
    text2 = text2.substring(0, text1_length);
  }
  var text_length = Math.min(text1_length, text2_length);
  // Quick check for the worst case.
  if (text1 == text2) {
    return text_length;
  }

  // Start by looking for a single character match
  // and increase length until no match is found.
  // Performance analysis: http://neil.fraser.name/news/2010/11/04/
  var best = 0;
  var length = 1;
  while (true) {
    var pattern = text1.substring(text_length - length);
    var found = text2.indexOf(pattern);
    if (found == -1) {
      return best;
    }
    length += found;
    if (found == 0 || text1.substring(text_length - length) ==
        text2.substring(0, length)) {
      best = length;
      length++;
    }
  }
};


/**
 * Do the two texts share a substring which is at least half the length of the
 * longer text?
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {Array.<string>} Five element Array, containing the prefix of
 *     text1, the suffix of text1, the prefix of text2, the suffix of
 *     text2 and the common middle.  Or null if there was no match.
 * @private
 */
diff_match_patch.prototype.diff_halfMatch_ = function(text1, text2) {
  if (this.Diff_Timeout <= 0) {
    // Don't risk returning a non-optimal diff if we have unlimited time.
    return null;
  }
  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
    return null;  // Pointless.
  }
  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Does a substring of shorttext exist within longtext such that the substring
   * is at least half the length of longtext?
   * Closure, but does not reference any external variables.
   * @param {string} longtext Longer string.
   * @param {string} shorttext Shorter string.
   * @param {number} i Start index of quarter length substring within longtext.
   * @return {Array.<string>} Five element Array, containing the prefix of
   *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
   *     of shorttext and the common middle.  Or null if there was no match.
   * @private
   */
  function diff_halfMatchI_(longtext, shorttext, i) {
    // Start with a 1/4 length substring at position i as a seed.
    var seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
    var j = -1;
    var best_common = '';
    var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
    while ((j = shorttext.indexOf(seed, j + 1)) != -1) {
      var prefixLength = dmp.diff_commonPrefix(longtext.substring(i),
                                               shorttext.substring(j));
      var suffixLength = dmp.diff_commonSuffix(longtext.substring(0, i),
                                               shorttext.substring(0, j));
      if (best_common.length < suffixLength + prefixLength) {
        best_common = shorttext.substring(j - suffixLength, j) +
            shorttext.substring(j, j + prefixLength);
        best_longtext_a = longtext.substring(0, i - suffixLength);
        best_longtext_b = longtext.substring(i + prefixLength);
        best_shorttext_a = shorttext.substring(0, j - suffixLength);
        best_shorttext_b = shorttext.substring(j + prefixLength);
      }
    }
    if (best_common.length * 2 >= longtext.length) {
      return [best_longtext_a, best_longtext_b,
              best_shorttext_a, best_shorttext_b, best_common];
    } else {
      return null;
    }
  }

  // First check if the second quarter is the seed for a half-match.
  var hm1 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 4));
  // Check again based on the third quarter.
  var hm2 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 2));
  var hm;
  if (!hm1 && !hm2) {
    return null;
  } else if (!hm2) {
    hm = hm1;
  } else if (!hm1) {
    hm = hm2;
  } else {
    // Both matched.  Select the longest.
    hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
  }

  // A half-match was found, sort out the return data.
  var text1_a, text1_b, text2_a, text2_b;
  if (text1.length > text2.length) {
    text1_a = hm[0];
    text1_b = hm[1];
    text2_a = hm[2];
    text2_b = hm[3];
  } else {
    text2_a = hm[0];
    text2_b = hm[1];
    text1_a = hm[2];
    text1_b = hm[3];
  }
  var mid_common = hm[4];
  return [text1_a, text1_b, text2_a, text2_b, mid_common];
};


/**
 * Reduce the number of edits by eliminating semantically trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemantic = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Number of characters that changed prior to the equality.
  var length_insertions1 = 0;
  var length_deletions1 = 0;
  // Number of characters that changed after the equality.
  var length_insertions2 = 0;
  var length_deletions2 = 0;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      equalities[equalitiesLength++] = pointer;
      length_insertions1 = length_insertions2;
      length_deletions1 = length_deletions2;
      length_insertions2 = 0;
      length_deletions2 = 0;
      lastequality = diffs[pointer][1];
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_INSERT) {
        length_insertions2 += diffs[pointer][1].length;
      } else {
        length_deletions2 += diffs[pointer][1].length;
      }
      // Eliminate an equality that is smaller or equal to the edits on both
      // sides of it.
      if (lastequality && (lastequality.length <=
          Math.max(length_insertions1, length_deletions1)) &&
          (lastequality.length <= Math.max(length_insertions2,
                                           length_deletions2))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        // Throw away the equality we just deleted.
        equalitiesLength--;
        // Throw away the previous equality (it needs to be reevaluated).
        equalitiesLength--;
        pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
        length_insertions1 = 0;  // Reset the counters.
        length_deletions1 = 0;
        length_insertions2 = 0;
        length_deletions2 = 0;
        lastequality = null;
        changes = true;
      }
    }
    pointer++;
  }

  // Normalize the diff.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
  this.diff_cleanupSemanticLossless(diffs);

  // Find any overlaps between deletions and insertions.
  // e.g: <del>abcxxx</del><ins>xxxdef</ins>
  //   -> <del>abc</del>xxx<ins>def</ins>
  // e.g: <del>xxxabc</del><ins>defxxx</ins>
  //   -> <ins>def</ins>xxx<del>abc</del>
  // Only extract an overlap if it is as big as the edit ahead or behind it.
  pointer = 1;
  while (pointer < diffs.length) {
    if (diffs[pointer - 1][0] == DIFF_DELETE &&
        diffs[pointer][0] == DIFF_INSERT) {
      var deletion = diffs[pointer - 1][1];
      var insertion = diffs[pointer][1];
      var overlap_length1 = this.diff_commonOverlap_(deletion, insertion);
      var overlap_length2 = this.diff_commonOverlap_(insertion, deletion);
      if (overlap_length1 >= overlap_length2) {
        if (overlap_length1 >= deletion.length / 2 ||
            overlap_length1 >= insertion.length / 2) {
          // Overlap found.  Insert an equality and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, insertion.substring(0, overlap_length1)]);
          diffs[pointer - 1][1] =
              deletion.substring(0, deletion.length - overlap_length1);
          diffs[pointer + 1][1] = insertion.substring(overlap_length1);
          pointer++;
        }
      } else {
        if (overlap_length2 >= deletion.length / 2 ||
            overlap_length2 >= insertion.length / 2) {
          // Reverse overlap found.
          // Insert an equality and swap and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, deletion.substring(0, overlap_length2)]);
          diffs[pointer - 1][0] = DIFF_INSERT;
          diffs[pointer - 1][1] =
              insertion.substring(0, insertion.length - overlap_length2);
          diffs[pointer + 1][0] = DIFF_DELETE;
          diffs[pointer + 1][1] =
              deletion.substring(overlap_length2);
          pointer++;
        }
      }
      pointer++;
    }
    pointer++;
  }
};


/**
 * Look for single edits surrounded on both sides by equalities
 * which can be shifted sideways to align the edit to a word boundary.
 * e.g: The c<ins>at c</ins>ame. -> The <ins>cat </ins>came.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemanticLossless = function(diffs) {
  /**
   * Given two strings, compute a score representing whether the internal
   * boundary falls on logical boundaries.
   * Scores range from 6 (best) to 0 (worst).
   * Closure, but does not reference any external variables.
   * @param {string} one First string.
   * @param {string} two Second string.
   * @return {number} The score.
   * @private
   */
  function diff_cleanupSemanticScore_(one, two) {
    if (!one || !two) {
      // Edges are the best.
      return 6;
    }

    // Each port of this function behaves slightly differently due to
    // subtle differences in each language's definition of things like
    // 'whitespace'.  Since this function's purpose is largely cosmetic,
    // the choice has been made to use each language's native features
    // rather than force total conformity.
    var char1 = one.charAt(one.length - 1);
    var char2 = two.charAt(0);
    var nonAlphaNumeric1 = char1.match(diff_match_patch.nonAlphaNumericRegex_);
    var nonAlphaNumeric2 = char2.match(diff_match_patch.nonAlphaNumericRegex_);
    var whitespace1 = nonAlphaNumeric1 &&
        char1.match(diff_match_patch.whitespaceRegex_);
    var whitespace2 = nonAlphaNumeric2 &&
        char2.match(diff_match_patch.whitespaceRegex_);
    var lineBreak1 = whitespace1 &&
        char1.match(diff_match_patch.linebreakRegex_);
    var lineBreak2 = whitespace2 &&
        char2.match(diff_match_patch.linebreakRegex_);
    var blankLine1 = lineBreak1 &&
        one.match(diff_match_patch.blanklineEndRegex_);
    var blankLine2 = lineBreak2 &&
        two.match(diff_match_patch.blanklineStartRegex_);

    if (blankLine1 || blankLine2) {
      // Five points for blank lines.
      return 5;
    } else if (lineBreak1 || lineBreak2) {
      // Four points for line breaks.
      return 4;
    } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
      // Three points for end of sentences.
      return 3;
    } else if (whitespace1 || whitespace2) {
      // Two points for whitespace.
      return 2;
    } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
      // One point for non-alphanumeric.
      return 1;
    }
    return 0;
  }

  var pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      var equality1 = diffs[pointer - 1][1];
      var edit = diffs[pointer][1];
      var equality2 = diffs[pointer + 1][1];

      // First, shift the edit as far left as possible.
      var commonOffset = this.diff_commonSuffix(equality1, edit);
      if (commonOffset) {
        var commonString = edit.substring(edit.length - commonOffset);
        equality1 = equality1.substring(0, equality1.length - commonOffset);
        edit = commonString + edit.substring(0, edit.length - commonOffset);
        equality2 = commonString + equality2;
      }

      // Second, step character by character right, looking for the best fit.
      var bestEquality1 = equality1;
      var bestEdit = edit;
      var bestEquality2 = equality2;
      var bestScore = diff_cleanupSemanticScore_(equality1, edit) +
          diff_cleanupSemanticScore_(edit, equality2);
      while (edit.charAt(0) === equality2.charAt(0)) {
        equality1 += edit.charAt(0);
        edit = edit.substring(1) + equality2.charAt(0);
        equality2 = equality2.substring(1);
        var score = diff_cleanupSemanticScore_(equality1, edit) +
            diff_cleanupSemanticScore_(edit, equality2);
        // The >= encourages trailing rather than leading whitespace on edits.
        if (score >= bestScore) {
          bestScore = score;
          bestEquality1 = equality1;
          bestEdit = edit;
          bestEquality2 = equality2;
        }
      }

      if (diffs[pointer - 1][1] != bestEquality1) {
        // We have an improvement, save it back to the diff.
        if (bestEquality1) {
          diffs[pointer - 1][1] = bestEquality1;
        } else {
          diffs.splice(pointer - 1, 1);
          pointer--;
        }
        diffs[pointer][1] = bestEdit;
        if (bestEquality2) {
          diffs[pointer + 1][1] = bestEquality2;
        } else {
          diffs.splice(pointer + 1, 1);
          pointer--;
        }
      }
    }
    pointer++;
  }
};

// Define some regex patterns for matching boundaries.
diff_match_patch.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
diff_match_patch.whitespaceRegex_ = /\s/;
diff_match_patch.linebreakRegex_ = /[\r\n]/;
diff_match_patch.blanklineEndRegex_ = /\n\r?\n$/;
diff_match_patch.blanklineStartRegex_ = /^\r?\n\r?\n/;

/**
 * Reduce the number of edits by eliminating operationally trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupEfficiency = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Is there an insertion operation before the last equality.
  var pre_ins = false;
  // Is there a deletion operation before the last equality.
  var pre_del = false;
  // Is there an insertion operation after the last equality.
  var post_ins = false;
  // Is there a deletion operation after the last equality.
  var post_del = false;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      if (diffs[pointer][1].length < this.Diff_EditCost &&
          (post_ins || post_del)) {
        // Candidate found.
        equalities[equalitiesLength++] = pointer;
        pre_ins = post_ins;
        pre_del = post_del;
        lastequality = diffs[pointer][1];
      } else {
        // Not a candidate, and can never become one.
        equalitiesLength = 0;
        lastequality = null;
      }
      post_ins = post_del = false;
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_DELETE) {
        post_del = true;
      } else {
        post_ins = true;
      }
      /*
       * Five types to be split:
       * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
       * <ins>A</ins>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<ins>C</ins>
       * <ins>A</del>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<del>C</del>
       */
      if (lastequality && ((pre_ins && pre_del && post_ins && post_del) ||
                           ((lastequality.length < this.Diff_EditCost / 2) &&
                            (pre_ins + pre_del + post_ins + post_del) == 3))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        equalitiesLength--;  // Throw away the equality we just deleted;
        lastequality = null;
        if (pre_ins && pre_del) {
          // No changes made which could affect previous entry, keep going.
          post_ins = post_del = true;
          equalitiesLength = 0;
        } else {
          equalitiesLength--;  // Throw away the previous equality.
          pointer = equalitiesLength > 0 ?
              equalities[equalitiesLength - 1] : -1;
          post_ins = post_del = false;
        }
        changes = true;
      }
    }
    pointer++;
  }

  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * Reorder and merge like edit sections.  Merge equalities.
 * Any edit section can move as long as it doesn't cross an equality.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupMerge = function(diffs) {
  diffs.push([DIFF_EQUAL, '']);  // Add a dummy entry at the end.
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  var commonlength;
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete + count_insert > 1) {
          if (count_delete !== 0 && count_insert !== 0) {
            // Factor out any common prefixies.
            commonlength = this.diff_commonPrefix(text_insert, text_delete);
            if (commonlength !== 0) {
              if ((pointer - count_delete - count_insert) > 0 &&
                  diffs[pointer - count_delete - count_insert - 1][0] ==
                  DIFF_EQUAL) {
                diffs[pointer - count_delete - count_insert - 1][1] +=
                    text_insert.substring(0, commonlength);
              } else {
                diffs.splice(0, 0, [DIFF_EQUAL,
                                    text_insert.substring(0, commonlength)]);
                pointer++;
              }
              text_insert = text_insert.substring(commonlength);
              text_delete = text_delete.substring(commonlength);
            }
            // Factor out any common suffixies.
            commonlength = this.diff_commonSuffix(text_insert, text_delete);
            if (commonlength !== 0) {
              diffs[pointer][1] = text_insert.substring(text_insert.length -
                  commonlength) + diffs[pointer][1];
              text_insert = text_insert.substring(0, text_insert.length -
                  commonlength);
              text_delete = text_delete.substring(0, text_delete.length -
                  commonlength);
            }
          }
          // Delete the offending records and add the merged ones.
          if (count_delete === 0) {
            diffs.splice(pointer - count_insert,
                count_delete + count_insert, [DIFF_INSERT, text_insert]);
          } else if (count_insert === 0) {
            diffs.splice(pointer - count_delete,
                count_delete + count_insert, [DIFF_DELETE, text_delete]);
          } else {
            diffs.splice(pointer - count_delete - count_insert,
                count_delete + count_insert, [DIFF_DELETE, text_delete],
                [DIFF_INSERT, text_insert]);
          }
          pointer = pointer - count_delete - count_insert +
                    (count_delete ? 1 : 0) + (count_insert ? 1 : 0) + 1;
        } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL) {
          // Merge this equality with the previous one.
          diffs[pointer - 1][1] += diffs[pointer][1];
          diffs.splice(pointer, 1);
        } else {
          pointer++;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
  }
  if (diffs[diffs.length - 1][1] === '') {
    diffs.pop();  // Remove the dummy entry at the end.
  }

  // Second pass: look for single edits surrounded on both sides by equalities
  // which can be shifted sideways to eliminate an equality.
  // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
  var changes = false;
  pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      if (diffs[pointer][1].substring(diffs[pointer][1].length -
          diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
        // Shift the edit over the previous equality.
        diffs[pointer][1] = diffs[pointer - 1][1] +
            diffs[pointer][1].substring(0, diffs[pointer][1].length -
                                        diffs[pointer - 1][1].length);
        diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
        diffs.splice(pointer - 1, 1);
        changes = true;
      } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) ==
          diffs[pointer + 1][1]) {
        // Shift the edit over the next equality.
        diffs[pointer - 1][1] += diffs[pointer + 1][1];
        diffs[pointer][1] =
            diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
            diffs[pointer + 1][1];
        diffs.splice(pointer + 1, 1);
        changes = true;
      }
    }
    pointer++;
  }
  // If shifts were made, the diff needs reordering and another shift sweep.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * loc is a location in text1, compute and return the equivalent location in
 * text2.
 * e.g. 'The cat' vs 'The big cat', 1->1, 5->8
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {number} loc Location within text1.
 * @return {number} Location within text2.
 */
diff_match_patch.prototype.diff_xIndex = function(diffs, loc) {
  var chars1 = 0;
  var chars2 = 0;
  var last_chars1 = 0;
  var last_chars2 = 0;
  var x;
  for (x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {  // Equality or deletion.
      chars1 += diffs[x][1].length;
    }
    if (diffs[x][0] !== DIFF_DELETE) {  // Equality or insertion.
      chars2 += diffs[x][1].length;
    }
    if (chars1 > loc) {  // Overshot the location.
      break;
    }
    last_chars1 = chars1;
    last_chars2 = chars2;
  }
  // Was the location was deleted?
  if (diffs.length != x && diffs[x][0] === DIFF_DELETE) {
    return last_chars2;
  }
  // Add the remaining character length.
  return last_chars2 + (loc - last_chars1);
};


/**
 * Convert a diff array into a pretty HTML report.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} HTML representation.
 */
diff_match_patch.prototype.diff_prettyHtml = function(diffs) {
  var html = [];
  var pattern_amp = /&/g;
  var pattern_lt = /</g;
  var pattern_gt = />/g;
  var pattern_para = /\n/g;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];    // Operation (insert, delete, equal)
    var data = diffs[x][1];  // Text of change.
    var text = data.replace(pattern_amp, '&amp;').replace(pattern_lt, '&lt;')
        .replace(pattern_gt, '&gt;').replace(pattern_para, '&para;<br>');
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins style="background:#e6ffe6;">' + text + '</ins>';
        break;
      case DIFF_DELETE:
        html[x] = '<del style="background:#ffe6e6;">' + text + '</del>';
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};


/**
 * Compute and return the source text (all equalities and deletions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Source text.
 */
diff_match_patch.prototype.diff_text1 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute and return the destination text (all equalities and insertions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Destination text.
 */
diff_match_patch.prototype.diff_text2 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_DELETE) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute the Levenshtein distance; the number of inserted, deleted or
 * substituted characters.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {number} Number of changes.
 */
diff_match_patch.prototype.diff_levenshtein = function(diffs) {
  var levenshtein = 0;
  var insertions = 0;
  var deletions = 0;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];
    var data = diffs[x][1];
    switch (op) {
      case DIFF_INSERT:
        insertions += data.length;
        break;
      case DIFF_DELETE:
        deletions += data.length;
        break;
      case DIFF_EQUAL:
        // A deletion and an insertion is one substitution.
        levenshtein += Math.max(insertions, deletions);
        insertions = 0;
        deletions = 0;
        break;
    }
  }
  levenshtein += Math.max(insertions, deletions);
  return levenshtein;
};


/**
 * Crush the diff into an encoded string which describes the operations
 * required to transform text1 into text2.
 * E.g. =3\t-2\t+ing  -> Keep 3 chars, delete 2 chars, insert 'ing'.
 * Operations are tab-separated.  Inserted text is escaped using %xx notation.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Delta text.
 */
diff_match_patch.prototype.diff_toDelta = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    switch (diffs[x][0]) {
      case DIFF_INSERT:
        text[x] = '+' + encodeURI(diffs[x][1]);
        break;
      case DIFF_DELETE:
        text[x] = '-' + diffs[x][1].length;
        break;
      case DIFF_EQUAL:
        text[x] = '=' + diffs[x][1].length;
        break;
    }
  }
  return text.join('\t').replace(/%20/g, ' ');
};


/**
 * Given the original text1, and an encoded string which describes the
 * operations required to transform text1 into text2, compute the full diff.
 * @param {string} text1 Source string for the diff.
 * @param {string} delta Delta text.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.diff_fromDelta = function(text1, delta) {
  var diffs = [];
  var diffsLength = 0;  // Keeping our own length var is faster in JS.
  var pointer = 0;  // Cursor in text1
  var tokens = delta.split(/\t/g);
  for (var x = 0; x < tokens.length; x++) {
    // Each token begins with a one character parameter which specifies the
    // operation of this token (delete, insert, equality).
    var param = tokens[x].substring(1);
    switch (tokens[x].charAt(0)) {
      case '+':
        try {
          diffs[diffsLength++] = [DIFF_INSERT, decodeURI(param)];
        } catch (ex) {
          // Malformed URI sequence.
          throw new Error('Illegal escape in diff_fromDelta: ' + param);
        }
        break;
      case '-':
        // Fall through.
      case '=':
        var n = parseInt(param, 10);
        if (isNaN(n) || n < 0) {
          throw new Error('Invalid number in diff_fromDelta: ' + param);
        }
        var text = text1.substring(pointer, pointer += n);
        if (tokens[x].charAt(0) == '=') {
          diffs[diffsLength++] = [DIFF_EQUAL, text];
        } else {
          diffs[diffsLength++] = [DIFF_DELETE, text];
        }
        break;
      default:
        // Blank tokens are ok (from a trailing \t).
        // Anything else is an error.
        if (tokens[x]) {
          throw new Error('Invalid diff operation in diff_fromDelta: ' +
                          tokens[x]);
        }
    }
  }
  if (pointer != text1.length) {
    throw new Error('Delta length (' + pointer +
        ') does not equal source text length (' + text1.length + ').');
  }
  return diffs;
};


//  MATCH FUNCTIONS


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc'.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 */
diff_match_patch.prototype.match_main = function(text, pattern, loc) {
  // Check for null inputs.
  if (text == null || pattern == null || loc == null) {
    throw new Error('Null input. (match_main)');
  }

  loc = Math.max(0, Math.min(loc, text.length));
  if (text == pattern) {
    // Shortcut (potentially not guaranteed by the algorithm)
    return 0;
  } else if (!text.length) {
    // Nothing to match.
    return -1;
  } else if (text.substring(loc, loc + pattern.length) == pattern) {
    // Perfect match at the perfect spot!  (Includes case of null pattern)
    return loc;
  } else {
    // Do a fuzzy compare.
    return this.match_bitap_(text, pattern, loc);
  }
};


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc' using the
 * Bitap algorithm.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 * @private
 */
diff_match_patch.prototype.match_bitap_ = function(text, pattern, loc) {
  if (pattern.length > this.Match_MaxBits) {
    throw new Error('Pattern too long for this browser.');
  }

  // Initialise the alphabet.
  var s = this.match_alphabet_(pattern);

  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Compute and return the score for a match with e errors and x location.
   * Accesses loc and pattern through being a closure.
   * @param {number} e Number of errors in match.
   * @param {number} x Location of match.
   * @return {number} Overall score for match (0.0 = good, 1.0 = bad).
   * @private
   */
  function match_bitapScore_(e, x) {
    var accuracy = e / pattern.length;
    var proximity = Math.abs(loc - x);
    if (!dmp.Match_Distance) {
      // Dodge divide by zero error.
      return proximity ? 1.0 : accuracy;
    }
    return accuracy + (proximity / dmp.Match_Distance);
  }

  // Highest score beyond which we give up.
  var score_threshold = this.Match_Threshold;
  // Is there a nearby exact match? (speedup)
  var best_loc = text.indexOf(pattern, loc);
  if (best_loc != -1) {
    score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
    // What about in the other direction? (speedup)
    best_loc = text.lastIndexOf(pattern, loc + pattern.length);
    if (best_loc != -1) {
      score_threshold =
          Math.min(match_bitapScore_(0, best_loc), score_threshold);
    }
  }

  // Initialise the bit arrays.
  var matchmask = 1 << (pattern.length - 1);
  best_loc = -1;

  var bin_min, bin_mid;
  var bin_max = pattern.length + text.length;
  var last_rd;
  for (var d = 0; d < pattern.length; d++) {
    // Scan for the best match; each iteration allows for one more error.
    // Run a binary search to determine how far from 'loc' we can stray at this
    // error level.
    bin_min = 0;
    bin_mid = bin_max;
    while (bin_min < bin_mid) {
      if (match_bitapScore_(d, loc + bin_mid) <= score_threshold) {
        bin_min = bin_mid;
      } else {
        bin_max = bin_mid;
      }
      bin_mid = Math.floor((bin_max - bin_min) / 2 + bin_min);
    }
    // Use the result from this iteration as the maximum for the next.
    bin_max = bin_mid;
    var start = Math.max(1, loc - bin_mid + 1);
    var finish = Math.min(loc + bin_mid, text.length) + pattern.length;

    var rd = Array(finish + 2);
    rd[finish + 1] = (1 << d) - 1;
    for (var j = finish; j >= start; j--) {
      // The alphabet (s) is a sparse hash, so the following line generates
      // warnings.
      var charMatch = s[text.charAt(j - 1)];
      if (d === 0) {  // First pass: exact match.
        rd[j] = ((rd[j + 1] << 1) | 1) & charMatch;
      } else {  // Subsequent passes: fuzzy match.
        rd[j] = (((rd[j + 1] << 1) | 1) & charMatch) |
                (((last_rd[j + 1] | last_rd[j]) << 1) | 1) |
                last_rd[j + 1];
      }
      if (rd[j] & matchmask) {
        var score = match_bitapScore_(d, j - 1);
        // This match will almost certainly be better than any existing match.
        // But check anyway.
        if (score <= score_threshold) {
          // Told you so.
          score_threshold = score;
          best_loc = j - 1;
          if (best_loc > loc) {
            // When passing loc, don't exceed our current distance from loc.
            start = Math.max(1, 2 * loc - best_loc);
          } else {
            // Already passed loc, downhill from here on in.
            break;
          }
        }
      }
    }
    // No hope for a (better) match at greater error levels.
    if (match_bitapScore_(d + 1, loc) > score_threshold) {
      break;
    }
    last_rd = rd;
  }
  return best_loc;
};


/**
 * Initialise the alphabet for the Bitap algorithm.
 * @param {string} pattern The text to encode.
 * @return {!Object} Hash of character locations.
 * @private
 */
diff_match_patch.prototype.match_alphabet_ = function(pattern) {
  var s = {};
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] = 0;
  }
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] |= 1 << (pattern.length - i - 1);
  }
  return s;
};


//  PATCH FUNCTIONS


/**
 * Increase the context until it is unique,
 * but don't let the pattern expand beyond Match_MaxBits.
 * @param {!diff_match_patch.patch_obj} patch The patch to grow.
 * @param {string} text Source text.
 * @private
 */
diff_match_patch.prototype.patch_addContext_ = function(patch, text) {
  if (text.length == 0) {
    return;
  }
  var pattern = text.substring(patch.start2, patch.start2 + patch.length1);
  var padding = 0;

  // Look for the first and last matches of pattern in text.  If two different
  // matches are found, increase the pattern length.
  while (text.indexOf(pattern) != text.lastIndexOf(pattern) &&
         pattern.length < this.Match_MaxBits - this.Patch_Margin -
         this.Patch_Margin) {
    padding += this.Patch_Margin;
    pattern = text.substring(patch.start2 - padding,
                             patch.start2 + patch.length1 + padding);
  }
  // Add one chunk for good luck.
  padding += this.Patch_Margin;

  // Add the prefix.
  var prefix = text.substring(patch.start2 - padding, patch.start2);
  if (prefix) {
    patch.diffs.unshift([DIFF_EQUAL, prefix]);
  }
  // Add the suffix.
  var suffix = text.substring(patch.start2 + patch.length1,
                              patch.start2 + patch.length1 + padding);
  if (suffix) {
    patch.diffs.push([DIFF_EQUAL, suffix]);
  }

  // Roll back the start points.
  patch.start1 -= prefix.length;
  patch.start2 -= prefix.length;
  // Extend the lengths.
  patch.length1 += prefix.length + suffix.length;
  patch.length2 += prefix.length + suffix.length;
};


/**
 * Compute a list of patches to turn text1 into text2.
 * Use diffs if provided, otherwise compute it ourselves.
 * There are four ways to call this function, depending on what data is
 * available to the caller:
 * Method 1:
 * a = text1, b = text2
 * Method 2:
 * a = diffs
 * Method 3 (optimal):
 * a = text1, b = diffs
 * Method 4 (deprecated, use method 3):
 * a = text1, b = text2, c = diffs
 *
 * @param {string|!Array.<!diff_match_patch.Diff>} a text1 (methods 1,3,4) or
 * Array of diff tuples for text1 to text2 (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_b text2 (methods 1,4) or
 * Array of diff tuples for text1 to text2 (method 3) or undefined (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_c Array of diff tuples
 * for text1 to text2 (method 4) or undefined (methods 1,2,3).
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_make = function(a, opt_b, opt_c) {
  var text1, diffs;
  if (typeof a == 'string' && typeof opt_b == 'string' &&
      typeof opt_c == 'undefined') {
    // Method 1: text1, text2
    // Compute diffs from text1 and text2.
    text1 = /** @type {string} */(a);
    diffs = this.diff_main(text1, /** @type {string} */(opt_b), true);
    if (diffs.length > 2) {
      this.diff_cleanupSemantic(diffs);
      this.diff_cleanupEfficiency(diffs);
    }
  } else if (a && typeof a == 'object' && typeof opt_b == 'undefined' &&
      typeof opt_c == 'undefined') {
    // Method 2: diffs
    // Compute text1 from diffs.
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(a);
    text1 = this.diff_text1(diffs);
  } else if (typeof a == 'string' && opt_b && typeof opt_b == 'object' &&
      typeof opt_c == 'undefined') {
    // Method 3: text1, diffs
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_b);
  } else if (typeof a == 'string' && typeof opt_b == 'string' &&
      opt_c && typeof opt_c == 'object') {
    // Method 4: text1, text2, diffs
    // text2 is not used.
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_c);
  } else {
    throw new Error('Unknown call format to patch_make.');
  }

  if (diffs.length === 0) {
    return [];  // Get rid of the null case.
  }
  var patches = [];
  var patch = new diff_match_patch.patch_obj();
  var patchDiffLength = 0;  // Keeping our own length var is faster in JS.
  var char_count1 = 0;  // Number of characters into the text1 string.
  var char_count2 = 0;  // Number of characters into the text2 string.
  // Start with text1 (prepatch_text) and apply the diffs until we arrive at
  // text2 (postpatch_text).  We recreate the patches one by one to determine
  // context info.
  var prepatch_text = text1;
  var postpatch_text = text1;
  for (var x = 0; x < diffs.length; x++) {
    var diff_type = diffs[x][0];
    var diff_text = diffs[x][1];

    if (!patchDiffLength && diff_type !== DIFF_EQUAL) {
      // A new patch starts here.
      patch.start1 = char_count1;
      patch.start2 = char_count2;
    }

    switch (diff_type) {
      case DIFF_INSERT:
        patch.diffs[patchDiffLength++] = diffs[x];
        patch.length2 += diff_text.length;
        postpatch_text = postpatch_text.substring(0, char_count2) + diff_text +
                         postpatch_text.substring(char_count2);
        break;
      case DIFF_DELETE:
        patch.length1 += diff_text.length;
        patch.diffs[patchDiffLength++] = diffs[x];
        postpatch_text = postpatch_text.substring(0, char_count2) +
                         postpatch_text.substring(char_count2 +
                             diff_text.length);
        break;
      case DIFF_EQUAL:
        if (diff_text.length <= 2 * this.Patch_Margin &&
            patchDiffLength && diffs.length != x + 1) {
          // Small equality inside a patch.
          patch.diffs[patchDiffLength++] = diffs[x];
          patch.length1 += diff_text.length;
          patch.length2 += diff_text.length;
        } else if (diff_text.length >= 2 * this.Patch_Margin) {
          // Time for a new patch.
          if (patchDiffLength) {
            this.patch_addContext_(patch, prepatch_text);
            patches.push(patch);
            patch = new diff_match_patch.patch_obj();
            patchDiffLength = 0;
            // Unlike Unidiff, our patch lists have a rolling context.
            // http://code.google.com/p/google-diff-match-patch/wiki/Unidiff
            // Update prepatch text & pos to reflect the application of the
            // just completed patch.
            prepatch_text = postpatch_text;
            char_count1 = char_count2;
          }
        }
        break;
    }

    // Update the current character count.
    if (diff_type !== DIFF_INSERT) {
      char_count1 += diff_text.length;
    }
    if (diff_type !== DIFF_DELETE) {
      char_count2 += diff_text.length;
    }
  }
  // Pick up the leftover patch if not empty.
  if (patchDiffLength) {
    this.patch_addContext_(patch, prepatch_text);
    patches.push(patch);
  }

  return patches;
};


/**
 * Given an array of patches, return another array that is identical.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_deepCopy = function(patches) {
  // Making deep copies is hard in JavaScript.
  var patchesCopy = [];
  for (var x = 0; x < patches.length; x++) {
    var patch = patches[x];
    var patchCopy = new diff_match_patch.patch_obj();
    patchCopy.diffs = [];
    for (var y = 0; y < patch.diffs.length; y++) {
      patchCopy.diffs[y] = patch.diffs[y].slice();
    }
    patchCopy.start1 = patch.start1;
    patchCopy.start2 = patch.start2;
    patchCopy.length1 = patch.length1;
    patchCopy.length2 = patch.length2;
    patchesCopy[x] = patchCopy;
  }
  return patchesCopy;
};


/**
 * Merge a set of patches onto the text.  Return a patched text, as well
 * as a list of true/false values indicating which patches were applied.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @param {string} text Old text.
 * @return {!Array.<string|!Array.<boolean>>} Two element Array, containing the
 *      new text and an array of boolean values.
 */
diff_match_patch.prototype.patch_apply = function(patches, text) {
  if (patches.length == 0) {
    return [text, []];
  }

  // Deep copy the patches so that no changes are made to originals.
  patches = this.patch_deepCopy(patches);

  var nullPadding = this.patch_addPadding(patches);
  text = nullPadding + text + nullPadding;

  this.patch_splitMax(patches);
  // delta keeps track of the offset between the expected and actual location
  // of the previous patch.  If there are patches expected at positions 10 and
  // 20, but the first patch was found at 12, delta is 2 and the second patch
  // has an effective expected position of 22.
  var delta = 0;
  var results = [];
  for (var x = 0; x < patches.length; x++) {
    var expected_loc = patches[x].start2 + delta;
    var text1 = this.diff_text1(patches[x].diffs);
    var start_loc;
    var end_loc = -1;
    if (text1.length > this.Match_MaxBits) {
      // patch_splitMax will only provide an oversized pattern in the case of
      // a monster delete.
      start_loc = this.match_main(text, text1.substring(0, this.Match_MaxBits),
                                  expected_loc);
      if (start_loc != -1) {
        end_loc = this.match_main(text,
            text1.substring(text1.length - this.Match_MaxBits),
            expected_loc + text1.length - this.Match_MaxBits);
        if (end_loc == -1 || start_loc >= end_loc) {
          // Can't find valid trailing context.  Drop this patch.
          start_loc = -1;
        }
      }
    } else {
      start_loc = this.match_main(text, text1, expected_loc);
    }
    if (start_loc == -1) {
      // No match found.  :(
      results[x] = false;
      // Subtract the delta for this failed patch from subsequent patches.
      delta -= patches[x].length2 - patches[x].length1;
    } else {
      // Found a match.  :)
      results[x] = true;
      delta = start_loc - expected_loc;
      var text2;
      if (end_loc == -1) {
        text2 = text.substring(start_loc, start_loc + text1.length);
      } else {
        text2 = text.substring(start_loc, end_loc + this.Match_MaxBits);
      }
      if (text1 == text2) {
        // Perfect match, just shove the replacement text in.
        text = text.substring(0, start_loc) +
               this.diff_text2(patches[x].diffs) +
               text.substring(start_loc + text1.length);
      } else {
        // Imperfect match.  Run a diff to get a framework of equivalent
        // indices.
        var diffs = this.diff_main(text1, text2, false);
        if (text1.length > this.Match_MaxBits &&
            this.diff_levenshtein(diffs) / text1.length >
            this.Patch_DeleteThreshold) {
          // The end points match, but the content is unacceptably bad.
          results[x] = false;
        } else {
          this.diff_cleanupSemanticLossless(diffs);
          var index1 = 0;
          var index2;
          for (var y = 0; y < patches[x].diffs.length; y++) {
            var mod = patches[x].diffs[y];
            if (mod[0] !== DIFF_EQUAL) {
              index2 = this.diff_xIndex(diffs, index1);
            }
            if (mod[0] === DIFF_INSERT) {  // Insertion
              text = text.substring(0, start_loc + index2) + mod[1] +
                     text.substring(start_loc + index2);
            } else if (mod[0] === DIFF_DELETE) {  // Deletion
              text = text.substring(0, start_loc + index2) +
                     text.substring(start_loc + this.diff_xIndex(diffs,
                         index1 + mod[1].length));
            }
            if (mod[0] !== DIFF_DELETE) {
              index1 += mod[1].length;
            }
          }
        }
      }
    }
  }
  // Strip the padding off.
  text = text.substring(nullPadding.length, text.length - nullPadding.length);
  return [text, results];
};


/**
 * Add some padding on text start and end so that edges can match something.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} The padding string added to each side.
 */
diff_match_patch.prototype.patch_addPadding = function(patches) {
  var paddingLength = this.Patch_Margin;
  var nullPadding = '';
  for (var x = 1; x <= paddingLength; x++) {
    nullPadding += String.fromCharCode(x);
  }

  // Bump all the patches forward.
  for (var x = 0; x < patches.length; x++) {
    patches[x].start1 += paddingLength;
    patches[x].start2 += paddingLength;
  }

  // Add some padding on start of first diff.
  var patch = patches[0];
  var diffs = patch.diffs;
  if (diffs.length == 0 || diffs[0][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.unshift([DIFF_EQUAL, nullPadding]);
    patch.start1 -= paddingLength;  // Should be 0.
    patch.start2 -= paddingLength;  // Should be 0.
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[0][1].length) {
    // Grow first equality.
    var extraLength = paddingLength - diffs[0][1].length;
    diffs[0][1] = nullPadding.substring(diffs[0][1].length) + diffs[0][1];
    patch.start1 -= extraLength;
    patch.start2 -= extraLength;
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  // Add some padding on end of last diff.
  patch = patches[patches.length - 1];
  diffs = patch.diffs;
  if (diffs.length == 0 || diffs[diffs.length - 1][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.push([DIFF_EQUAL, nullPadding]);
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[diffs.length - 1][1].length) {
    // Grow last equality.
    var extraLength = paddingLength - diffs[diffs.length - 1][1].length;
    diffs[diffs.length - 1][1] += nullPadding.substring(0, extraLength);
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  return nullPadding;
};


/**
 * Look through the patches and break up any which are longer than the maximum
 * limit of the match algorithm.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 */
diff_match_patch.prototype.patch_splitMax = function(patches) {
  var patch_size = this.Match_MaxBits;
  for (var x = 0; x < patches.length; x++) {
    if (patches[x].length1 <= patch_size) {
      continue;
    }
    var bigpatch = patches[x];
    // Remove the big old patch.
    patches.splice(x--, 1);
    var start1 = bigpatch.start1;
    var start2 = bigpatch.start2;
    var precontext = '';
    while (bigpatch.diffs.length !== 0) {
      // Create one of several smaller patches.
      var patch = new diff_match_patch.patch_obj();
      var empty = true;
      patch.start1 = start1 - precontext.length;
      patch.start2 = start2 - precontext.length;
      if (precontext !== '') {
        patch.length1 = patch.length2 = precontext.length;
        patch.diffs.push([DIFF_EQUAL, precontext]);
      }
      while (bigpatch.diffs.length !== 0 &&
             patch.length1 < patch_size - this.Patch_Margin) {
        var diff_type = bigpatch.diffs[0][0];
        var diff_text = bigpatch.diffs[0][1];
        if (diff_type === DIFF_INSERT) {
          // Insertions are harmless.
          patch.length2 += diff_text.length;
          start2 += diff_text.length;
          patch.diffs.push(bigpatch.diffs.shift());
          empty = false;
        } else if (diff_type === DIFF_DELETE && patch.diffs.length == 1 &&
                   patch.diffs[0][0] == DIFF_EQUAL &&
                   diff_text.length > 2 * patch_size) {
          // This is a large deletion.  Let it pass in one chunk.
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          empty = false;
          patch.diffs.push([diff_type, diff_text]);
          bigpatch.diffs.shift();
        } else {
          // Deletion or equality.  Only take as much as we can stomach.
          diff_text = diff_text.substring(0,
              patch_size - patch.length1 - this.Patch_Margin);
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          if (diff_type === DIFF_EQUAL) {
            patch.length2 += diff_text.length;
            start2 += diff_text.length;
          } else {
            empty = false;
          }
          patch.diffs.push([diff_type, diff_text]);
          if (diff_text == bigpatch.diffs[0][1]) {
            bigpatch.diffs.shift();
          } else {
            bigpatch.diffs[0][1] =
                bigpatch.diffs[0][1].substring(diff_text.length);
          }
        }
      }
      // Compute the head context for the next patch.
      precontext = this.diff_text2(patch.diffs);
      precontext =
          precontext.substring(precontext.length - this.Patch_Margin);
      // Append the end context for this patch.
      var postcontext = this.diff_text1(bigpatch.diffs)
                            .substring(0, this.Patch_Margin);
      if (postcontext !== '') {
        patch.length1 += postcontext.length;
        patch.length2 += postcontext.length;
        if (patch.diffs.length !== 0 &&
            patch.diffs[patch.diffs.length - 1][0] === DIFF_EQUAL) {
          patch.diffs[patch.diffs.length - 1][1] += postcontext;
        } else {
          patch.diffs.push([DIFF_EQUAL, postcontext]);
        }
      }
      if (!empty) {
        patches.splice(++x, 0, patch);
      }
    }
  }
};


/**
 * Take a list of patches and return a textual representation.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} Text representation of patches.
 */
diff_match_patch.prototype.patch_toText = function(patches) {
  var text = [];
  for (var x = 0; x < patches.length; x++) {
    text[x] = patches[x];
  }
  return text.join('');
};


/**
 * Parse a textual representation of patches and return a list of Patch objects.
 * @param {string} textline Text representation of patches.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.patch_fromText = function(textline) {
  var patches = [];
  if (!textline) {
    return patches;
  }
  var text = textline.split('\n');
  var textPointer = 0;
  var patchHeader = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;
  while (textPointer < text.length) {
    var m = text[textPointer].match(patchHeader);
    if (!m) {
      throw new Error('Invalid patch string: ' + text[textPointer]);
    }
    var patch = new diff_match_patch.patch_obj();
    patches.push(patch);
    patch.start1 = parseInt(m[1], 10);
    if (m[2] === '') {
      patch.start1--;
      patch.length1 = 1;
    } else if (m[2] == '0') {
      patch.length1 = 0;
    } else {
      patch.start1--;
      patch.length1 = parseInt(m[2], 10);
    }

    patch.start2 = parseInt(m[3], 10);
    if (m[4] === '') {
      patch.start2--;
      patch.length2 = 1;
    } else if (m[4] == '0') {
      patch.length2 = 0;
    } else {
      patch.start2--;
      patch.length2 = parseInt(m[4], 10);
    }
    textPointer++;

    while (textPointer < text.length) {
      var sign = text[textPointer].charAt(0);
      try {
        var line = decodeURI(text[textPointer].substring(1));
      } catch (ex) {
        // Malformed URI sequence.
        throw new Error('Illegal escape in patch_fromText: ' + line);
      }
      if (sign == '-') {
        // Deletion.
        patch.diffs.push([DIFF_DELETE, line]);
      } else if (sign == '+') {
        // Insertion.
        patch.diffs.push([DIFF_INSERT, line]);
      } else if (sign == ' ') {
        // Minor equality.
        patch.diffs.push([DIFF_EQUAL, line]);
      } else if (sign == '@') {
        // Start of next patch.
        break;
      } else if (sign === '') {
        // Blank line?  Whatever.
      } else {
        // WTF?
        throw new Error('Invalid patch mode "' + sign + '" in: ' + line);
      }
      textPointer++;
    }
  }
  return patches;
};


/**
 * Class representing one patch operation.
 * @constructor
 */
diff_match_patch.patch_obj = function() {
  /** @type {!Array.<!diff_match_patch.Diff>} */
  this.diffs = [];
  /** @type {?number} */
  this.start1 = null;
  /** @type {?number} */
  this.start2 = null;
  /** @type {number} */
  this.length1 = 0;
  /** @type {number} */
  this.length2 = 0;
};


/**
 * Emmulate GNU diff's format.
 * Header: @@ -382,8 +481,9 @@
 * Indicies are printed as 1-based, not 0-based.
 * @return {string} The GNU diff string.
 */
diff_match_patch.patch_obj.prototype.toString = function() {
  var coords1, coords2;
  if (this.length1 === 0) {
    coords1 = this.start1 + ',0';
  } else if (this.length1 == 1) {
    coords1 = this.start1 + 1;
  } else {
    coords1 = (this.start1 + 1) + ',' + this.length1;
  }
  if (this.length2 === 0) {
    coords2 = this.start2 + ',0';
  } else if (this.length2 == 1) {
    coords2 = this.start2 + 1;
  } else {
    coords2 = (this.start2 + 1) + ',' + this.length2;
  }
  var text = ['@@ -' + coords1 + ' +' + coords2 + ' @@\n'];
  var op;
  // Escape the body of the patch with %xx notation.
  for (var x = 0; x < this.diffs.length; x++) {
    switch (this.diffs[x][0]) {
      case DIFF_INSERT:
        op = '+';
        break;
      case DIFF_DELETE:
        op = '-';
        break;
      case DIFF_EQUAL:
        op = ' ';
        break;
    }
    text[x + 1] = op + encodeURI(this.diffs[x][1]) + '\n';
  }
  return text.join('').replace(/%20/g, ' ');
};


// The following export code was added by @ForbesLindesay
module.exports = diff_match_patch;
module.exports['diff_match_patch'] = diff_match_patch;
module.exports['DIFF_DELETE'] = DIFF_DELETE;
module.exports['DIFF_INSERT'] = DIFF_INSERT;
module.exports['DIFF_EQUAL'] = DIFF_EQUAL;

},{}],36:[function(require,module,exports){
module.exports = require('./lib')

},{"./lib":37}],37:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromRange = fromRange;
exports.toRange = toRange;

var _domNodeIterator = require('dom-node-iterator');

var _domNodeIterator2 = _interopRequireDefault(_domNodeIterator);

var _domSeek = require('dom-seek');

var _domSeek2 = _interopRequireDefault(_domSeek);

var _rangeToString = require('./range-to-string');

var _rangeToString2 = _interopRequireDefault(_rangeToString);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SHOW_TEXT = 4;

function fromRange(root, range) {
  if (root === undefined) {
    throw new Error('missing required parameter "root"');
  }
  if (range === undefined) {
    throw new Error('missing required parameter "range"');
  }

  var document = root.ownerDocument;
  var prefix = document.createRange();

  var startNode = range.startContainer;
  var startOffset = range.startOffset;

  prefix.setStart(root, 0);
  prefix.setEnd(startNode, startOffset);

  var start = (0, _rangeToString2.default)(prefix).length;
  var end = start + (0, _rangeToString2.default)(range).length;

  return {
    start: start,
    end: end
  };
}

function toRange(root) {
  var selector = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  if (root === undefined) {
    throw new Error('missing required parameter "root"');
  }

  var document = root.ownerDocument;
  var range = document.createRange();
  var iter = (0, _domNodeIterator2.default)(root, SHOW_TEXT);

  var start = selector.start || 0;
  var end = selector.end || start;
  var count = (0, _domSeek2.default)(iter, start);
  var remainder = start - count;

  if (iter.pointerBeforeReferenceNode) {
    range.setStart(iter.referenceNode, remainder);
  } else {
    range.setStart(iter.nextNode(), remainder);
    iter.previousNode();
  }

  var length = end - start + remainder;
  count = (0, _domSeek2.default)(iter, length);
  remainder = length - count;

  if (iter.pointerBeforeReferenceNode) {
    range.setEnd(iter.referenceNode, remainder);
  } else {
    range.setEnd(iter.nextNode(), remainder);
  }

  return range;
}

},{"./range-to-string":38,"dom-node-iterator":42,"dom-seek":51}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = rangeToString;
/* global Node */

/**
 * Return the next node after `node` in a tree order traversal of the document.
 */
function nextNode(node, skipChildren) {
  if (!skipChildren && node.firstChild) {
    return node.firstChild;
  }

  do {
    if (node.nextSibling) {
      return node.nextSibling;
    }
    node = node.parentNode;
  } while (node);

  /* istanbul ignore next */
  return node;
}

function firstNode(range) {
  if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
    var node = range.startContainer.childNodes[range.startOffset];
    return node || nextNode(range.startContainer, true /* skip children */);
  }
  return range.startContainer;
}

function firstNodeAfter(range) {
  if (range.endContainer.nodeType === Node.ELEMENT_NODE) {
    var node = range.endContainer.childNodes[range.endOffset];
    return node || nextNode(range.endContainer, true /* skip children */);
  }
  return nextNode(range.endContainer);
}

function forEachNodeInRange(range, cb) {
  var node = firstNode(range);
  var pastEnd = firstNodeAfter(range);
  while (node !== pastEnd) {
    cb(node);
    node = nextNode(node);
  }
}

/**
 * A ponyfill for Range.toString().
 * Spec: https://dom.spec.whatwg.org/#dom-range-stringifier
 *
 * Works around the buggy Range.toString() implementation in IE and Edge.
 * See https://github.com/tilgovi/dom-anchor-text-position/issues/4
 */
function rangeToString(range) {
  // This is a fairly direct translation of the Range.toString() implementation
  // in Blink.
  var text = '';
  forEachNodeInRange(range, function (node) {
    if (node.nodeType !== Node.TEXT_NODE) {
      return;
    }
    var start = node === range.startContainer ? range.startOffset : 0;
    var end = node === range.endContainer ? range.endOffset : node.textContent.length;
    text += node.textContent.slice(start, end);
  });
  return text;
}

},{}],39:[function(require,module,exports){
module.exports = require('./lib');

},{"./lib":40}],40:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromRange = fromRange;
exports.fromTextPosition = fromTextPosition;
exports.toRange = toRange;
exports.toTextPosition = toTextPosition;

var _diffMatchPatch = require('diff-match-patch');

var _diffMatchPatch2 = _interopRequireDefault(_diffMatchPatch);

var _domAnchorTextPosition = require('dom-anchor-text-position');

var textPosition = _interopRequireWildcard(_domAnchorTextPosition);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// The DiffMatchPatch bitap has a hard 32-character pattern length limit.
var SLICE_LENGTH = 32;
var SLICE_RE = new RegExp('(.|[\r\n]){1,' + String(SLICE_LENGTH) + '}', 'g');
var CONTEXT_LENGTH = SLICE_LENGTH;

function fromRange(root, range) {
  if (root === undefined) {
    throw new Error('missing required parameter "root"');
  }
  if (range === undefined) {
    throw new Error('missing required parameter "range"');
  }

  var position = textPosition.fromRange(root, range);
  return fromTextPosition(root, position);
}

function fromTextPosition(root, selector) {
  if (root === undefined) {
    throw new Error('missing required parameter "root"');
  }
  if (selector === undefined) {
    throw new Error('missing required parameter "selector"');
  }

  var start = selector.start;

  if (start === undefined) {
    throw new Error('selector missing required property "start"');
  }
  if (start < 0) {
    throw new Error('property "start" must be a non-negative integer');
  }

  var end = selector.end;

  if (end === undefined) {
    throw new Error('selector missing required property "end"');
  }
  if (end < 0) {
    throw new Error('property "end" must be a non-negative integer');
  }

  var exact = root.textContent.substr(start, end - start);

  var prefixStart = Math.max(0, start - CONTEXT_LENGTH);
  var prefix = root.textContent.substr(prefixStart, start - prefixStart);

  var suffixEnd = Math.min(root.textContent.length, end + CONTEXT_LENGTH);
  var suffix = root.textContent.substr(end, suffixEnd - end);

  return { exact: exact, prefix: prefix, suffix: suffix };
}

function toRange(root, selector) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var position = toTextPosition(root, selector, options);
  if (position === null) {
    return null;
  } else {
    return textPosition.toRange(root, position);
  }
}

function toTextPosition(root, selector) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  if (root === undefined) {
    throw new Error('missing required parameter "root"');
  }
  if (selector === undefined) {
    throw new Error('missing required parameter "selector"');
  }

  var exact = selector.exact;

  if (exact === undefined) {
    throw new Error('selector missing required property "exact"');
  }

  var prefix = selector.prefix,
      suffix = selector.suffix;
  var hint = options.hint;

  var dmp = new _diffMatchPatch2.default();

  dmp.Match_Distance = root.textContent.length * 2;

  // Work around a hard limit of the DiffMatchPatch bitap implementation.
  // The search pattern must be no more than SLICE_LENGTH characters.
  var slices = exact.match(SLICE_RE);
  var loc = hint === undefined ? root.textContent.length / 2 | 0 : hint;
  var start = Number.POSITIVE_INFINITY;
  var end = Number.NEGATIVE_INFINITY;
  var result = -1;
  var havePrefix = prefix !== undefined;
  var haveSuffix = suffix !== undefined;
  var foundPrefix = false;

  // If the prefix is known then search for that first.
  if (havePrefix) {
    result = dmp.match_main(root.textContent, prefix, loc);
    if (result > -1) {
      loc = result + prefix.length;
      foundPrefix = true;
    }
  }

  // If we have a suffix, and the prefix wasn't found, then search for it.
  if (haveSuffix && !foundPrefix) {
    result = dmp.match_main(root.textContent, suffix, loc + exact.length);
    if (result > -1) {
      loc = result - exact.length;
    }
  }

  // Search for the first slice.
  var firstSlice = slices.shift();
  result = dmp.match_main(root.textContent, firstSlice, loc);
  if (result > -1) {
    start = result;
    loc = end = start + firstSlice.length;
  } else {
    return null;
  }

  // Create a fold function that will reduce slices to positional extents.
  var foldSlices = function foldSlices(acc, slice) {
    if (!acc) {
      // A search for an earlier slice of the pattern failed to match.
      return null;
    }

    var result = dmp.match_main(root.textContent, slice, acc.loc);
    if (result === -1) {
      return null;
    }

    // The next slice should follow this one closely.
    acc.loc = result + slice.length;

    // Expand the start and end to a quote that includes all the slices.
    acc.start = Math.min(acc.start, result);
    acc.end = Math.max(acc.end, result + slice.length);

    return acc;
  };

  // Use the fold function to establish the full quote extents.
  // Expect the slices to be close to one another.
  // This distance is deliberately generous for now.
  dmp.Match_Distance = 64;
  var acc = slices.reduce(foldSlices, { start: start, end: end, loc: loc });
  if (!acc) {
    return null;
  }

  return { start: acc.start, end: acc.end };
}

},{"diff-match-patch":35,"dom-anchor-text-position":36}],41:[function(require,module,exports){
module.exports = require('./lib/implementation')['default'];

},{"./lib/implementation":45}],42:[function(require,module,exports){
module.exports = require('./lib')['default'];
module.exports.getPolyfill = require('./polyfill');
module.exports.implementation = require('./implementation');
module.exports.shim = require('./shim');

},{"./implementation":41,"./lib":46,"./polyfill":49,"./shim":50}],43:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

exports['default'] = createNodeIterator;


function createNodeIterator(root) {
  var whatToShow = arguments.length <= 1 || arguments[1] === undefined ? 0xFFFFFFFF : arguments[1];
  var filter = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  var doc = root.nodeType == 9 || root.ownerDocument;
  var iter = doc.createNodeIterator(root, whatToShow, filter, false);
  return new NodeIterator(iter, root, whatToShow, filter);
}

var NodeIterator = function () {
  function NodeIterator(iter, root, whatToShow, filter) {
    _classCallCheck(this, NodeIterator);

    this.root = root;
    this.whatToShow = whatToShow;
    this.filter = filter;
    this.referenceNode = root;
    this.pointerBeforeReferenceNode = true;
    this._iter = iter;
  }

  NodeIterator.prototype.nextNode = function nextNode() {
    var result = this._iter.nextNode();
    this.pointerBeforeReferenceNode = false;
    if (result === null) return null;
    this.referenceNode = result;
    return this.referenceNode;
  };

  NodeIterator.prototype.previousNode = function previousNode() {
    var result = this._iter.previousNode();
    this.pointerBeforeReferenceNode = true;
    if (result === null) return null;
    this.referenceNode = result;
    return this.referenceNode;
  };

  NodeIterator.prototype.toString = function toString() {
    return '[object NodeIterator]';
  };

  return NodeIterator;
}();

},{}],44:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports["default"] = createNodeIterator;


function createNodeIterator(root) {
  var whatToShow = arguments.length <= 1 || arguments[1] === undefined ? 0xFFFFFFFF : arguments[1];
  var filter = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  var doc = root.ownerDocument;
  return doc.createNodeIterator.call(doc, root, whatToShow, filter);
}

},{}],45:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

exports['default'] = createNodeIterator;


function createNodeIterator(root) {
  var whatToShow = arguments.length <= 1 || arguments[1] === undefined ? 0xFFFFFFFF : arguments[1];
  var filter = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  return new NodeIterator(root, whatToShow, filter);
}

var NodeIterator = function () {
  function NodeIterator(root, whatToShow, filter) {
    _classCallCheck(this, NodeIterator);

    this.root = root;
    this.whatToShow = whatToShow;
    this.filter = filter;
    this.referenceNode = root;
    this.pointerBeforeReferenceNode = true;
    this._filter = function (node) {
      return filter ? filter(node) === 1 : true;
    };
    this._show = function (node) {
      return whatToShow >> node.nodeType - 1 & 1 === 1;
    };
  }

  NodeIterator.prototype.nextNode = function nextNode() {
    var before = this.pointerBeforeReferenceNode;
    this.pointerBeforeReferenceNode = false;

    var node = this.referenceNode;
    if (before && this._show(node) && this._filter(node)) return node;

    do {
      if (node.firstChild) {
        node = node.firstChild;
        continue;
      }

      do {
        if (node === this.root) return null;
        if (node.nextSibling) break;
        node = node.parentNode;
      } while (node);

      node = node.nextSibling;
    } while (!this._show(node) || !this._filter(node));

    this.referenceNode = node;
    this.pointerBeforeReferenceNode = false;
    return node;
  };

  NodeIterator.prototype.previousNode = function previousNode() {
    var before = this.pointerBeforeReferenceNode;
    this.pointerBeforeReferenceNode = true;

    var node = this.referenceNode;
    if (!before && this._show(node) && this._filter(node)) return node;

    do {
      if (node === this.root) return null;

      if (node.previousSibling) {
        node = node.previousSibling;
        while (node.lastChild) {
          node = node.lastChild;
        }continue;
      }

      node = node.parentNode;
    } while (!this._show(node) || !this._filter(node));

    this.referenceNode = node;
    this.pointerBeforeReferenceNode = true;
    return node;
  };

  NodeIterator.prototype.toString = function toString() {
    return '[object NodeIterator]';
  };

  return NodeIterator;
}();

},{}],46:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _polyfill = require('./polyfill');

var _polyfill2 = _interopRequireDefault(_polyfill);

var _implementation = require('./implementation');

var _implementation2 = _interopRequireDefault(_implementation);

var _shim = require('./shim');

var _shim2 = _interopRequireDefault(_shim);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var polyfill = (0, _polyfill2['default'])();
polyfill.implementation = _implementation2['default'];
polyfill.shim = _shim2['default'];

exports['default'] = polyfill;

},{"./implementation":45,"./polyfill":47,"./shim":48}],47:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = getPolyfill;

var _adapter = require('./adapter');

var _adapter2 = _interopRequireDefault(_adapter);

var _builtin = require('./builtin');

var _builtin2 = _interopRequireDefault(_builtin);

var _implementation = require('./implementation');

var _implementation2 = _interopRequireDefault(_implementation);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function getPolyfill() {
  try {
    var doc = typeof document === 'undefined' ? {} : document;
    var iter = (0, _builtin2['default'])(doc, 0xFFFFFFFF, null, false);
    if (iter.referenceNode === doc) return _builtin2['default'];
    return _adapter2['default'];
  } catch (_) {
    return _implementation2['default'];
  }
} /*global document*/

},{"./adapter":43,"./builtin":44,"./implementation":45}],48:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = shim;

var _builtin = require('./builtin');

var _builtin2 = _interopRequireDefault(_builtin);

var _polyfill = require('./polyfill');

var _polyfill2 = _interopRequireDefault(_polyfill);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*global document*/
function shim() {
  var doc = typeof document === 'undefined' ? {} : document;
  var polyfill = (0, _polyfill2['default'])();
  if (polyfill !== _builtin2['default']) doc.createNodeIterator = polyfill;
  return polyfill;
}

},{"./builtin":44,"./polyfill":47}],49:[function(require,module,exports){
module.exports = require('./lib/polyfill')['default'];

},{"./lib/polyfill":47}],50:[function(require,module,exports){
module.exports = require('./lib/shim')['default'];

},{"./lib/shim":48}],51:[function(require,module,exports){
module.exports = require('./lib')['default'];

},{"./lib":52}],52:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = seek;

var _ancestors = require('ancestors');

var _ancestors2 = _interopRequireDefault(_ancestors);

var _indexOf = require('index-of');

var _indexOf2 = _interopRequireDefault(_indexOf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var E_SHOW = 'Argument 1 of seek must use filter NodeFilter.SHOW_TEXT.';
var E_WHERE = 'Argument 2 of seek must be a number or a Text Node.';

var SHOW_TEXT = 4;
var TEXT_NODE = 3;

function seek(iter, where) {
  if (iter.whatToShow !== SHOW_TEXT) {
    throw new Error(E_SHOW);
  }

  var count = 0;
  var node = iter.referenceNode;
  var predicates = null;

  if (isNumber(where)) {
    predicates = {
      forward: function forward() {
        return count < where;
      },
      backward: function backward() {
        return count > where;
      }
    };
  } else if (isText(where)) {
    var forward = before(node, where) ? function () {
      return false;
    } : function () {
      return node !== where;
    };
    var backward = function backward() {
      return node != where || !iter.pointerBeforeReferenceNode;
    };
    predicates = { forward: forward, backward: backward };
  } else {
    throw new Error(E_WHERE);
  }

  while (predicates.forward() && (node = iter.nextNode()) !== null) {
    count += node.nodeValue.length;
  }

  while (predicates.backward() && (node = iter.previousNode()) !== null) {
    count -= node.nodeValue.length;
  }

  return count;
}

function isNumber(n) {
  return !isNaN(parseInt(n)) && isFinite(n);
}

function isText(node) {
  return node.nodeType === TEXT_NODE;
}

function before(ref, node) {
  if (ref === node) return false;

  var common = null;
  var left = [ref].concat((0, _ancestors2['default'])(ref)).reverse();
  var right = [node].concat((0, _ancestors2['default'])(node)).reverse();

  while (left[0] === right[0]) {
    common = left.shift();
    right.shift();
  }

  left = left[0];
  right = right[0];

  var l = (0, _indexOf2['default'])(common.childNodes, left);
  var r = (0, _indexOf2['default'])(common.childNodes, right);

  return l > r;
}

},{"ancestors":1,"index-of":56}],53:[function(require,module,exports){
/**
 * Check if argument is a HTML element.
 *
 * @param {Object} value
 * @return {Boolean}
 */
exports.node = function(value) {
    return value !== undefined
        && value instanceof HTMLElement
        && value.nodeType === 1;
};

/**
 * Check if argument is a list of HTML elements.
 *
 * @param {Object} value
 * @return {Boolean}
 */
exports.nodeList = function(value) {
    var type = Object.prototype.toString.call(value);

    return value !== undefined
        && (type === '[object NodeList]' || type === '[object HTMLCollection]')
        && ('length' in value)
        && (value.length === 0 || exports.node(value[0]));
};

/**
 * Check if argument is a string.
 *
 * @param {Object} value
 * @return {Boolean}
 */
exports.string = function(value) {
    return typeof value === 'string'
        || value instanceof String;
};

/**
 * Check if argument is a function.
 *
 * @param {Object} value
 * @return {Boolean}
 */
exports.fn = function(value) {
    var type = Object.prototype.toString.call(value);

    return type === '[object Function]';
};

},{}],54:[function(require,module,exports){
var is = require('./is');
var delegate = require('delegate');

/**
 * Validates all params and calls the right
 * listener function based on its target type.
 *
 * @param {String|HTMLElement|HTMLCollection|NodeList} target
 * @param {String} type
 * @param {Function} callback
 * @return {Object}
 */
function listen(target, type, callback) {
    if (!target && !type && !callback) {
        throw new Error('Missing required arguments');
    }

    if (!is.string(type)) {
        throw new TypeError('Second argument must be a String');
    }

    if (!is.fn(callback)) {
        throw new TypeError('Third argument must be a Function');
    }

    if (is.node(target)) {
        return listenNode(target, type, callback);
    }
    else if (is.nodeList(target)) {
        return listenNodeList(target, type, callback);
    }
    else if (is.string(target)) {
        return listenSelector(target, type, callback);
    }
    else {
        throw new TypeError('First argument must be a String, HTMLElement, HTMLCollection, or NodeList');
    }
}

/**
 * Adds an event listener to a HTML element
 * and returns a remove listener function.
 *
 * @param {HTMLElement} node
 * @param {String} type
 * @param {Function} callback
 * @return {Object}
 */
function listenNode(node, type, callback) {
    node.addEventListener(type, callback);

    return {
        destroy: function() {
            node.removeEventListener(type, callback);
        }
    }
}

/**
 * Add an event listener to a list of HTML elements
 * and returns a remove listener function.
 *
 * @param {NodeList|HTMLCollection} nodeList
 * @param {String} type
 * @param {Function} callback
 * @return {Object}
 */
function listenNodeList(nodeList, type, callback) {
    Array.prototype.forEach.call(nodeList, function(node) {
        node.addEventListener(type, callback);
    });

    return {
        destroy: function() {
            Array.prototype.forEach.call(nodeList, function(node) {
                node.removeEventListener(type, callback);
            });
        }
    }
}

/**
 * Add an event listener to a selector
 * and returns a remove listener function.
 *
 * @param {String} selector
 * @param {String} type
 * @param {Function} callback
 * @return {Object}
 */
function listenSelector(selector, type, callback) {
    return delegate(document.body, selector, type, callback);
}

module.exports = listen;

},{"./is":53,"delegate":34}],55:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],56:[function(require,module,exports){
/*!
 * index-of <https://github.com/jonschlinkert/index-of>
 *
 * Copyright (c) 2014-2015 Jon Schlinkert.
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function indexOf(arr, ele, start) {
  start = start || 0;
  var idx = -1;

  if (arr == null) return idx;
  var len = arr.length;
  var i = start < 0
    ? (len + start)
    : start;

  if (i >= arr.length) {
    return -1;
  }

  while (i < len) {
    if (arr[i] === ele) {
      return i;
    }
    i++;
  }

  return -1;
};

},{}],57:[function(require,module,exports){
/*!
 * jQuery JavaScript Library v3.2.1
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2017-03-20T18:59Z
 */
( function( global, factory ) {

	"use strict";

	if ( typeof module === "object" && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
} )( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
// enough that all such attempts are guarded in a try block.
"use strict";

var arr = [];

var document = window.document;

var getProto = Object.getPrototypeOf;

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var support = {};



	function DOMEval( code, doc ) {
		doc = doc || document;

		var script = doc.createElement( "script" );

		script.text = code;
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}
/* global Symbol */
// Defining this global in .eslintrc.json would create a danger of using the global
// unguarded in another place, it seems safer to define global only for this module



var
	version = "3.2.1",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android <=4.0 only
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {

		// Return all the elements in a clean array
		if ( num == null ) {
			return slice.call( this );
		}

		// Return just the one element from the set
		return num < 0 ? this[ num + this.length ] : this[ num ];
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = Array.isArray( copy ) ) ) ) {

					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && Array.isArray( src ) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject( src ) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isFunction: function( obj ) {
		return jQuery.type( obj ) === "function";
	},

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {

		// As of jQuery 3.0, isNumeric is limited to
		// strings and numbers (primitives or objects)
		// that can be coerced to finite numbers (gh-2662)
		var type = jQuery.type( obj );
		return ( type === "number" || type === "string" ) &&

			// parseFloat NaNs numeric-cast false positives ("")
			// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
			// subtraction forces infinities to NaN
			!isNaN( obj - parseFloat( obj ) );
	},

	isPlainObject: function( obj ) {
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = getProto( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with prototype are plain iff they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	},

	isEmptyObject: function( obj ) {

		/* eslint-disable no-unused-vars */
		// See https://github.com/eslint/eslint/issues/6125
		var name;

		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}

		// Support: Android <=2.3 only (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call( obj ) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		DOMEval( code );
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Support: IE <=9 - 11, Edge 12 - 13
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// Support: Android <=4.0 only
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android <=4.0 only, PhantomJS 1 only
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
function( i, name ) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
} );

function isArrayLike( obj ) {

	// Support: real iOS 8.2 only (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.3
 * https://sizzlejs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2016-08-08
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" + ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	disabledAncestor = addCombinator(
		function( elem ) {
			return elem.disabled === true && ("form" in elem || "label" in elem);
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {

		if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
			setDocument( context );
		}
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

				// ID selector
				if ( (m = match[1]) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( (elem = context.getElementById( m )) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && (elem = newContext.getElementById( m )) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[2] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( (m = match[3]) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!compilerCache[ selector + " " ] &&
				(!rbuggyQSA || !rbuggyQSA.test( selector )) ) {

				if ( nodeType !== 1 ) {
					newContext = context;
					newSelector = selector;

				// qSA looks outside Element context, which is not what we want
				// Thanks to Andrew Dupont for this workaround technique
				// Support: IE <=8
				// Exclude object elements
				} else if ( context.nodeName.toLowerCase() !== "object" ) {

					// Capture the context ID, setting it first if necessary
					if ( (nid = context.getAttribute( "id" )) ) {
						nid = nid.replace( rcssescape, fcssescape );
					} else {
						context.setAttribute( "id", (nid = expando) );
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[i] = "#" + nid + " " + toSelector( groups[i] );
					}
					newSelector = groups.join( "," );

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;
				}

				if ( newSelector ) {
					try {
						push.apply( results,
							newContext.querySelectorAll( newSelector )
						);
						return results;
					} catch ( qsaError ) {
					} finally {
						if ( nid === expando ) {
							context.removeAttribute( "id" );
						}
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement("fieldset");

	try {
		return !!fn( el );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}
		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
						disabledAncestor( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9-11, Edge
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	if ( preferredDoc !== document &&
		(subWindow = document.defaultView) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert(function( el ) {
		el.className = "i";
		return !el.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( el ) {
		el.appendChild( document.createComment("") );
		return !el.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	});

	// ID filter and find
	if ( support.getById ) {
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode("id");
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( (elem = elems[i++]) ) {
						node = elem.getAttributeNode("id");
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( el ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push(".#.+[+~]");
			}
		});

		assert(function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement("input");
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll(":enabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll(":disabled").length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( el ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === document ? -1 :
				b === document ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		!compilerCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch (e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return (sel + "").replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || (node[ expando ] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								(outerCache[ node.uniqueID ] = {});

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {
							// Use previously-cached element index if available
							if ( useCache ) {
								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || (node[ expando ] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									(outerCache[ node.uniqueID ] = {});

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {
								// Use the same loop as above to seek `elem` from the start
								while ( (node = ++nodeIndex && node && node[ dir ] ||
									(diff = nodeIndex = 0) || start.pop()) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] || (node[ expando ] = {});

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												(outerCache[ node.uniqueID ] = {});

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					// Don't keep the element (issue #299)
					input[0] = null;
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( (oldCache = uniqueCache[ key ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context === document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					if ( !context && elem.ownerDocument !== document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context || document, xml) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( el ) {
	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement("fieldset") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( el ) {
	return el.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;




var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;



function nodeName( elem, name ) {

  return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();

};
var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			return !!qualifier.call( elem, i, elem ) !== not;
		} );
	}

	// Single element
	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );
	}

	// Arraylike of elements (jQuery, arguments, Array)
	if ( typeof qualifier !== "string" ) {
		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	// Simple selector that can be filtered directly, removing non-Elements
	if ( risSimple.test( qualifier ) ) {
		return jQuery.filter( qualifier, elements, not );
	}

	// Complex selector, compare the two sets, removing non-Elements
	qualifier = jQuery.filter( qualifier, elements );
	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) > -1 ) !== not && elem.nodeType === 1;
	} );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	if ( elems.length === 1 && elem.nodeType === 1 ) {
		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
	}

	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
		return elem.nodeType === 1;
	} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
        if ( nodeName( elem, "iframe" ) ) {
            return elem.contentDocument;
        }

        // Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
        // Treat the template element as a regular one in browsers that
        // don't support it.
        if ( nodeName( elem, "template" ) ) {
            elem = elem.content || elem;
        }

        return jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = locked || options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( jQuery.isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && jQuery.type( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

function adoptValue( value, resolve, reject, noValue ) {
	var method;

	try {

		// Check for promise aspect first to privilege synchronous behavior
		if ( value && jQuery.isFunction( ( method = value.promise ) ) ) {
			method.call( value ).done( resolve ).fail( reject );

		// Other thenables
		} else if ( value && jQuery.isFunction( ( method = value.then ) ) ) {
			method.call( value, resolve, reject );

		// Other non-thenables
		} else {

			// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
			// * false: [ value ].slice( 0 ) => resolve( value )
			// * true: [ value ].slice( 1 ) => resolve()
			resolve.apply( undefined, [ value ].slice( noValue ) );
		}

	// For Promises/A+, convert exceptions into rejections
	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
	// Deferred#then to conditionally suppress rejection.
	} catch ( value ) {

		// Support: Android 4.0 only
		// Strict mode functions invoked without .call/.apply get global-object context
		reject.apply( undefined, [ value ] );
	}
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = jQuery.isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( jQuery.isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notifyWith )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )( that, args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that, args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( singleValue ) {
		var

			// count of uncompleted subordinates
			remaining = arguments.length,

			// count of unprocessed arguments
			i = remaining,

			// subordinate fulfillment data
			resolveContexts = Array( i ),
			resolveValues = slice.call( arguments ),

			// the master Deferred
			master = jQuery.Deferred(),

			// subordinate callback factory
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						master.resolveWith( resolveContexts, resolveValues );
					}
				};
			};

		// Single- and empty arguments are adopted like Promise.resolve
		if ( remaining <= 1 ) {
			adoptValue( singleValue, master.done( updateFunc( i ) ).resolve, master.reject,
				!remaining );

			// Use .then() to unwrap secondary thenables (cf. gh-3000)
			if ( master.state() === "pending" ||
				jQuery.isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

				return master.then();
			}
		}

		// Multiple arguments are aggregated like Promise.all array elements
		while ( i-- ) {
			adoptValue( resolveValues[ i ], updateFunc( i ), master.reject );
		}

		return master.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE 8 - 9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
	}
};




jQuery.readyException = function( error ) {
	window.setTimeout( function() {
		throw error;
	} );
};




// The deferred used on DOM ready
var readyList = jQuery.Deferred();

jQuery.fn.ready = function( fn ) {

	readyList
		.then( fn )

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch( function( error ) {
			jQuery.readyException( error );
		} );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

jQuery.ready.then = readyList.then;

// The ready event handler and self cleanup method
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

// Catch cases where $(document).ready() is called
// after the browser event has already occurred.
// Support: IE <=9 - 10 only
// Older IE sometimes signals "interactive" too soon
if ( document.readyState === "complete" ||
	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	// Handle it asynchronously to allow scripts the opportunity to delay ready
	window.setTimeout( jQuery.ready );

} else {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", completed );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", completed );
}




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
					value :
					value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	if ( chainable ) {
		return elems;
	}

	// Gets
	if ( bulk ) {
		return fn.call( elems );
	}

	return len ? fn( elems[ 0 ], key ) : emptyGet;
};
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ jQuery.camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ jQuery.camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ jQuery.camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( Array.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( jQuery.camelCase );
			} else {
				key = jQuery.camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnothtmlwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <=35 - 45
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function getData( data ) {
	if ( data === "true" ) {
		return true;
	}

	if ( data === "false" ) {
		return false;
	}

	if ( data === "null" ) {
		return null;
	}

	// Only convert to a number if it doesn't change the string
	if ( data === +data + "" ) {
		return +data;
	}

	if ( rbrace.test( data ) ) {
		return JSON.parse( data );
	}

	return data;
}

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = getData( data );
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE 11 only
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = jQuery.camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || Array.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" ||
			elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			jQuery.contains( elem.ownerDocument, elem ) &&

			jQuery.css( elem, "display" ) === "none";
	};

var swap = function( elem, options, callback, args ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.apply( elem, args || [] );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};




function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted,
		scale = 1,
		maxIterations = 20,
		currentValue = tween ?
			function() {
				return tween.cur();
			} :
			function() {
				return jQuery.css( elem, prop, "" );
			},
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = ( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		do {

			// If previous iteration zeroed out, double until we get *something*.
			// Use string for doubling so we don't accidentally see scale as unchanged below
			scale = scale || ".5";

			// Adjust and apply
			initialInUnit = initialInUnit / scale;
			jQuery.style( elem, prop, initialInUnit + unit );

		// Update scale, tolerating zero or NaN from tween.cur()
		// Break the loop if scale is unchanged or perfect, or if we've just had enough.
		} while (
			scale !== ( scale = currentValue() / initial ) && scale !== 1 && --maxIterations
		);
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) );
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]+)/i );

var rscriptType = ( /^$|\/(?:java|ecma)script/i );



// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// Support: IE <=9 only
	option: [ 1, "<select multiple='multiple'>", "</select>" ],

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

// Support: IE <=9 only
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;


function getAll( context, tag ) {

	// Support: IE <=9 - 11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret;

	if ( typeof context.getElementsByTagName !== "undefined" ) {
		ret = context.getElementsByTagName( tag || "*" );

	} else if ( typeof context.querySelectorAll !== "undefined" ) {
		ret = context.querySelectorAll( tag || "*" );

	} else {
		ret = [];
	}

	if ( tag === undefined || tag && nodeName( context, tag ) ) {
		return jQuery.merge( [ context ], ret );
	}

	return ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, contains, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( jQuery.type( elem ) === "object" ) {

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		contains = jQuery.contains( elem.ownerDocument, elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( contains ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android <=4.1 only
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE <=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
} )();
var documentElement = document.documentElement;



var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE <=9 only
// See #13393 for more info
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Ensure that invalid selectors throw exceptions at attach time
		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
		if ( selector ) {
			jQuery.find.matchesSelector( documentElement, selector );
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = {};
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( nativeEvent ) {

		// Make a writable jQuery.Event from the native event object
		var event = jQuery.event.fix( nativeEvent );

		var i, j, ret, matched, handleObj, handlerQueue,
			args = new Array( arguments.length ),
			handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;

		for ( i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}

		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or 2) have namespace(s)
				// a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.rnamespace || event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, handleObj, sel, matchedHandlers, matchedSelectors,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		if ( delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!( event.type === "click" && event.button >= 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
					matchedHandlers = [];
					matchedSelectors = {};
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matchedSelectors[ sel ] === undefined ) {
							matchedSelectors[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matchedSelectors[ sel ] ) {
							matchedHandlers.push( handleObj );
						}
					}
					if ( matchedHandlers.length ) {
						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		cur = this;
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	addProp: function( name, hook ) {
		Object.defineProperty( jQuery.Event.prototype, name, {
			enumerable: true,
			configurable: true,

			get: jQuery.isFunction( hook ) ?
				function() {
					if ( this.originalEvent ) {
							return hook( this.originalEvent );
					}
				} :
				function() {
					if ( this.originalEvent ) {
							return this.originalEvent[ name ];
					}
				},

			set: function( value ) {
				Object.defineProperty( this, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: value
				} );
			}
		} );
	},

	fix: function( originalEvent ) {
		return originalEvent[ jQuery.expando ] ?
			originalEvent :
			new jQuery.Event( originalEvent );
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {

			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {

			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ?
			returnTrue :
			returnFalse;

		// Create target properties
		// Support: Safari <=6 - 7 only
		// Target should not be a text node (#504, #13143)
		this.target = ( src.target && src.target.nodeType === 3 ) ?
			src.target.parentNode :
			src.target;

		this.currentTarget = src.currentTarget;
		this.relatedTarget = src.relatedTarget;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,
	isSimulated: false,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && !this.isSimulated ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Includes all common event props including KeyEvent and MouseEvent specific props
jQuery.each( {
	altKey: true,
	bubbles: true,
	cancelable: true,
	changedTouches: true,
	ctrlKey: true,
	detail: true,
	eventPhase: true,
	metaKey: true,
	pageX: true,
	pageY: true,
	shiftKey: true,
	view: true,
	"char": true,
	charCode: true,
	key: true,
	keyCode: true,
	button: true,
	buttons: true,
	clientX: true,
	clientY: true,
	offsetX: true,
	offsetY: true,
	pointerId: true,
	pointerType: true,
	screenX: true,
	screenY: true,
	targetTouches: true,
	toElement: true,
	touches: true,

	which: function( event ) {
		var button = event.button;

		// Add which for key events
		if ( event.which == null && rkeyEvent.test( event.type ) ) {
			return event.charCode != null ? event.charCode : event.keyCode;
		}

		// Add which for click: 1 === left; 2 === middle; 3 === right
		if ( !event.which && button !== undefined && rmouseEvent.test( event.type ) ) {
			if ( button & 1 ) {
				return 1;
			}

			if ( button & 2 ) {
				return 3;
			}

			if ( button & 4 ) {
				return 2;
			}

			return 0;
		}

		return event.which;
	}
}, jQuery.event.addProp );

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var

	/* eslint-disable max-len */

	// See https://github.com/eslint/eslint/issues/3229
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,

	/* eslint-enable */

	// Support: IE <=10 - 11, Edge 12 - 13
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

// Prefer a tbody over its parent table for containing new rows
function manipulationTarget( elem, content ) {
	if ( nodeName( elem, "table" ) &&
		nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return jQuery( ">tbody", elem )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.access( src );
		pdataCur = dataPriv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = concat.apply( [], args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		isFunction = jQuery.isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( isFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( isFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl ) {
								jQuery._evalUrl( node.src );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && jQuery.contains( node.ownerDocument, node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html.replace( rxhtmlTag, "<$1></$2>" );
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android <=4.0 only, PhantomJS 1 only
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rmargin = ( /^margin/ );

var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};



( function() {

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {

		// This is a singleton, we need to execute it only once
		if ( !div ) {
			return;
		}

		div.style.cssText =
			"box-sizing:border-box;" +
			"position:relative;display:block;" +
			"margin:auto;border:1px;padding:1px;" +
			"top:1%;width:50%";
		div.innerHTML = "";
		documentElement.appendChild( container );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";

		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
		reliableMarginLeftVal = divStyle.marginLeft === "2px";
		boxSizingReliableVal = divStyle.width === "4px";

		// Support: Android 4.0 - 4.3 only
		// Some styles come back with percentage values, even though they shouldn't
		div.style.marginRight = "50%";
		pixelMarginRightVal = divStyle.marginRight === "4px";

		documentElement.removeChild( container );

		// Nullify the div so it wouldn't be stored in the memory and
		// it will also be a sign that checks already performed
		div = null;
	}

	var pixelPositionVal, boxSizingReliableVal, pixelMarginRightVal, reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE <=9 - 11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	container.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;" +
		"padding:0;margin-top:1px;position:absolute";
	container.appendChild( div );

	jQuery.extend( support, {
		pixelPosition: function() {
			computeStyleTests();
			return pixelPositionVal;
		},
		boxSizingReliable: function() {
			computeStyleTests();
			return boxSizingReliableVal;
		},
		pixelMarginRight: function() {
			computeStyleTests();
			return pixelMarginRightVal;
		},
		reliableMarginLeft: function() {
			computeStyleTests();
			return reliableMarginLeftVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,

		// Support: Firefox 51+
		// Retrieving style before computed somehow
		// fixes an issue with getting wrong values
		// on detached elements
		style = elem.style;

	computed = computed || getStyles( elem );

	// getPropertyValue is needed for:
	//   .css('filter') (IE 9 only, #12537)
	//   .css('--customProperty) (#3144)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelMarginRight() && rnumnonpx.test( ret ) && rmargin.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rcustomProp = /^--/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	},

	cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style;

// Return a css property mapped to a potentially vendor prefixed property
function vendorPropName( name ) {

	// Shortcut for names that are not vendor prefixed
	if ( name in emptyStyle ) {
		return name;
	}

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

// Return a property mapped along what jQuery.cssProps suggests or to
// a vendor prefixed property.
function finalPropName( name ) {
	var ret = jQuery.cssProps[ name ];
	if ( !ret ) {
		ret = jQuery.cssProps[ name ] = vendorPropName( name ) || name;
	}
	return ret;
}

function setPositiveNumber( elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
	var i,
		val = 0;

	// If we already have the right measurement, avoid augmentation
	if ( extra === ( isBorderBox ? "border" : "content" ) ) {
		i = 4;

	// Otherwise initialize for horizontal or vertical properties
	} else {
		i = name === "width" ? 1 : 0;
	}

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
		}

		if ( isBorderBox ) {

			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// At this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		} else {

			// At this point, extra isn't content, so add padding
			val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// At this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with computed style
	var valueIsBorderBox,
		styles = getStyles( elem ),
		val = curCSS( elem, name, styles ),
		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

	// Computed unit is not pixels. Stop here and return.
	if ( rnumnonpx.test( val ) ) {
		return val;
	}

	// Check for style in case a browser which returns unreliable values
	// for getComputedStyle silently falls back to the reliable elem.style
	valueIsBorderBox = isBorderBox &&
		( support.boxSizingReliable() || val === elem.style[ name ] );

	// Fall back to offsetWidth/Height when value is "auto"
	// This happens for inline elements with no explicit setting (gh-3571)
	if ( val === "auto" ) {
		val = elem[ "offset" + name[ 0 ].toUpperCase() + name.slice( 1 ) ];
	}

	// Normalize "", auto, and prepare for extra
	val = parseFloat( val ) || 0;

	// Use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		"float": "cssFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			isCustomProp = rcustomProp.test( name ),
			style = elem.style;

		// Make sure that we're working with the right name. We don't
		// want to query the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			if ( type === "number" ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				if ( isCustomProp ) {
					style.setProperty( name, value );
				} else {
					style[ name ] = value;
				}
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name ),
			isCustomProp = rcustomProp.test( name );

		// Make sure that we're working with the right name. We don't
		// want to modify the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}

		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
						swap( elem, cssShow, function() {
							return getWidthOrHeight( elem, name, extra );
						} ) :
						getWidthOrHeight( elem, name, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = extra && getStyles( elem ),
				subtract = extra && augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
					styles
				);

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ name ] = value;
				value = jQuery.css( elem, name );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
				) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( Array.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 &&
				( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null ||
					jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, inProgress,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function schedule() {
	if ( inProgress ) {
		if ( document.hidden === false && window.requestAnimationFrame ) {
			window.requestAnimationFrame( schedule );
		} else {
			window.setTimeout( schedule, jQuery.fx.interval );
		}

		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = jQuery.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE <=9 - 11, Edge 12 - 13
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* eslint-disable no-loop-func */

			anim.done( function() {

			/* eslint-enable no-loop-func */

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( Array.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			// If there's more to do, yield
			if ( percent < 1 && length ) {
				return remaining;
			}

			// If this was an empty animation, synthesize a final progress notification
			if ( !length ) {
				deferred.notifyWith( elem, [ animation, 1, 0 ] );
			}

			// Resolve the animation and report its conclusion
			deferred.resolveWith( elem, [ animation ] );
			return false;
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( jQuery.isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					jQuery.proxy( result.stop, result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	// Attach callbacks from options
	animation
		.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	return animation;
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnothtmlwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	// Go to the end state if fx are off
	if ( jQuery.fx.off ) {
		opt.duration = 0;

	} else {
		if ( typeof opt.duration !== "number" ) {
			if ( opt.duration in jQuery.fx.speeds ) {
				opt.duration = jQuery.fx.speeds[ opt.duration ];

			} else {
				opt.duration = jQuery.fx.speeds._default;
			}
		}
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};
			doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = jQuery.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Run the timer and safely remove it when done (allowing for external removal)
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	jQuery.fx.start();
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( inProgress ) {
		return;
	}

	inProgress = true;
	schedule();
};

jQuery.fx.stop = function() {
	inProgress = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android <=4.3 only
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE <=11 only
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE <=11 only
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// Attribute hooks are determined by the lowercase version
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,

			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match( rnothtmlwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				elem.removeAttribute( name );
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle,
			lowercaseName = name.toLowerCase();

		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ lowercaseName ];
			attrHandle[ lowercaseName ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				lowercaseName :
				null;
			attrHandle[ lowercaseName ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE <=9 - 11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				if ( tabindex ) {
					return parseInt( tabindex, 10 );
				}

				if (
					rfocusable.test( elem.nodeName ) ||
					rclickable.test( elem.nodeName ) &&
					elem.href
				) {
					return 0;
				}

				return -1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
// eslint rule "no-unused-expressions" is disabled for this code
// since it considers such accessions noop
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




	// Strip and collapse whitespace according to HTML spec
	// https://html.spec.whatwg.org/multipage/infrastructure.html#strip-and-collapse-whitespace
	function stripAndCollapse( value ) {
		var tokens = value.match( rnothtmlwhite ) || [];
		return tokens.join( " " );
	}


function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( typeof value === "string" && value ) {
			classes = value.match( rnothtmlwhite ) || [];

			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		if ( typeof value === "string" && value ) {
			classes = value.match( rnothtmlwhite ) || [];

			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( type === "string" ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = value.match( rnothtmlwhite ) || [];

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
						"" :
						dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
					return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				// Handle most common string cases
				if ( typeof ret === "string" ) {
					return ret.replace( rreturn, "" );
				}

				// Handle cases where value is null/undef or number
				return ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( Array.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option, i,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length;

				if ( index < 0 ) {
					i = max;

				} else {
					i = one ? index : 0;
				}

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Support: IE <=9 only
					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					/* eslint-disable no-cond-assign */

					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}

					/* eslint-enable no-cond-assign */
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( Array.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	// Used only for `focus(in | out)` events
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
			}
		);

		jQuery.event.trigger( e, null, elem );
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


jQuery.each( ( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
} );

jQuery.fn.extend( {
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );




support.focusin = "onfocusin" in window;


// Support: Firefox <=44
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	} );
}
var location = window.location;

var nonce = jQuery.now();

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9 - 11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {
		xml = undefined;
	}

	if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
		jQuery.error( "Invalid XML: " + data );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( Array.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {

			// If value is a function, invoke it and use its return value
			var value = jQuery.isFunction( valueOrFunction ) ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	// If an array was passed in, assume that it is an array of form elements.
	if ( Array.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} )
		.filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} )
		.map( function( i, elem ) {
			var val = jQuery( this ).val();

			if ( val == null ) {
				return null;
			}

			if ( Array.isArray( val ) ) {
				return jQuery.map( val, function( val ) {
					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
				} );
			}

			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rantiCache = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );
	originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

		if ( jQuery.isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
					jQuery( callbackContext ) :
					jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match == null ? null : match;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE <=8 - 11, Edge 12 - 13
			// IE throws exception on accessing the href property if url is malformed,
			// e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE <=8 - 11 only
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available, append data to url
			if ( s.data ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add or update anti-cache param if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rantiCache, "$1" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce++ ) + uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );


jQuery._evalUrl = function( url ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,
		"throws": true
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( jQuery.isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( isFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE <=9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = callback( "error" );

				// Support: IE 9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" ).prop( {
					charset: s.scriptCharset,
					src: s.url
				} ).on(
					"load error",
					callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					}
				);

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	var base, parsed, scripts;

	if ( !context ) {

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		if ( support.createHTMLDocument ) {
			context = document.implementation.createHTMLDocument( "" );

			// Set the base href for the created document
			// so any parsed elements with URLs
			// are based on the document's URL (gh-2965)
			base = context.createElement( "base" );
			base.href = document.location.href;
			context.head.appendChild( base );
		} else {
			context = document;
		}
	}

	parsed = rsingleTag.exec( data );
	scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = stripAndCollapse( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




// Attach a bunch of functions for handling common AJAX events
jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend( {
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var doc, docElem, rect, win,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
		// Support: IE <=11 only
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		if ( !elem.getClientRects().length ) {
			return { top: 0, left: 0 };
		}

		rect = elem.getBoundingClientRect();

		doc = elem.ownerDocument;
		docElem = doc.documentElement;
		win = doc.defaultView;

		return {
			top: rect.top + win.pageYOffset - docElem.clientTop,
			left: rect.left + win.pageXOffset - docElem.clientLeft
		};
	},

	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// Fixed elements are offset from window (parentOffset = {top:0, left: 0},
		// because it is its only offset parent
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume getBoundingClientRect is there when computed position is fixed
			offset = elem.getBoundingClientRect();

		} else {

			// Get *real* offsetParent
			offsetParent = this.offsetParent();

			// Get correct offsets
			offset = this.offset();
			if ( !nodeName( offsetParent[ 0 ], "html" ) ) {
				parentOffset = offsetParent.offset();
			}

			// Add offsetParent borders
			parentOffset = {
				top: parentOffset.top + jQuery.css( offsetParent[ 0 ], "borderTopWidth", true ),
				left: parentOffset.left + jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true )
			};
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {

			// Coalesce documents and windows
			var win;
			if ( jQuery.isWindow( elem ) ) {
				win = elem;
			} else if ( elem.nodeType === 9 ) {
				win = elem.defaultView;
			}

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari <=7 - 9.1, Chrome <=37 - 49
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name },
		function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	}
} );

jQuery.holdReady = function( hold ) {
	if ( hold ) {
		jQuery.readyWait++;
	} else {
		jQuery.ready( true );
	}
};
jQuery.isArray = Array.isArray;
jQuery.parseJSON = JSON.parse;
jQuery.nodeName = nodeName;




// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}




var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( !noGlobal ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;
} );

},{}],58:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.7.1
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

}).call(this,require('_process'))
},{"_process":59}],59:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],60:[function(require,module,exports){
'use strict';

var pug_has_own_property = Object.prototype.hasOwnProperty;

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = pug_merge;
function pug_merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = pug_merge(attrs, a[i]);
    }
    return attrs;
  }

  for (var key in b) {
    if (key === 'class') {
      var valA = a[key] || [];
      a[key] = (Array.isArray(valA) ? valA : [valA]).concat(b[key] || []);
    } else if (key === 'style') {
      var valA = pug_style(a[key]);
      var valB = pug_style(b[key]);
      a[key] = valA + valB;
    } else {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Process array, object, or string as a string of classes delimited by a space.
 *
 * If `val` is an array, all members of it and its subarrays are counted as
 * classes. If `escaping` is an array, then whether or not the item in `val` is
 * escaped depends on the corresponding item in `escaping`. If `escaping` is
 * not an array, no escaping is done.
 *
 * If `val` is an object, all the keys whose value is truthy are counted as
 * classes. No escaping is done.
 *
 * If `val` is a string, it is counted as a class. No escaping is done.
 *
 * @param {(Array.<string>|Object.<string, boolean>|string)} val
 * @param {?Array.<string>} escaping
 * @return {String}
 */
exports.classes = pug_classes;
function pug_classes_array(val, escaping) {
  var classString = '', className, padding = '', escapeEnabled = Array.isArray(escaping);
  for (var i = 0; i < val.length; i++) {
    className = pug_classes(val[i]);
    if (!className) continue;
    escapeEnabled && escaping[i] && (className = pug_escape(className));
    classString = classString + padding + className;
    padding = ' ';
  }
  return classString;
}
function pug_classes_object(val) {
  var classString = '', padding = '';
  for (var key in val) {
    if (key && val[key] && pug_has_own_property.call(val, key)) {
      classString = classString + padding + key;
      padding = ' ';
    }
  }
  return classString;
}
function pug_classes(val, escaping) {
  if (Array.isArray(val)) {
    return pug_classes_array(val, escaping);
  } else if (val && typeof val === 'object') {
    return pug_classes_object(val);
  } else {
    return val || '';
  }
}

/**
 * Convert object or string to a string of CSS styles delimited by a semicolon.
 *
 * @param {(Object.<string, string>|string)} val
 * @return {String}
 */

exports.style = pug_style;
function pug_style(val) {
  if (!val) return '';
  if (typeof val === 'object') {
    var out = '';
    for (var style in val) {
      /* istanbul ignore else */
      if (pug_has_own_property.call(val, style)) {
        out = out + style + ':' + val[style] + ';';
      }
    }
    return out;
  } else {
    val += '';
    if (val[val.length - 1] !== ';') 
      return val + ';';
    return val;
  }
};

/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = pug_attr;
function pug_attr(key, val, escaped, terse) {
  if (val === false || val == null || !val && (key === 'class' || key === 'style')) {
    return '';
  }
  if (val === true) {
    return ' ' + (terse ? key : key + '="' + key + '"');
  }
  if (typeof val.toJSON === 'function') {
    val = val.toJSON();
  }
  if (typeof val !== 'string') {
    val = JSON.stringify(val);
    if (!escaped && val.indexOf('"') !== -1) {
      return ' ' + key + '=\'' + val.replace(/'/g, '&#39;') + '\'';
    }
  }
  if (escaped) val = pug_escape(val);
  return ' ' + key + '="' + val + '"';
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} terse whether to use HTML5 terse boolean attributes
 * @return {String}
 */
exports.attrs = pug_attrs;
function pug_attrs(obj, terse){
  var attrs = '';

  for (var key in obj) {
    if (pug_has_own_property.call(obj, key)) {
      var val = obj[key];

      if ('class' === key) {
        val = pug_classes(val);
        attrs = pug_attr(key, val, false, terse) + attrs;
        continue;
      }
      if ('style' === key) {
        val = pug_style(val);
      }
      attrs += pug_attr(key, val, false, terse);
    }
  }

  return attrs;
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

var pug_match_html = /["&<>]/;
exports.escape = pug_escape;
function pug_escape(_html){
  var html = '' + _html;
  var regexResult = pug_match_html.exec(html);
  if (!regexResult) return _html;

  var result = '';
  var i, lastIndex, escape;
  for (i = regexResult.index, lastIndex = 0; i < html.length; i++) {
    switch (html.charCodeAt(i)) {
      case 34: escape = '&quot;'; break;
      case 38: escape = '&amp;'; break;
      case 60: escape = '&lt;'; break;
      case 62: escape = '&gt;'; break;
      default: continue;
    }
    if (lastIndex !== i) result += html.substring(lastIndex, i);
    lastIndex = i + 1;
    result += escape;
  }
  if (lastIndex !== i) return result + html.substring(lastIndex, i);
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the pug in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @param {String} str original source
 * @api private
 */

exports.rethrow = pug_rethrow;
function pug_rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str = str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    pug_rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Pug') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

},{"fs":28}],61:[function(require,module,exports){
(function (global){
var now = require('performance-now')
  , root = typeof window === 'undefined' ? global : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = root['request' + suffix]
  , caf = root['cancel' + suffix] || root['cancelRequest' + suffix]

for(var i = 0; !raf && i < vendors.length; i++) {
  raf = root[vendors[i] + 'Request' + suffix]
  caf = root[vendors[i] + 'Cancel' + suffix]
      || root[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf.call(root, fn)
}
module.exports.cancel = function() {
  caf.apply(root, arguments)
}
module.exports.polyfill = function() {
  root.requestAnimationFrame = raf
  root.cancelAnimationFrame = caf
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"performance-now":58}],62:[function(require,module,exports){
var raf = require('raf'),
    COMPLETE = 'complete',
    CANCELED = 'canceled';

function setElementScroll(element, x, y){
    if(element === window){
        element.scrollTo(x, y);
    }else{
        element.scrollLeft = x;
        element.scrollTop = y;
    }
}

function getTargetScrollLocation(target, parent, align){
    var targetPosition = target.getBoundingClientRect(),
        parentPosition,
        x,
        y,
        differenceX,
        differenceY,
        leftAlign = align && align.left != null ? align.left : 0.5,
        topAlign = align && align.top != null ? align.top : 0.5,
        leftScalar = leftAlign,
        topScalar = topAlign;

    if(parent === window){
        x = targetPosition.left + window.pageXOffset - window.innerWidth * leftScalar + Math.min(targetPosition.width, window.innerWidth) * leftScalar;
        y = targetPosition.top + window.pageYOffset - window.innerHeight * topScalar + Math.min(targetPosition.height, window.innerHeight) * topScalar;
        x = Math.max(Math.min(x, document.body.scrollWidth - window.innerWidth * leftScalar), 0);
        y = Math.max(Math.min(y, document.body.scrollHeight- window.innerHeight * topScalar), 0);
        differenceX = x - window.pageXOffset;
        differenceY = y - window.pageYOffset;
    }else{
        parentPosition = parent.getBoundingClientRect();
        var offsetTop = targetPosition.top - (parentPosition.top - parent.scrollTop);
        var offsetLeft = targetPosition.left - (parentPosition.left - parent.scrollLeft);
        x = offsetLeft + (targetPosition.width * leftScalar) - parent.clientWidth * leftScalar;
        y = offsetTop + (targetPosition.height * topScalar) - parent.clientHeight * topScalar;
        x = Math.max(Math.min(x, parent.scrollWidth - parent.clientWidth), 0);
        y = Math.max(Math.min(y, parent.scrollHeight - parent.clientHeight), 0);
        differenceX = x - parent.scrollLeft;
        differenceY = y - parent.scrollTop;
    }

    return {
        x: x,
        y: y,
        differenceX: differenceX,
        differenceY: differenceY
    };
}

function animate(parent){
    raf(function(){
        var scrollSettings = parent._scrollSettings;
        if(!scrollSettings){
            return;
        }

        var location = getTargetScrollLocation(scrollSettings.target, parent, scrollSettings.align),
            time = Date.now() - scrollSettings.startTime,
            timeValue = Math.min(1 / scrollSettings.time * time, 1);

        if(
            time > scrollSettings.time + 20 ||
            (Math.abs(location.differenceY) <= 1 && Math.abs(location.differenceX) <= 1)
        ){
            setElementScroll(parent, location.x, location.y);
            parent._scrollSettings = null;
            return scrollSettings.end(COMPLETE);
        }

        var easeValue = 1 - scrollSettings.ease(timeValue);

        setElementScroll(parent,
            location.x - location.differenceX * easeValue,
            location.y - location.differenceY * easeValue
        );

        animate(parent);
    });
}
function transitionScrollTo(target, parent, settings, callback){
    var idle = !parent._scrollSettings,
        lastSettings = parent._scrollSettings,
        now = Date.now(),
        endHandler;

    if(lastSettings){
        lastSettings.end(CANCELED);
    }

    function end(endType){
        parent._scrollSettings = null;
        callback(endType);
        parent.removeEventListener('touchstart', endHandler);
    }

    parent._scrollSettings = {
        startTime: lastSettings ? lastSettings.startTime : Date.now(),
        target: target,
        time: settings.time + (lastSettings ? now - lastSettings.startTime : 0),
        ease: settings.ease,
        align: settings.align,
        end: end
    };

    endHandler = end.bind(null, CANCELED);
    parent.addEventListener('touchstart', endHandler);

    if(idle){
        animate(parent);
    }
}

module.exports = function(target, settings, callback){
    if(!target){
        return;
    }

    if(typeof settings === 'function'){
        callback = settings;
        settings = null;
    }

    if(!settings){
        settings = {};
    }

    settings.time = isNaN(settings.time) ? 1000 : settings.time;
    settings.ease = settings.ease || function(v){return 1 - Math.pow(1 - v, v / 2);};

    var parent = target.parentElement,
        parents = 0;

    function done(endType){
        parents--;
        if(!parents){
            callback && callback(endType);
        }
    }

    while(parent){
        if(
            // If there is a validTarget function, check it.
            (settings.validTarget ? settings.validTarget(parent, parents) : true) &&

            // Else if window
            parent === window ||

            // Else...
            (
                /// check if scrollable
                (
                    parent.scrollHeight !== parent.clientHeight ||
                    parent.scrollWidth !== parent.clientWidth
                ) &&

                // And not hidden.
                getComputedStyle(parent).overflow !== 'hidden'
            )
        ){
            parents++;
            transitionScrollTo(target, parent, settings, done);
        }

        parent = parent.parentElement;

        if(!parent){
            return;
        }

        if(parent.tagName === 'BODY'){
            parent = window;
        }
    }
};

},{"raf":61}],63:[function(require,module,exports){
function select(element) {
    var selectedText;

    if (element.nodeName === 'SELECT') {
        element.focus();

        selectedText = element.value;
    }
    else if (element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA') {
        var isReadOnly = element.hasAttribute('readonly');

        if (!isReadOnly) {
            element.setAttribute('readonly', '');
        }

        element.select();
        element.setSelectionRange(0, element.value.length);

        if (!isReadOnly) {
            element.removeAttribute('readonly');
        }

        selectedText = element.value;
    }
    else {
        if (element.hasAttribute('contenteditable')) {
            element.focus();
        }

        var selection = window.getSelection();
        var range = document.createRange();

        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);

        selectedText = selection.toString();
    }

    return selectedText;
}

module.exports = select;

},{}],64:[function(require,module,exports){
var engine = require('../src/store-engine')

var storages = require('../storages/all')
var plugins = [require('../plugins/json2')]

module.exports = engine.createStore(storages, plugins)

},{"../plugins/json2":65,"../src/store-engine":67,"../storages/all":69}],65:[function(require,module,exports){
module.exports = json2Plugin

function json2Plugin() {
	require('./lib/json2')
	return {}
}

},{"./lib/json2":66}],66:[function(require,module,exports){
//  json2.js
//  2016-10-28
//  Public Domain.
//  NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
//  See http://www.JSON.org/js.html
//  This code should be minified before deployment.
//  See http://javascript.crockford.com/jsmin.html

//  USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
//  NOT CONTROL.

//  This file creates a global JSON object containing two methods: stringify
//  and parse. This file provides the ES5 JSON capability to ES3 systems.
//  If a project might run on IE8 or earlier, then this file should be included.
//  This file does nothing on ES5 systems.

//      JSON.stringify(value, replacer, space)
//          value       any JavaScript value, usually an object or array.
//          replacer    an optional parameter that determines how object
//                      values are stringified for objects. It can be a
//                      function or an array of strings.
//          space       an optional parameter that specifies the indentation
//                      of nested structures. If it is omitted, the text will
//                      be packed without extra whitespace. If it is a number,
//                      it will specify the number of spaces to indent at each
//                      level. If it is a string (such as "\t" or "&nbsp;"),
//                      it contains the characters used to indent at each level.
//          This method produces a JSON text from a JavaScript value.
//          When an object value is found, if the object contains a toJSON
//          method, its toJSON method will be called and the result will be
//          stringified. A toJSON method does not serialize: it returns the
//          value represented by the name/value pair that should be serialized,
//          or undefined if nothing should be serialized. The toJSON method
//          will be passed the key associated with the value, and this will be
//          bound to the value.

//          For example, this would serialize Dates as ISO strings.

//              Date.prototype.toJSON = function (key) {
//                  function f(n) {
//                      // Format integers to have at least two digits.
//                      return (n < 10)
//                          ? "0" + n
//                          : n;
//                  }
//                  return this.getUTCFullYear()   + "-" +
//                       f(this.getUTCMonth() + 1) + "-" +
//                       f(this.getUTCDate())      + "T" +
//                       f(this.getUTCHours())     + ":" +
//                       f(this.getUTCMinutes())   + ":" +
//                       f(this.getUTCSeconds())   + "Z";
//              };

//          You can provide an optional replacer method. It will be passed the
//          key and value of each member, with this bound to the containing
//          object. The value that is returned from your method will be
//          serialized. If your method returns undefined, then the member will
//          be excluded from the serialization.

//          If the replacer parameter is an array of strings, then it will be
//          used to select the members to be serialized. It filters the results
//          such that only members with keys listed in the replacer array are
//          stringified.

//          Values that do not have JSON representations, such as undefined or
//          functions, will not be serialized. Such values in objects will be
//          dropped; in arrays they will be replaced with null. You can use
//          a replacer function to replace those with JSON values.

//          JSON.stringify(undefined) returns undefined.

//          The optional space parameter produces a stringification of the
//          value that is filled with line breaks and indentation to make it
//          easier to read.

//          If the space parameter is a non-empty string, then that string will
//          be used for indentation. If the space parameter is a number, then
//          the indentation will be that many spaces.

//          Example:

//          text = JSON.stringify(["e", {pluribus: "unum"}]);
//          // text is '["e",{"pluribus":"unum"}]'

//          text = JSON.stringify(["e", {pluribus: "unum"}], null, "\t");
//          // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

//          text = JSON.stringify([new Date()], function (key, value) {
//              return this[key] instanceof Date
//                  ? "Date(" + this[key] + ")"
//                  : value;
//          });
//          // text is '["Date(---current time---)"]'

//      JSON.parse(text, reviver)
//          This method parses a JSON text to produce an object or array.
//          It can throw a SyntaxError exception.

//          The optional reviver parameter is a function that can filter and
//          transform the results. It receives each of the keys and values,
//          and its return value is used instead of the original value.
//          If it returns what it received, then the structure is not modified.
//          If it returns undefined then the member is deleted.

//          Example:

//          // Parse the text. Values that look like ISO date strings will
//          // be converted to Date objects.

//          myData = JSON.parse(text, function (key, value) {
//              var a;
//              if (typeof value === "string") {
//                  a =
//   /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
//                  if (a) {
//                      return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
//                          +a[5], +a[6]));
//                  }
//              }
//              return value;
//          });

//          myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
//              var d;
//              if (typeof value === "string" &&
//                      value.slice(0, 5) === "Date(" &&
//                      value.slice(-1) === ")") {
//                  d = new Date(value.slice(5, -1));
//                  if (d) {
//                      return d;
//                  }
//              }
//              return value;
//          });

//  This is a reference implementation. You are free to copy, modify, or
//  redistribute.

/*jslint
    eval, for, this
*/

/*property
    JSON, apply, call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== "object") {
    JSON = {};
}

(function () {
    "use strict";

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10
            ? "0" + n
            : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== "function") {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear() + "-" +
                        f(this.getUTCMonth() + 1) + "-" +
                        f(this.getUTCDate()) + "T" +
                        f(this.getUTCHours()) + ":" +
                        f(this.getUTCMinutes()) + ":" +
                        f(this.getUTCSeconds()) + "Z"
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? "\"" + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === "string"
                    ? c
                    : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + "\""
            : "\"" + string + "\"";
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i;          // The loop counter.
        var k;          // The member key.
        var v;          // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === "object" &&
                typeof value.toJSON === "function") {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case "string":
            return quote(value);

        case "number":

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value)
                ? String(value)
                : "null";

        case "boolean":
        case "null":

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce "null". The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is "object", we might be dealing with an object or an array or
// null.

        case "object":

// Due to a specification blunder in ECMAScript, typeof null is "object",
// so watch out for that case.

            if (!value) {
                return "null";
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === "[object Array]") {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? "[]"
                    : gap
                        ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]"
                        : "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === "object") {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === "string") {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                gap
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                gap
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? "{}"
                : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== "function") {
        meta = {    // table of character substitutions
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = "";
            indent = "";

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === "string") {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== "function" &&
                    (typeof replacer !== "object" ||
                    typeof replacer.length !== "number")) {
                throw new Error("JSON.stringify");
            }

// Make a fake root object containing our value under the key of "".
// Return the result of stringifying the value.

            return str("", {"": value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return "\\u" +
                            ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with "()" and "new"
// because they can cause invocation, and "=" because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
// replace all simple value tokens with "]" characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or "]" or
// "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

            if (
                rx_one.test(
                    text
                        .replace(rx_two, "@")
                        .replace(rx_three, "]")
                        .replace(rx_four, "")
                )
            ) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The "{" operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval("(" + text + ")");

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return (typeof reviver === "function")
                    ? walk({"": j}, "")
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError("JSON.parse");
        };
    }
}());
},{}],67:[function(require,module,exports){
var util = require('./util')
var slice = util.slice
var pluck = util.pluck
var each = util.each
var create = util.create
var isList = util.isList
var isFunction = util.isFunction
var isObject = util.isObject

module.exports = {
	createStore: createStore,
}

var storeAPI = {
	version: '2.0.4',
	enabled: false,
	storage: null,

	// addStorage adds another storage to this store. The store
	// will use the first storage it receives that is enabled, so
	// call addStorage in the order of preferred storage.
	addStorage: function(storage) {
		if (this.enabled) { return }
		if (this._testStorage(storage)) {
			this._storage.resolved = storage
			this.enabled = true
			this.storage = storage.name
		}
	},

	// addPlugin will add a plugin to this store.
	addPlugin: function(plugin) {
		var self = this

		// If the plugin is an array, then add all plugins in the array.
		// This allows for a plugin to depend on other plugins.
		if (isList(plugin)) {
			each(plugin, function(plugin) {
				self.addPlugin(plugin)
			})
			return
		}

		// Keep track of all plugins we've seen so far, so that we
		// don't add any of them twice.
		var seenPlugin = pluck(this._seenPlugins, function(seenPlugin) { return (plugin === seenPlugin) })
		if (seenPlugin) {
			return
		}
		this._seenPlugins.push(plugin)

		// Check that the plugin is properly formed
		if (!isFunction(plugin)) {
			throw new Error('Plugins must be function values that return objects')
		}

		var pluginProperties = plugin.call(this)
		if (!isObject(pluginProperties)) {
			throw new Error('Plugins must return an object of function properties')
		}

		// Add the plugin function properties to this store instance.
		each(pluginProperties, function(pluginFnProp, propName) {
			if (!isFunction(pluginFnProp)) {
				throw new Error('Bad plugin property: '+propName+' from plugin '+plugin.name+'. Plugins should only return functions.')
			}
			self._assignPluginFnProp(pluginFnProp, propName)
		})
	},

	// get returns the value of the given key. If that value
	// is undefined, it returns optionalDefaultValue instead.
	get: function(key, optionalDefaultValue) {
		var data = this._storage().read(this._namespacePrefix + key)
		return this._deserialize(data, optionalDefaultValue)
	},

	// set will store the given value at key and returns value.
	// Calling set with value === undefined is equivalent to calling remove.
	set: function(key, value) {
		if (value === undefined) {
			return this.remove(key)
		}
		this._storage().write(this._namespacePrefix + key, this._serialize(value))
		return value
	},

	// remove deletes the key and value stored at the given key.
	remove: function(key) {
		this._storage().remove(this._namespacePrefix + key)
	},

	// each will call the given callback once for each key-value pair
	// in this store.
	each: function(callback) {
		var self = this
		this._storage().each(function(val, namespacedKey) {
			callback(self._deserialize(val), namespacedKey.replace(self._namespaceRegexp, ''))
		})
	},

	// clearAll will remove all the stored key-value pairs in this store.
	clearAll: function() {
		this._storage().clearAll()
	},

	// additional functionality that can't live in plugins
	// ---------------------------------------------------

	// hasNamespace returns true if this store instance has the given namespace.
	hasNamespace: function(namespace) {
		return (this._namespacePrefix == '__storejs_'+namespace+'_')
	},

	// namespace clones the current store and assigns it the given namespace
	namespace: function(namespace) {
		if (!this._legalNamespace.test(namespace)) {
			throw new Error('store.js namespaces can only have alhpanumerics + underscores and dashes')
		}
		// create a prefix that is very unlikely to collide with un-namespaced keys
		var namespacePrefix = '__storejs_'+namespace+'_'
		return create(this, {
			_namespacePrefix: namespacePrefix,
			_namespaceRegexp: namespacePrefix ? new RegExp('^'+namespacePrefix) : null
		})
	},

	// createStore creates a store.js instance with the first
	// functioning storage in the list of storage candidates,
	// and applies the the given mixins to the instance.
	createStore: function(storages, plugins) {
		return createStore(storages, plugins)
	},
}

function createStore(storages, plugins) {
	var _privateStoreProps = {
		_seenPlugins: [],
		_namespacePrefix: '',
		_namespaceRegexp: null,
		_legalNamespace: /^[a-zA-Z0-9_\-]+$/, // alpha-numeric + underscore and dash

		_storage: function() {
			if (!this.enabled) {
				throw new Error("store.js: No supported storage has been added! "+
					"Add one (e.g store.addStorage(require('store/storages/cookieStorage')) "+
					"or use a build with more built-in storages (e.g "+
					"https://github.com/marcuswestin/store.js/tree/master/dist/store.legacy.min.js)")
			}
			return this._storage.resolved
		},

		_testStorage: function(storage) {
			try {
				var testStr = '__storejs__test__'
				storage.write(testStr, testStr)
				var ok = (storage.read(testStr) === testStr)
				storage.remove(testStr)
				return ok
			} catch(e) {
				return false
			}
		},

		_assignPluginFnProp: function(pluginFnProp, propName) {
			var oldFn = this[propName]
			this[propName] = function pluginFn() {
				var args = slice(arguments, 0)
				var self = this

				// super_fn calls the old function which was overwritten by
				// this mixin.
				function super_fn() {
					if (!oldFn) { return }
					each(arguments, function(arg, i) {
						args[i] = arg
					})
					return oldFn.apply(self, args)
				}

				// Give mixing function access to super_fn by prefixing all mixin function
				// arguments with super_fn.
				var newFnArgs = [super_fn].concat(args)

				return pluginFnProp.apply(self, newFnArgs)
			}
		},

		_serialize: function(obj) {
			return JSON.stringify(obj)
		},

		_deserialize: function(strVal, defaultVal) {
			if (!strVal) { return defaultVal }
			// It is possible that a raw string value has been previously stored
			// in a storage without using store.js, meaning it will be a raw
			// string value instead of a JSON serialized string. By defaulting
			// to the raw string value in case of a JSON parse error, we allow
			// for past stored values to be forwards-compatible with store.js
			var val = ''
			try { val = JSON.parse(strVal) }
			catch(e) { val = strVal }

			return (val !== undefined ? val : defaultVal)
		},
	}

	var store = create(_privateStoreProps, storeAPI)
	each(storages, function(storage) {
		store.addStorage(storage)
	})
	each(plugins, function(plugin) {
		store.addPlugin(plugin)
	})
	return store
}

},{"./util":68}],68:[function(require,module,exports){
(function (global){
var assign = make_assign()
var create = make_create()
var trim = make_trim()
var Global = (typeof window !== 'undefined' ? window : global)

module.exports = {
	assign: assign,
	create: create,
	trim: trim,
	bind: bind,
	slice: slice,
	each: each,
	map: map,
	pluck: pluck,
	isList: isList,
	isFunction: isFunction,
	isObject: isObject,
	Global: Global,
}

function make_assign() {
	if (Object.assign) {
		return Object.assign
	} else {
		return function shimAssign(obj, props1, props2, etc) {
			for (var i = 1; i < arguments.length; i++) {
				each(Object(arguments[i]), function(val, key) {
					obj[key] = val
				})
			}			
			return obj
		}
	}
}

function make_create() {
	if (Object.create) {
		return function create(obj, assignProps1, assignProps2, etc) {
			var assignArgsList = slice(arguments, 1)
			return assign.apply(this, [Object.create(obj)].concat(assignArgsList))
		}
	} else {
		function F() {} // eslint-disable-line no-inner-declarations
		return function create(obj, assignProps1, assignProps2, etc) {
			var assignArgsList = slice(arguments, 1)
			F.prototype = obj
			return assign.apply(this, [new F()].concat(assignArgsList))
		}
	}
}

function make_trim() {
	if (String.prototype.trim) {
		return function trim(str) {
			return String.prototype.trim.call(str)
		}
	} else {
		return function trim(str) {
			return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '')
		}
	}
}

function bind(obj, fn) {
	return function() {
		return fn.apply(obj, Array.prototype.slice.call(arguments, 0))
	}
}

function slice(arr, index) {
	return Array.prototype.slice.call(arr, index || 0)
}

function each(obj, fn) {
	pluck(obj, function(key, val) {
		fn(key, val)
		return false
	})
}

function map(obj, fn) {
	var res = (isList(obj) ? [] : {})
	pluck(obj, function(v, k) {
		res[k] = fn(v, k)
		return false
	})
	return res
}

function pluck(obj, fn) {
	if (isList(obj)) {
		for (var i=0; i<obj.length; i++) {
			if (fn(obj[i], i)) {
				return obj[i]
			}
		}
	} else {
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (fn(obj[key], key)) {
					return obj[key]
				}
			}
		}
	}
}

function isList(val) {
	return (val != null && typeof val != 'function' && typeof val.length == 'number')
}

function isFunction(val) {
	return val && {}.toString.call(val) === '[object Function]'
}

function isObject(val) {
	return val && {}.toString.call(val) === '[object Object]'
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],69:[function(require,module,exports){
module.exports = {
	// Listed in order of usage preference
	'localStorage': require('./localStorage'),
	'oldFF-globalStorage': require('./oldFF-globalStorage'),
	'oldIE-userDataStorage': require('./oldIE-userDataStorage'),
	'cookieStorage': require('./cookieStorage'),
	'sessionStorage': require('./sessionStorage'),
	'memoryStorage': require('./memoryStorage'),
}

},{"./cookieStorage":70,"./localStorage":71,"./memoryStorage":72,"./oldFF-globalStorage":73,"./oldIE-userDataStorage":74,"./sessionStorage":75}],70:[function(require,module,exports){
// cookieStorage is useful Safari private browser mode, where localStorage
// doesn't work but cookies do. This implementation is adopted from
// https://developer.mozilla.org/en-US/docs/Web/API/Storage/LocalStorage

var util = require('../src/util')
var Global = util.Global
var trim = util.trim

module.exports = {
	name: 'cookieStorage',
	read: read,
	write: write,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

var doc = Global.document

function read(key) {
	if (!key || !_has(key)) { return null }
	var regexpStr = "(?:^|.*;\\s*)" +
		escape(key).replace(/[\-\.\+\*]/g, "\\$&") +
		"\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"
	return unescape(doc.cookie.replace(new RegExp(regexpStr), "$1"))
}

function each(callback) {
	var cookies = doc.cookie.split(/; ?/g)
	for (var i = cookies.length - 1; i >= 0; i--) {
		if (!trim(cookies[i])) {
			continue
		}
		var kvp = cookies[i].split('=')
		var key = unescape(kvp[0])
		var val = unescape(kvp[1])
		callback(val, key)
	}
}

function write(key, data) {
	if(!key) { return }
	doc.cookie = escape(key) + "=" + escape(data) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/"
}

function remove(key) {
	if (!key || !_has(key)) {
		return
	}
	doc.cookie = escape(key) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
}

function clearAll() {
	each(function(_, key) {
		remove(key)
	})
}

function _has(key) {
	return (new RegExp("(?:^|;\\s*)" + escape(key).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(doc.cookie)
}

},{"../src/util":68}],71:[function(require,module,exports){
var util = require('../src/util')
var Global = util.Global

module.exports = {
	name: 'localStorage',
	read: read,
	write: write,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

function localStorage() {
	return Global.localStorage
}

function read(key) {
	return localStorage().getItem(key)
}

function write(key, data) {
	return localStorage().setItem(key, data)
}

function each(fn) {
	for (var i = localStorage().length - 1; i >= 0; i--) {
		var key = localStorage().key(i)
		fn(read(key), key)
	}
}

function remove(key) {
	return localStorage().removeItem(key)
}

function clearAll() {
	return localStorage().clear()
}

},{"../src/util":68}],72:[function(require,module,exports){
// memoryStorage is a useful last fallback to ensure that the store
// is functions (meaning store.get(), store.set(), etc will all function).
// However, stored values will not persist when the browser navigates to
// a new page or reloads the current page.

module.exports = {
	name: 'memoryStorage',
	read: read,
	write: write,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

var memoryStorage = {}

function read(key) {
	return memoryStorage[key]
}

function write(key, data) {
	memoryStorage[key] = data
}

function each(callback) {
	for (var key in memoryStorage) {
		if (memoryStorage.hasOwnProperty(key)) {
			callback(memoryStorage[key], key)
		}
	}
}

function remove(key) {
	delete memoryStorage[key]
}

function clearAll(key) {
	memoryStorage = {}
}

},{}],73:[function(require,module,exports){
// oldFF-globalStorage provides storage for Firefox
// versions 6 and 7, where no localStorage, etc
// is available.

var util = require('../src/util')
var Global = util.Global

module.exports = {
	name: 'oldFF-globalStorage',
	read: read,
	write: write,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

var globalStorage = Global.globalStorage

function read(key) {
	return globalStorage[key]
}

function write(key, data) {
	globalStorage[key] = data
}

function each(fn) {
	for (var i = globalStorage.length - 1; i >= 0; i--) {
		var key = globalStorage.key(i)
		fn(globalStorage[key], key)
	}
}

function remove(key) {
	return globalStorage.removeItem(key)
}

function clearAll() {
	each(function(key, _) {
		delete globalStorage[key]
	})
}

},{"../src/util":68}],74:[function(require,module,exports){
// oldIE-userDataStorage provides storage for Internet Explorer
// versions 6 and 7, where no localStorage, sessionStorage, etc
// is available.

var util = require('../src/util')
var Global = util.Global

module.exports = {
	name: 'oldIE-userDataStorage',
	write: write,
	read: read,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

var storageName = 'storejs'
var doc = Global.document
var _withStorageEl = _makeIEStorageElFunction()
var disable = (Global.navigator ? Global.navigator.userAgent : '').match(/ (MSIE 8|MSIE 9|MSIE 10)\./) // MSIE 9.x, MSIE 10.x

function write(unfixedKey, data) {
	if (disable) { return }
	var fixedKey = fixKey(unfixedKey)
	_withStorageEl(function(storageEl) {
		storageEl.setAttribute(fixedKey, data)
		storageEl.save(storageName)
	})
}

function read(unfixedKey) {
	if (disable) { return }
	var fixedKey = fixKey(unfixedKey)
	var res = null
	_withStorageEl(function(storageEl) {
		res = storageEl.getAttribute(fixedKey)
	})
	return res
}

function each(callback) {
	_withStorageEl(function(storageEl) {
		var attributes = storageEl.XMLDocument.documentElement.attributes
		for (var i=attributes.length-1; i>=0; i--) {
			var attr = attributes[i]
			callback(storageEl.getAttribute(attr.name), attr.name)
		}
	})
}

function remove(unfixedKey) {
	var fixedKey = fixKey(unfixedKey)
	_withStorageEl(function(storageEl) {
		storageEl.removeAttribute(fixedKey)
		storageEl.save(storageName)
	})
}

function clearAll() {
	_withStorageEl(function(storageEl) {
		var attributes = storageEl.XMLDocument.documentElement.attributes
		storageEl.load(storageName)
		for (var i=attributes.length-1; i>=0; i--) {
			storageEl.removeAttribute(attributes[i].name)
		}
		storageEl.save(storageName)
	})
}

// Helpers
//////////

// In IE7, keys cannot start with a digit or contain certain chars.
// See https://github.com/marcuswestin/store.js/issues/40
// See https://github.com/marcuswestin/store.js/issues/83
var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")
function fixKey(key) {
	return key.replace(/^\d/, '___$&').replace(forbiddenCharsRegex, '___')
}

function _makeIEStorageElFunction() {
	if (!doc || !doc.documentElement || !doc.documentElement.addBehavior) {
		return null
	}
	var scriptTag = 'script',
		storageOwner,
		storageContainer,
		storageEl

	// Since #userData storage applies only to specific paths, we need to
	// somehow link our data to a specific path.  We choose /favicon.ico
	// as a pretty safe option, since all browsers already make a request to
	// this URL anyway and being a 404 will not hurt us here.  We wrap an
	// iframe pointing to the favicon in an ActiveXObject(htmlfile) object
	// (see: http://msdn.microsoft.com/en-us/library/aa752574(v=VS.85).aspx)
	// since the iframe access rules appear to allow direct access and
	// manipulation of the document element, even for a 404 page.  This
	// document can be used instead of the current document (which would
	// have been limited to the current path) to perform #userData storage.
	try {
		/* global ActiveXObject */
		storageContainer = new ActiveXObject('htmlfile')
		storageContainer.open()
		storageContainer.write('<'+scriptTag+'>document.w=window</'+scriptTag+'><iframe src="/favicon.ico"></iframe>')
		storageContainer.close()
		storageOwner = storageContainer.w.frames[0].document
		storageEl = storageOwner.createElement('div')
	} catch(e) {
		// somehow ActiveXObject instantiation failed (perhaps some special
		// security settings or otherwse), fall back to per-path storage
		storageEl = doc.createElement('div')
		storageOwner = doc.body
	}

	return function(storeFunction) {
		var args = [].slice.call(arguments, 0)
		args.unshift(storageEl)
		// See http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
		// and http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
		storageOwner.appendChild(storageEl)
		storageEl.addBehavior('#default#userData')
		storageEl.load(storageName)
		storeFunction.apply(this, args)
		storageOwner.removeChild(storageEl)
		return
	}
}

},{"../src/util":68}],75:[function(require,module,exports){
var util = require('../src/util')
var Global = util.Global

module.exports = {
	name: 'sessionStorage',
	read: read,
	write: write,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

function sessionStorage() {
	return Global.sessionStorage
}

function read(key) {
	return sessionStorage().getItem(key)
}

function write(key, data) {
	return sessionStorage().setItem(key, data)
}

function each(fn) {
	for (var i = sessionStorage().length - 1; i >= 0; i--) {
		var key = sessionStorage().key(i)
		fn(read(key), key)
	}
}

function remove(key) {
	return sessionStorage().removeItem(key)
}

function clearAll() {
	return sessionStorage().clear()
}

},{"../src/util":68}],76:[function(require,module,exports){
function E () {
  // Keep this empty so it's easier to inherit from
  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
}

E.prototype = {
  on: function (name, callback, ctx) {
    var e = this.e || (this.e = {});

    (e[name] || (e[name] = [])).push({
      fn: callback,
      ctx: ctx
    });

    return this;
  },

  once: function (name, callback, ctx) {
    var self = this;
    function listener () {
      self.off(name, listener);
      callback.apply(ctx, arguments);
    };

    listener._ = callback
    return this.on(name, listener, ctx);
  },

  emit: function (name) {
    var data = [].slice.call(arguments, 1);
    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
    var i = 0;
    var len = evtArr.length;

    for (i; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }

    return this;
  },

  off: function (name, callback) {
    var e = this.e || (this.e = {});
    var evts = e[name];
    var liveEvents = [];

    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
          liveEvents.push(evts[i]);
      }
    }

    // Remove event from queue to prevent memory leak
    // Suggested by https://github.com/lazd
    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

    (liveEvents.length)
      ? e[name] = liveEvents
      : delete e[name];

    return this;
  }
};

module.exports = E;

},{}],77:[function(require,module,exports){
/*
 * Toastr
 * Copyright 2012-2015
 * Authors: John Papa, Hans Fjällemark, and Tim Ferrell.
 * All Rights Reserved.
 * Use, reproduction, distribution, and modification of this code is subject to the terms and
 * conditions of the MIT license, available at http://www.opensource.org/licenses/mit-license.php
 *
 * ARIA Support: Greta Krafsig
 *
 * Project: https://github.com/CodeSeven/toastr
 */
/* global define */
; (function (define) {
    define(['jquery'], function ($) {
        return (function () {
            var $container;
            var listener;
            var toastId = 0;
            var toastType = {
                error: 'error',
                info: 'info',
                success: 'success',
                warning: 'warning'
            };

            var toastr = {
                clear: clear,
                remove: remove,
                error: error,
                getContainer: getContainer,
                info: info,
                options: {},
                subscribe: subscribe,
                success: success,
                version: '2.1.2',
                warning: warning
            };

            var previousToast;

            return toastr;

            ////////////////

            function error(message, title, optionsOverride) {
                return notify({
                    type: toastType.error,
                    iconClass: getOptions().iconClasses.error,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function getContainer(options, create) {
                if (!options) { options = getOptions(); }
                $container = $('#' + options.containerId);
                if ($container.length) {
                    return $container;
                }
                if (create) {
                    $container = createContainer(options);
                }
                return $container;
            }

            function info(message, title, optionsOverride) {
                return notify({
                    type: toastType.info,
                    iconClass: getOptions().iconClasses.info,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function subscribe(callback) {
                listener = callback;
            }

            function success(message, title, optionsOverride) {
                return notify({
                    type: toastType.success,
                    iconClass: getOptions().iconClasses.success,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function warning(message, title, optionsOverride) {
                return notify({
                    type: toastType.warning,
                    iconClass: getOptions().iconClasses.warning,
                    message: message,
                    optionsOverride: optionsOverride,
                    title: title
                });
            }

            function clear($toastElement, clearOptions) {
                var options = getOptions();
                if (!$container) { getContainer(options); }
                if (!clearToast($toastElement, options, clearOptions)) {
                    clearContainer(options);
                }
            }

            function remove($toastElement) {
                var options = getOptions();
                if (!$container) { getContainer(options); }
                if ($toastElement && $(':focus', $toastElement).length === 0) {
                    removeToast($toastElement);
                    return;
                }
                if ($container.children().length) {
                    $container.remove();
                }
            }

            // internal functions

            function clearContainer (options) {
                var toastsToClear = $container.children();
                for (var i = toastsToClear.length - 1; i >= 0; i--) {
                    clearToast($(toastsToClear[i]), options);
                }
            }

            function clearToast ($toastElement, options, clearOptions) {
                var force = clearOptions && clearOptions.force ? clearOptions.force : false;
                if ($toastElement && (force || $(':focus', $toastElement).length === 0)) {
                    $toastElement[options.hideMethod]({
                        duration: options.hideDuration,
                        easing: options.hideEasing,
                        complete: function () { removeToast($toastElement); }
                    });
                    return true;
                }
                return false;
            }

            function createContainer(options) {
                $container = $('<div/>')
                    .attr('id', options.containerId)
                    .addClass(options.positionClass)
                    .attr('aria-live', 'polite')
                    .attr('role', 'alert');

                $container.appendTo($(options.target));
                return $container;
            }

            function getDefaults() {
                return {
                    tapToDismiss: true,
                    toastClass: 'toast',
                    containerId: 'toast-container',
                    debug: false,

                    showMethod: 'fadeIn', //fadeIn, slideDown, and show are built into jQuery
                    showDuration: 300,
                    showEasing: 'swing', //swing and linear are built into jQuery
                    onShown: undefined,
                    hideMethod: 'fadeOut',
                    hideDuration: 1000,
                    hideEasing: 'swing',
                    onHidden: undefined,
                    closeMethod: false,
                    closeDuration: false,
                    closeEasing: false,

                    extendedTimeOut: 1000,
                    iconClasses: {
                        error: 'toast-error',
                        info: 'toast-info',
                        success: 'toast-success',
                        warning: 'toast-warning'
                    },
                    iconClass: 'toast-info',
                    positionClass: 'toast-top-right',
                    timeOut: 5000, // Set timeOut and extendedTimeOut to 0 to make it sticky
                    titleClass: 'toast-title',
                    messageClass: 'toast-message',
                    escapeHtml: false,
                    target: 'body',
                    closeHtml: '<button type="button">&times;</button>',
                    newestOnTop: true,
                    preventDuplicates: false,
                    progressBar: false
                };
            }

            function publish(args) {
                if (!listener) { return; }
                listener(args);
            }

            function notify(map) {
                var options = getOptions();
                var iconClass = map.iconClass || options.iconClass;

                if (typeof (map.optionsOverride) !== 'undefined') {
                    options = $.extend(options, map.optionsOverride);
                    iconClass = map.optionsOverride.iconClass || iconClass;
                }

                if (shouldExit(options, map)) { return; }

                toastId++;

                $container = getContainer(options, true);

                var intervalId = null;
                var $toastElement = $('<div/>');
                var $titleElement = $('<div/>');
                var $messageElement = $('<div/>');
                var $progressElement = $('<div/>');
                var $closeElement = $(options.closeHtml);
                var progressBar = {
                    intervalId: null,
                    hideEta: null,
                    maxHideTime: null
                };
                var response = {
                    toastId: toastId,
                    state: 'visible',
                    startTime: new Date(),
                    options: options,
                    map: map
                };

                personalizeToast();

                displayToast();

                handleEvents();

                publish(response);

                if (options.debug && console) {
                    console.log(response);
                }

                return $toastElement;

                function escapeHtml(source) {
                    if (source == null)
                        source = "";

                    return new String(source)
                        .replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                }

                function personalizeToast() {
                    setIcon();
                    setTitle();
                    setMessage();
                    setCloseButton();
                    setProgressBar();
                    setSequence();
                }

                function handleEvents() {
                    $toastElement.hover(stickAround, delayedHideToast);
                    if (!options.onclick && options.tapToDismiss) {
                        $toastElement.click(hideToast);
                    }

                    if (options.closeButton && $closeElement) {
                        $closeElement.click(function (event) {
                            if (event.stopPropagation) {
                                event.stopPropagation();
                            } else if (event.cancelBubble !== undefined && event.cancelBubble !== true) {
                                event.cancelBubble = true;
                            }
                            hideToast(true);
                        });
                    }

                    if (options.onclick) {
                        $toastElement.click(function (event) {
                            options.onclick(event);
                            hideToast();
                        });
                    }
                }

                function displayToast() {
                    $toastElement.hide();

                    $toastElement[options.showMethod](
                        {duration: options.showDuration, easing: options.showEasing, complete: options.onShown}
                    );

                    if (options.timeOut > 0) {
                        intervalId = setTimeout(hideToast, options.timeOut);
                        progressBar.maxHideTime = parseFloat(options.timeOut);
                        progressBar.hideEta = new Date().getTime() + progressBar.maxHideTime;
                        if (options.progressBar) {
                            progressBar.intervalId = setInterval(updateProgress, 10);
                        }
                    }
                }

                function setIcon() {
                    if (map.iconClass) {
                        $toastElement.addClass(options.toastClass).addClass(iconClass);
                    }
                }

                function setSequence() {
                    if (options.newestOnTop) {
                        $container.prepend($toastElement);
                    } else {
                        $container.append($toastElement);
                    }
                }

                function setTitle() {
                    if (map.title) {
                        $titleElement.append(!options.escapeHtml ? map.title : escapeHtml(map.title)).addClass(options.titleClass);
                        $toastElement.append($titleElement);
                    }
                }

                function setMessage() {
                    if (map.message) {
                        $messageElement.append(!options.escapeHtml ? map.message : escapeHtml(map.message)).addClass(options.messageClass);
                        $toastElement.append($messageElement);
                    }
                }

                function setCloseButton() {
                    if (options.closeButton) {
                        $closeElement.addClass('toast-close-button').attr('role', 'button');
                        $toastElement.prepend($closeElement);
                    }
                }

                function setProgressBar() {
                    if (options.progressBar) {
                        $progressElement.addClass('toast-progress');
                        $toastElement.prepend($progressElement);
                    }
                }

                function shouldExit(options, map) {
                    if (options.preventDuplicates) {
                        if (map.message === previousToast) {
                            return true;
                        } else {
                            previousToast = map.message;
                        }
                    }
                    return false;
                }

                function hideToast(override) {
                    var method = override && options.closeMethod !== false ? options.closeMethod : options.hideMethod;
                    var duration = override && options.closeDuration !== false ?
                        options.closeDuration : options.hideDuration;
                    var easing = override && options.closeEasing !== false ? options.closeEasing : options.hideEasing;
                    if ($(':focus', $toastElement).length && !override) {
                        return;
                    }
                    clearTimeout(progressBar.intervalId);
                    return $toastElement[method]({
                        duration: duration,
                        easing: easing,
                        complete: function () {
                            removeToast($toastElement);
                            if (options.onHidden && response.state !== 'hidden') {
                                options.onHidden();
                            }
                            response.state = 'hidden';
                            response.endTime = new Date();
                            publish(response);
                        }
                    });
                }

                function delayedHideToast() {
                    if (options.timeOut > 0 || options.extendedTimeOut > 0) {
                        intervalId = setTimeout(hideToast, options.extendedTimeOut);
                        progressBar.maxHideTime = parseFloat(options.extendedTimeOut);
                        progressBar.hideEta = new Date().getTime() + progressBar.maxHideTime;
                    }
                }

                function stickAround() {
                    clearTimeout(intervalId);
                    progressBar.hideEta = 0;
                    $toastElement.stop(true, true)[options.showMethod](
                        {duration: options.showDuration, easing: options.showEasing}
                    );
                }

                function updateProgress() {
                    var percentage = ((progressBar.hideEta - (new Date().getTime())) / progressBar.maxHideTime) * 100;
                    $progressElement.width(percentage + '%');
                }
            }

            function getOptions() {
                return $.extend({}, getDefaults(), toastr.options);
            }

            function removeToast($toastElement) {
                if (!$container) { $container = getContainer(); }
                if ($toastElement.is(':visible')) {
                    return;
                }
                $toastElement.remove();
                $toastElement = null;
                if ($container.children().length === 0) {
                    $container.remove();
                    previousToast = undefined;
                }
            }

        })();
    });
}(typeof define === 'function' && define.amd ? define : function (deps, factory) {
    if (typeof module !== 'undefined' && module.exports) { //Node
        module.exports = factory(require('jquery'));
    } else {
        window.toastr = factory(window.jQuery);
    }
}));

},{"jquery":57}],78:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],79:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],80:[function(require,module,exports){
(function (global){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

module.exports = rng;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],81:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":79,"./lib/rng":80}],82:[function(require,module,exports){

// return all text nodes that are contained within `el`
function getTextNodes(el) {
  el = el || document.body

  var doc = el.ownerDocument || document
    , walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false)
    , textNodes = []
    , node

  while (node = walker.nextNode()) {
    textNodes.push(node)
  }
  return textNodes
}

// return true if `rangeA` intersects `rangeB`
function rangesIntersect(rangeA, rangeB) {
  return rangeA.compareBoundaryPoints(Range.END_TO_START, rangeB) === -1 &&
    rangeA.compareBoundaryPoints(Range.START_TO_END, rangeB) === 1
}

// create and return a range that selects `node`
function createRangeFromNode(node) {
  var range = node.ownerDocument.createRange()
  try {
    range.selectNode(node)
  } catch (e) {
    range.selectNodeContents(node)
  }
  return range
}

// return true if `node` is fully or partially selected by `range`
function rangeIntersectsNode(range, node) {
  if (range.intersectsNode) {
    return range.intersectsNode(node)
  } else {
    return rangesIntersect(range, createRangeFromNode(node))
  }
}

// return all non-empty text nodes fully or partially selected by `range`
function getRangeTextNodes(range) {
  var container = range.commonAncestorContainer
    , nodes = getTextNodes(container.parentNode || container)

  return nodes.filter(function (node) {
    return rangeIntersectsNode(range, node) && isNonEmptyTextNode(node)
  })
}

// returns true if `node` has text content
function isNonEmptyTextNode(node) {
  return node.textContent.length > 0
}

// remove `el` from the DOM
function remove(el) {
  if (el.parentNode) {
    el.parentNode.removeChild(el)
  }
}

// replace `node` with `replacementNode`
function replaceNode(replacementNode, node) {
  remove(replacementNode)
  node.parentNode.insertBefore(replacementNode, node)
  remove(node)
}

// unwrap `el` by replacing itself with its contents
function unwrap(el) {
  var range = document.createRange()
  range.selectNodeContents(el)
  replaceNode(range.extractContents(), el)
}

// undo the effect of `wrapRangeText`, given a resulting array of wrapper `nodes`
function undo(nodes) {
  nodes.forEach(function (node) {
    var parent = node.parentNode
    unwrap(node)
    parent.normalize()
  })
}

// create a node wrapper function
function createWrapperFunction(wrapperEl, range) {
    var startNode = range.startContainer
      , endNode = range.endContainer
      , startOffset = range.startOffset
      , endOffset = range.endOffset

  return function wrapNode(node) {
    var currentRange = document.createRange()
      , currentWrapper = wrapperEl.cloneNode()

    currentRange.selectNodeContents(node)

    if (node === startNode && startNode.nodeType === 3) {
      currentRange.setStart(node, startOffset)
      startNode = currentWrapper
      startOffset = 0
    }
    if (node === endNode && endNode.nodeType === 3) {
      currentRange.setEnd(node, endOffset)
      endNode = currentWrapper
      endOffset = 1
    }

    currentRange.surroundContents(currentWrapper)
    return currentWrapper
  }
}

function wrapRangeText(wrapperEl, range) {
  var nodes
    , wrapNode
    , wrapperObj = {}

  if (typeof range === 'undefined') {
    // get the current selection if no range is specified
    range = window.getSelection().getRangeAt(0)
  }

  if (range.isCollapsed) {
    // nothing to wrap
    return []
  }

  if (typeof wrapperEl === 'undefined') {
    wrapperEl = 'span'
  }

  if (typeof wrapperEl === 'string') {
    // assume it's a tagname
    wrapperEl = document.createElement(wrapperEl)
  }

  wrapNode = createWrapperFunction(wrapperEl, range)

  nodes = getRangeTextNodes(range)
  nodes = nodes.map(wrapNode)

  wrapperObj.nodes = nodes
  wrapperObj.unwrap = function () {
    if (this.nodes.length) {
      undo(this.nodes)
      this.nodes = []
    }
  }

  return wrapperObj
}

module.exports = wrapRangeText

},{}],83:[function(require,module,exports){

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


},{"../bundle/config/config":84,"axios":2}],84:[function(require,module,exports){
(function (process,Buffer){
/* config/config.js */

var store = require("store");
var _ = require("underscore");

var cmiConfig;
var apiEndpoint = "https://s0l2an0odc.execute-api.us-east-1.amazonaws.com/latest/search";
var idxEndpoint = "https://4r9azgy1hb.execute-api.us-east-1.amazonaws.com/latest/index";

//get array of source id (sid) values:
function getSourceArray() {
  var srcArray = [];
  var i;

  for (i = 0; i < cmiConfig.source.length; i++) {
    srcArray.push(cmiConfig.source[i].sid);
  }
  return srcArray;
}

function getSourceInfo(sid) {
  var srcObj;
  var i;
  for (i = 0; i < cmiConfig.source.length; i++) {
    if (cmiConfig.source[i].sid === sid) {
      srcObj = cmiConfig.source[i];
      break;
    }
  }
  return srcObj;
}

//generate sort key from source id (id), book id (id), and unit id (idx)
//srcId is required but others are optional
function genKey(srcId, bookId, unitId) {
  var sPart;
  var bPart;
  var uPart;

  if (!srcId) {
    return 0;
  }

  sPart = srcId * 10000000;
  bPart = bookId ? (bookId * 1000): 0;
  uPart = unitId ? unitId : 0;

  return sPart + bPart + uPart;
}

//get ordered array of book ids (bid) by sid
function getOrderedArrayOfBids(sid) {
  var i;
  var arr = [];
  var idArray;
  var srcInfo = getSourceInfo(sid);

  if (!srcInfo) {
    return arr;
  }

  for (i = 0; i < srcInfo.books.length; i++) {
    arr.push({
      bid: srcInfo.books[i].bid,
      key: genKey(srcInfo.id, srcInfo.books[i].id)
    });
  }

  //it should be sorted... but, sort by key just in case
  arr.sort(function(a, b) {
    return a.key - b.key;
  });

  idArray = _.map(arr, function(item) {
    return item.bid;
  });

  //console.log(idArray);
  return idArray;
}

var pageInfo = (function() {
  var path = "";
  var sid = -1;
  var bid = -1;
  var uid = -1;
  var source;
  var book;
  var unit;

  function getSource(psid) {
    var i;
    if (psid !== sid) {
      bid = -1;
      uid = -1;
      for (i = 0; i < cmiConfig.source.length; i++) {
        if (cmiConfig.source[i].sid === psid) {
          sid = psid;
          source = cmiConfig.source[i];
          break;
        }
      }
    }
  }

  function getBook(pbid) {
    var i;
    if (pbid !== bid) {
      uid = -1;
      for (i = 0; i < source.books.length; i++) {
        if (source.books[i].bid === pbid) {
          bid = pbid;
          book = source.books[i];
          break;
        }
      }
    }
  }

  function getUnit(puid) {
    var i;
    if (puid !== uid) {
      for (i = 0; i < book.units.page.length; i++) {
        if (book.units.page[i].uid === puid) {
          uid = puid;
          unit = book.units.page[i];
          break;
        }
      }
    }
  }

  return {
    init: function(pathname) {
      path = pathname;
      var parts = pathname.split("/");
      var unit = parts[3];

      getSource(parts[1]);
      getBook(parts[2]);

      //this happens for sparkly acim text
      if (parts.length === 6) {
        unit = unit + "/" + parts[4];
      }
      getUnit(unit);
    },
    initParts: function(sid, bid, uid) {
      path = ["",sid,bid,uid,""].join("/");
      //console.log("initParts: path=%s", path);
      getSource(sid);
      getBook(bid);
      getUnit(uid);
    },
    get: function(pathname) {
      this.init(pathname);
      return {
        pathname: pathname,
        siteTitle: cmiConfig.title,
        siteUrl: cmiConfig.url,
        sourceTitle: source.title,
        sourceId: source.id,
        sid: source.sid,
        bookTitle: book.title,
        bookId: book.id,
        bid: book.bid,
        pageTitle: unit.title,
        pageUrl: unit.url,
        pageId: unit.idx,
        pageKey: (source.id * 10000000) + (book.id * 1000) + unit.idx,
        uid: unit.uid,
        pageHasAudioTimingData: unit.hasAudioTimingData,
        timer: unit.timer
      };
    },
    getTitle: function() {
      return book.title + " - " + unit.title;
    },
    getKey: function() {
      //return (source.id * 100000) + (book.id * 1000) + unit.idx;
      return genKey(source.id, book.id, unit.idx);
    },
    getAudio: function() {
      return unit.hasAudioTimingData;
    }
  };
}());

//this injects config.json using browerify transform: brfs
function loadConfig(cb) {
  

  process.nextTick(function(){(function (err, json) {
    if (err) {
        cb(err);
    } else {
        cb(null, json);
    }
})(null,Buffer("eyJ0aXRsZSI6IlRlYWNoaW5ncyBvZiBDaHJpc3QgTWluZCIsInVybCI6Imh0dHBzOi8vd3d3LmNocmlzdG1pbmQuaW5mbyIsInNvdXJjZSI6W3siaWQiOjEsInRpdGxlIjoiV2F5IG9mIE1hc3RlcnkiLCJzaWQiOiJ3b20iLCJib29rcyI6W3siaWQiOjEsImJpZCI6IndvaCIsInRpdGxlIjoiV2F5IG9mIHRoZSBIZWFydCIsInVuaXRzIjp7InBhZ2UiOlt7InRpdGxlIjoiQWJvdXQiLCJ1cmwiOiIvd29tL2ludHJvL3dvaC8iLCJpZHgiOjAsInVpZCI6IndvaCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJMZXNzb24gT25lIiwidXJsIjoiL3dvbS93b2gvbDAxLyIsImlkeCI6MSwidWlkIjoibDAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIFR3byIsInVybCI6Ii93b20vd29oL2wwMi8iLCJpZHgiOjIsInVpZCI6ImwwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBUaHJlZSIsInVybCI6Ii93b20vd29oL2wwMy8iLCJpZHgiOjMsInVpZCI6ImwwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBGb3VyIiwidXJsIjoiL3dvbS93b2gvbDA0LyIsImlkeCI6NCwidWlkIjoibDA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIEZpdmUiLCJ1cmwiOiIvd29tL3dvaC9sMDUvIiwiaWR4Ijo1LCJ1aWQiOiJsMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJMZXNzb24gU2l4IiwidXJsIjoiL3dvbS93b2gvbDA2LyIsImlkeCI6NiwidWlkIjoibDA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIFNldmVuIiwidXJsIjoiL3dvbS93b2gvbDA3LyIsImlkeCI6NywidWlkIjoibDA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJHbGVvcG9sZDU4In0seyJ0aXRsZSI6Ikxlc3NvbiBFaWdodCIsInVybCI6Ii93b20vd29oL2wwOC8iLCJpZHgiOjgsInVpZCI6ImwwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBOaW5lIiwidXJsIjoiL3dvbS93b2gvbDA5LyIsImlkeCI6OSwidWlkIjoibDA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIFRlbiIsInVybCI6Ii93b20vd29oL2wxMC8iLCJpZHgiOjEwLCJ1aWQiOiJsMTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJMZXNzb24gRWxldmVuIiwidXJsIjoiL3dvbS93b2gvbDExLyIsImlkeCI6MTEsInVpZCI6ImwxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBUd2VsdmUiLCJ1cmwiOiIvd29tL3dvaC9sMTIvIiwiaWR4IjoxMiwidWlkIjoibDEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfV19fSx7ImlkIjoyLCJiaWQiOiJ3b3QiLCJ0aXRsZSI6IldheSBvZiBUcmFuc2Zvcm1hdGlvbiIsInVuaXRzIjp7InBhZ2UiOlt7InRpdGxlIjoiQWJvdXQiLCJ1cmwiOiIvd29tL2ludHJvL3dvdC8iLCJpZHgiOjAsInVpZCI6IndvdCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJMZXNzb24gT25lIiwidXJsIjoiL3dvbS93b3QvbDAxLyIsImlkeCI6MSwidWlkIjoibDAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIFR3byIsInVybCI6Ii93b20vd290L2wwMi8iLCJpZHgiOjIsInVpZCI6ImwwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBUaHJlZSIsInVybCI6Ii93b20vd290L2wwMy8iLCJpZHgiOjMsInVpZCI6ImwwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBGb3VyIiwidXJsIjoiL3dvbS93b3QvbDA0LyIsImlkeCI6NCwidWlkIjoibDA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIEZpdmUiLCJ1cmwiOiIvd29tL3dvdC9sMDUvIiwiaWR4Ijo1LCJ1aWQiOiJsMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJMZXNzb24gU2l4IiwidXJsIjoiL3dvbS93b3QvbDA2LyIsImlkeCI6NiwidWlkIjoibDA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIFNldmVuIiwidXJsIjoiL3dvbS93b3QvbDA3LyIsImlkeCI6NywidWlkIjoibDA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIEVpZ2h0IiwidXJsIjoiL3dvbS93b3QvbDA4LyIsImlkeCI6OCwidWlkIjoibDA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIE5pbmUiLCJ1cmwiOiIvd29tL3dvdC9sMDkvIiwiaWR4Ijo5LCJ1aWQiOiJsMDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJMZXNzb24gVGVuIiwidXJsIjoiL3dvbS93b3QvbDEwLyIsImlkeCI6MTAsInVpZCI6ImwxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBFbGV2ZW4iLCJ1cmwiOiIvd29tL3dvdC9sMTEvIiwiaWR4IjoxMSwidWlkIjoibDExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIFR3ZWx2ZSIsInVybCI6Ii93b20vd290L2wxMi8iLCJpZHgiOjEyLCJ1aWQiOiJsMTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9XX19LHsiaWQiOjMsImJpZCI6IndvayIsInRpdGxlIjoiV2F5IG9mIEtub3dpbmciLCJ1bml0cyI6eyJwYWdlIjpbeyJ0aXRsZSI6IkFib3V0IiwidXJsIjoiL3dvbS9pbnRyby93b2svIiwiaWR4IjowLCJ1aWQiOiJ3b2siLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTGVzc29uIE9uZSIsInVybCI6Ii93b20vd29rL2wwMS8iLCJpZHgiOjEsInVpZCI6ImwwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBUd28iLCJ1cmwiOiIvd29tL3dvay9sMDIvIiwiaWR4IjoyLCJ1aWQiOiJsMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJMZXNzb24gVGhyZWUiLCJ1cmwiOiIvd29tL3dvay9sMDMvIiwiaWR4IjozLCJ1aWQiOiJsMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJMZXNzb24gRm91ciIsInVybCI6Ii93b20vd29rL2wwNC8iLCJpZHgiOjQsInVpZCI6ImwwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBGaXZlIiwidXJsIjoiL3dvbS93b2svbDA1LyIsImlkeCI6NSwidWlkIjoibDA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIFNpeCIsInVybCI6Ii93b20vd29rL2wwNi8iLCJpZHgiOjYsInVpZCI6ImwwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBTZXZlbiIsInVybCI6Ii93b20vd29rL2wwNy8iLCJpZHgiOjcsInVpZCI6ImwwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBFaWdodCIsInVybCI6Ii93b20vd29rL2wwOC8iLCJpZHgiOjgsInVpZCI6ImwwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikxlc3NvbiBOaW5lIiwidXJsIjoiL3dvbS93b2svbDA5LyIsImlkeCI6OSwidWlkIjoibDA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGVzc29uIFRlbiIsInVybCI6Ii93b20vd29rL2wxMC8iLCJpZHgiOjEwLCJ1aWQiOiJsMTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJMZXNzb24gRWxldmVuIiwidXJsIjoiL3dvbS93b2svbDExLyIsImlkeCI6MTEsInVpZCI6ImwxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9XX19LHsiaWQiOjQsImJpZCI6InRqbCIsInRpdGxlIjoiVGhlIEplc2h1YSBMZXR0ZXJzIiwidW5pdHMiOnsicGFnZSI6W3sidGl0bGUiOiJBYm91dCBUaGUgSmVzaHVhIExldHRlcnMiLCJ1cmwiOiIvd29tL2ludHJvL3RqbC8iLCJpZHgiOjAsInVpZCI6InRqbCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJBY2tub3dsZWRnZW1lbnRzIiwidXJsIjoiL3dvbS90amwvYWNrLyIsImlkeCI6MSwidWlkIjoiYWNrIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZvcmV3b3JkIiwidXJsIjoiL3dvbS90amwvZm9yZXdvcmQvIiwiaWR4IjoyLCJ1aWQiOiJmb3Jld29yZCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJQcmVmYWNlIiwidXJsIjoiL3dvbS90amwvcHJlZmFjZS8iLCJpZHgiOjMsInVpZCI6InByZWZhY2UiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQ2hhcHRlciBPbmUiLCJ1cmwiOiIvd29tL3RqbC9jaGFwMDEvIiwiaWR4Ijo0LCJ1aWQiOiJjaGFwMDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQ2hhcHRlciBUd28iLCJ1cmwiOiIvd29tL3RqbC9jaGFwMDIvIiwiaWR4Ijo1LCJ1aWQiOiJjaGFwMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQ2hhcHRlciBUaHJlZSIsInVybCI6Ii93b20vdGpsL2NoYXAwMy8iLCJpZHgiOjYsInVpZCI6ImNoYXAwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJDaGFwdGVyIEZvdXIiLCJ1cmwiOiIvd29tL3RqbC9jaGFwMDQvIiwiaWR4Ijo3LCJ1aWQiOiJjaGFwMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQ2hhcHRlciBGaXZlIiwidXJsIjoiL3dvbS90amwvY2hhcDA1LyIsImlkeCI6OCwidWlkIjoiY2hhcDA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkNoYXB0ZXIgU2l4IiwidXJsIjoiL3dvbS90amwvY2hhcDA2LyIsImlkeCI6OSwidWlkIjoiY2hhcDA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkNoYXB0ZXIgU2V2ZW4iLCJ1cmwiOiIvd29tL3RqbC9jaGFwMDcvIiwiaWR4IjoxMCwidWlkIjoiY2hhcDA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkNoYXB0ZXIgRWlnaHQiLCJ1cmwiOiIvd29tL3RqbC9jaGFwMDgvIiwiaWR4IjoxMSwidWlkIjoiY2hhcDA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkNoYXB0ZXIgTmluZSIsInVybCI6Ii93b20vdGpsL2NoYXAwOS8iLCJpZHgiOjEyLCJ1aWQiOiJjaGFwMDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQ2hhcHRlciBUZW4iLCJ1cmwiOiIvd29tL3RqbC9jaGFwMTAvIiwiaWR4IjoxMywidWlkIjoiY2hhcDEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkNoYXB0ZXIgRWxldmVuIiwidXJsIjoiL3dvbS90amwvY2hhcDExLyIsImlkeCI6MTQsInVpZCI6ImNoYXAxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJDaGFwdGVyIFR3ZWxldmUiLCJ1cmwiOiIvd29tL3RqbC9jaGFwMTIvIiwiaWR4IjoxNSwidWlkIjoiY2hhcDEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkVwaWxvZ3VlIiwidXJsIjoiL3dvbS90amwvZXBpbG9ndWUvIiwiaWR4IjoxNiwidWlkIjoiZXBpbG9ndWUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfV19fSx7ImlkIjo1LCJiaWQiOiJ3b3MiLCJ0aXRsZSI6IldheSBvZiB0aGUgU2VydmFudCIsInVuaXRzIjp7InBhZ2UiOlt7InRpdGxlIjoiQWJvdXQgV2F5IG9mIHRoZSBTZXJ2YW50IiwidXJsIjoiL3dvbS9pbnRyby93b3MvIiwiaWR4IjowLCJ1aWQiOiJ3b3MiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRm9yZXdvcmQiLCJ1cmwiOiIvd29tL3dvcy9mb3Jld29yZC8iLCJpZHgiOjEsInVpZCI6ImZvcmV3b3JkIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlByZWZhY2UiLCJ1cmwiOiIvd29tL3dvcy9wcmVmYWNlLyIsImlkeCI6MiwidWlkIjoicHJlZmFjZSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJCb29rIE9uZSIsInVybCI6Ii93b20vd29zL2NoYXAwMS8iLCJpZHgiOjMsInVpZCI6ImNoYXAwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJCb29rIFR3byIsInVybCI6Ii93b20vd29zL2NoYXAwMi8iLCJpZHgiOjQsInVpZCI6ImNoYXAwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJCb29rIFRocmVlIiwidXJsIjoiL3dvbS93b3MvY2hhcDAzLyIsImlkeCI6NSwidWlkIjoiY2hhcDAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkJvb2sgRm91ciIsInVybCI6Ii93b20vd29zL2NoYXAwNC8iLCJpZHgiOjYsInVpZCI6ImNoYXAwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJBZnRlciBXb3JkcyIsInVybCI6Ii93b20vd29zL2FmdGVyd29yZHMvIiwiaWR4Ijo3LCJ1aWQiOiJhZnRlcndvcmRzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkVwaWxvZ3VlIiwidXJsIjoiL3dvbS93b3MvZXBpbG9nLyIsImlkeCI6OCwidWlkIjoiZXBpbG9nIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlByYXllciBvZiBSZW1lbWJyYW5jZSIsInVybCI6Ii93b20vd29zL3ByYXllci8iLCJpZHgiOjksInVpZCI6InByYXllciIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9XX19LHsiaWQiOjYsImJpZCI6ImVhcmx5IiwidGl0bGUiOiJUaGUgRWFybHkgWWVhcnMiLCJ1bml0cyI6eyJwYWdlIjpbeyJ0aXRsZSI6IkFib3V0IiwidXJsIjoiL3dvbS9pbnRyby9lYXJseS8iLCJpZHgiOjAsInVpZCI6ImVhcmx5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlRoZSBCbGVzc2luZyBvZiBGb3JnaXZlbmVzcyIsInVybCI6Ii93b20vZWFybHkvYmxlLyIsImlkeCI6MSwidWlkIjoiYmxlIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiQ2hvb3NlIHRvIFNlZSIsInVybCI6Ii93b20vZWFybHkvYzJzLyIsImlkeCI6MiwidWlkIjoiYzJzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJ0aXRsZSI6IkhlYXZlbiBvbiBFYXJ0aCIsInVybCI6Ii93b20vZWFybHkvaG9lLyIsImlkeCI6MywidWlkIjoiaG9lIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiSWdub3JhbmNlIGlzIEJsaXNzIiwidXJsIjoiL3dvbS9lYXJseS9pZ24vIiwiaWR4Ijo0LCJ1aWQiOiJpZ24iLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJNYXN0ZXJpbmcgQ29tbXVuaWNhdGlvbiIsInVybCI6Ii93b20vZWFybHkvY29tLyIsImlkeCI6NSwidWlkIjoiY29tIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiRGVjaWRlIHRvIGJlIENocmlzdCIsInVybCI6Ii93b20vZWFybHkvZGJjLyIsImlkeCI6NiwidWlkIjoiZGJjIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkRlYXRoIGFuZCBFYXJ0aCBDaGFuZ2VzIiwidXJsIjoiL3dvbS9lYXJseS9kdGgvIiwiaWR4Ijo3LCJ1aWQiOiJkdGgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJUaGUgRGl2aW5lIEZlbWluaW5lIiwidXJsIjoiL3dvbS9lYXJseS9mZW0vIiwiaWR4Ijo4LCJ1aWQiOiJmZW0iLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJHcmFjZSBhcyBSZWFsaXR5IiwidXJsIjoiL3dvbS9lYXJseS9nYXIvIiwiaWR4Ijo5LCJ1aWQiOiJnYXIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJIZWFsaW5nIiwidXJsIjoiL3dvbS9lYXJseS9oZWEvIiwiaWR4IjoxMCwidWlkIjoiaGVhIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlRoZSBIb2x5IEluc3RhbnQiLCJ1cmwiOiIvd29tL2Vhcmx5L2hvaS8iLCJpZHgiOjExLCJ1aWQiOiJob2kiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJUaGUgSG9seSBTcGlyaXQiLCJ1cmwiOiIvd29tL2Vhcmx5L2hzcC8iLCJpZHgiOjEyLCJ1aWQiOiJoc3AiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSm95IEkiLCJ1cmwiOiIvd29tL2Vhcmx5L2pveTEvIiwiaWR4IjoxMywidWlkIjoiam95MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJKb3kgSUkiLCJ1cmwiOiIvd29tL2Vhcmx5L2pveTIvIiwiaWR4IjoxNCwidWlkIjoiam95MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNZWFuaW5nIG9mIEFzY2Vuc2lvbiIsInVybCI6Ii93b20vZWFybHkvbW9hLyIsImlkeCI6MTUsInVpZCI6Im1vYSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IkJlY29tZSB0aGUgTWFzdGVyIG9mIFRpbWUiLCJ1cmwiOiIvd29tL2Vhcmx5L21vdC8iLCJpZHgiOjE2LCJ1aWQiOiJtb3QiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQXdha2VuaW5nIiwidXJsIjoiL3dvbS9lYXJseS93YWsvIiwiaWR4IjoxNywidWlkIjoid2FrIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IldhbGsgd2l0aCBNZSIsInVybCI6Ii93b20vZWFybHkvd2xrLyIsImlkeCI6MTgsInVpZCI6IndsayIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX1dfX0seyJpZCI6NywiYmlkIjoicXVlc3Rpb25zIiwidGl0bGUiOiJRdWVzdGlvbnMiLCJ1bml0cyI6eyJwYWdlIjpbeyJ0aXRsZSI6IkFib3V0IiwidXJsIjoiL3dvbS9pbnRyby9xdWVzdGlvbnMvIiwiaWR4IjowLCJ1aWQiOiJxdWVzdGlvbnMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiUHJvZm91bmQgVGltZSBvZiBZZWFyIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvYmxlcTEvIiwiaWR4IjoxLCJ1aWQiOiJibGVxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IkxpdmluZyBpbiBDb21tdW5pdHkiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9ibGVxMi8iLCJpZHgiOjIsInVpZCI6ImJsZXEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiQ28tY3JlYXRpbmcgQ2hyaXN0IiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvYmxlcTMvIiwiaWR4IjozLCJ1aWQiOiJibGVxMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IjEyLzEyIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvYmxlcTQvIiwiaWR4Ijo0LCJ1aWQiOiJibGVxNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IlN5bWJvbGlzbSBvZiBDcnVjaWZpeGlvbiIsInVybCI6Ii93b20vcXVlc3Rpb25zL2Myc3ExLyIsImlkeCI6NSwidWlkIjoiYzJzcTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJTdXJyZW5kZXIgdG8gdGhlIEhvbHkgU3Bpcml0IiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvYzJzcTIvIiwiaWR4Ijo2LCJ1aWQiOiJjMnNxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IkJyaW5naW5nIEhlYXZlbiB0byBFYXJ0aCIsInVybCI6Ii93b20vcXVlc3Rpb25zL2Myc3EzLyIsImlkeCI6NywidWlkIjoiYzJzcTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJEaWZmZXJlbmNlIGJldHdlZW4gSmVzaHVhIGFuZCBDaHJpc3QiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9jMnNxNC8iLCJpZHgiOjgsInVpZCI6ImMyc3E0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTm9uLXBoeXNpY2FsIFJlYWxpdHkiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9jMnNxNS8iLCJpZHgiOjksInVpZCI6ImMyc3E1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiRXhwbGFpbiBBQ0lNIFF1b3RlcyIsInVybCI6Ii93b20vcXVlc3Rpb25zL2NvbXExLyIsImlkeCI6MTAsInVpZCI6ImNvbXExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiUG9sYXJpemF0aW9uIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvZHRocTEvIiwiaWR4IjoxMSwidWlkIjoiZHRocTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJQaHlzaWNhbCBFYXJ0aCBDaGFuZ2VzIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvZHRocTIvIiwiaWR4IjoxMiwidWlkIjoiZHRocTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJSb2xlIG9mIFNoYW50aSBDaHJpc3RvIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvZHRocTMvIiwiaWR4IjoxMywidWlkIjoiZHRocTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJUaHJlZSBEYXlzIG9mIERhcmtuZXNzIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvZHRocTQvIiwiaWR4IjoxNCwidWlkIjoiZHRocTQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJEaWZmZXJlbmNlcyBCZXR3ZWVuIEplc2h1YSBhbmQgR2VybWFpbmUsIGV0YyIsInVybCI6Ii93b20vcXVlc3Rpb25zL2R0aHE1LyIsImlkeCI6MTUsInVpZCI6ImR0aHE1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiQmVpbmcgVW5hd2FyZSBvZiBEZWF0aCIsInVybCI6Ii93b20vcXVlc3Rpb25zL2R0aHE2LyIsImlkeCI6MTYsInVpZCI6ImR0aHE2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiVGhlIFR1bm5lbCBhdCBEZWF0aCIsInVybCI6Ii93b20vcXVlc3Rpb25zL2R0aHE3LyIsImlkeCI6MTcsInVpZCI6ImR0aHE3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiSXMgR29kIFNlbGYtQXdhcmUiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9kdGhxOC8iLCJpZHgiOjE4LCJ1aWQiOiJkdGhxOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IkEgRm9yY2UgT3V0c2lkZSBvZiBHb2QiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9kdGhxOS8iLCJpZHgiOjE5LCJ1aWQiOiJkdGhxOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IlNoYW50aSBDaHJpc3RvIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvZHRocTEwLyIsImlkeCI6MjAsInVpZCI6ImR0aHExMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ikplc2h1YSdzIE1vdGl2YXRpb24iLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9oMDFxMS8iLCJpZHgiOjIxLCJ1aWQiOiJoMDFxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IlNleHVhbGl0eSIsInVybCI6Ii93b20vcXVlc3Rpb25zL2gwMXEyLyIsImlkeCI6MjIsInVpZCI6ImgwMXEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJ0aXRsZSI6IlBoeXNpY2FsIEhlYWxpbmciLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9oMDFxMy8iLCJpZHgiOjIzLCJ1aWQiOiJoMDFxMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IjQwIERheXMgYW5kIE5pZ2h0cyIsInVybCI6Ii93b20vcXVlc3Rpb25zL2gwMnExLyIsImlkeCI6MjQsInVpZCI6ImgwMnExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJ0aXRsZSI6Ik1hcnkiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9oMDJxMi8iLCJpZHgiOjI1LCJ1aWQiOiJoMDJxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsidGl0bGUiOiJBQ0lNIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvaDA2cTEvIiwiaWR4IjoyNiwidWlkIjoiaDA2cTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7InByb2JsZW0iOiJ3ZSBkb24ndCBoYXZlIHRoaXMgYXVkaW8iLCJ0aXRsZSI6IlRoZSBEYXJrIFNpZGUiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9oMDZxMi8iLCJpZHgiOjI3LCJ1aWQiOiJoMDZxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJFZ28gSGFiaXRzIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvaDA2cTMvIiwiaWR4IjoyOCwidWlkIjoiaDA2cTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7InRpdGxlIjoiQmVpbmcgYSBTZXJ2YW50IG9mIEdvZCIsInVybCI6Ii93b20vcXVlc3Rpb25zL2gwN3ExLyIsImlkeCI6MjksInVpZCI6ImgwN3ExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJ0aXRsZSI6IlR3aW4gRmxhbWUgJiBTb3VsIE1hdGUiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9oMDdxMi8iLCJpZHgiOjMwLCJ1aWQiOiJoMDdxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsidGl0bGUiOiJVbmNvbnNjaW91cyBCbG9ja3MiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9oMDdxMy8iLCJpZHgiOjMxLCJ1aWQiOiJoMDdxMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsidGl0bGUiOiJEaXNjaXBsaW5lIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvaDA3cTQvIiwiaWR4IjozMiwidWlkIjoiaDA3cTQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7InRpdGxlIjoiQ2hyaXN0aWFuIFBlbnRlY29zdGFsIGFuZCBOZXcgQWdlIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvaDA3cTUvIiwiaWR4IjozMywidWlkIjoiaDA3cTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7InRpdGxlIjoiSG9seSBTcGlyaXQgYW5kIE92ZXJzb3VsIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvaDA4cTEvIiwiaWR4IjozNCwidWlkIjoiaDA4cTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7InRpdGxlIjoiSGVhbGluZyIsInVybCI6Ii93b20vcXVlc3Rpb25zL2gwOHEyLyIsImlkeCI6MzUsInVpZCI6ImgwOHEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJwcm9ibGVtIjoiZG9uJ3QgaGF2ZSBhdWRpbyIsInRpdGxlIjoiU2VsZi1mb3JnaXZlbmVzcyIsInVybCI6Ii93b20vcXVlc3Rpb25zL2gwOXExLyIsImlkeCI6MzYsInVpZCI6ImgwOXExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkFzdHJvbG9neSIsInVybCI6Ii93b20vcXVlc3Rpb25zL2gxMHExLyIsImlkeCI6MzcsInVpZCI6ImgxMHExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJ0aXRsZSI6IlN5bWJvbG9neSBvZiB0aGUgQ3Jvc3MiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9oMTBxMi8iLCJpZHgiOjM4LCJ1aWQiOiJoMTBxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsidGl0bGUiOiJJbml0aWF0aW9ucyIsInVybCI6Ii93b20vcXVlc3Rpb25zL2gxMHEzLyIsImlkeCI6MzksInVpZCI6ImgxMHEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJ0aXRsZSI6IlJlc3BvbnNpYmlsaXR5IHRvIHRoZSBQb29yIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvaDExcTEvIiwiaWR4Ijo0MCwidWlkIjoiaDExcTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJIZWxwaW5nIHRoZSBQb29yIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvaDExcTIvIiwiaWR4Ijo0MSwidWlkIjoiaDExcTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7InRpdGxlIjoiVGVhY2hpbmcgQ2hpbGRyZW4iLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9oMTFxMy8iLCJpZHgiOjQyLCJ1aWQiOiJoMTFxMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsidGl0bGUiOiJXaHkgaGFzdCBUaG91IEZvcnNha2VuIE1lIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvaDEycTEvIiwiaWR4Ijo0MywidWlkIjoiaDEycTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJNYXJ5IE1hZ2RhbGVuZSIsInVybCI6Ii93b20vcXVlc3Rpb25zL2gxMnEyLyIsImlkeCI6NDQsInVpZCI6ImgxMnEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJ0aXRsZSI6IlN0LiBHZXJtYWluIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvaDEycTMvIiwiaWR4Ijo0NSwidWlkIjoiaDEycTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7InRpdGxlIjoiVW5jbGVhciBRdWVzdGlvbnMiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9ob2VxMS8iLCJpZHgiOjQ2LCJ1aWQiOiJob2VxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IkRldmVsb3BpbmcgQ2xhaXJ0eSIsInVybCI6Ii93b20vcXVlc3Rpb25zL2hvZXEyLyIsImlkeCI6NDcsInVpZCI6ImhvZXEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiTGl2aW5nIGFzIENocmlzdCIsInVybCI6Ii93b20vcXVlc3Rpb25zL2hvZXEzLyIsImlkeCI6NDgsInVpZCI6ImhvZXEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiU2hhbnRpIENocmlzdG8gTWVtYmVyc2hpcCIsInVybCI6Ii93b20vcXVlc3Rpb25zL2hvZXE0LyIsImlkeCI6NDksInVpZCI6ImhvZXE0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiRGVmaW5pdGlvbiBvZiBLbm93aW5nIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvazAycTEvIiwiaWR4Ijo1MCwidWlkIjoiazAycTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJHbGVlIENsdWJzIGFuZCBBdHRhY2siLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9rMDJxMi8iLCJpZHgiOjUxLCJ1aWQiOiJrMDJxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IkxvdmUgb2YgU2VsZiBhbmQgT3RoZXJzIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvazAzcTEvIiwiaWR4Ijo1MiwidWlkIjoiazAzcTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJHdWlkYW5jZSBvZiB0aGUgSG9seSBTcGlyaXQiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9rMDNxMi8iLCJpZHgiOjUzLCJ1aWQiOiJrMDNxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IkdyZWF0IFJheXMgb2YgTGlnaHQiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9rMDRxMS8iLCJpZHgiOjU0LCJ1aWQiOiJrMDRxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IkRpZmZlcmVuY2VzIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvazA0cTIvIiwiaWR4Ijo1NSwidWlkIjoiazA0cTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJKb3kgYW5kIFBsZWFzdXJlIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvazA2cTEvIiwiaWR4Ijo1NiwidWlkIjoiazA2cTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJTaGFudGkgQ2hyaXN0byIsInVybCI6Ii93b20vcXVlc3Rpb25zL2swNnEyLyIsImlkeCI6NTcsInVpZCI6ImswNnEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiQmlibGUgQ29kZXMiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy9rMTBxMS8iLCJpZHgiOjU4LCJ1aWQiOiJrMTBxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IkZyZWUgV2lsbCBvZiBDaGlsZHJlbiIsInVybCI6Ii93b20vcXVlc3Rpb25zL2sxMHEyLyIsImlkeCI6NTksInVpZCI6ImsxMHEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiT3RoZXIgTWFzdGVycyIsInVybCI6Ii93b20vcXVlc3Rpb25zL3QwMXExLyIsImlkeCI6NjAsInVpZCI6InQwMXExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiSnVkZ21lbnQgYW5kIERpc2Nlcm5tZW50IiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvdDAxcTIvIiwiaWR4Ijo2MSwidWlkIjoidDAxcTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJWdWxuZXJhYmlsaXR5IGFuZCBJbnZ1bG5lcmFiaWxpdHkiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy90MDZxMS8iLCJpZHgiOjYyLCJ1aWQiOiJ0MDZxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6Ik1lc3NhZ2Ugb2YgdGhlIENyb3NzIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvdDA2cTIvIiwiaWR4Ijo2MywidWlkIjoidDA2cTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJFbmxpZ2h0ZW5tZW50IiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvdDA3cTEvIiwiaWR4Ijo2NCwidWlkIjoidDA3cTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJHdWlkYW5jZSIsInVybCI6Ii93b20vcXVlc3Rpb25zL3QwOXExLyIsImlkeCI6NjUsInVpZCI6InQwOXExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiQWxsIEV2ZW50cyBhcmUgTmV1dHJhbCIsInVybCI6Ii93b20vcXVlc3Rpb25zL3QwOXEyLyIsImlkeCI6NjYsInVpZCI6InQwOXEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiQ2hyaXN0IENvbnNjaW91c25lc3MiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy90MDlxMy8iLCJpZHgiOjY3LCJ1aWQiOiJ0MDlxMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IkFzY2VuZGluZyBhbmQgRGVzY2VuZGluZyBDdXJyZW50cyIsInVybCI6Ii93b20vcXVlc3Rpb25zL3QwOXE0LyIsImlkeCI6NjgsInVpZCI6InQwOXE0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7InRpdGxlIjoiVW5pcXVlIFB1cnBvc2UiLCJ1cmwiOiIvd29tL3F1ZXN0aW9ucy90MTFxMS8iLCJpZHgiOjY5LCJ1aWQiOiJ0MTFxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJ0aXRsZSI6IlRoZSBMaW5lYWdlIiwidXJsIjoiL3dvbS9xdWVzdGlvbnMvdDExcTIvIiwiaWR4Ijo3MCwidWlkIjoidDExcTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsidGl0bGUiOiJTcGVjaWFsbmVzcywgSG9saW5lc3MgYW5kIFNleHVhbGl0eSIsInVybCI6Ii93b20vcXVlc3Rpb25zL3QxMXEzLyIsImlkeCI6NzEsInVpZCI6InQxMXEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfV19fV19LHsiaWQiOjIsInRpdGxlIjoiTm9ydGh3ZXN0IEZvdW5kYXRpb24gZm9yIEFDSU0iLCJzaWQiOiJud2ZmYWNpbSIsImJvb2tzIjpbeyJpZCI6MSwiYmlkIjoieWFhIiwidGl0bGUiOiJZb3UgQXJlIHRoZSBBbnN3ZXIiLCJ1bml0cyI6eyJwYWdlIjpbeyJ0aXRsZSI6IkludHJvZHVjdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS9pbnRyby95YWEvIiwiaWR4IjowLCJ1aWQiOiJ5YWEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQWNrbm93bGVkZ21lbnRzIiwidXJsIjoiL253ZmZhY2ltL3lhYS9hY2tub3dsZWRnbWVudHMvIiwiaWR4IjoxLCJ1aWQiOiJhY2tub3dsZWRnbWVudHMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRm9yZXdvcmQiLCJ1cmwiOiIvbndmZmFjaW0veWFhL2ZvcmV3b3JkLyIsImlkeCI6MiwidWlkIjoiZm9yZXdvcmQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDcsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAyMDc4Mi8iLCJpZHgiOjMsInVpZCI6IjAyMDc4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJGZWIgOCwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIwODgyLyIsImlkeCI6NCwidWlkIjoiMDIwODgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiA5LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMjA5ODIvIiwiaWR4Ijo1LCJ1aWQiOiIwMjA5ODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDEwLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMjEwODIvIiwiaWR4Ijo2LCJ1aWQiOiIwMjEwODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDExLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMjExODJhLyIsImlkeCI6NywidWlkIjoiMDIxMTgyYSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJGZWIgMTEsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAyMTE4MmIvIiwiaWR4Ijo4LCJ1aWQiOiIwMjExODJiIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAxMiwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIxMjgyLyIsImlkeCI6OSwidWlkIjoiMDIxMjgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAxMywgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIxMzgyLyIsImlkeCI6MTAsInVpZCI6IjAyMTM4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJGZWIgMTQsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAyMTQ4Mi8iLCJpZHgiOjExLCJ1aWQiOiIwMjE0ODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDE2LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMjE2ODIvIiwiaWR4IjoxMiwidWlkIjoiMDIxNjgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAxNywgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIxNzgyLyIsImlkeCI6MTMsInVpZCI6IjAyMTc4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJGZWIgMTgsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAyMTg4MmEvIiwiaWR4IjoxNCwidWlkIjoiMDIxODgyYSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJGZWIgMTgsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAyMTg4MmIvIiwiaWR4IjoxNSwidWlkIjoiMDIxODgyYiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJGZWIgMTgsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAyMTg4MmMvIiwiaWR4IjoxNiwidWlkIjoiMDIxODgyYyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJGZWIgMTksIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAyMTk4Mi8iLCJpZHgiOjE3LCJ1aWQiOiIwMjE5ODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDIwLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMjIwODIvIiwiaWR4IjoxOCwidWlkIjoiMDIyMDgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAyMSwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIyMTgyYS8iLCJpZHgiOjE5LCJ1aWQiOiIwMjIxODJhIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAyMSwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIyMTgyYi8iLCJpZHgiOjIwLCJ1aWQiOiIwMjIxODJiIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAyMywgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIyMzgyYS8iLCJpZHgiOjIxLCJ1aWQiOiIwMjIzODJhIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAyMywgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIyMzgyYi8iLCJpZHgiOjIyLCJ1aWQiOiIwMjIzODJiIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAyMywgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIyMzgyYy8iLCJpZHgiOjIzLCJ1aWQiOiIwMjIzODJjIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAyNCwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIyNDgyLyIsImlkeCI6MjQsInVpZCI6IjAyMjQ4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJGZWIgMjUsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAyMjU4Mi8iLCJpZHgiOjI1LCJ1aWQiOiIwMjI1ODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDI2LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMjI2ODJhLyIsImlkeCI6MjYsInVpZCI6IjAyMjY4MmEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDI2LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMjI2ODJiLyIsImlkeCI6MjcsInVpZCI6IjAyMjY4MmIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDI2LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMjI2ODJjLyIsImlkeCI6MjgsInVpZCI6IjAyMjY4MmMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDI3LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMjI3ODIvIiwiaWR4IjoyOSwidWlkIjoiMDIyNzgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAyOCwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDIyODgyLyIsImlkeCI6MzAsInVpZCI6IjAyMjg4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgMSwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDMwMTgyYS8iLCJpZHgiOjMxLCJ1aWQiOiIwMzAxODJhIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1hciAxLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMzAxODJiLyIsImlkeCI6MzIsInVpZCI6IjAzMDE4MmIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDIsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAzMDI4Mi8iLCJpZHgiOjMzLCJ1aWQiOiIwMzAyODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDMsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAzMDM4Mi8iLCJpZHgiOjM0LCJ1aWQiOiIwMzAzODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDQsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAzMDQ4MmEvIiwiaWR4IjozNSwidWlkIjoiMDMwNDgyYSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgNCwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDMwNDgyYi8iLCJpZHgiOjM2LCJ1aWQiOiIwMzA0ODJiIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1hciA1LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMzA1ODJhLyIsImlkeCI6MzcsInVpZCI6IjAzMDU4MmEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDUsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAzMDU4MmIvIiwiaWR4IjozOCwidWlkIjoiMDMwNTgyYiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgNiwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDMwNjgyYS8iLCJpZHgiOjM5LCJ1aWQiOiIwMzA2ODJhIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1hciA2LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMzA2ODJiLyIsImlkeCI6NDAsInVpZCI6IjAzMDY4MmIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDYsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAzMDY4MmMvIiwiaWR4Ijo0MSwidWlkIjoiMDMwNjgyYyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgNiwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDMwNjgyZC8iLCJpZHgiOjQyLCJ1aWQiOiIwMzA2ODJkIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1hciA2LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMzA2ODJlLyIsImlkeCI6NDMsInVpZCI6IjAzMDY4MmUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDgsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAzMDg4Mi8iLCJpZHgiOjQ0LCJ1aWQiOiIwMzA4ODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDksIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAzMDk4Mi8iLCJpZHgiOjQ1LCJ1aWQiOiIwMzA5ODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDEwLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMzEwODJhLyIsImlkeCI6NDYsInVpZCI6IjAzMTA4MmEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDEwLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMzEwODJiLyIsImlkeCI6NDcsInVpZCI6IjAzMTA4MmIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDEwLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMzEwODJjLyIsImlkeCI6NDgsInVpZCI6IjAzMTA4MmMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDExLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMzExODIvIiwiaWR4Ijo0OSwidWlkIjoiMDMxMTgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1hciAxMywgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDMxMzgyLyIsImlkeCI6NTAsInVpZCI6IjAzMTM4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgMTUsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAzMTU4Mi8iLCJpZHgiOjUxLCJ1aWQiOiIwMzE1ODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDE5LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wMzE5ODIvIiwiaWR4Ijo1MiwidWlkIjoiMDMxOTgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1hciAyOSwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDMyOTgyLyIsImlkeCI6NTMsInVpZCI6IjAzMjk4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgMzAsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzAzMzA4Mi8iLCJpZHgiOjU0LCJ1aWQiOiIwMzMwODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQXByIDI3LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wNDI3ODIvIiwiaWR4Ijo1NSwidWlkIjoiMDQyNzgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkFwciAyOCwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDQyODgyLyIsImlkeCI6NTYsInVpZCI6IjA0Mjg4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJBcHIgMjksIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzA0Mjk4Mi8iLCJpZHgiOjU3LCJ1aWQiOiIwNDI5ODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQXByIDMwLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wNDMwODIvIiwiaWR4Ijo1OCwidWlkIjoiMDQzMDgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1heSAxLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wNTAxODIvIiwiaWR4Ijo1OSwidWlkIjoiMDUwMTgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1heSAyLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wNTAyODIvIiwiaWR4Ijo2MCwidWlkIjoiMDUwMjgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1heSAzLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wNTAzODIvIiwiaWR4Ijo2MSwidWlkIjoiMDUwMzgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1heSA3LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wNTA3ODIvIiwiaWR4Ijo2MiwidWlkIjoiMDUwNzgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1heSA5LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wNTA5ODIvIiwiaWR4Ijo2MywidWlkIjoiMDUwOTgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1heSAxMCwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDUxMDgyYS8iLCJpZHgiOjY0LCJ1aWQiOiIwNTEwODJhIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1heSAxMCwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDUxMDgyYi8iLCJpZHgiOjY1LCJ1aWQiOiIwNTEwODJiIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1heSAxMCwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDUxMDgyYy8iLCJpZHgiOjY2LCJ1aWQiOiIwNTEwODJjIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1heSAxMSwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDUxMTgyLyIsImlkeCI6NjcsInVpZCI6IjA1MTE4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXkgMTUsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzA1MTU4Mi8iLCJpZHgiOjY4LCJ1aWQiOiIwNTE1ODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWF5IDE3LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wNTE3ODIvIiwiaWR4Ijo2OSwidWlkIjoiMDUxNzgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1heSAyOCwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDUyODgyLyIsImlkeCI6NzAsInVpZCI6IjA1Mjg4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXkgMzAsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzA1MzA4Mi8iLCJpZHgiOjcxLCJ1aWQiOiIwNTMwODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSnVuIDMsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzA2MDM4Mi8iLCJpZHgiOjcyLCJ1aWQiOiIwNjAzODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSnVuIDEwLCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wNjEwODIvIiwiaWR4Ijo3MywidWlkIjoiMDYxMDgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ikp1biAxMiwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDYxMjgyLyIsImlkeCI6NzQsInVpZCI6IjA2MTI4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJKdW4gMTQsIDE5ODIiLCJ1cmwiOiIvbndmZmFjaW0veWFhLzA2MTQ4Mi8iLCJpZHgiOjc1LCJ1aWQiOiIwNjE0ODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSnVuIDE5LCAxOTgyIiwidXJsIjoiL253ZmZhY2ltL3lhYS8wNjE5ODIvIiwiaWR4Ijo3NiwidWlkIjoiMDYxOTgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ikp1biAyMSwgMTk4MiIsInVybCI6Ii9ud2ZmYWNpbS95YWEvMDYyMTgyLyIsImlkeCI6NzcsInVpZCI6IjA2MjE4MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJBZnRlcndvcmQiLCJ1cmwiOiIvbndmZmFjaW0veWFhL2FmdGVyd29yZC8iLCJpZHgiOjc4LCJ1aWQiOiJhZnRlcndvcmQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfV19fSx7ImlkIjoyLCJiaWQiOiJncmFkIiwidGl0bGUiOiJHcmFkdWF0aW9uIiwidW5pdHMiOnsicGFnZSI6W3sidGl0bGUiOiJJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvbndmZmFjaW0vaW50cm8vZ3JhZC8iLCJpZHgiOjAsInVpZCI6ImdyYWQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQXV0aG9yJ3MgTm90ZSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMDAwMDIvIiwiaWR4IjoxLCJ1aWQiOiJnMDAwMDAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZvcmV3b3JkIiwidXJsIjoiL253ZmZhY2ltL2dyYWQvZzAwMDAwMy8iLCJpZHgiOjIsInVpZCI6ImcwMDAwMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSmFuIDQsIDE5OTEiLCJ1cmwiOiIvbndmZmFjaW0vZ3JhZC9nMDEwNDkxLyIsImlkeCI6MywidWlkIjoiZzAxMDQ5MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJKYW4gNSwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMTA1OTEvIiwiaWR4Ijo0LCJ1aWQiOiJnMDEwNTkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkphbiAxNCwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMTE0OTEvIiwiaWR4Ijo1LCJ1aWQiOiJnMDExNDkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkphbiAxNSwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMTE1OTEvIiwiaWR4Ijo2LCJ1aWQiOiJnMDExNTkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkphbiAxNiwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMTE2OTEvIiwiaWR4Ijo3LCJ1aWQiOiJnMDExNjkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkphbiAxOCwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMTE4OTEvIiwiaWR4Ijo4LCJ1aWQiOiJnMDExODkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkphbiAyMCwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMTIwOTEvIiwiaWR4Ijo5LCJ1aWQiOiJnMDEyMDkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkphbiAyNSwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMTI1OTEvIiwiaWR4IjoxMCwidWlkIjoiZzAxMjU5MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJKYW4gMjcsIDE5OTEiLCJ1cmwiOiIvbndmZmFjaW0vZ3JhZC9nMDEyNzkxLyIsImlkeCI6MTEsInVpZCI6ImcwMTI3OTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDIsIDE5OTEiLCJ1cmwiOiIvbndmZmFjaW0vZ3JhZC9nMDIwMjkxLyIsImlkeCI6MTIsInVpZCI6ImcwMjAyOTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDUsIDE5OTEiLCJ1cmwiOiIvbndmZmFjaW0vZ3JhZC9nMDIwNTkxLyIsImlkeCI6MTMsInVpZCI6ImcwMjA1OTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDYsIDE5OTEiLCJ1cmwiOiIvbndmZmFjaW0vZ3JhZC9nMDIwNjkxLyIsImlkeCI6MTQsInVpZCI6ImcwMjA2OTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDEyLCAxOTkxIiwidXJsIjoiL253ZmZhY2ltL2dyYWQvZzAyMTI5MS8iLCJpZHgiOjE1LCJ1aWQiOiJnMDIxMjkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAxMywgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMjEzOTEvIiwiaWR4IjoxNiwidWlkIjoiZzAyMTM5MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJGZWIgMTQsIDE5OTEiLCJ1cmwiOiIvbndmZmFjaW0vZ3JhZC9nMDIxNDkxLyIsImlkeCI6MTcsInVpZCI6ImcwMjE0OTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiRmViIDIwLCAxOTkxIiwidXJsIjoiL253ZmZhY2ltL2dyYWQvZzAyMjA5MS8iLCJpZHgiOjE4LCJ1aWQiOiJnMDIyMDkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZlYiAyNSwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMjI1OTEvIiwiaWR4IjoxOSwidWlkIjoiZzAyMjU5MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgMiwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMzAyOTEvIiwiaWR4IjoyMCwidWlkIjoiZzAzMDI5MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgOCwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMzA4OTEvIiwiaWR4IjoyMSwidWlkIjoiZzAzMDg5MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgMTQsIDE5OTEiLCJ1cmwiOiIvbndmZmFjaW0vZ3JhZC9nMDMxNDkxLyIsImlkeCI6MjIsInVpZCI6ImcwMzE0OTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDE5LCAxOTkxIiwidXJsIjoiL253ZmZhY2ltL2dyYWQvZzAzMTk5MS8iLCJpZHgiOjIzLCJ1aWQiOiJnMDMxOTkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1hciAyMCwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMzIwOTEvIiwiaWR4IjoyNCwidWlkIjoiZzAzMjA5MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgMjEsIDE5OTEiLCJ1cmwiOiIvbndmZmFjaW0vZ3JhZC9nMDMyMTkxLyIsImlkeCI6MjUsInVpZCI6ImcwMzIxOTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTWFyIDIyLCAxOTkxIiwidXJsIjoiL253ZmZhY2ltL2dyYWQvZzAzMjI5MS8iLCJpZHgiOjI2LCJ1aWQiOiJnMDMyMjkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6Ik1hciAyNSwgMTk5MSIsInVybCI6Ii9ud2ZmYWNpbS9ncmFkL2cwMzI1OTEvIiwiaWR4IjoyNywidWlkIjoiZzAzMjU5MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJNYXIgMjksIDE5OTEiLCJ1cmwiOiIvbndmZmFjaW0vZ3JhZC9nMDMyOTkxLyIsImlkeCI6MjgsInVpZCI6ImcwMzI5OTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfV19fSx7ImlkIjozLCJiaWQiOiIyMDAyIiwidGl0bGUiOiJBQ0lNIFN0dWR5IEdyb3VwIC0gMjAwMiIsInVuaXRzIjp7InBhZ2UiOlt7InVybCI6Ii9ud2ZmYWNpbS9pbnRyby8yMDAyLyIsImlkeCI6MCwidGl0bGUiOiJBYm91dCAyMDAyIFRyYW5zY3JpcHRzIiwidWlkIjoiMjAwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsiZGVzYyI6IlQzMS5JSSBXYWxraW5nIHdpdGggQ2hyaXN0IiwidXJsIjoiL253ZmZhY2ltLzIwMDIvMDYxMjAyLyIsImlkeCI6MSwidGl0bGUiOiJKdW4gMTIsIDIwMDIiLCJ1aWQiOiIwNjEyMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQzMS5WSUlJIENob29zZSBPbmNlIEFnYWluIiwidXJsIjoiL253ZmZhY2ltLzIwMDIvMDczMTAyLyIsImlkeCI6MiwidGl0bGUiOiJKdWwgMzEsIDIwMDIiLCJ1aWQiOiIwNzMxMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxLkluIEludHJvZHVjdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAyLzA4MDcwMi8iLCJpZHgiOjMsInRpdGxlIjoiQXVnIDcsIDIwMDIiLCJ1aWQiOiIwODA3MDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IipObyB0cmFuc2NyaXB0IGF2YWlsYWJsZSBmb3IgdGhpcyBzZXNzaW9uKiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAyLzA4MTQwMi8iLCJpZHgiOjQsInRpdGxlIjoiQXVnIDE0LCAyMDAyIiwidWlkIjoiMDgxNDAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJkZXNjIjoiVDEuSSBQcmluY2lwbGVzIG9mIE1pcmFjbGVzLCBQcmluY2lwbGUgMzMiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMi8wODI4MDIvIiwiaWR4Ijo1LCJ0aXRsZSI6IkF1ZyAyOCwgMjAwMiIsInVpZCI6IjA4MjgwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEuSSBQcmluY2lwbGVzIG9mIE1pcmFjbGVzLCBQcmluY2lwbGUgNDIiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMi8wOTA0MDIvIiwiaWR4Ijo2LCJ0aXRsZSI6IlNlcCA0LCAyMDAyIiwidWlkIjoiMDkwNDAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMS5JIFByaW5jaXBsZXMgb2YgTWlyYWNsZXMsIFByaW5jaXBsZSA0NyIsInVybCI6Ii9ud2ZmYWNpbS8yMDAyLzA5MTEwMi8iLCJpZHgiOjcsInRpdGxlIjoiU2VwIDExLCAyMDAyIiwidWlkIjoiMDkxMTAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMS5JSSBSZXZlbGF0aW9uLCBUaW1lIGFuZCBNaXJhY2xlcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDAyLzA5MTgwMi8iLCJpZHgiOjgsInRpdGxlIjoiU2VwIDE4LCAyMDAyIiwidWlkIjoiMDkxODAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMS5JSUkgQXRvbmVtZW50IGFuZCBNaXJhY2xlcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDAyLzA5MjUwMi8iLCJpZHgiOjksInRpdGxlIjoiU2VwIDI1LCAyMDAyIiwidWlkIjoiMDkyNTAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMS5JViBUaGUgRXNjYXBlIGZyb20gRGFya25lc3MiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMi8xMDAyMDIvIiwiaWR4IjoxMCwidGl0bGUiOiJPY3QgMiwgMjAwMiIsInVpZCI6IjEwMDIwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEuViBXaG9sZW5lc3MgYW5kIFNwaXJpdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDAyLzEwMTAwMi8iLCJpZHgiOjExLCJ0aXRsZSI6Ik9jdCAxMCwgMjAwMiIsInVpZCI6IjEwMTAwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEuVkkgVGhlIElsbHVzaW9uIG9mIE5lZWRzIiwidXJsIjoiL253ZmZhY2ltLzIwMDIvMTAxNzAyLyIsImlkeCI6MTIsInRpdGxlIjoiT2N0IDE3LCAyMDAyIiwidWlkIjoiMTAxNzAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMS5WSUkgRGlzdG9ydGlvbnMgb2YgTWlyYWNsZSBJbXB1bHNlcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDAyLzEwMjQwMi8iLCJpZHgiOjEzLCJ0aXRsZSI6Ik9jdCAyNCwgMjAwMiIsInVpZCI6IjEwMjQwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDIuSSBUaGUgT3JpZ2lucyBvZiBTZXBhcmF0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDIvMTAzMTAyLyIsImlkeCI6MTQsInRpdGxlIjoiT2N0IDMxLCAyMDAyIiwidWlkIjoiMTAzMTAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMi5JSSBUaGUgQXRvbmVtZW50IGFzIERlZmVuc2UiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMi8xMTA3MDIvIiwiaWR4IjoxNSwidGl0bGUiOiJOb3YgNywgMjAwMiIsInVpZCI6IjExMDcwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAyLzExMjEwMi8iLCJpZHgiOjE2LCJ0aXRsZSI6Ik5vdiAyMSwgMjAwMiIsInVpZCI6IjExMjEwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDIuSUlJIFRoZSBBbHRlciBvZiBHb2QiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMi8xMjA1MDIvIiwiaWR4IjoxNywidGl0bGUiOiJEZWMgNSwgMjAwMiIsInVpZCI6IjEyMDUwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDIuSVYgSGVhbGluZyBhcyBSZWxlYXNlIGZyb20gRmVhciIsInVybCI6Ii9ud2ZmYWNpbS8yMDAyLzEyMTIwMi8iLCJpZHgiOjE4LCJ0aXRsZSI6IkRlYyAxMiwgMjAwMiIsInVpZCI6IjEyMTIwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDIuViBUaGUgRnVuY3Rpb24gb2YgdGhlIE1pcmFjbGUgV29ya2VyIiwidXJsIjoiL253ZmZhY2ltLzIwMDIvMTIxOTAyLyIsImlkeCI6MTksInRpdGxlIjoiRGVjIDE5LCAyMDAyIiwidWlkIjoiMTIxOTAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfV19fSx7ImlkIjo0LCJiaWQiOiIyMDAzIiwidGl0bGUiOiJBQ0lNIFN0dWR5IEdyb3VwIC0gMjAwMyIsInVuaXRzIjp7InBhZ2UiOlt7InVybCI6Ii9ud2ZmYWNpbS9pbnRyby8yMDAzLyIsImlkeCI6MCwidGl0bGUiOiJBYm91dCAyMDAzIFRyYW5zY3JpcHRzIiwidWlkIjoiMjAwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsiZGVzYyI6IlQyLlYgVGhlIEZ1bmN0aW9uIG9mIHRoZSBNaXJhY2xlIFdvcmtlciIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzAxMDIwMy8iLCJpZHgiOjEsInRpdGxlIjoiSmFuIDIsIDIwMDMiLCJ1aWQiOiIwMTAyMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQyLlZJIEZlYXIgYW5kIENvbmZsaWN0IiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDEwOTAzLyIsImlkeCI6MiwidGl0bGUiOiJKYW4gOSwgMjAwMyIsInVpZCI6IjAxMDkwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDIuVkkgRmVhciBhbmQgQ29uZmxpY3QiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wMTE2MDMvIiwiaWR4IjozLCJ0aXRsZSI6IkphbiAxNiwgMjAwMyIsInVpZCI6IjAxMTYwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wMTIzMDMvIiwiaWR4Ijo0LCJ0aXRsZSI6IkphbiAyMywgMjAwMyIsInVpZCI6IjAxMjMwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsiZGVzYyI6IlQyLlZJSSBDYXVzZSBhbmQgRWZmZWN0IiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDIwNjAzLyIsImlkeCI6NSwidGl0bGUiOiJGZWIgNiwgMjAwMyIsInVpZCI6IjAyMDYwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wMjEzMDMvIiwiaWR4Ijo2LCJ0aXRsZSI6IkZlYiAxMywgMjAwMyIsInVpZCI6IjAyMTMwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQyLlZJSSBDYXVzZSBhbmQgRWZmZWN0IiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDIyMDAzLyIsImlkeCI6NywidGl0bGUiOiJGZWIgMjAsIDIwMDMiLCJ1aWQiOiIwMjIwMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMi5WSUkgQ2F1c2UgYW5kIEVmZmVjdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzAyMjcwMy8iLCJpZHgiOjgsInRpdGxlIjoiRmViIDI3LCAyMDAzIiwidWlkIjoiMDIyNzAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDIuVklJSSBUaGUgTWVhbmluZyBvZiB0aGUgTGFzdCBKdWRnbWVudCIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzAzMDYwMy8iLCJpZHgiOjksInRpdGxlIjoiTWFyIDYsIDIwMDMiLCJ1aWQiOiIwMzA2MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMi5WLkEgU3BlY2lhbCBQcmluY2lwbGVzIGZvciBNaXJhY2xlIFdvcmtlcnMiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wMzEzMDMvIiwiaWR4IjoxMCwidGl0bGUiOiJNYXIgMTMsIDIwMDMiLCJ1aWQiOiIwMzEzMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMy5JIEF0b25lbWVudCB3aXRob3V0IFNhY3JpZmljZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzAzMjAwMy8iLCJpZHgiOjExLCJ0aXRsZSI6Ik1hciAyMCwgMjAwMyIsInVpZCI6IjAzMjAwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQzLkkgQXRvbmVtZW50IHdpdGhvdXQgU2FjcmlmaWNlIiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDMyNzAzLyIsImlkeCI6MTIsInRpdGxlIjoiTWFyIDI3LCAyMDAzIiwidWlkIjoiMDMyNzAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDMuSSBBdG9uZW1lbnQgd2l0aG91dCBTYWNyaWZpY2UiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wNDAzMDMvIiwiaWR4IjoxMywidGl0bGUiOiJBcHIgMywgMjAwMyIsInVpZCI6IjA0MDMwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQzLklJIE1pcmFjbGVzIGFzIFRydWUgUGVyY2VwdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzA0MTAwMy8iLCJpZHgiOjE0LCJ0aXRsZSI6IkFwciAxMCwgMjAwMyIsInVpZCI6IjA0MTAwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQzLklJIE1pcmFjbGVzIGFzIFRydWUgUGVyY2VwdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzA0MjQwMy8iLCJpZHgiOjE1LCJ0aXRsZSI6IkFwciAyNCwgMjAwMyIsInVpZCI6IjA0MjQwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQzLklJSSBQZXJjZXB0aW9uIHZzIEtub3dsZWRnZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzA1MDEwMy8iLCJpZHgiOjE2LCJ0aXRsZSI6Ik1heSAxLCAyMDAzIiwidWlkIjoiMDUwMTAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDMuSVYgRXJyb3IgYW5kIHRoZSBFZ28iLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wNTExMDMvIiwiaWR4IjoxNywidGl0bGUiOiJNYXkgMTEsIDIwMDMiLCJ1aWQiOiIwNTExMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMy5JViBFcnJvciBhbmQgdGhlIEVnbyIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzA1MTgwMy8iLCJpZHgiOjE4LCJ0aXRsZSI6Ik1heSAxOCwgMjAwMyIsInVpZCI6IjA1MTgwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQzLklWIEVycm9yIGFuZCB0aGUgRWdvIiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDUyNTAzLyIsImlkeCI6MTksInRpdGxlIjoiTWF5IDI1LCAyMDAzIiwidWlkIjoiMDUyNTAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDMuSVYgRXJyb3IgYW5kIHRoZSBFZ28iLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wNjAxMDMvIiwiaWR4IjoyMCwidGl0bGUiOiJKdW4gMSwgMjAwMyIsInVpZCI6IjA2MDEwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQzLlYgQmV5b25kIFBlcmVjZXB0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDYwODAzLyIsImlkeCI6MjEsInRpdGxlIjoiSnVuIDgsIDIwMDMiLCJ1aWQiOiIwNjA4MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMy5WSSBKdWRnZW1lbnQgYW5kIHRoZSBBdXRob3JpdHkgUHJvYmxlbSIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzA2MTUwMy8iLCJpZHgiOjIyLCJ0aXRsZSI6Ikp1biAxNSwgMjAwMyIsInVpZCI6IjA2MTUwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQzLlZJIEp1ZGdlbWVudCBhbmQgdGhlIEF1dGhvcml0eSBQcm9ibGVtIiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDYyMjAzLyIsImlkeCI6MjMsInRpdGxlIjoiSnVuIDIyLCAyMDAzIiwidWlkIjoiMDYyMjAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDQuSW4gSW50cm9kdWN0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDYyOTAzLyIsImlkeCI6MjQsInRpdGxlIjoiSnVuIDI5LCAyMDAzIiwidWlkIjoiMDYyOTAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiPHNtYWxsPkJlZ2luIHJlYWRpbmcgZnJvbSB0aGUgU3BhcmtseSBFZGl0aW9uPC9zbWFsbD48YnIvPlQ0LjEgUmlnaHQgVGVhY2hpbmcgYW5kIFJpZ2h0IExlYXJuaW5nIiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDcwNjAzLyIsImlkeCI6MjUsInRpdGxlIjoiSnVsIDYsIDIwMDMiLCJ1aWQiOiIwNzA2MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNC4xIFJpZ2h0IFRlYWNoaW5nIGFuZCBSaWdodCBMZWFybmluZyIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzA3MTMwMy8iLCJpZHgiOjI2LCJ0aXRsZSI6Ikp1bCAxMywgMjAwMyIsInVpZCI6IjA3MTMwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ0LjIgVGhlIEVnbyBhbmQgRmFsc2UgQXV0b25vbXkiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wNzIwMDMvIiwiaWR4IjoyNywidGl0bGUiOiJKdWwgMjAsIDIwMDMiLCJ1aWQiOiIwNzIwMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNC4yIFRoZSBFZ28gYW5kIEZhbHNlIEF1dG9ub215IiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDcyNzAzLyIsImlkeCI6MjgsInRpdGxlIjoiSnVsIDI3LCAyMDAzIiwidWlkIjoiMDcyNzAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDQuMyBMb3ZlIHdpdGhvdXQgQ29uZmxpY3QiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wODAzMDMvIiwiaWR4IjoyOSwidGl0bGUiOiJBdWcgMywgMjAwMyIsInVpZCI6IjA4MDMwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ0LjQgVGhlIEVzY2FwZSBmcm9tIEZlYXIiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wODEwMDMvIiwiaWR4IjozMCwidGl0bGUiOiJBdWcgMTAsIDIwMDMiLCJ1aWQiOiIwODEwMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNC41IFRoZSBFZ28tQm9keSBJbGx1c2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzA4MTcwMy8iLCJpZHgiOjMxLCJ0aXRsZSI6IkF1ZyAxNywgMjAwMyIsInVpZCI6IjA4MTcwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ0LjUgVGhlIEVnby1Cb2R5IElsbHVzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDgyNDAzLyIsImlkeCI6MzIsInRpdGxlIjoiQXVnIDI0LCAyMDAzIiwidWlkIjoiMDgyNDAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDQuNyBDcmVhdGlvbiBhbmQgQ29tbXVuaWNhdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzA4MzEwMy8iLCJpZHgiOjMzLCJ0aXRsZSI6IkF1ZyAzMSwgMjAwMyIsInVpZCI6IjA4MzEwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ0LjggVHJ1ZSBSZWhhYmlsaXRhdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzA5MDcwMy8iLCJpZHgiOjM0LCJ0aXRsZSI6IlNlcCA3LCAyMDAzIiwidWlkIjoiMDkwNzAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDUuMSBIZWFsaW5nIGFzIEpvaW5pbmciLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8wOTE0MDMvIiwiaWR4IjozNSwidGl0bGUiOiJTZXAgMTQsIDIwMDMiLCJ1aWQiOiIwOTE0MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNS4zIFRoZSBWb2ljZSBmb3IgR29kIiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDkyMTAzLyIsImlkeCI6MzYsInRpdGxlIjoiU2VwIDIxLCAyMDAzIiwidWlkIjoiMDkyMTAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDUuNCBUaGUgR3VpZGUgdG8gU2FsdmF0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMDkyODAzLyIsImlkeCI6MzcsInRpdGxlIjoiU2VwIDI4LCAyMDAzIiwidWlkIjoiMDkyODAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzEwMTIwMy8iLCJpZHgiOjM4LCJ0aXRsZSI6Ik9jdCAxMiwgMjAwMyIsInVpZCI6IjEwMTIwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDUuNCBUaGUgR3VpZGUgdG8gU2FsdmF0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDMvMTAxOTAzLyIsImlkeCI6MzksInRpdGxlIjoiT2N0IDE5LCAyMDAzIiwidWlkIjoiMTAxOTAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDUuNSBUaGVyYXB5IGFuZCBUZWFjaGluZyIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzEwMjYwMy8iLCJpZHgiOjQwLCJ0aXRsZSI6Ik9jdCAyNiwgMjAwMyIsInVpZCI6IjEwMjYwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ1LjYgVGhlIFR3byBEZWNpc2lvbnMiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8xMTAyMDMvIiwiaWR4Ijo0MSwidGl0bGUiOiJOb3YgMiwgMjAwMyIsInVpZCI6IjExMDIwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ1LjYgVGhlIFR3byBEZWNpc2lvbnMiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8xMTA5MDMvIiwiaWR4Ijo0MiwidGl0bGUiOiJOb3YgOSwgMjAwMyIsInVpZCI6IjExMDkwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ1LjcgVGltZSBhbmQgRXRlcm5pdHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8xMTE2MDMvIiwiaWR4Ijo0MywidGl0bGUiOiJOb3YgMTYsIDIwMDMiLCJ1aWQiOiIxMTE2MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ1LjggVGhlIEV0ZXJuYWwgRml4YXRpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8xMTIzMDMvIiwiaWR4Ijo0NCwidGl0bGUiOiJOb3YgMjMsIDIwMDMiLCJ1aWQiOiIxMTIzMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNi4xIFRoZSBNZXNzYWdlIG9mIHRoZSBDcnVjaWZpeGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzEyMDcwMy8iLCJpZHgiOjQ1LCJ0aXRsZSI6IkRlYyA3LCAyMDAzIiwidWlkIjoiMTIwNzAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDYuMSBUaGUgTWVzc2FnZSBvZiB0aGUgQ3J1Y2lmaXhpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwMy8xMjE0MDMvIiwiaWR4Ijo0NiwidGl0bGUiOiJEZWMgMTQsIDIwMDMiLCJ1aWQiOiIxMjE0MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNi4xIFRoZSBNZXNzYWdlIG9mIHRoZSBDcnVjaWZpeGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDAzLzEyMjEwMy8iLCJpZHgiOjQ3LCJ0aXRsZSI6IkRlYyAyMSwgMjAwMyIsInVpZCI6IjEyMjEwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9XX19LHsiaWQiOjUsImJpZCI6IjIwMDQiLCJ0aXRsZSI6IkFDSU0gU3R1ZHkgR3JvdXAgLSAyMDA0IiwidW5pdHMiOnsicGFnZSI6W3sidXJsIjoiL253ZmZhY2ltL2ludHJvLzIwMDQvIiwiaWR4IjowLCJ0aXRsZSI6IkFib3V0IDIwMDQgVHJhbnNjcmlwdHMiLCJ1aWQiOiIyMDA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJkZXNjIjoiVDYuMiBUaGUgVXNlcyBvZiBQcm9qZWN0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDExMTA0LyIsImlkeCI6MSwidGl0bGUiOiJKYW4gMTEsIDIwMDQiLCJ1aWQiOiIwMTExMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ2LjIgVGhlIFVzZXMgb2YgUHJvamVjdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzAxMTgwNC8iLCJpZHgiOjIsInRpdGxlIjoiSmFuIDE4LCAyMDA0IiwidWlkIjoiMDExODA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUNi4yIFRoZSBVc2VzIG9mIFByb2plY3Rpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wMTI1MDQvIiwiaWR4IjozLCJ0aXRsZSI6IkphbiAyNSwgMjAwNCIsInVpZCI6IjAxMjUwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDYuMyBUaGUgUmVsaW5xdWlzaG1lbnQgb2YgQXR0YWNrIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDIwMTA0LyIsImlkeCI6NCwidGl0bGUiOiJGZWIgMSwgMjAwNCIsInVpZCI6IjAyMDEwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ2LjQgVGhlIE9ubHkgQW5zd2VyIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDIwODA0LyIsImlkeCI6NSwidGl0bGUiOiJGZWIgOCwgMjAwNCIsInVpZCI6IjAyMDgwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ2LjUgJ1RvIEhhdmUsIEdpdmUgQWxsIHRvIEFsbCciLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wMjE1MDQvIiwiaWR4Ijo2LCJ0aXRsZSI6IkZlYiAxNSwgMjAwNCIsInVpZCI6IjAyMTUwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ2LjUgJ1RvIEhhdmUsIEdpdmUgQWxsIHRvIEFsbCciLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wMjIyMDQvIiwiaWR4Ijo3LCJ0aXRsZSI6IkZlYiAyMiwgMjAwNCIsInVpZCI6IjAyMjIwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ2LjYgJ1RvIEhhdmUgUGVhY2UsIFRlYWNoIFBlYWNlIHRvIExlYXJuIEl0JyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzAzMDcwNC8iLCJpZHgiOjgsInRpdGxlIjoiTWFyIDcsIDIwMDQiLCJ1aWQiOiIwMzA3MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNi43ICdCZSBWaWdpbGFudCBPbmx5IGZvciBHb2QgYW5kIEhpcyBLaW5nZG9tJyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzAzMTQwNC8iLCJpZHgiOjksInRpdGxlIjoiTWFyIDE0LCAyMDA0IiwidWlkIjoiMDMxNDA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDcgSW50cm9kdWN0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDMyODA0LyIsImlkeCI6MTAsInRpdGxlIjoiTWFyIDI4LCAyMDA0IiwidWlkIjoiMDMyODA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDcuMSBCYXJnYWluaW5nIHZlcnN1cyBIZWFsaW5nIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDQwNDA0LyIsImlkeCI6MTEsInRpdGxlIjoiQXByIDQsIDIwMDQiLCJ1aWQiOiIwNDA0MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNy4zIFRoZSBVbmlmaWVkIEN1cnJpY3VsdW0iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wNDExMDQvIiwiaWR4IjoxMiwidGl0bGUiOiJBcHIgMTEsIDIwMDQiLCJ1aWQiOiIwNDExMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNy4zIFRoZSBVbmlmaWVkIEN1cnJpY3VsdW0iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wNDE4MDQvIiwiaWR4IjoxMywidGl0bGUiOiJBcHIgMTgsIDIwMDQiLCJ1aWQiOiIwNDE4MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNy40IFRoZSBSZWNvZ25pdGlvbiBvZiBUcnV0aCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzA0MjUwNC8iLCJpZHgiOjE0LCJ0aXRsZSI6IkFwciAyNSwgMjAwNCIsInVpZCI6IjA0MjUwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ3LjUgSGVhbGluZyBhbmQgdGhlIENoYW5nZWxlc3NuZXNzIG9mIE1pbmQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wNTAyMDQvIiwiaWR4IjoxNSwidGl0bGUiOiJNYXkgMiwgMjAwNCIsInVpZCI6IjA1MDIwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ3LjYgRnJvbSBWaWdpbGFuY2UgdG8gUGVhY2UiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wNTA5MDQvIiwiaWR4IjoxNiwidGl0bGUiOiJNYXkgOSwgMjAwNCIsInVpZCI6IjA1MDkwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ3LjYgRnJvbSBWaWdpbGFuY2UgdG8gUGVhY2UiLCJub3RlIjoiY2VsZXN0aWFscmVhbG0uY29tIHJlZmVyZW5jZXMgMjAwNC0wNS0wMi5tcDMgaW5zdGVhZCBvZiBNYXkgMTYiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wNTE2MDQvIiwiaWR4IjoxNywidGl0bGUiOiJNYXkgMTYsIDIwMDQiLCJ1aWQiOiIwNTE2MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7ImRlc2MiOiJUNy42IEZyb20gVmlnaWxhbmNlIHRvIFBlYWNlIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDUyMzA0LyIsImlkeCI6MTgsInRpdGxlIjoiTWF5IDIzLCAyMDA0IiwidWlkIjoiMDUyMzA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDcuNyBUaGUgVG90YWwgQ29tbWl0bWVudCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzA1MzAwNC8iLCJpZHgiOjE5LCJ0aXRsZSI6Ik1heSAzMCwgMjAwNCIsInVpZCI6IjA1MzAwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ3LjcgVGhlIFRvdGFsIENvbW1pdG1lbnQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wNjEzMDQvIiwiaWR4IjoyMCwidGl0bGUiOiJKdW4gMTMsIDIwMDQiLCJ1aWQiOiIwNjEzMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUNy43IFRoZSBUb3RhbCBDb21taXRtZW50IiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDYyMDA0LyIsImlkeCI6MjEsInRpdGxlIjoiSnVuIDIwLCAyMDA0IiwidWlkIjoiMDYyMDA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDcuOCBUaGUgRGVmZW5zZSBvZiBDb25mbGljdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzA2MjcwNC8iLCJpZHgiOjIyLCJ0aXRsZSI6Ikp1biAyNywgMjAwNCIsInVpZCI6IjA2MjcwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wNzExMDQvIiwiaWR4IjoyMywidGl0bGUiOiJKdWwgMTEsIDIwMDQiLCJ1aWQiOiIwNzExMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ3LjkgVGhlIEV4dGVuc2lvbiBvZiB0aGUgS2luZ2RvbSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzA3MTgwNC8iLCJpZHgiOjI0LCJ0aXRsZSI6Ikp1bCAxOCwgMjAwNCIsInVpZCI6IjA3MTgwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ3LjEwIFRoZSBDb25mdXNpb24gb2YgU3RyZW5ndGggYW5kIFdlYWtuZXNzIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDcyNTA0LyIsImlkeCI6MjUsInRpdGxlIjoiSnVsIDI1LCAyMDA0IiwidWlkIjoiMDcyNTA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDcuMTEgVGhlIFN0YXRlIG9mIEdyYWNlIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDgwMTA0LyIsImlkeCI6MjYsInRpdGxlIjoiQXVnIDEsIDIwMDQiLCJ1aWQiOiIwODAxMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUOCBUaGUgSm91cm5leSBCYWNrIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDgwODA0LyIsImlkeCI6MjcsInRpdGxlIjoiQXVnIDgsIDIwMDQiLCJ1aWQiOiIwODA4MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUOC4xIFRoZSBEaXJlY3Rpb24gb2YgdGhlIEN1cnJpY3VsdW0iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wODE1MDQvIiwiaWR4IjoyOCwidGl0bGUiOiJBdWcgMTUsIDIwMDQiLCJ1aWQiOiIwODE1MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUOC4yIFRoZSBSYXRpb25hbGUgZm9yIENob2ljZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzA4MjIwNC8iLCJpZHgiOjI5LCJ0aXRsZSI6IkF1ZyAyMiwgMjAwNCIsInVpZCI6IjA4MjIwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ4LjMgVGhlIEhvbHkgRW5jb3VudGVyIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDkwNTA0LyIsImlkeCI6MzAsInRpdGxlIjoiU2VwIDUsIDIwMDQiLCJ1aWQiOiIwOTA1MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ4LjMgVGhlIEhvbHkgRW5jb3VudGVyIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMDkxMjA0LyIsImlkeCI6MzEsInRpdGxlIjoiU2VwIDEyLCAyMDA0IiwidWlkIjoiMDkxMjA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUOC40IFRoZSBMaWdodCBvZiB0aGUgV29ybGQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8wOTE5MDQvIiwiaWR4IjozMiwidGl0bGUiOiJTZXAgMTksIDIwMDQiLCJ1aWQiOiIwOTE5MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ4LjQgVGhlIExpZ2h0IG9mIHRoZSBXb3JsZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzA5MjYwNC8iLCJpZHgiOjMzLCJ0aXRsZSI6IlNlcCAyNiwgMjAwNCIsInVpZCI6IjA5MjYwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ4LjQgVGhlIExpZ2h0IG9mIHRoZSBXb3JsZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzEwMDMwNC8iLCJpZHgiOjM0LCJ0aXRsZSI6Ik9jdCAzLCAyMDA0IiwidWlkIjoiMTAwMzA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDguNSBUaGUgUG93ZXIgb2YgSm9pbnQgRGVjaXNpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8xMDEwMDQvIiwiaWR4IjozNSwidGl0bGUiOiJPY3QgMTAsIDIwMDQiLCJ1aWQiOiIxMDEwMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ4LjUgVGhlIFBvd2VyIG9mIEpvaW50IERlY2lzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMTAxNzA0LyIsImlkeCI6MzYsInRpdGxlIjoiT2N0IDE3LCAyMDA0IiwidWlkIjoiMTAxNzA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUOC42IENvbW11bmljYXRpb24gYW5kIHRoZSBFZ28tQm9keSBFcXVhdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzEwMjQwNC8iLCJpZHgiOjM3LCJ0aXRsZSI6Ik9jdCAyNCwgMjAwNCIsInVpZCI6IjEwMjQwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDguNiBDb21tdW5pY2F0aW9uIGFuZCB0aGUgRWdvLUJvZHkgRXF1YXRpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8xMTA3MDQvIiwiaWR4IjozOCwidGl0bGUiOiJOb3YgNywgMjAwNCIsInVpZCI6IjExMDcwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDguOCBIZWFsaW5nIGFzIENvcnJlY3RlZCBQZXJjZXB0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMTEyMTA0LyIsImlkeCI6MzksInRpdGxlIjoiTm92IDIxLCAyMDA0IiwidWlkIjoiMTEyMTA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUOC44IEhlYWxpbmcgYXMgQ29ycmVjdGVkIFBlcmNlcHRpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8xMTI4MDQvIiwiaWR4Ijo0MCwidGl0bGUiOiJOb3YgMjgsIDIwMDQiLCJ1aWQiOiIxMTI4MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ4LjkgVGhlIEFjY2VwdGFuY2Ugb2YgUmVhbGl0eSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA0LzEyMDUwNC8iLCJpZHgiOjQxLCJ0aXRsZSI6IkRlYyA1LCAyMDA0IiwidWlkIjoiMTIwNTA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUOC45IFRoZSBBY2NlcHRhbmNlIG9mIFJlYWxpdHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNC8xMjEyMDQvIiwiaWR4Ijo0MiwidGl0bGUiOiJEZWMgMTIsIDIwMDQiLCJ1aWQiOiIxMjEyMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ4LjEwIFRoZSBBbnN3ZXIgdG8gUHJheWVyIiwidXJsIjoiL253ZmZhY2ltLzIwMDQvMTIxOTA0LyIsImlkeCI6NDMsInRpdGxlIjoiRGVjIDE5LCAyMDA0IiwidWlkIjoiMTIxOTA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfV19fSx7ImlkIjo2LCJiaWQiOiIyMDA1IiwidGl0bGUiOiJBQ0lNIFN0dWR5IEdyb3VwIC0gMjAwNSIsInVuaXRzIjp7InBhZ2UiOlt7InVybCI6Ii9ud2ZmYWNpbS9pbnRyby8yMDA1LyIsImlkeCI6MCwidGl0bGUiOiJBYm91dCAyMDA1IFRyYW5zY3JpcHRzIiwidWlkIjoiMjAwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsiZGVzYyI6IlQ4LjEwIFRoZSBBbnN3ZXIgdG8gUHJheWVyIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMDEwMjA1LyIsImlkeCI6MSwidGl0bGUiOiJKYW4gMiwgMjAwNSIsInVpZCI6IjAxMDIwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDkgSW50cm9kdWN0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMDExNjA1LyIsImlkeCI6MiwidGl0bGUiOiJKYW4gMTYsIDIwMDUiLCJ1aWQiOiIwMTE2MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ5LjIgQXRvbmVtZW50IGFzIGEgTGVzc29uIGluIFNoYXJpbmciLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8wMTIzMDUvIiwiaWR4IjozLCJ0aXRsZSI6IkphbiAyMywgMjAwNSIsInVpZCI6IjAxMjMwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDkuMiBBdG9uZW1lbnQgYXMgYSBMZXNzb24gaW4gU2hhcmluZyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzAxMzAwNS8iLCJpZHgiOjQsInRpdGxlIjoiSmFuIDMwLCAyMDA1IiwidWlkIjoiMDEzMDA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUOS4zIFRoZSBVbmhlYWxlZCBIZWFsZXIiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8wMjEzMDUvIiwiaWR4Ijo1LCJ0aXRsZSI6IkZlYiAxMywgMjAwNSIsInVpZCI6IjAyMTMwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDkuMyBUaGUgVW5oZWFsZWQgSGVhbGVyIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMDIyMDA1LyIsImlkeCI6NiwidGl0bGUiOiJGZWIgMjAsIDIwMDUiLCJ1aWQiOiIwMjIwMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8wMzA2MDUvIiwiaWR4Ijo3LCJ0aXRsZSI6Ik1hciA2LCAyMDA1IiwidWlkIjoiMDMwNjA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUOS41IFNhbHZhdGlvbiBhbmQgR29kJ3MgV2lsbCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzAzMTMwNS8iLCJpZHgiOjgsInRpdGxlIjoiTWFyIDEzLCAyMDA1IiwidWlkIjoiMDMxMzA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUOS41IFNhbHZhdGlvbiBhbmQgR29kJ3MgV2lsbCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzAzMjcwNS8iLCJpZHgiOjksInRpdGxlIjoiTWFyIDI3LCAyMDA1IiwidWlkIjoiMDMyNzA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUOS42IEdyYW5kZXVyIHZlcnN1cyBHcmFuZGlvc2l0eSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzA0MDMwNS8iLCJpZHgiOjEwLCJ0aXRsZSI6IkFwciAzLCAyMDA1IiwidWlkIjoiMDQwMzA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUOS42IEdyYW5kZXVyIHZlcnN1cyBHcmFuZGlvc2l0eSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzA0MTAwNS8iLCJpZHgiOjExLCJ0aXRsZSI6IkFwciAxMCwgMjAwNSIsInVpZCI6IjA0MTAwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDkuNiBHcmFuZGV1ciB2ZXJzdXMgR3JhbmRpb3NpdHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8wNDE3MDUvIiwiaWR4IjoxMiwidGl0bGUiOiJBcHIgMTcsIDIwMDUiLCJ1aWQiOiIwNDE3MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ5LjcgVGhlIEluY2x1c2l2ZW5lc3Mgb2YgQ3JlYXRpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8wNDI0MDUvIiwiaWR4IjoxMywidGl0bGUiOiJBcHIgMjQsIDIwMDUiLCJ1aWQiOiIwNDI0MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQ5LjggVGhlIERlY2lzaW9uIHRvIEZvcmdldCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzA1MDEwNS8iLCJpZHgiOjE0LCJ0aXRsZSI6Ik1heSAxLCAyMDA1IiwidWlkIjoiMDUwMTA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUOS44IFRoZSBEZWNpc2lvbiB0byBGb3JnZXQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8wNTA4MDUvIiwiaWR4IjoxNSwidGl0bGUiOiJNYXkgOCwgMjAwNSIsInVpZCI6IjA1MDgwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDkuOCBUaGUgRGVjaXNpb24gdG8gRm9yZ2V0IiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMDUyMjA1LyIsImlkeCI6MTYsInRpdGxlIjoiTWF5IDIyLCAyMDA1IiwidWlkIjoiMDUyMjA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDkuOSBNYWdpYyB2cyBNaXJhY2xlcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzA2MDUwNS8iLCJpZHgiOjE3LCJ0aXRsZSI6Ikp1biA1LCAyMDA1IiwidWlkIjoiMDYwNTA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDkuMTAgVGhlIERlbmlhbCBvZiBHb2QiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8wNjEyMDUvIiwiaWR4IjoxOCwidGl0bGUiOiJKdW4gMTIsIDIwMDUiLCJ1aWQiOiIwNjEyMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUOS4xMCBUaGUgRGVuaWFsIG9mIEdvZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzA2MTkwNS8iLCJpZHgiOjE5LCJ0aXRsZSI6Ikp1biAxOSwgMjAwNSIsInVpZCI6IjA2MTkwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQ5LjEwIFRoZSBEZW5pYWwgb2YgR29kIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMDcwMzA1LyIsImlkeCI6MjAsInRpdGxlIjoiSnVsIDMsIDIwMDUiLCJ1aWQiOiIwNzAzMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTAgSW50cm9kdWN0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMDcxMDA1LyIsImlkeCI6MjEsInRpdGxlIjoiSnVsIDEwLCAyMDA1IiwidWlkIjoiMDcxMDA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEwLjEgUHJvamVjdGlvbiB2ZXJzdXMgRXh0ZW5zaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMDcxNzA1LyIsImlkeCI6MjIsInRpdGxlIjoiSnVsIDE3LCAyMDA1IiwidWlkIjoiMDcxNzA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEwLjEgUHJvamVjdGlvbiB2ZXJzdXMgRXh0ZW5zaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMDcyNDA1LyIsImlkeCI6MjMsInRpdGxlIjoiSnVsIDI0LCAyMDA1IiwidWlkIjoiMDcyNDA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEwLjIgVGhlIFdpbGxpbmduZXNzIGZvciBIZWFsaW5nIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMDgwNzA1LyIsImlkeCI6MjQsInRpdGxlIjoiQXVnIDcsIDIwMDUiLCJ1aWQiOiIwODA3MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxMC4zIEZyb20gRGFya25lc3MgdG8gTGlnaHQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8wODE0MDUvIiwiaWR4IjoyNSwidGl0bGUiOiJBdWcgMTQsIDIwMDUiLCJ1aWQiOiIwODE0MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxMC4zIEZyb20gRGFya25lc3MgdG8gTGlnaHQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8wODIxMDUvIiwiaWR4IjoyNiwidGl0bGUiOiJBdWcgMjEsIDIwMDUiLCJ1aWQiOiIwODIxMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTAuNCBUaGUgSW5oZXJpdGFuY2Ugb2YgR29kJ3MgU29uIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMDgyODA1LyIsImlkeCI6MjcsInRpdGxlIjoiQXVnIDI4LCAyMDA1IiwidWlkIjoiMDgyODA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEwLjUgVGhlICdEeW5hbWljcycgb2YgdGhlIEVnbyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzA5MDQwNS8iLCJpZHgiOjI4LCJ0aXRsZSI6IlNlcCA0LCAyMDA1IiwidWlkIjoiMDkwNDA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEwLjUgVGhlICdEeW5hbWljcycgb2YgdGhlIEVnbyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzA5MTEwNS8iLCJpZHgiOjI5LCJ0aXRsZSI6IlNlcCAxMSwgMjAwNSIsInVpZCI6IjA5MTEwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxMC41IFRoZSAnRHluYW1pY3MnIG9mIHRoZSBFZ28iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8wOTE4MDUvIiwiaWR4IjozMCwidGl0bGUiOiJTZXAgMTgsIDIwMDUiLCJ1aWQiOiIwOTE4MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTAuNSBUaGUgJ0R5bmFtaWNzJyBvZiB0aGUgRWdvIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMTAwMjA1LyIsImlkeCI6MzEsInRpdGxlIjoiT2N0IDIsIDIwMDUiLCJ1aWQiOiIxMDAyMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTAuNSBUaGUgJ0R5bmFtaWNzJyBvZiB0aGUgRWdvIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMTAwOTA1LyIsImlkeCI6MzIsInRpdGxlIjoiT2N0IDksIDIwMDUiLCJ1aWQiOiIxMDA5MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTAuNiBFeHBlcmllbmNlIGFuZCBQZXJjZXB0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMTAxNjA1LyIsImlkeCI6MzMsInRpdGxlIjoiT2N0IDE2LCAyMDA1IiwidWlkIjoiMTAxNjA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEwLjcgVGhlIFByb2JsZW0gYW5kIHRoZSBBbnN3ZXIiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8xMDIzMDUvIiwiaWR4IjozNCwidGl0bGUiOiJPY3QgMjMsIDIwMDUiLCJ1aWQiOiIxMDIzMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTAuNyBUaGUgUHJvYmxlbSBhbmQgdGhlIEFuc3dlciIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzExMDYwNS8iLCJpZHgiOjM1LCJ0aXRsZSI6Ik5vdiA2LCAyMDA1IiwidWlkIjoiMTEwNjA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDExLjEgVGhlIEp1ZGdlbWVudCBvZiB0aGUgSG9seSBTcGlyaXQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNS8xMTEzMDUvIiwiaWR4IjozNiwidGl0bGUiOiJOb3YgMTMsIDIwMDUiLCJ1aWQiOiIxMTEzMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTEuMSBUaGUgSnVkZ2VtZW50IG9mIHRoZSBIb2x5IFNwaXJpdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzExMjAwNS8iLCJpZHgiOjM3LCJ0aXRsZSI6Ik5vdiAyMCwgMjAwNSIsInVpZCI6IjExMjAwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxMS4xIFRoZSBKdWRnZW1lbnQgb2YgdGhlIEhvbHkgU3Bpcml0IiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMTIwNDA1LyIsImlkeCI6MzgsInRpdGxlIjoiRGVjIDQsIDIwMDUiLCJ1aWQiOiIxMjA0MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDUvMTIxMTA1LyIsImlkeCI6MzksInRpdGxlIjoiRGVjIDExLCAyMDA1IiwidWlkIjoiMTIxMTA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTEuMiBUaGUgTWVjaGFuaXNtIGZvciBNaXJhY2xlcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA1LzEyMTgwNS8iLCJpZHgiOjQwLCJ0aXRsZSI6IkRlYyAxOCwgMjAwNSIsInVpZCI6IjEyMTgwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9XX19LHsiaWQiOjcsImJpZCI6IjIwMDYiLCJ0aXRsZSI6IkFDSU0gU3R1ZHkgR3JvdXAgLSAyMDA2IiwidW5pdHMiOnsicGFnZSI6W3sidXJsIjoiL253ZmZhY2ltL2ludHJvLzIwMDYvIiwiaWR4IjowLCJ0aXRsZSI6IkFib3V0IDIwMDYgVHJhbnNjcmlwdHMiLCJ1aWQiOiIyMDA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJkZXNjIjoiVDExLjIgVGhlIE1lY2hhbmlzbSBmb3IgTWlyYWNsZXMiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wMTA4MDYvIiwiaWR4IjoxLCJ0aXRsZSI6IkphbiA4LCAyMDA2IiwidWlkIjoiMDEwODA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTEuMyBUaGUgSW52ZXN0bWVudCBpbiBSZWFsaXR5IiwidXJsIjoiL253ZmZhY2ltLzIwMDYvMDExNTA2LyIsImlkeCI6MiwidGl0bGUiOiJKYW4gMTUsIDIwMDYiLCJ1aWQiOiIwMTE1MDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxMS4zIFRoZSBJbnZlc3RtZW50IGluIFJlYWxpdHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wMTIyMDYvIiwiaWR4IjozLCJ0aXRsZSI6IkphbiAyMiwgMjAwNiIsInVpZCI6IjAxMjIwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDExLjQgU2Vla2luZyBhbmQgRmluZGluZyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzAxMjkwNi8iLCJpZHgiOjQsInRpdGxlIjoiSmFuIDI5LCAyMDA2IiwidWlkIjoiMDEyOTA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTEuNSBUaGUgU2FuZSBDdXJyaWN1bHVtIiwidXJsIjoiL253ZmZhY2ltLzIwMDYvMDIxMjA2LyIsImlkeCI6NSwidGl0bGUiOiJGZWIgMTIsIDIwMDYiLCJ1aWQiOiIwMjEyMDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6IllvZGkuZGViZWJlIn0seyJkZXNjIjoiVDExLjYgVGhlIFZpc2lvbiBvZiBDaHJpc3QiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wMjI2MDYvIiwiaWR4Ijo2LCJ0aXRsZSI6IkZlYiAyNiwgMjAwNiIsInVpZCI6IjAyMjYwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDExLjYgVGhlIFZpc2lvbiBvZiBDaHJpc3QiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wMzA0MDYvIiwiaWR4Ijo3LCJ0aXRsZSI6Ik1hciA0LCAyMDA2IiwidWlkIjoiMDMwNDA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTEuNyBUaGUgR3VpZGUgZm9yIE1pcmFjbGVzIiwidXJsIjoiL253ZmZhY2ltLzIwMDYvMDMxMTA2LyIsImlkeCI6OCwidGl0bGUiOiJNYXIgMTEsIDIwMDYiLCJ1aWQiOiIwMzExMDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxMS43IFRoZSBHdWlkZSBmb3IgTWlyYWNsZXMiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wMzE5MDYvIiwiaWR4Ijo5LCJ0aXRsZSI6Ik1hciAxOSwgMjAwNiIsInVpZCI6IjAzMTkwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiRGlzdWNzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzA0MDEwNi8iLCJpZHgiOjEwLCJ0aXRsZSI6IkFwciAxLCAyMDA2IiwidWlkIjoiMDQwMTA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTEuNyBUaGUgR3VpZGUgZm9yIE1pcmFjbGVzIiwidXJsIjoiL253ZmZhY2ltLzIwMDYvMDQxNTA2LyIsImlkeCI6MTEsInRpdGxlIjoiQXByIDE1LCAyMDA2IiwidWlkIjoiMDQxNTA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTEuNyBUaGUgR3VpZGUgZm9yIE1pcmFjbGVzIiwidXJsIjoiL253ZmZhY2ltLzIwMDYvMDQyOTA2LyIsImlkeCI6MTIsInRpdGxlIjoiQXByIDI5LCAyMDA2IiwidWlkIjoiMDQyOTA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTEuOCBSZWFsaXR5IGFuZCBSZWRlbXB0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDYvMDUwNjA2LyIsImlkeCI6MTMsInRpdGxlIjoiTWF5IDYsIDIwMDYiLCJ1aWQiOiIwNTA2MDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wNTIwMDYvIiwiaWR4IjoxNCwidGl0bGUiOiJNYXkgMjAsIDIwMDYiLCJ1aWQiOiIwNTIwMDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxMS44IFJlYWxpdHkgYW5kIFJlZGVtcHRpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wNTI3MDYvIiwiaWR4IjoxNSwidGl0bGUiOiJNYXkgMjcsIDIwMDYiLCJ1aWQiOiIwNTI3MDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxMS45IEd1aWx0bGVzc25lc3MgYW5kIEludnVsbmVyYWJpbGl0eSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzA2MDMwNi8iLCJpZHgiOjE2LCJ0aXRsZSI6Ikp1biAzLCAyMDA2IiwidWlkIjoiMDYwMzA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTEuOSBHdWlsdGxlc3NuZXNzIGFuZCBJbnZ1bG5lcmFiaWxpdHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wNjEwMDYvIiwiaWR4IjoxNywidGl0bGUiOiJKdW4gMTAsIDIwMDYiLCJ1aWQiOiIwNjEwMDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxMS45IEd1aWx0bGVzc25lc3MgYW5kIEludnVsbmVyYWJpbGl0eSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzA2MTgwNi8iLCJpZHgiOjE4LCJ0aXRsZSI6Ikp1biAxOCwgMjAwNiIsInVpZCI6IjA2MTgwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDExLjkgR3VpbHRsZXNzbmVzcyBhbmQgSW52dWxuZXJhYmlsaXR5IiwidXJsIjoiL253ZmZhY2ltLzIwMDYvMDYyNDA2LyIsImlkeCI6MTksInRpdGxlIjoiSnVuIDI0LCAyMDA2IiwidWlkIjoiMDYyNDA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTEuOSBHdWlsdGxlc3NuZXNzIGFuZCBJbnZ1bG5lcmFiaWxpdHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wNzAxMDYvIiwiaWR4IjoyMCwidGl0bGUiOiJKdWwgMSwgMjAwNiIsInVpZCI6IjA3MDEwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDExLjkgR3VpbHRsZXNzbmVzcyBhbmQgSW52dWxuZXJhYmlsaXR5IiwidXJsIjoiL253ZmZhY2ltLzIwMDYvMDcxNTA2LyIsImlkeCI6MjEsInRpdGxlIjoiSnVsIDE1LCAyMDA2IiwidWlkIjoiMDcxNTA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTIuMSBDcnVjaWZpeGlvbiBieSBHdWlsdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzA3MzAwNi8iLCJpZHgiOjIyLCJ0aXRsZSI6Ikp1bCAzMCwgMjAwNiIsInVpZCI6IjA3MzAwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEyLjEgQ3J1Y2lmaXhpb24gYnkgR3VpbHQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wODA1MDYvIiwiaWR4IjoyMywidGl0bGUiOiJBdWcgNSwgMjAwNiIsInVpZCI6IjA4MDUwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEyLjIgVGhlIEZlYXIgb2YgUmVkZW1wdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzA4MTIwNi8iLCJpZHgiOjI0LCJ0aXRsZSI6IkF1ZyAxMiwgMjAwNiIsInVpZCI6IjA4MTIwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEyLjIgVGhlIEZlYXIgb2YgUmVkZW1wdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzA4MjAwNi8iLCJpZHgiOjI1LCJ0aXRsZSI6IkF1ZyAyMCwgMjAwNiIsInVpZCI6IjA4MjAwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEyLjMgSGVhbGluZyBhbmQgVGltZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzA5MDIwNi8iLCJpZHgiOjI2LCJ0aXRsZSI6IlNlcCAyLCAyMDA2IiwidWlkIjoiMDkwMjA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTIuNCBUaGUgVHdvIEVtb3Rpb25zIiwidXJsIjoiL253ZmZhY2ltLzIwMDYvMDkwOTA2LyIsImlkeCI6MjcsInRpdGxlIjoiU2VwIDksIDIwMDYiLCJ1aWQiOiIwOTA5MDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxMi40IFRoZSBUd28gRW1vdGlvbnMiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8wOTIzMDYvIiwiaWR4IjoyOCwidGl0bGUiOiJTZXAgMjMsIDIwMDYiLCJ1aWQiOiIwOTIzMDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxMi41IEZpbmRpbmcgdGhlIFByZXNlbnQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwNi8xMDA3MDYvIiwiaWR4IjoyOSwidGl0bGUiOiJPY3QgNywgMjAwNiIsInVpZCI6IjEwMDcwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEyLjUgRmluZGluZyB0aGUgUHJlc2VudCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzEwMTQwNi8iLCJpZHgiOjMwLCJ0aXRsZSI6Ik9jdCAxNCwgMjAwNiIsInVpZCI6IjEwMTQwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEyLjUgRmluZGluZyB0aGUgUHJlc2VudCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzEwMjEwNi8iLCJpZHgiOjMxLCJ0aXRsZSI6Ik9jdCAyMSwgMjAwNiIsInVpZCI6IjEwMjEwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEyLjUgRmluZGluZyB0aGUgUHJlc2VudCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzEwMjgwNi8iLCJpZHgiOjMyLCJ0aXRsZSI6Ik9jdCAyOCwgMjAwNiIsInVpZCI6IjEwMjgwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEyLjYgQXR0YWlubWVudCBvZiB0aGUgUmVhbCBXb3JsZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzExMTEwNi8iLCJpZHgiOjMzLCJ0aXRsZSI6Ik5vdiAxMSwgMjAwNiIsInVpZCI6IjExMTEwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEyLjYgQXR0YWlubWVudCBvZiB0aGUgUmVhbCBXb3JsZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzExMTgwNi8iLCJpZHgiOjM0LCJ0aXRsZSI6Ik5vdiAxOCwgMjAwNiIsInVpZCI6IjExMTgwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEyLjYgQXR0YWlubWVudCBvZiB0aGUgUmVhbCBXb3JsZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA2LzEyMDIwNi8iLCJpZHgiOjM1LCJ0aXRsZSI6IkRlYyAyLCAyMDA2IiwidWlkIjoiMTIwMjA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfV19fSx7ImlkIjo4LCJiaWQiOiIyMDA3IiwidGl0bGUiOiJBQ0lNIFN0dWR5IEdyb3VwIC0gMjAwNyIsInVuaXRzIjp7InBhZ2UiOlt7InVybCI6Ii9ud2ZmYWNpbS9pbnRyby8yMDA3LyIsImlkeCI6MCwidGl0bGUiOiJBYm91dCAyMDA3IFRyYW5zY3JpcHRzIiwidWlkIjoiMjAwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNy8wODE4MDcvIiwiaWR4IjoxLCJ0aXRsZSI6IkF1ZyAxOCwgMjAwNyIsInVpZCI6IjA4MTgwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEzIEludHJvZHVjdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA3LzA4MjUwNy8iLCJpZHgiOjIsInRpdGxlIjoiQXVnIDI1LCAyMDA3IiwidWlkIjoiMDgyNTA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEzLjEgVGhlIFJvbGUgb2YgSGVhbGluZyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA3LzA5MDkwNy8iLCJpZHgiOjMsInRpdGxlIjoiU2VwIDksIDIwMDciLCJ1aWQiOiIwOTA5MDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxMy4xIFRoZSBSb2xlIG9mIEhlYWxpbmciLCJ1cmwiOiIvbndmZmFjaW0vMjAwNy8wOTE2MDcvIiwiaWR4Ijo0LCJ0aXRsZSI6IlNlcCAxNiwgMjAwNyIsInVpZCI6IjA5MTYwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDEzLjEgVGhlIFJvbGUgb2YgSGVhbGluZyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA3LzA5MjIwNy8iLCJpZHgiOjUsInRpdGxlIjoiU2VwIDIyLCAyMDA3IiwidWlkIjoiMDkyMjA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEzLjIgVGhlIFNoYWRvdyBvZiBHdWlsdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA3LzEwMDYwNy8iLCJpZHgiOjYsInRpdGxlIjoiT2N0IDYsIDIwMDciLCJ1aWQiOiIxMDA2MDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTMuMiBUaGUgU2hhZG93IG9mIEd1aWx0IiwidXJsIjoiL253ZmZhY2ltLzIwMDcvMTAxNDA3LyIsImlkeCI6NywidGl0bGUiOiJPY3QgMTQsIDIwMDciLCJ1aWQiOiIxMDE0MDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTMuMyBSZWxlYXNlIGFuZCBSZXN0b3JhdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA3LzEwMjcwNy8iLCJpZHgiOjgsInRpdGxlIjoiT2N0IDI3LCAyMDA3IiwidWlkIjoiMTAyNzA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEzLjMgUmVsZWFzZSBhbmQgUmVzdG9yYXRpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNy8xMTAzMDcvIiwiaWR4Ijo5LCJ0aXRsZSI6Ik5vdiAzLCAyMDA3IiwidWlkIjoiMTEwMzA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEzLjMgUmVsZWFzZSBhbmQgUmVzdG9yYXRpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwNy8xMTEwMDcvIiwiaWR4IjoxMCwidGl0bGUiOiJOb3YgMTAsIDIwMDciLCJ1aWQiOiIxMTEwMDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTMuMyBSZWxlYXNlIGFuZCBSZXN0b3JhdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA3LzExMTgwNy8iLCJpZHgiOjExLCJ0aXRsZSI6Ik5vdiAxOCwgMjAwNyIsInVpZCI6IjExMTgwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxMy4zIFJlbGVhc2UgYW5kIFJlc3RvcmF0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDcvMTIwODA3LyIsImlkeCI6MTIsInRpdGxlIjoiRGVjIDgsIDIwMDciLCJ1aWQiOiIxMjA4MDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTMuMyBSZWxlYXNlIGFuZCBSZXN0b3JhdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA3LzEyMTYwNy8iLCJpZHgiOjEzLCJ0aXRsZSI6IkRlYyAxNiwgMjAwNyIsInVpZCI6IjEyMTYwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9XX19LHsiaWQiOjksImJpZCI6IjIwMDgiLCJ0aXRsZSI6IkFDSU0gU3R1ZHkgR3JvdXAgLSAyMDA4IiwidW5pdHMiOnsicGFnZSI6W3sidXJsIjoiL253ZmZhY2ltL2ludHJvLzIwMDgvIiwiaWR4IjowLCJ0aXRsZSI6IkFib3V0IDIwMDggVHJhbnNjcmlwdHMiLCJ1aWQiOiIyMDA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJkZXNjIjoiVDEzLjQgVGhlIEd1YXJhbnRlZSBvZiBIZWF2ZW4iLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wMTIwMDgvIiwiaWR4IjoxLCJ0aXRsZSI6IkphbiAyMCwgMjAwOCIsInVpZCI6IjAxMjAwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxMy40IFRoZSBHdWFyYW50ZWUgb2YgSGVhdmVuIiwidXJsIjoiL253ZmZhY2ltLzIwMDgvMDEyNzA4LyIsImlkeCI6MiwidGl0bGUiOiJKYW4gMjcsIDIwMDgiLCJ1aWQiOiIwMTI3MDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTMuNCBUaGUgR3VhcmFudGVlIG9mIEhlYXZlbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzAyMTAwOC8iLCJpZHgiOjMsInRpdGxlIjoiRmViIDEwLCAyMDA4IiwidWlkIjoiMDIxMDA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEzLjUgVGhlIFRlc3RpbW9ueSBvZiBNaXJhY2xlcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzAyMTcwOC8iLCJpZHgiOjQsInRpdGxlIjoiRmViIDE3LCAyMDA4IiwidWlkIjoiMDIxNzA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEzLjYgVGhlIEhhcHB5IExlYXJuZXIiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wMjI0MDgvIiwiaWR4Ijo1LCJ0aXRsZSI6IkZlYiAyNCwgMjAwOCIsInVpZCI6IjAyMjQwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxMy42IFRoZSBIYXBweSBMZWFybmVyIiwidXJsIjoiL253ZmZhY2ltLzIwMDgvMDMwMjA4LyIsImlkeCI6NiwidGl0bGUiOiJNYXIgMiwgMjAwOCIsInVpZCI6IjAzMDIwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxMy43IFRoZSBEZWNpc2lvbiBmb3IgR3VpbHRsZXNzbmVzcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzAzMDkwOC8iLCJpZHgiOjcsInRpdGxlIjoiTWFyIDksIDIwMDgiLCJ1aWQiOiIwMzA5MDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTMuNyBUaGUgRGVjaXNpb24gZm9yIEd1aWx0bGVzc25lc3MiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wMzI1MDgvIiwiaWR4Ijo4LCJ0aXRsZSI6Ik1hciAyNSwgMjAwOCIsInVpZCI6IjAzMjUwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxMy43IFRoZSBEZWNpc2lvbiBmb3IgR3VpbHRsZXNzbmVzcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzAzMzAwOC8iLCJpZHgiOjksInRpdGxlIjoiTWFyIDMwLCAyMDA4IiwidWlkIjoiMDMzMDA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDEzLjcgVGhlIERlY2lzaW9uIGZvciBHdWlsdGxlc3NuZXNzIiwidXJsIjoiL253ZmZhY2ltLzIwMDgvMDQwNjA4LyIsImlkeCI6MTAsInRpdGxlIjoiQXByIDYsIDIwMDgiLCJ1aWQiOiIwNDA2MDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTMuOCBUaGUgV2F5IG9mIFNhbHZhdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzA0MTMwOC8iLCJpZHgiOjExLCJ0aXRsZSI6IkFwciAxMywgMjAwOCIsInVpZCI6IjA0MTMwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNCBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wNDIwMDgvIiwiaWR4IjoxMiwidGl0bGUiOiJBcHIgMjAsIDIwMDgiLCJ1aWQiOiIwNDIwMDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTQuMSBHdWlsdCBhbmQgR3VpbHRsZXNzbmVzcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzA1MDQwOC8iLCJpZHgiOjEzLCJ0aXRsZSI6Ik1heSA0LCAyMDA4IiwidWlkIjoiMDUwNDA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE0LjEgR3VpbHQgYW5kIEd1aWx0bGVzc25lc3MiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wNTE4MDgvIiwiaWR4IjoxNCwidGl0bGUiOiJNYXkgMTgsIDIwMDgiLCJ1aWQiOiIwNTE4MDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTQuMSBHdWlsdCBhbmQgR3VpbHRsZXNzbmVzcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzA1MjUwOC8iLCJpZHgiOjE1LCJ0aXRsZSI6Ik1heSAyNSwgMjAwOCIsInVpZCI6IjA1MjUwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNC4xIEd1aWx0IGFuZCBHdWlsdGxlc3NuZXNzIiwidXJsIjoiL253ZmZhY2ltLzIwMDgvMDYwMTA4LyIsImlkeCI6MTYsInRpdGxlIjoiSnVuIDEsIDIwMDgiLCJ1aWQiOiIwNjAxMDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTQuMiBPdXQgb2YgdGhlIERhcmtuZXNzIiwidXJsIjoiL253ZmZhY2ltLzIwMDgvMDYwODA4LyIsImlkeCI6MTcsInRpdGxlIjoiSnVuIDgsIDIwMDgiLCJ1aWQiOiIwNjA4MDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTQuMyBQZXJjZXB0aW9uIHdpdGhvdXQgRGVjZWl0IiwidXJsIjoiL253ZmZhY2ltLzIwMDgvMDYxNTA4LyIsImlkeCI6MTgsInRpdGxlIjoiSnVuIDE1LCAyMDA4IiwidWlkIjoiMDYxNTA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE0LjMgUGVyY2VwdGlvbiB3aXRob3V0IERlY2VpdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzA2MjIwOC8iLCJpZHgiOjE5LCJ0aXRsZSI6Ikp1biAyMiwgMjAwOCIsInVpZCI6IjA2MjIwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNC4zIFBlcmNlcHRpb24gd2l0aG91dCBEZWNlaXQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wNzA2MDgvIiwiaWR4IjoyMCwidGl0bGUiOiJKdWwgNiwgMjAwOCIsInVpZCI6IjA3MDYwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNC4zIFBlcmNlcHRpb24gd2l0aG91dCBEZWNlaXQiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wNzEzMDgvIiwiaWR4IjoyMSwidGl0bGUiOiJKdWwgMTMsIDIwMDgiLCJ1aWQiOiIwNzEzMDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTQuNCBUaGUgUmVjb2duaXRpb24gb2YgSG9saW5lc3MiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wNzI3MDgvIiwiaWR4IjoyMiwidGl0bGUiOiJKdWwgMjcsIDIwMDgiLCJ1aWQiOiIwNzI3MDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTQuNSBUaGUgU2hpZnQgdG8gTWlyYWNsZXMiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wODE3MDgvIiwiaWR4IjoyMywidGl0bGUiOiJBdWcgMTcsIDIwMDgiLCJ1aWQiOiIwODE3MDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTQuNSBUaGUgU2hpZnQgdG8gTWlyYWNsZXMiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wODMxMDgvIiwiaWR4IjoyNCwidGl0bGUiOiJBdWcgMzEsIDIwMDgiLCJ1aWQiOiIwODMxMDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTQuNSBUaGUgU2hpZnQgdG8gTWlyYWNsZXMiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wOTA3MDgvIiwiaWR4IjoyNSwidGl0bGUiOiJTZXAgNywgMjAwOCIsInVpZCI6IjA5MDcwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNC42IFRoZSBUZXN0IG9mIFRydXRoIiwidXJsIjoiL253ZmZhY2ltLzIwMDgvMDkxNDA4LyIsImlkeCI6MjYsInRpdGxlIjoiU2VwIDE0LCAyMDA4IiwidWlkIjoiMDkxNDA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE0LjYgVGhlIFRlc3Qgb2YgVHJ1dGgiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8wOTIxMDgvIiwiaWR4IjoyNywidGl0bGUiOiJTZXAgMjEsIDIwMDgiLCJ1aWQiOiIwOTIxMDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTQuNiBUaGUgVGVzdCBvZiBUcnV0aCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzEwMDUwOC8iLCJpZHgiOjI4LCJ0aXRsZSI6Ik9jdCA1LCAyMDA4IiwidWlkIjoiMTAwNTA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE0LjYgVGhlIFRlc3Qgb2YgVHJ1dGgiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8xMDE5MDgvIiwiaWR4IjoyOSwidGl0bGUiOiJPY3QgMTksIDIwMDgiLCJ1aWQiOiIxMDE5MDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTUuMSBUaGUgVXNlcyBvZiBUaW1lIiwidXJsIjoiL253ZmZhY2ltLzIwMDgvMTAyNjA4LyIsImlkeCI6MzAsInRpdGxlIjoiT2N0IDI2LCAyMDA4IiwidWlkIjoiMTAyNjA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJKdWxpZWY4In0seyJkZXNjIjoiVDE1LjEgVGhlIFVzZXMgb2YgVGltZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzExMDIwOC8iLCJpZHgiOjMxLCJ0aXRsZSI6Ik5vdiAyLCAyMDA4IiwidWlkIjoiMTEwMjA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJKdWxpZWY4In0seyJkZXNjIjoiVDE1LjEgVGhlIFVzZXMgb2YgVGltZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA4LzExMDkwOC8iLCJpZHgiOjMyLCJ0aXRsZSI6Ik5vdiA5LCAyMDA4IiwidWlkIjoiMTEwOTA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJKdWxpZWY4In0seyJkZXNjIjoiVDE1LjIgVGltZSBhbmQgRXRlcm5pdHkiLCJub3RlIjoiYXVkaW8gbGluayBvbiBjZWxlc3RpYWxyZWFsbSBpcyBtZXNzZWQgdXAgYnV0IGdvdCBpdCBmcm9tIHJhamNhc3QiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOC8xMTIzMDgvIiwiaWR4IjozMywidGl0bGUiOiJOb3YgMjMsIDIwMDgiLCJ1aWQiOiIxMTIzMDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Ikp1bGllZjgifV19fSx7ImlkIjoxMCwiYmlkIjoiMjAwOSIsInRpdGxlIjoiQUNJTSBTdHVkeSBHcm91cCAtIDIwMDkiLCJ1bml0cyI6eyJwYWdlIjpbeyJ1cmwiOiIvbndmZmFjaW0vaW50cm8vMjAwOS8iLCJpZHgiOjAsInRpdGxlIjoiQWJvdXQgMjAwOSBUcmFuc2NyaXB0cyIsInVpZCI6IjIwMDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7ImRlc2MiOiJUMTUuMiBUaW1lIGFuZCBFdGVybml0eSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA5LzAxMDMwOS8iLCJpZHgiOjEsInRpdGxlIjoiSmFuIDMsIDIwMDkiLCJ1aWQiOiIwMTAzMDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Ikp1bGllZjgifSx7ImRlc2MiOiJUMTUuMiBUaW1lIGFuZCBFdGVybml0eSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA5LzAxMTAwOS8iLCJpZHgiOjIsInRpdGxlIjoiSmFuIDEwLCAyMDA5IiwidWlkIjoiMDExMDA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJKdWxpZWY4In0seyJkZXNjIjoiVDE1LjIgVGltZSBhbmQgRXRlcm5pdHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOS8wMTE3MDkvIiwiaWR4IjozLCJ0aXRsZSI6IkphbiAxNywgMjAwOSIsInVpZCI6IjAxMTcwOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE1LjMgTGl0dGxlbmVzcyB2ZXJzdXMgTWFnbml0dWRlIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDEyNDA5LyIsImlkeCI6NCwidGl0bGUiOiJKYW4gMjQsIDIwMDkiLCJ1aWQiOiIwMTI0MDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTUuMyBMaXR0bGVuZXNzIHZlcnN1cyBNYWduaXR1ZGUiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOS8wMjA3MDkvIiwiaWR4Ijo1LCJ0aXRsZSI6IkZlYiA3LCAyMDA5IiwidWlkIjoiMDIwNzA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjMgTGl0dGxlbmVzcyB2ZXJzdXMgTWFnbml0dWRlIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDIyODA5LyIsImlkeCI6NiwidGl0bGUiOiJGZWIgMjgsIDIwMDkiLCJ1aWQiOiIwMjI4MDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTUuMyBMaXR0bGVuZXNzIHZlcnN1cyBNYWduaXR1ZGUiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOS8wMzE0MDkvIiwiaWR4Ijo3LCJ0aXRsZSI6Ik1hciAxNCwgMjAwOSIsInVpZCI6IjAzMTQwOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNS40IFByYWN0aWNpbmcgdGhlIEhvbHkgSW5zdGFudCIsInVybCI6Ii9ud2ZmYWNpbS8yMDA5LzAzMjgwOS8iLCJpZHgiOjgsInRpdGxlIjoiTWFyIDI4LCAyMDA5IiwidWlkIjoiMDMyODA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjQgUHJhY3RpY2luZyB0aGUgSG9seSBJbnN0YW50IiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDQwNDA5LyIsImlkeCI6OSwidGl0bGUiOiJBcHIgNCwgMjAwOSIsInVpZCI6IjA0MDQwOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNS4zIExpdHRsZW5lc3MgdmVyc3VzIE1hZ25pdHVkZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDA5LzA0MTIwOS8iLCJpZHgiOjEwLCJ0aXRsZSI6IkFwciAxMiwgMjAwOSIsInVpZCI6IjA0MTIwOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNS41IFRoZSBIb2x5IEluc3RhbnQgYW5kIFNwZWNpYWwgUmVsYXRpb25zaGlwcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA5LzA0MjUwOS8iLCJpZHgiOjExLCJ0aXRsZSI6IkFwciAyNSwgMjAwOSIsInVpZCI6IjA0MjUwOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNS41IFRoZSBIb2x5IEluc3RhbnQgYW5kIFNwZWNpYWwgUmVsYXRpb25zaGlwcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDA5LzA1MDkwOS8iLCJpZHgiOjEyLCJ0aXRsZSI6Ik1heSA5LCAyMDA5IiwidWlkIjoiMDUwOTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjUgVGhlIEhvbHkgSW5zdGFudCBhbmQgU3BlY2lhbCBSZWxhdGlvbnNoaXBzIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDUyNDA5LyIsImlkeCI6MTMsInRpdGxlIjoiTWF5IDI0LCAyMDA5IiwidWlkIjoiMDUyNDA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjUgVGhlIEhvbHkgSW5zdGFudCBhbmQgU3BlY2lhbCBSZWxhdGlvbnNoaXBzIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDUzMTA5LyIsImlkeCI6MTQsInRpdGxlIjoiTWF5IDMxLCAyMDA5IiwidWlkIjoiMDUzMTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjUgVGhlIEhvbHkgSW5zdGFudCBhbmQgU3BlY2lhbCBSZWxhdGlvbnNoaXBzIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDYwNzA5LyIsImlkeCI6MTUsInRpdGxlIjoiSnVuIDcsIDIwMDkiLCJ1aWQiOiIwNjA3MDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTUuNiBUaGUgSG9seSBJbnN0YW50IGFuZCB0aGUgTGF3cyBvZiBHb2QiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOS8wNjEzMDkvIiwiaWR4IjoxNiwidGl0bGUiOiJKdW4gMTMsIDIwMDkiLCJ1aWQiOiIwNjEzMDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTUuNiBUaGUgSG9seSBJbnN0YW50IGFuZCB0aGUgTGF3cyBvZiBHb2QiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOS8wNjIwMDkvIiwiaWR4IjoxNywidGl0bGUiOiJKdW4gMjAsIDIwMDkiLCJ1aWQiOiIwNjIwMDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDcxMTA5LyIsImlkeCI6MTgsInRpdGxlIjoiSnVsIDExLCAyMDA5IiwidWlkIjoiMDcxMTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA5LzA3MTgwOS8iLCJpZHgiOjE5LCJ0aXRsZSI6Ikp1bCAxOCwgMjAwOSIsInVpZCI6IjA3MTgwOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNS43IFRoZSBIb2x5IEluc3RhbnQgYW5kIENvbW11bmljYXRpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAwOS8wNzI1MDkvIiwiaWR4IjoyMCwidGl0bGUiOiJKdWwgMjUsIDIwMDkiLCJ1aWQiOiIwNzI1MDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTUuNyBUaGUgSG9seSBJbnN0YW50IGFuZCBDb21tdW5pY2F0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDgwMTA5LyIsImlkeCI6MjEsInRpdGxlIjoiQXVnIDEsIDIwMDkiLCJ1aWQiOiIwODAxMDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTUuNyBUaGUgSG9seSBJbnN0YW50IGFuZCBDb21tdW5pY2F0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDgwODA5LyIsImlkeCI6MjIsInRpdGxlIjoiQXVnIDgsIDIwMDkiLCJ1aWQiOiIwODA4MDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTUuNyBUaGUgSG9seSBJbnN0YW50IGFuZCBDb21tdW5pY2F0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDgyOTA5LyIsImlkeCI6MjMsInRpdGxlIjoiQXVnIDI5LCAyMDA5IiwidWlkIjoiMDgyOTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjcgVGhlIEhvbHkgSW5zdGFudCBhbmQgQ29tbXVuaWNhdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDA5LzA5MDUwOS8iLCJpZHgiOjI0LCJ0aXRsZSI6IlNlcCA1LCAyMDA5IiwidWlkIjoiMDkwNTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjggVGhlIEhvbHkgSW5zdGFudCBhbmQgUmVhbCBSZWxhdGlvbnNoaXBzIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDkxMjA5LyIsImlkeCI6MjUsInRpdGxlIjoiU2VwIDEyLCAyMDA5IiwidWlkIjoiMDkxMjA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjggVGhlIEhvbHkgSW5zdGFudCBhbmQgUmVhbCBSZWxhdGlvbnNoaXBzIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDkxOTA5LyIsImlkeCI6MjYsInRpdGxlIjoiU2VwIDE5LCAyMDA5IiwidWlkIjoiMDkxOTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjggVGhlIEhvbHkgSW5zdGFudCBhbmQgUmVhbCBSZWxhdGlvbnNoaXBzIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMDkyNzA5LyIsImlkeCI6MjcsInRpdGxlIjoiU2VwIDI3LCAyMDA5IiwidWlkIjoiMDkyNzA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjggVGhlIEhvbHkgSW5zdGFudCBhbmQgUmVhbCBSZWxhdGlvbnNoaXBzIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMTAxMDA5LyIsImlkeCI6MjgsInRpdGxlIjoiT2N0IDEwLCAyMDA5IiwidWlkIjoiMTAxMDA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjkgVGhlIFRpbWUgb2YgQ2hyaXN0IiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMTAyNDA5LyIsImlkeCI6MjksInRpdGxlIjoiT2N0IDI0LCAyMDA5IiwidWlkIjoiMTAyNDA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjkgVGhlIFRpbWUgb2YgQ2hyaXN0IiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMTAzMTA5LyIsImlkeCI6MzAsInRpdGxlIjoiT2N0IDMxLCAyMDA5IiwidWlkIjoiMTAzMTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjkgVGhlIFRpbWUgb2YgQ2hyaXN0IiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMTExNDA5LyIsImlkeCI6MzEsInRpdGxlIjoiTm92IDE0LCAyMDA5IiwidWlkIjoiMTExNDA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjEwIFRoZSBFbmQgb2YgU2FjcmlmaWNlIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMTEyMjA5LyIsImlkeCI6MzIsInRpdGxlIjoiTm92IDIyLCAyMDA5IiwidWlkIjoiMTEyMjA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE1LjEwIFRoZSBFbmQgb2YgU2FjcmlmaWNlIiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMTEyODA5LyIsImlkeCI6MzMsInRpdGxlIjoiTm92IDI4LCAyMDA5IiwidWlkIjoiMTEyODA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE2LjEgVHJ1ZSBFbXBhdGh5IiwidXJsIjoiL253ZmZhY2ltLzIwMDkvMTIwNTA5LyIsImlkeCI6MzQsInRpdGxlIjoiRGVjIDUsIDIwMDkiLCJ1aWQiOiIxMjA1MDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTYuMSBUcnVlIEVtcGF0aHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAwOS8xMjE5MDkvIiwiaWR4IjozNSwidGl0bGUiOiJEZWMgMTksIDIwMDkiLCJ1aWQiOiIxMjE5MDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifV19fSx7ImlkIjoxMSwiYmlkIjoiMjAxMCIsInRpdGxlIjoiQUNJTSBTdHVkeSBHcm91cCAtIDIwMTAiLCJ1bml0cyI6eyJwYWdlIjpbeyJ1cmwiOiIvbndmZmFjaW0vaW50cm8vMjAxMC8iLCJpZHgiOjAsInRpdGxlIjoiQWJvdXQgMjAxMCBUcmFuc2NyaXB0cyIsInVpZCI6IjIwMTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7ImRlc2MiOiJUMTYuMSBUcnVlIEVtcGF0aHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMC8wMTAyMTAvIiwiaWR4IjoxLCJ0aXRsZSI6IkphbiAyLCAyMDEwIiwidWlkIjoiMDEwMjEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTYuMiBUaGUgTWFnbml0dWRlIG9mIEhvbGluZXNzIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMDExNjEwLyIsImlkeCI6MiwidGl0bGUiOiJKYW4gMTYsIDIwMTAiLCJ1aWQiOiIwMTE2MTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6IkdsZW9wb2xkNTgifSx7ImRlc2MiOiJUMTYuMiBUaGUgTWFnbml0dWRlIG9mIEhvbGluZXNzIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMDEzMDEwLyIsImlkeCI6MywidGl0bGUiOiJKYW4gMzAsIDIwMTAiLCJ1aWQiOiIwMTMwMTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6IkdsZW9wb2xkNTgifSx7ImRlc2MiOiJUMTYuMiBUaGUgTWFnbml0dWRlIG9mIEhvbGluZXNzIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMDIwNjEwLyIsImlkeCI6NCwidGl0bGUiOiJGZWIgNiwgMjAxMCIsInVpZCI6IjAyMDYxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoiR2xlb3BvbGQ1OCJ9LHsiZGVzYyI6IlQxNi4yIFRoZSBNYWduaXR1ZGUgb2YgSG9saW5lc3MiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMC8wMjEzMTAvIiwiaWR4Ijo1LCJ0aXRsZSI6IkZlYiAxMywgMjAxMCIsInVpZCI6IjAyMTMxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoiR2xlb3BvbGQ1OCJ9LHsiZGVzYyI6IlQxNi4zIFRoZSBSZXdhcmQgb2YgVGVhY2hpbmciLCJ1cmwiOiIvbndmZmFjaW0vMjAxMC8wMzA2MTAvIiwiaWR4Ijo2LCJ0aXRsZSI6Ik1hciA2LCAyMDEwIiwidWlkIjoiMDMwNjEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE2LjMgVGhlIFJld2FyZCBvZiBUZWFjaGluZyIsInVybCI6Ii9ud2ZmYWNpbS8yMDEwLzAzMjAxMC8iLCJpZHgiOjcsInRpdGxlIjoiTWFyIDIwLCAyMDEwIiwidWlkIjoiMDMyMDEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE2LjQgSWxsdXNpb24gYW5kIFJlYWxpdHkgb2YgTG92ZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDEwLzAzMjcxMC8iLCJpZHgiOjgsInRpdGxlIjoiTWFyIDI3LCAyMDEwIiwidWlkIjoiMDMyNzEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE2LjQgSWxsdXNpb24gYW5kIFJlYWxpdHkgb2YgTG92ZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDEwLzA0MDMxMC8iLCJpZHgiOjksInRpdGxlIjoiQXByIDMsIDIwMTAiLCJ1aWQiOiIwNDAzMTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTYuNCBJbGx1c2lvbiBhbmQgUmVhbGl0eSBvZiBMb3ZlIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMDQxMDEwLyIsImlkeCI6MTAsInRpdGxlIjoiQXByIDEwLCAyMDEwIiwidWlkIjoiMDQxMDEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE2LjQgSWxsdXNpb24gYW5kIFJlYWxpdHkgb2YgTG92ZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDEwLzA1MDExMC8iLCJpZHgiOjExLCJ0aXRsZSI6Ik1heSAxLCAyMDEwIiwidWlkIjoiMDUwMTEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE2LjQgSWxsdXNpb24gYW5kIFJlYWxpdHkgb2YgTG92ZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDEwLzA1MTUxMC8iLCJpZHgiOjEyLCJ0aXRsZSI6Ik1heSAxNSwgMjAxMCIsInVpZCI6IjA1MTUxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNi40IElsbHVzaW9uIGFuZCBSZWFsaXR5IG9mIExvdmUiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMC8wNTI5MTAvIiwiaWR4IjoxMywidGl0bGUiOiJNYXkgMjksIDIwMTAiLCJ1aWQiOiIwNTI5MTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMDYwNTEwLyIsImlkeCI6MTQsInRpdGxlIjoiSnVuIDUsIDIwMTAiLCJ1aWQiOiIwNjA1MTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTYuNSBTcGVjaWFsbmVzcyBhbmQgR3VpbHQiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMC8wNjEyMTAvIiwiaWR4IjoxNSwidGl0bGUiOiJKdW4gMTIsIDIwMTAiLCJ1aWQiOiIwNjEyMTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTYuNSBTcGVjaWFsbmVzcyBhbmQgR3VpbHQiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMC8wNjE5MTAvIiwiaWR4IjoxNiwidGl0bGUiOiJKdW4gMTksIDIwMTAiLCJ1aWQiOiIwNjE5MTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMDcwMzEwLyIsImlkeCI6MTcsInRpdGxlIjoiSnVsIDMsIDIwMTAiLCJ1aWQiOiIwNzAzMTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMzEuNCBTZWxmLUNvbmNlcHQgdmVyc3VzIFNlbGYiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMC8wNzEwMTAvIiwiaWR4IjoxOCwidGl0bGUiOiJKdWwgMTAsIDIwMTAiLCJ1aWQiOiIwNzEwMTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMDcxNzEwLyIsImlkeCI6MTksInRpdGxlIjoiSnVsIDE3LCAyMDEwIiwidWlkIjoiMDcxNzEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEwLzA3MjQxMC8iLCJpZHgiOjIwLCJ0aXRsZSI6Ikp1bCAyNCwgMjAxMCIsInVpZCI6IjA3MjQxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMC8wODA3MTAvIiwiaWR4IjoyMSwidGl0bGUiOiJBdWcgNywgMjAxMCIsInVpZCI6IjA4MDcxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMC8wODI4MTAvIiwiaWR4IjoyMiwidGl0bGUiOiJBdWcgMjgsIDIwMTAiLCJ1aWQiOiIwODI4MTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMDkwNDEwLyIsImlkeCI6MjMsInRpdGxlIjoiU2VwIDQsIDIwMTAiLCJ1aWQiOiIwOTA0MTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMDkxMTEwLyIsImlkeCI6MjQsInRpdGxlIjoiU2VwIDExLCAyMDEwIiwidWlkIjoiMDkxMTEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEwLzA5MjUxMC8iLCJpZHgiOjI1LCJ0aXRsZSI6IlNlcCAyNSwgMjAxMCIsInVpZCI6IjA5MjUxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNi41IFNwZWNpYWxuZXNzIGFuZCBHdWlsdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDEwLzEwMDIxMC8iLCJpZHgiOjI2LCJ0aXRsZSI6Ik9jdCAyLCAyMDEwIiwidWlkIjoiMTAwMjEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEwLzEwMDkxMC8iLCJpZHgiOjI3LCJ0aXRsZSI6Ik9jdCA5LCAyMDEwIiwidWlkIjoiMTAwOTEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE2LjUgU3BlY2lhbG5lc3MgYW5kIEd1aWx0IiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMTAxNjEwLyIsImlkeCI6MjgsInRpdGxlIjoiT2N0IDE2LCAyMDEwIiwidWlkIjoiMTAxNjEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE2LjUgU3BlY2lhbG5lc3MgYW5kIEd1aWx0IiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMTAyMzEwLyIsImlkeCI6MjksInRpdGxlIjoiT2N0IDIzLCAyMDEwIiwidWlkIjoiMTAyMzEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE2LjUgU3BlY2lhbG5lc3MgYW5kIEd1aWx0IiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMTEwNjEwLyIsImlkeCI6MzAsInRpdGxlIjoiTm92IDYsIDIwMTAiLCJ1aWQiOiIxMTA2MTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTYuNiBUaGUgQnJpZGdlIHRvIHRoZSBSZWFsIFdvcmxkIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMTExMzEwLyIsImlkeCI6MzEsInRpdGxlIjoiTm92IDEzLCAyMDEwIiwidWlkIjoiMTExMzEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn0seyJkZXNjIjoiVDE2LjYgVGhlIEJyaWRnZSB0byB0aGUgUmVhbCBXb3JsZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDEwLzExMjAxMC8iLCJpZHgiOjMyLCJ0aXRsZSI6Ik5vdiAyMCwgMjAxMCIsInVpZCI6IjExMjAxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoibm9uZSJ9LHsiZGVzYyI6IlQxNi42IFRoZSBCcmlkZ2UgdG8gdGhlIFJlYWwgV29ybGQiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMC8xMTI3MTAvIiwiaWR4IjozMywidGl0bGUiOiJOb3YgMjcsIDIwMTAiLCJ1aWQiOiIxMTI3MTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJUMTYuNiBUaGUgQnJpZGdlIHRvIHRoZSBSZWFsIFdvcmxkIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMTIwNDEwLyIsImlkeCI6MzQsInRpdGxlIjoiRGVjIDQsIDIwMTAiLCJ1aWQiOiIxMjA0MTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6Im5vbmUifSx7ImRlc2MiOiJEaXN1Y3NzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTAvMTIxODEwLyIsImlkeCI6MzUsInRpdGxlIjoiRGVjIDE4LCAyMDEwIiwidWlkIjoiMTIxODEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJub25lIn1dfX0seyJpZCI6MTIsImJpZCI6IjIwMTEiLCJ0aXRsZSI6IkFDSU0gU3R1ZHkgR3JvdXAgLSAyMDExIiwidW5pdHMiOnsicGFnZSI6W3sidXJsIjoiL253ZmZhY2ltL2ludHJvLzIwMTEvIiwiaWR4IjowLCJ0aXRsZSI6IkFib3V0IDIwMTEgVHJhbnNjcmlwdHMiLCJ1aWQiOiIyMDExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJkZXNjIjoiVDE2LjYgVGhlIEJyaWRnZSB0byB0aGUgUmVhbCBXb3JsZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzAxMDExMS8iLCJpZHgiOjEsInRpdGxlIjoiSmFuIDEsIDIwMTEiLCJ1aWQiOiIwMTAxMTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxNi42IFRoZSBCcmlkZ2UgdG8gdGhlIFJlYWwgV29ybGQiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8wMTA4MTEvIiwiaWR4IjoyLCJ0aXRsZSI6IkphbiA4LCAyMDExIiwidWlkIjoiMDEwODExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMDExNTExLyIsImlkeCI6MywidGl0bGUiOiJKYW4gMTUsIDIwMTEiLCJ1aWQiOiIwMTE1MTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7ImRlc2MiOiJUMTYuNyBUaGUgRW5kIG9mIElsbHVzaW9ucyIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzAxMjIxMS8iLCJpZHgiOjQsInRpdGxlIjoiSmFuIDIyLCAyMDExIiwidWlkIjoiMDEyMjExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTYuNyBUaGUgRW5kIG9mIElsbHVzaW9ucyIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzAyMDUxMS8iLCJpZHgiOjUsInRpdGxlIjoiRmViIDUsIDIwMTEiLCJ1aWQiOiIwMjA1MTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxNi43IFRoZSBFbmQgb2YgSWxsdXNpb25zIiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMDIxNjExLyIsImlkeCI6NiwidGl0bGUiOiJGZWIgMTYsIDIwMTEiLCJ1aWQiOiIwMjE2MTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxNy4xIEZhbnRhc3kgYW5kIERpc3RvcnRlZCBQZXJjZXB0aW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMDIxOTExLyIsImlkeCI6NywidGl0bGUiOiJGZWIgMTksIDIwMTEiLCJ1aWQiOiIwMjE5MTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8wMzEyMTEvIiwiaWR4Ijo4LCJ0aXRsZSI6Ik1hciAxMiwgMjAxMSIsInVpZCI6IjAzMTIxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzAzMjAxMS8iLCJpZHgiOjksInRpdGxlIjoiTWFyIDIwLCAyMDExIiwidWlkIjoiMDMyMDExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMDMyNjExLyIsImlkeCI6MTAsInRpdGxlIjoiTWFyIDI2LCAyMDExIiwidWlkIjoiMDMyNjExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMDQwMzExLyIsImlkeCI6MTEsInRpdGxlIjoiQXByIDMsIDIwMTEiLCJ1aWQiOiIwNDAzMTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8wNDA5MTEvIiwiaWR4IjoxMiwidGl0bGUiOiJBcHIgOSwgMjAxMSIsInVpZCI6IjA0MDkxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE3LjEgRmFudGFzeSBhbmQgRGlzdG9ydGVkIFBlcmNlcHRpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8wNDE2MTEvIiwiaWR4IjoxMywidGl0bGUiOiJBcHIgMTYsIDIwMTEiLCJ1aWQiOiIwNDE2MTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxNy4yIFRoZSBGb3JnaXZlbiBXb3JsZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzA0MjMxMS8iLCJpZHgiOjE0LCJ0aXRsZSI6IkFwciAyMywgMjAxMSIsInVpZCI6IjA0MjMxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE3LjMgU2hhZG93cyBvZiB0aGUgUGFzdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzA0MzAxMS8iLCJpZHgiOjE1LCJ0aXRsZSI6IkFwciAzMCwgMjAxMSIsInVpZCI6IjA0MzAxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE3LjMgU2hhZG93cyBvZiB0aGUgUGFzdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzA1MDcxMS8iLCJpZHgiOjE2LCJ0aXRsZSI6Ik1heSA3LCAyMDExIiwidWlkIjoiMDUwNzExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTcuMyBTaGFkb3dzIG9mIHRoZSBQYXN0IiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMDUxNDExLyIsImlkeCI6MTcsInRpdGxlIjoiTWF5IDE0LCAyMDExIiwidWlkIjoiMDUxNDExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTcuNCBQZXJjZXB0aW9uIGFuZCB0aGUgVHdvIFdvcmxkcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzA1MjIxMS8iLCJpZHgiOjE4LCJ0aXRsZSI6Ik1heSAyMiwgMjAxMSIsInVpZCI6IjA1MjIxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE3LjQgUGVyY2VwdGlvbiBhbmQgdGhlIFR3byBXb3JsZHMiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8wNjA0MTEvIiwiaWR4IjoxOSwidGl0bGUiOiJKdW4gNCwgMjAxMSIsInVpZCI6IjA2MDQxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE3LjQgUGVyY2VwdGlvbiBhbmQgdGhlIFR3byBXb3JsZHMiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8wNjEyMTEvIiwiaWR4IjoyMCwidGl0bGUiOiJKdW4gMTIsIDIwMTEiLCJ1aWQiOiIwNjEyMTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxNy40IFBlcmNlcHRpb24gYW5kIHRoZSBUd28gV29ybGRzIiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMDYxODExLyIsImlkeCI6MjEsInRpdGxlIjoiSnVuIDE4LCAyMDExIiwidWlkIjoiMDYxODExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTcuNCBQZXJjZXB0aW9uIGFuZCB0aGUgVHdvIFdvcmxkcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzA2MjYxMS8iLCJpZHgiOjIyLCJ0aXRsZSI6Ikp1biAyNiwgMjAxMSIsInVpZCI6IjA2MjYxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiV29ya2Jvb2s6IExlc3NvbiAyMyIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzA3MDkxMS8iLCJpZHgiOjIzLCJ0aXRsZSI6Ikp1bCA5LCAyMDExIiwidWlkIjoiMDcwOTExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTcuNSBUaGUgSGVhbGVkIFJlbGF0aW9uc2hpcCIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzA3MTYxMS8iLCJpZHgiOjI0LCJ0aXRsZSI6Ikp1bCAxNiwgMjAxMSIsInVpZCI6IjA3MTYxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE3LjUgVGhlIEhlYWxlZCBSZWxhdGlvbnNoaXAiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8wNzMwMTEvIiwiaWR4IjoyNSwidGl0bGUiOiJKdWwgMzAsIDIwMTEiLCJ1aWQiOiIwNzMwMTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxNy41IFRoZSBIZWFsZWQgUmVsYXRpb25zaGlwIiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMDgwNjExLyIsImlkeCI6MjYsInRpdGxlIjoiQXVnIDYsIDIwMTEiLCJ1aWQiOiIwODA2MTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6IllvZGkuZGViZWJlIn0seyJkZXNjIjoiVDE3LjYgUHJhY3RpY2FsIEZvcmdpdmVuZXNzIiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMDgyMDExLyIsImlkeCI6MjcsInRpdGxlIjoiQXVnIDIwLCAyMDExIiwidWlkIjoiMDgyMDExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJZb2RpLmRlYmViZSJ9LHsiZGVzYyI6IlQxNy42IFByYWN0aWNhbCBGb3JnaXZlbmVzcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzA4MjcxMS8iLCJpZHgiOjI4LCJ0aXRsZSI6IkF1ZyAyNywgMjAxMSIsInVpZCI6IjA4MjcxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoiWW9kaS5kZWJlYmUifSx7ImRlc2MiOiJUMTcuNiBQcmFjdGljYWwgRm9yZ2l2ZW5lc3MiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8wOTAzMTEvIiwiaWR4IjoyOSwidGl0bGUiOiJTZXAgMywgMjAxMSIsInVpZCI6IjA5MDMxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoiWW9kaS5kZWJlYmUifSx7ImRlc2MiOiJUMTcuNyBUaGUgTmVlZCBmb3IgRmFpdGgiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8wOTE3MTEvIiwiaWR4IjozMCwidGl0bGUiOiJTZXAgMTcsIDIwMTEiLCJ1aWQiOiIwOTE3MTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6IllvZGkuZGViZWJlIn0seyJkZXNjIjoiVDE3LjcgVGhlIE5lZWQgZm9yIEZhaXRoIiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMDkyNDExLyIsImlkeCI6MzEsInRpdGxlIjoiU2VwIDI0LCAyMDExIiwidWlkIjoiMDkyNDExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJZb2RpLmRlYmViZSJ9LHsiZGVzYyI6IlQxNy43IFRoZSBOZWVkIGZvciBGYWl0aCIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzEwMDExMS8iLCJpZHgiOjMyLCJ0aXRsZSI6Ik9jdCAxLCAyMDExIiwidWlkIjoiMTAwMTExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJZb2RpLmRlYmViZSJ9LHsiZGVzYyI6IlQxNy43IFRoZSBOZWVkIGZvciBGYWl0aCIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzEwMTUxMS8iLCJpZHgiOjMzLCJ0aXRsZSI6Ik9jdCAxNSwgMjAxMSIsInVpZCI6IjEwMTUxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoiWW9kaS5kZWJlYmUifSx7ImRlc2MiOiJUMTcuOCBUaGUgQ29uZGl0aW9ucyBvZiBGb3JnaXZlbmVzcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzEwMjMxMS8iLCJpZHgiOjM0LCJ0aXRsZSI6Ik9jdCAyMywgMjAxMSIsInVpZCI6IjEwMjMxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoiWW9kaS5kZWJlYmUifSx7ImRlc2MiOiJUMTggVGhlIERyZWFtIGFuZCB0aGUgUmVhbGl0eSIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzExMDUxMS8iLCJpZHgiOjM1LCJ0aXRsZSI6Ik5vdiA1LCAyMDExIiwidWlkIjoiMTEwNTExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJZb2RpLmRlYmViZSJ9LHsiZGVzYyI6IlQxOCBUaGUgRHJlYW0gYW5kIHRoZSBSZWFsaXR5IiwidXJsIjoiL253ZmZhY2ltLzIwMTEvMTExMzExLyIsImlkeCI6MzYsInRpdGxlIjoiTm92IDEzLCAyMDExIiwidWlkIjoiMTExMzExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJZb2RpLmRlYmViZSJ9LHsiZGVzYyI6IlQxOC4xIFN1YnN0aXR1dGlvbiBhcyBhIERlZmVuc2UiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8xMTI2MTEvIiwiaWR4IjozNywidGl0bGUiOiJOb3YgMjYsIDIwMTEiLCJ1aWQiOiIxMTI2MTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6IllvZGkuZGViZWJlIn0seyJkZXNjIjoiVDE4LjEgU3Vic3RpdHV0aW9uIGFzIGEgRGVmZW5zZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzEyMDQxMS8iLCJpZHgiOjM4LCJ0aXRsZSI6IkRlYyA0LCAyMDExIiwidWlkIjoiMTIwNDExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZSwidGltZXIiOiJZb2RpLmRlYmViZSJ9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMS8xMjExMTEvIiwiaWR4IjozOSwidGl0bGUiOiJEZWMgMTEsIDIwMTEiLCJ1aWQiOiIxMjExMTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlLCJ0aW1lciI6IllvZGkuZGViZWJlIn0seyJkZXNjIjoiVDE4LjIgVGhlIEJhc2lzIG9mIHRoZSBEcmVhbSIsInVybCI6Ii9ud2ZmYWNpbS8yMDExLzEyMjAxMS8iLCJpZHgiOjQwLCJ0aXRsZSI6IkRlYyAyMCwgMjAxMSIsInVpZCI6IjEyMjAxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2UsInRpbWVyIjoiWW9kaS5kZWJlYmUifV19fSx7ImlkIjoxMywiYmlkIjoiMjAxMiIsInRpdGxlIjoiQUNJTSBTdHVkeSBHcm91cCAtIDIwMTIiLCJ1bml0cyI6eyJwYWdlIjpbeyJ1cmwiOiIvbndmZmFjaW0vaW50cm8vMjAxMi8iLCJpZHgiOjAsInRpdGxlIjoiQWJvdXQgMjAxMiBUcmFuc2NyaXB0cyIsInVpZCI6IjIwMTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7ImRlc2MiOiJUMTguMyBMaWdodCBpbiB0aGUgRHJlYW0iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMi8wMTA3MTIvIiwiaWR4IjoxLCJ0aXRsZSI6IkphbiA3LCAyMDEyIiwidWlkIjoiMDEwNzEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTguMyBMaWdodCBpbiB0aGUgRHJlYW0iLCJub3RlIjoiZ290IGF1ZGlvIGZyb20gUmFqY2FzdCIsInVybCI6Ii9ud2ZmYWNpbS8yMDEyLzAxMjIxMi8iLCJpZHgiOjIsInRpdGxlIjoiSmFuIDIyLCAyMDEyIiwidWlkIjoiMDEyMjEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTguNCBUaGUgTGl0dGxlIFdpbGxpbmduZXNzIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDIwNTEyLyIsImlkeCI6MywidGl0bGUiOiJGZWIgNSwgMjAxMiIsInVpZCI6IjAyMDUxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE4LjUgVGhlIEhhcHB5IERyZWFtIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDIxMjEyLyIsImlkeCI6NCwidGl0bGUiOiJGZWIgMTIsIDIwMTIiLCJ1aWQiOiIwMjEyMTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOC42IERyZWFtcyBhbmQgdGhlIEJvZHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMi8wMjE4MTIvIiwiaWR4Ijo1LCJ0aXRsZSI6IkZlYiAxOCwgMjAxMiIsInVpZCI6IjAyMTgxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE4LjYgRHJlYW1zIGFuZCB0aGUgQm9keSIsInVybCI6Ii9ud2ZmYWNpbS8yMDEyLzAzMjQxMi8iLCJpZHgiOjYsInRpdGxlIjoiTWFyIDI0LCAyMDEyIiwidWlkIjoiMDMyNDEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTguNiBEcmVhbXMgYW5kIHRoZSBCb2R5IiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDMzMTEyLyIsImlkeCI6NywidGl0bGUiOiJNYXIgMzEsIDIwMTIiLCJ1aWQiOiIwMzMxMTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOC43IEkgTmVlZCBkbyBOb3RoaW5nIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDQwODEyLyIsImlkeCI6OCwidGl0bGUiOiJBcHIgOCwgMjAxMiIsInVpZCI6IjA0MDgxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE4LjggVGhlIFB1cnBvc2Ugb2YgdGhlIEJvZHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMi8wNDE1MTIvIiwiaWR4Ijo5LCJ0aXRsZSI6IkFwciAxNSwgMjAxMiIsInVpZCI6IjA0MTUxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE4LjggVGhlIFB1cnBvc2Ugb2YgdGhlIEJvZHkiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMi8wNDIyMTIvIiwiaWR4IjoxMCwidGl0bGUiOiJBcHIgMjIsIDIwMTIiLCJ1aWQiOiIwNDIyMTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOC45IFRoZSBEZWx1c2lvbmFsIFRob3VnaHQgU3lzdGVtIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDQyOTEyLyIsImlkeCI6MTEsInRpdGxlIjoiQXByIDI5LCAyMDEyIiwidWlkIjoiMDQyOTEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTguMTAgVGhlIFBhc3Npbmcgb2YgdGhlIERyZWFtIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDUxMjEyLyIsImlkeCI6MTIsInRpdGxlIjoiTWF5IDEyLCAyMDEyIiwidWlkIjoiMDUxMjEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTkuMSBIZWFsaW5nIGFuZCB0aGUgTWluZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDEyLzA1MjAxMi8iLCJpZHgiOjEzLCJ0aXRsZSI6Ik1heSAyMCwgMjAxMiIsInVpZCI6IjA1MjAxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE5LjEgSGVhbGluZyBhbmQgdGhlIE1pbmQiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMi8wNjAzMTIvIiwiaWR4IjoxNCwidGl0bGUiOiJKdW4gMywgMjAxMiIsInVpZCI6IjA2MDMxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEyLzA2MTcxMi8iLCJpZHgiOjE1LCJ0aXRsZSI6Ikp1biAxNywgMjAxMiIsInVpZCI6IjA2MTcxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE5LjEgSGVhbGluZyBhbmQgdGhlIE1pbmQiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMi8wNzIyMTIvIiwiaWR4IjoxNiwidGl0bGUiOiJKdWwgMjIsIDIwMTIiLCJ1aWQiOiIwNzIyMTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOS4xIEhlYWxpbmcgYW5kIHRoZSBNaW5kIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDcyOTEyLyIsImlkeCI6MTcsInRpdGxlIjoiSnVsIDI5LCAyMDEyIiwidWlkIjoiMDcyOTEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTkuMiBTaW4gdnMgRXJyb3IiLCJub3RlIjoiQXVkaW8gYWJydXB0bHkgZW5kcyBhdCA1MToyMCIsInVybCI6Ii9ud2ZmYWNpbS8yMDEyLzA4MDQxMi8iLCJpZHgiOjE4LCJ0aXRsZSI6IkF1ZyA0LCAyMDEyIiwidWlkIjoiMDgwNDEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTkuMiBTaW4gdnMgRXJyb3IiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMi8wODExMTIvIiwiaWR4IjoxOSwidGl0bGUiOiJBdWcgMTEsIDIwMTIiLCJ1aWQiOiIwODExMTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOS4zIFRoZSBVbnJlYWxpdHkgb2YgU2luIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDgxODEyLyIsImlkeCI6MjAsInRpdGxlIjoiQXVnIDE4LCAyMDEyIiwidWlkIjoiMDgxODEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDgyNzEyLyIsImlkeCI6MjEsInRpdGxlIjoiQXVnIDI3LCAyMDEyIiwidWlkIjoiMDgyNzEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDkwODEyLyIsImlkeCI6MjIsInRpdGxlIjoiU2VwIDgsIDIwMTIiLCJ1aWQiOiIwOTA4MTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOS4zIFRoZSBVbnJlYWxpdHkgb2YgU2luIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMDkxNjEyLyIsImlkeCI6MjMsInRpdGxlIjoiU2VwIDE2LCAyMDEyIiwidWlkIjoiMDkxNjEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTkuMyBUaGUgVW5yZWFsaXR5IG9mIFNpbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEyLzA5MjMxMi8iLCJpZHgiOjI0LCJ0aXRsZSI6IlNlcCAyMywgMjAxMiIsInVpZCI6IjA5MjMxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE5LjQgVGhlIE9ic3RhY2xlcyB0byBQZWFjZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDEyLzA5MzAxMi8iLCJpZHgiOjI1LCJ0aXRsZSI6IlNlcCAzMCwgMjAxMiIsInVpZCI6IjA5MzAxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE5LjUgVGhlIEF0dHJhY3Rpb24gb2YgR3VpbHQiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMi8xMDA4MTIvIiwiaWR4IjoyNiwidGl0bGUiOiJPY3QgOCwgMjAxMiIsInVpZCI6IjEwMDgxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE5LjUgVGhlIEF0dHJhY3Rpb24gb2YgR3VpbHQiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMi8xMDE0MTIvIiwiaWR4IjoyNywidGl0bGUiOiJPY3QgMTQsIDIwMTIiLCJ1aWQiOiIxMDE0MTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOS41IFRoZSBBdHRyYWN0aW9uIG9mIEd1aWx0IiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMTAyMTEyLyIsImlkeCI6MjgsInRpdGxlIjoiT2N0IDIxLCAyMDEyIiwidWlkIjoiMTAyMTEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXN1Y3NzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTIvMTEwNTEyLyIsImlkeCI6MjksInRpdGxlIjoiTm92IDUsIDIwMTIiLCJ1aWQiOiIxMTA1MTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOS42IE9ic3RhY2xlcyB0byBQZWFjZSwgVGhlIFNlY29uZCBPYnN0YWNsZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDEyLzExMTIxMi8iLCJpZHgiOjMwLCJ0aXRsZSI6Ik5vdiAxMiwgMjAxMiIsInVpZCI6IjExMTIxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX1dfX0seyJpZCI6MTQsImJpZCI6IjIwMTMiLCJ0aXRsZSI6IkFDSU0gU3R1ZHkgR3JvdXAgLSAyMDEzIiwidW5pdHMiOnsicGFnZSI6W3sidXJsIjoiL253ZmZhY2ltL2ludHJvLzIwMTMvIiwiaWR4IjowLCJ0aXRsZSI6IkFib3V0IDIwMTMgVHJhbnNjcmlwdHMiLCJ1aWQiOiIyMDEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEzLzA0MjcxMy8iLCJpZHgiOjEsInRpdGxlIjoiQXByIDI3LCAyMDEzIiwidWlkIjoiMDQyNzEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTMvMDUwNDEzLyIsImlkeCI6MiwidGl0bGUiOiJNYXkgNCwgMjAxMyIsInVpZCI6IjA1MDQxMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE5LjYgVGhlIE9ic3RhY2xlcyB0byBQZWFjZSwgVGhlIFNlY29uZCBPYnN0YWNsZSIsInVybCI6Ii9ud2ZmYWNpbS8yMDEzLzA1MTExMy8iLCJpZHgiOjMsInRpdGxlIjoiTWF5IDExLCAyMDEzIiwidWlkIjoiMDUxMTEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTkuNyBQbGVhc3VyZSBhbmQgUGFpbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEzLzA1MjAxMy8iLCJpZHgiOjQsInRpdGxlIjoiTWF5IDIwLCAyMDEzIiwidWlkIjoiMDUyMDEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTkuNyBQbGVhc3VyZSBhbmQgUGFpbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEzLzA1MjgxMy8iLCJpZHgiOjUsInRpdGxlIjoiTWF5IDI4LCAyMDEzIiwidWlkIjoiMDUyODEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTMvMDYwMjEzLyIsImlkeCI6NiwidGl0bGUiOiJKdW4gMiwgMjAxMyIsInVpZCI6IjA2MDIxMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEzLzA2MDkxMy8iLCJpZHgiOjcsInRpdGxlIjoiSnVuIDksIDIwMTMiLCJ1aWQiOiIwNjA5MTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMy8wNjI1MTMvIiwiaWR4Ijo4LCJ0aXRsZSI6Ikp1biAyNSwgMjAxMyIsInVpZCI6IjA2MjUxMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEzLzA2MzAxMy8iLCJpZHgiOjksInRpdGxlIjoiSnVuIDMwLCAyMDEzIiwidWlkIjoiMDYzMDEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTMuOCBUaGUgV2F5IG9mIFNhbHZhdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEzLzA3MDcxMy8iLCJpZHgiOjEwLCJ0aXRsZSI6Ikp1bCA3LCAyMDEzIiwidWlkIjoiMDcwNzEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMjcuNSBUaGUgSGVhbGluZyBFeGFtcGxlIiwidXJsIjoiL253ZmZhY2ltLzIwMTMvMDcxNDEzLyIsImlkeCI6MTEsInRpdGxlIjoiSnVsIDE0LCAyMDEzIiwidWlkIjoiMDcxNDEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMjcuNSBUaGUgSGVhbGluZyBFeGFtcGxlIiwidXJsIjoiL253ZmZhY2ltLzIwMTMvMDcyMTEzLyIsImlkeCI6MTIsInRpdGxlIjoiSnVsIDIxLCAyMDEzIiwidWlkIjoiMDcyMTEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMjcuNSBUaGUgSGVhbGluZyBFeGFtcGxlIiwidXJsIjoiL253ZmZhY2ltLzIwMTMvMDgwNDEzLyIsImlkeCI6MTMsInRpdGxlIjoiQXVnIDQsIDIwMTMiLCJ1aWQiOiIwODA0MTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMy8wODExMTMvIiwiaWR4IjoxNCwidGl0bGUiOiJBdWcgMTEsIDIwMTMiLCJ1aWQiOiIwODExMTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMy8wODI1MTMvIiwiaWR4IjoxNSwidGl0bGUiOiJBdWcgMjUsIDIwMTMiLCJ1aWQiOiIwODI1MTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMy8wOTAxMTMvIiwiaWR4IjoxNiwidGl0bGUiOiJTZXAgMSwgMjAxMyIsInVpZCI6IjA5MDExMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDEzLzA5MDgxMy8iLCJpZHgiOjE3LCJ0aXRsZSI6IlNlcCA4LCAyMDEzIiwidWlkIjoiMDkwODEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTMvMDkxNTEzLyIsImlkeCI6MTgsInRpdGxlIjoiU2VwIDE1LCAyMDEzIiwidWlkIjoiMDkxNTEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMzAuMSBSdWxlcyBmb3IgRGVjaXNpb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMy8wOTIzMTMvIiwiaWR4IjoxOSwidGl0bGUiOiJTZXAgMjMsIDIwMTMiLCJ1aWQiOiIwOTIzMTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQzMC4yIEZyZWVkb20gb2YgV2lsbCIsInVybCI6Ii9ud2ZmYWNpbS8yMDEzLzEwMDYxMy8iLCJpZHgiOjIwLCJ0aXRsZSI6Ik9jdCA2LCAyMDEzIiwidWlkIjoiMTAwNjEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTMvMTAxNTEzLyIsImlkeCI6MjEsInRpdGxlIjoiT2N0IDE1LCAyMDEzIiwidWlkIjoiMTAxNTEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTMvMTAyMDEzLyIsImlkeCI6MjIsInRpdGxlIjoiT2N0IDIwLCAyMDEzIiwidWlkIjoiMTAyMDEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTEuNyBUaGUgR3VpZGUgZm9yIE1pcmFjbGVzIiwidXJsIjoiL253ZmZhY2ltLzIwMTMvMTAyNzEzLyIsImlkeCI6MjMsInRpdGxlIjoiT2N0IDI3LCAyMDEzIiwidWlkIjoiMTAyNzEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTMvMTEwMzEzLyIsImlkeCI6MjQsInRpdGxlIjoiTm92IDMsIDIwMTMiLCJ1aWQiOiIxMTAzMTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxNS4xIFRoZSBVc2VzIG9mIFRpbWUiLCJ1cmwiOiIvbndmZmFjaW0vMjAxMy8xMTI0MTMvIiwiaWR4IjoyNSwidGl0bGUiOiJOb3YgMjQsIDIwMTMiLCJ1aWQiOiIxMTI0MTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMy8xMjIyMTMvIiwiaWR4IjoyNiwidGl0bGUiOiJEZWMgMjIsIDIwMTMiLCJ1aWQiOiIxMjIyMTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxMy8xMjMwMTMvIiwiaWR4IjoyNywidGl0bGUiOiJEZWMgMzAsIDIwMTMiLCJ1aWQiOiIxMjMwMTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9XX19LHsiaWQiOjE1LCJiaWQiOiIyMDE0IiwidGl0bGUiOiJBQ0lNIFN0dWR5IEdyb3VwIC0gMjAxNCIsInVuaXRzIjp7InBhZ2UiOlt7InVybCI6Ii9ud2ZmYWNpbS9pbnRyby8yMDE0LyIsImlkeCI6MCwidGl0bGUiOiJBYm91dCAyMDE0IFRyYW5zY3JpcHRzIiwidWlkIjoiMjAxNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxNC8wMTA2MTQvIiwiaWR4IjoxLCJ0aXRsZSI6IkphbiA2LCAyMDE0IiwidWlkIjoiMDEwNjE0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTQvMDExNDE0LyIsImlkeCI6MiwidGl0bGUiOiJKYW4gMTQsIDIwMTQiLCJ1aWQiOiIwMTE0MTQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxNC8wMTI4MTQvIiwiaWR4IjozLCJ0aXRsZSI6IkphbiAyOCwgMjAxNCIsInVpZCI6IjAxMjgxNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDE0LzAyMDkxNC8iLCJpZHgiOjQsInRpdGxlIjoiRmViIDksIDIwMTQiLCJ1aWQiOiIwMjA5MTQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxNC8wMjI0MTQvIiwiaWR4Ijo1LCJ0aXRsZSI6IkZlYiAyNCwgMjAxNCIsInVpZCI6IjAyMjQxNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDE0LzAzMDkxNC8iLCJpZHgiOjYsInRpdGxlIjoiTWFyIDksIDIwMTQiLCJ1aWQiOiIwMzA5MTQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxNS40IFByYWN0aWNpbmcgdGhlIEhvbHkgSW5zdGFudCIsInVybCI6Ii9ud2ZmYWNpbS8yMDE0LzA0MTMxNC8iLCJpZHgiOjcsInRpdGxlIjoiQXByIDEzLCAyMDE0IiwidWlkIjoiMDQxMzE0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXN1Y3NzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTQvMDYxNjE0LyIsImlkeCI6OCwidGl0bGUiOiJKdW4gMTYsIDIwMTQiLCJ1aWQiOiIwNjE2MTQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc3Vjc3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxNC8wNjI5MTQvIiwiaWR4Ijo5LCJ0aXRsZSI6Ikp1biAyOSwgMjAxNCIsInVpZCI6IjA2MjkxNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiRGlzdWNzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDE0LzA5MTUxNC8iLCJpZHgiOjEwLCJ0aXRsZSI6IlNlcCAxNSwgMjAxNCIsInVpZCI6IjA5MTUxNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX1dfX0seyJpZCI6MTYsImJpZCI6IjIwMTUiLCJ0aXRsZSI6IkFDSU0gU3R1ZHkgR3JvdXAgLSAyMDE1IiwidW5pdHMiOnsicGFnZSI6W3sidXJsIjoiL253ZmZhY2ltL2ludHJvLzIwMTUvIiwiaWR4IjowLCJ0aXRsZSI6IkFib3V0IDIwMTUgVHJhbnNjcmlwdHMiLCJ1aWQiOiIyMDE1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJkZXNjIjoiRGlzY3Vzc2lvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDE1LzA0MTgxNS8iLCJpZHgiOjEsInRpdGxlIjoiQXByIDE4LCAyMDE1IiwidWlkIjoiMDQxODE1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTkuNiBPYnN0YWNsZXMgdG8gUGVhY2U7IEJlbGllZiB0aGUgQm9keSBpcyBWYWx1YWJsZSZoZWxsaXA7IiwidXJsIjoiL253ZmZhY2ltLzIwMTUvMDQyNTE1LyIsImlkeCI6MiwidGl0bGUiOiJBcHIgMjUsIDIwMTUiLCJ1aWQiOiIwNDI1MTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOS43IFBsZWFzdXJlIGFuZCBQYWluIiwidXJsIjoiL253ZmZhY2ltLzIwMTUvMDUwMzE1LyIsImlkeCI6MywidGl0bGUiOiJNYXkgMywgMjAxNSIsInVpZCI6IjA1MDMxNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE5LjcgUGxlYXN1cmUgYW5kIFBhaW4iLCJ1cmwiOiIvbndmZmFjaW0vMjAxNS8wNTA5MTUvIiwiaWR4Ijo0LCJ0aXRsZSI6Ik1heSA5LCAyMDE1IiwidWlkIjoiMDUwOTE1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTkuOCBPYnN0YWNsZXMgdG8gUGVhY2U7IFRoZSBBdHRyYWN0aW9uIG9mIERlYXRoIiwidXJsIjoiL253ZmZhY2ltLzIwMTUvMDUxNzE1LyIsImlkeCI6NSwidGl0bGUiOiJNYXkgMTcsIDIwMTUiLCJ1aWQiOiIwNTE3MTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOS44IE9ic3RhY2xlcyB0byBQZWFjZTsgVGhlIEF0dHJhY3Rpb24gb2YgRGVhdGgiLCJ1cmwiOiIvbndmZmFjaW0vMjAxNS8wNjA3MTUvIiwiaWR4Ijo2LCJ0aXRsZSI6Ikp1biA3LCAyMDE1IiwidWlkIjoiMDYwNzE1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMTkuMTAgT2JzdGFjbGVzIHRvIFBlYWNlOyBUaGUgRmVhciBvZiBHb2QiLCJ1cmwiOiIvbndmZmFjaW0vMjAxNS8wNjE0MTUvIiwiaWR4Ijo3LCJ0aXRsZSI6Ikp1biAxNCwgMjAxNSIsInVpZCI6IjA2MTQxNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDE5LjEwIE9ic3RhY2xlcyB0byBQZWFjZTsgVGhlIEZlYXIgb2YgR29kIiwidXJsIjoiL253ZmZhY2ltLzIwMTUvMDYyMTE1LyIsImlkeCI6OCwidGl0bGUiOiJKdW4gMjEsIDIwMTUiLCJ1aWQiOiIwNjIxMTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQxOS4xMSBUaGUgTGlmdGluZyBvZiB0aGUgVmVpbCIsInVybCI6Ii9ud2ZmYWNpbS8yMDE1LzA2MjgxNS8iLCJpZHgiOjksInRpdGxlIjoiSnVuIDI4LCAyMDE1IiwidWlkIjoiMDYyODE1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMjAgVGhlIFByb21pc2Ugb2YgdGhlIFJlc3VycmVjdGlvbiIsInVybCI6Ii9ud2ZmYWNpbS8yMDE1LzA3MDUxNS8iLCJpZHgiOjEwLCJ0aXRsZSI6Ikp1bCA1LCAyMDE1IiwidWlkIjoiMDcwNTE1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJUMjAuMiBUaG9ybnMgYW5kIExpbGllcyIsInVybCI6Ii9ud2ZmYWNpbS8yMDE1LzA3MTMxNS8iLCJpZHgiOjExLCJ0aXRsZSI6Ikp1bCAxMywgMjAxNSIsInVpZCI6IjA3MTMxNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX0seyJkZXNjIjoiVDIwLjIgVGhvcm5zIGFuZCBMaWxpZXMiLCJ1cmwiOiIvbndmZmFjaW0vMjAxNS8wNzIxMTUvIiwiaWR4IjoxMiwidGl0bGUiOiJKdWwgMjEsIDIwMTUiLCJ1aWQiOiIwNzIxMTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQyMC4yIFRob3JucyBhbmQgTGlsaWVzIiwidXJsIjoiL253ZmZhY2ltLzIwMTUvMDgwMTE1LyIsImlkeCI6MTMsInRpdGxlIjoiQXVnIDEsIDIwMTUiLCJ1aWQiOiIwODAxMTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQyMC4zIFNpbiBhcyBhbiBBZGp1c3RtZW50IiwidXJsIjoiL253ZmZhY2ltLzIwMTUvMDgyMzE1LyIsImlkeCI6MTQsInRpdGxlIjoiQXVnIDIzLCAyMDE1IiwidWlkIjoiMDgyMzE1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTUvMDkxMzE1LyIsImlkeCI6MTUsInRpdGxlIjoiU2VwIDEzLCAyMDE1IiwidWlkIjoiMDkxMzE1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTUvMTAwMjE1LyIsImlkeCI6MTYsInRpdGxlIjoiT2N0IDIsIDIwMTUiLCJ1aWQiOiIxMDAyMTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IkRpc2N1c3Npb24iLCJ1cmwiOiIvbndmZmFjaW0vMjAxNS8xMDIxMTUvIiwiaWR4IjoxNywidGl0bGUiOiJPY3QgMjEsIDIwMTUiLCJ1aWQiOiIxMDIxMTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlQyMC4zIFNpbiBhcyBhbiBBZGp1c3RtZW50IiwidXJsIjoiL253ZmZhY2ltLzIwMTUvMTEwMTE1LyIsImlkeCI6MTgsInRpdGxlIjoiTm92IDEsIDIwMTUiLCJ1aWQiOiIxMTAxMTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9XX19LHsiaWQiOjE3LCJiaWQiOiIyMDE2IiwidGl0bGUiOiJBQ0lNIFN0dWR5IEdyb3VwIC0gMjAxNiIsInVuaXRzIjp7InBhZ2UiOlt7InVybCI6Ii9ud2ZmYWNpbS9pbnRyby8yMDE2LyIsImlkeCI6MCwidGl0bGUiOiJBYm91dCAyMDE2IFRyYW5zY3JpcHRzIiwidWlkIjoiMjAxNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsiZGVzYyI6IlQxNS40IFByYWN0aWNpbmcgdGhlIEhvbHkgSW5zdGFudCIsInVybCI6Ii9ud2ZmYWNpbS8yMDE2LzA3MDMxNi8iLCJpZHgiOjEsInRpdGxlIjoiSnVsIDMsIDIwMTYiLCJ1aWQiOiIwNzAzMTYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOnRydWV9LHsiZGVzYyI6IlcxMiBJIGFtIHVwc2V0IGJlY2F1c2UgSSBzZWUgYSBtZWFuaW5nbGVzcyB3b3JsZCIsInVybCI6Ii9ud2ZmYWNpbS8yMDE2LzA3MTYxNi8iLCJpZHgiOjIsInRpdGxlIjoiSnVsIDE2LCAyMDE2IiwidWlkIjoiMDcxNjE2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjp0cnVlfSx7ImRlc2MiOiJEaXNjdXNzaW9uIiwidXJsIjoiL253ZmZhY2ltLzIwMTYvMDgwMjE2LyIsImlkeCI6MywidGl0bGUiOiJBdWcgMiwgMjAxNiIsInVpZCI6IjA4MDIxNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6dHJ1ZX1dfX1dfSx7ImlkIjozLCJ0aXRsZSI6IlNwYXJrbHkgQUNJTSIsInNpZCI6ImFjaW0iLCJib29rcyI6W3siaWQiOjEsImJpZCI6InRleHQiLCJ0aXRsZSI6IkFDSU0gVGV4dCIsInVuaXRzIjp7InBhZ2UiOlt7InVybCI6Ii9hY2ltL2ludHJvL3RleHQiLCJpZHgiOjAsInVpZCI6InRleCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMSBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzAxL2NoYXAwMTAwLyIsImlkeCI6MSwidWlkIjoiMDEvY2hhcDAxMDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEuMSBQcmluY2lwbGVzIG9mIE1pcmFjbGVzIiwidXJsIjoiL2FjaW0vdGV4dC8wMS9jaGFwMDEwMS8iLCJpZHgiOjIsInVpZCI6IjAxL2NoYXAwMTAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxLjIgRGlzdG9ydGlvbnMgb2YgTWlyYWNsZSBJbXB1bHNlcyIsInVybCI6Ii9hY2ltL3RleHQvMDEvY2hhcDAxMDIvIiwiaWR4IjozLCJ1aWQiOiIwMS9jaGFwMDEwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMiBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzAyL2NoYXAwMjAwLyIsImlkeCI6NCwidWlkIjoiMDIvY2hhcDAyMDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIuMSBUaGUgUmVpbnRlcnByZXRhdGlvbiBvZiBEZWZlbnNlcyIsInVybCI6Ii9hY2ltL3RleHQvMDIvY2hhcDAyMDEvIiwiaWR4Ijo1LCJ1aWQiOiIwMi9jaGFwMDIwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMi4yIEhlYWxpbmcgYXMgUmVsZWFzZSBmcm9tIEZlYXIiLCJ1cmwiOiIvYWNpbS90ZXh0LzAyL2NoYXAwMjAyLyIsImlkeCI6NiwidWlkIjoiMDIvY2hhcDAyMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIuMyBGZWFyIGFzIExhY2sgb2YgTG92ZSIsInVybCI6Ii9hY2ltL3RleHQvMDIvY2hhcDAyMDMvIiwiaWR4Ijo3LCJ1aWQiOiIwMi9jaGFwMDIwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMi40IFRoZSBDb3JyZWN0aW9uIGZvciBMYWNrIG9mIExvdmUiLCJ1cmwiOiIvYWNpbS90ZXh0LzAyL2NoYXAwMjA0LyIsImlkeCI6OCwidWlkIjoiMDIvY2hhcDAyMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIuNSBUaGUgTWVhbmluZyBvZiB0aGUgTGFzdCBKdWRnZW1lbnQiLCJ1cmwiOiIvYWNpbS90ZXh0LzAyL2NoYXAwMjA1LyIsImlkeCI6OSwidWlkIjoiMDIvY2hhcDAyMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8wMy9jaGFwMDMwMC8iLCJpZHgiOjEwLCJ1aWQiOiIwMy9jaGFwMDMwMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMy4xIFNwZWNpYWwgUHJpbmNpcGxlcyBmb3IgTWlyYWNsZSBXb3JrZXJzIiwidXJsIjoiL2FjaW0vdGV4dC8wMy9jaGFwMDMwMS8iLCJpZHgiOjExLCJ1aWQiOiIwMy9jaGFwMDMwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMy4yIEF0b25lbWVudCB3aXRob3V0IFNhY3JpZmljZSIsInVybCI6Ii9hY2ltL3RleHQvMDMvY2hhcDAzMDIvIiwiaWR4IjoxMiwidWlkIjoiMDMvY2hhcDAzMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMuMyBNaXJhY2xlcyBhcyBBY2N1cmF0ZSBQZXJjZXB0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8wMy9jaGFwMDMwMy8iLCJpZHgiOjEzLCJ1aWQiOiIwMy9jaGFwMDMwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMy40IFBlcmNlcHRpb24gVmVyc3VzIEtub3dsZWRnZSIsInVybCI6Ii9hY2ltL3RleHQvMDMvY2hhcDAzMDQvIiwiaWR4IjoxNCwidWlkIjoiMDMvY2hhcDAzMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMuNSBDb25mbGljdCBhbmQgdGhlIEVnbyIsInVybCI6Ii9hY2ltL3RleHQvMDMvY2hhcDAzMDUvIiwiaWR4IjoxNSwidWlkIjoiMDMvY2hhcDAzMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMuNiBUaGUgTG9zcyBvZiBDZXJ0YWludHkiLCJ1cmwiOiIvYWNpbS90ZXh0LzAzL2NoYXAwMzA2LyIsImlkeCI6MTYsInVpZCI6IjAzL2NoYXAwMzA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQzLjcgSnVkZ2VtZW50IGFuZCB0aGUgQXV0aG9yaXR5IFByb2JsZW0iLCJ1cmwiOiIvYWNpbS90ZXh0LzAzL2NoYXAwMzA3LyIsImlkeCI6MTcsInVpZCI6IjAzL2NoYXAwMzA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQzLjggQ3JlYXRpbmcgdmVyc3VzIHRoZSBTZWxmLUltYWdlIiwidXJsIjoiL2FjaW0vdGV4dC8wMy9jaGFwMDMwOC8iLCJpZHgiOjE4LCJ1aWQiOiIwMy9jaGFwMDMwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNCBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzA0L2NoYXAwNDAwLyIsImlkeCI6MTksInVpZCI6IjA0L2NoYXAwNDAwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ0LjEgUmlnaHQgVGVhY2hpbmcgYW5kIFJpZ2h0IExlYXJuaW5nIiwidXJsIjoiL2FjaW0vdGV4dC8wNC9jaGFwMDQwMS8iLCJpZHgiOjIwLCJ1aWQiOiIwNC9jaGFwMDQwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNC4yIFRoZSBFZ28gYW5kIEZhbHNlIEF1dG9ub215IiwidXJsIjoiL2FjaW0vdGV4dC8wNC9jaGFwMDQwMi8iLCJpZHgiOjIxLCJ1aWQiOiIwNC9jaGFwMDQwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNC4zIExvdmUgd2l0aG91dCBDb25mbGljdCIsInVybCI6Ii9hY2ltL3RleHQvMDQvY2hhcDA0MDMvIiwiaWR4IjoyMiwidWlkIjoiMDQvY2hhcDA0MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDQuNCBUaGUgRXNjYXBlIGZyb20gRmVhciIsInVybCI6Ii9hY2ltL3RleHQvMDQvY2hhcDA0MDQvIiwiaWR4IjoyMywidWlkIjoiMDQvY2hhcDA0MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDQuNSBUaGUgRWdvLUJvZHkgSWxsdXNpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzA0L2NoYXAwNDA1LyIsImlkeCI6MjQsInVpZCI6IjA0L2NoYXAwNDA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ0LjYgVGhlIENvbnN0YW50IFN0YXRlIiwidXJsIjoiL2FjaW0vdGV4dC8wNC9jaGFwMDQwNi8iLCJpZHgiOjI1LCJ1aWQiOiIwNC9jaGFwMDQwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNC43IENyZWF0aW9uIGFuZCBDb21tdW5pY2F0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8wNC9jaGFwMDQwNy8iLCJpZHgiOjI2LCJ1aWQiOiIwNC9jaGFwMDQwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNC44IFRydWUgUmVoYWJpbGl0YXRpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzA0L2NoYXAwNDA4LyIsImlkeCI6MjcsInVpZCI6IjA0L2NoYXAwNDA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ1IEludHJvZHVjdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMDUvY2hhcDA1MDAvIiwiaWR4IjoyOCwidWlkIjoiMDUvY2hhcDA1MDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDUuMSBIZWFsaW5nIGFzIEpvaW5pbmciLCJ1cmwiOiIvYWNpbS90ZXh0LzA1L2NoYXAwNTAxLyIsImlkeCI6MjksInVpZCI6IjA1L2NoYXAwNTAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ1LjIgVGhlIE1pbmQgb2YgdGhlIEF0b25lbWVudCIsInVybCI6Ii9hY2ltL3RleHQvMDUvY2hhcDA1MDIvIiwiaWR4IjozMCwidWlkIjoiMDUvY2hhcDA1MDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDUuMyBUaGUgVm9pY2UgZm9yIEdvZCIsInVybCI6Ii9hY2ltL3RleHQvMDUvY2hhcDA1MDMvIiwiaWR4IjozMSwidWlkIjoiMDUvY2hhcDA1MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDUuNCBUaGUgR3VpZGUgdG8gU2FsdmF0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8wNS9jaGFwMDUwNC8iLCJpZHgiOjMyLCJ1aWQiOiIwNS9jaGFwMDUwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNS41IFRoZXJhcHkgYW5kIFRlYWNoaW5nIiwidXJsIjoiL2FjaW0vdGV4dC8wNS9jaGFwMDUwNS8iLCJpZHgiOjMzLCJ1aWQiOiIwNS9jaGFwMDUwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNS42IFRoZSBUd28gRGVjaXNpb25zIiwidXJsIjoiL2FjaW0vdGV4dC8wNS9jaGFwMDUwNi8iLCJpZHgiOjM0LCJ1aWQiOiIwNS9jaGFwMDUwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNS43IFRpbWUgYW5kIEV0ZXJuaXR5IiwidXJsIjoiL2FjaW0vdGV4dC8wNS9jaGFwMDUwNy8iLCJpZHgiOjM1LCJ1aWQiOiIwNS9jaGFwMDUwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNS44IFRoZSBFdGVybmFsIEZpeGF0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8wNS9jaGFwMDUwOC8iLCJpZHgiOjM2LCJ1aWQiOiIwNS9jaGFwMDUwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNiBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzA2L2NoYXAwNjAwLyIsImlkeCI6MzcsInVpZCI6IjA2L2NoYXAwNjAwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ2LjEgVGhlIE1lc3NhZ2Ugb2YgdGhlIENydWNpZml4aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8wNi9jaGFwMDYwMS8iLCJpZHgiOjM4LCJ1aWQiOiIwNi9jaGFwMDYwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNi4yIFRoZSBVc2VzIG9mIFByb2plY3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzA2L2NoYXAwNjAyLyIsImlkeCI6MzksInVpZCI6IjA2L2NoYXAwNjAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ2LjMgVGhlIFJlbGlucXVpc2htZW50IG9mIEF0dGFjayIsInVybCI6Ii9hY2ltL3RleHQvMDYvY2hhcDA2MDMvIiwiaWR4Ijo0MCwidWlkIjoiMDYvY2hhcDA2MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDYuNCBUaGUgT25seSBBbnN3ZXIiLCJ1cmwiOiIvYWNpbS90ZXh0LzA2L2NoYXAwNjA0LyIsImlkeCI6NDEsInVpZCI6IjA2L2NoYXAwNjA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ3IEludHJvZHVjdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMDcvY2hhcDA3MDAvIiwiaWR4Ijo0MiwidWlkIjoiMDcvY2hhcDA3MDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDcuMSBCYXJnYWluaW5nIHZlcnN1cyBIZWFsaW5nIiwidXJsIjoiL2FjaW0vdGV4dC8wNy9jaGFwMDcwMS8iLCJpZHgiOjQzLCJ1aWQiOiIwNy9jaGFwMDcwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUNy4yIFRoZSBMYXdzIG9mIE1pbmQiLCJ1cmwiOiIvYWNpbS90ZXh0LzA3L2NoYXAwNzAyLyIsImlkeCI6NDQsInVpZCI6IjA3L2NoYXAwNzAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ3LjMgVGhlIFVuaWZpZWQgQ3VycmljdWx1bSIsInVybCI6Ii9hY2ltL3RleHQvMDcvY2hhcDA3MDMvIiwiaWR4Ijo0NSwidWlkIjoiMDcvY2hhcDA3MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDcuNCBUaGUgUmVjb2duaXRpb24gb2YgVHJ1dGgiLCJ1cmwiOiIvYWNpbS90ZXh0LzA3L2NoYXAwNzA0LyIsImlkeCI6NDYsInVpZCI6IjA3L2NoYXAwNzA0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ3LjUgSGVhbGluZyBhbmQgdGhlIENoYW5nZWxlc3NuZXNzIG9mIE1pbmQiLCJ1cmwiOiIvYWNpbS90ZXh0LzA3L2NoYXAwNzA1LyIsImlkeCI6NDcsInVpZCI6IjA3L2NoYXAwNzA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ3LjYgRnJvbSBWaWdpbGFuY2UgdG8gUGVhY2UiLCJ1cmwiOiIvYWNpbS90ZXh0LzA3L2NoYXAwNzA2LyIsImlkeCI6NDgsInVpZCI6IjA3L2NoYXAwNzA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ3LjcgVGhlIFRvdGFsIENvbW1pdG1lbnQiLCJ1cmwiOiIvYWNpbS90ZXh0LzA3L2NoYXAwNzA3LyIsImlkeCI6NDksInVpZCI6IjA3L2NoYXAwNzA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ3LjggVGhlIERlZmVuc2Ugb2YgQ29uZmxpY3QiLCJ1cmwiOiIvYWNpbS90ZXh0LzA3L2NoYXAwNzA4LyIsImlkeCI6NTAsInVpZCI6IjA3L2NoYXAwNzA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ3LjkgVGhlIEV4dGVuc2lvbiBvZiB0aGUgS2luZ2RvbSIsInVybCI6Ii9hY2ltL3RleHQvMDcvY2hhcDA3MDkvIiwiaWR4Ijo1MSwidWlkIjoiMDcvY2hhcDA3MDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDcuMTAgVGhlIENvbmZ1c2lvbiBvZiBTdHJlbmd0aCBhbmQgV2Vha25lc3MiLCJ1cmwiOiIvYWNpbS90ZXh0LzA3L2NoYXAwNzEwLyIsImlkeCI6NTIsInVpZCI6IjA3L2NoYXAwNzEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ3LjExIFRoZSBTdGF0ZSBvZiBHcmFjZSIsInVybCI6Ii9hY2ltL3RleHQvMDcvY2hhcDA3MTEvIiwiaWR4Ijo1MywidWlkIjoiMDcvY2hhcDA3MTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDggSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8wOC9jaGFwMDgwMC8iLCJpZHgiOjU0LCJ1aWQiOiIwOC9jaGFwMDgwMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUOC4xIFRoZSBEaXJlY3Rpb24gb2YgdGhlIEN1cnJpY3VsdW0iLCJ1cmwiOiIvYWNpbS90ZXh0LzA4L2NoYXAwODAxLyIsImlkeCI6NTUsInVpZCI6IjA4L2NoYXAwODAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ4LjIgVGhlIFJhdGlvbmFsZSBmb3IgQ2hvaWNlIiwidXJsIjoiL2FjaW0vdGV4dC8wOC9jaGFwMDgwMi8iLCJpZHgiOjU2LCJ1aWQiOiIwOC9jaGFwMDgwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUOC4zIFRoZSBIb2x5IEVuY291bnRlciIsInVybCI6Ii9hY2ltL3RleHQvMDgvY2hhcDA4MDMvIiwiaWR4Ijo1NywidWlkIjoiMDgvY2hhcDA4MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDguNCBUaGUgTGlnaHQgb2YgdGhlIFdvcmxkIiwidXJsIjoiL2FjaW0vdGV4dC8wOC9jaGFwMDgwNC8iLCJpZHgiOjU4LCJ1aWQiOiIwOC9jaGFwMDgwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUOC41IFRoZSBQb3dlciBvZiBKb2ludCBEZWNpc2lvbiIsInVybCI6Ii9hY2ltL3RleHQvMDgvY2hhcDA4MDUvIiwiaWR4Ijo1OSwidWlkIjoiMDgvY2hhcDA4MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDguNiBDb21tdW5pY2F0aW9uIGFuZCB0aGUgRWdvLUJvZHkgRXF1YXRpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzA4L2NoYXAwODA2LyIsImlkeCI6NjAsInVpZCI6IjA4L2NoYXAwODA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ4LjcgVGhlIEJvZHkgYXMgTWVhbnMgb3IgRW5kIiwidXJsIjoiL2FjaW0vdGV4dC8wOC9jaGFwMDgwNy8iLCJpZHgiOjYxLCJ1aWQiOiIwOC9jaGFwMDgwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUOC44IEhlYWxpbmcgYXMgQ29ycmVjdGVkIFBlcmNlcHRpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzA4L2NoYXAwODA4LyIsImlkeCI6NjIsInVpZCI6IjA4L2NoYXAwODA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ4LjkgVGhlIEFjY2VwdGFuY2Ugb2YgUmVhbGl0eSIsInVybCI6Ii9hY2ltL3RleHQvMDgvY2hhcDA4MDkvIiwiaWR4Ijo2MywidWlkIjoiMDgvY2hhcDA4MDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDguMTAgVGhlIEFuc3dlciB0byBQcmF5ZXIiLCJ1cmwiOiIvYWNpbS90ZXh0LzA4L2NoYXAwODEwLyIsImlkeCI6NjQsInVpZCI6IjA4L2NoYXAwODEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ5IEludHJvZHVjdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMDkvY2hhcDA5MDAvIiwiaWR4Ijo2NSwidWlkIjoiMDkvY2hhcDA5MDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDkuMSBTYW5pdHkgYW5kIFBlcmNlcHRpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzA5L2NoYXAwOTAxLyIsImlkeCI6NjYsInVpZCI6IjA5L2NoYXAwOTAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ5LjIgQXRvbmVtZW50IGFzIGEgTGVzc29uIGluIFNoYXJpbmciLCJ1cmwiOiIvYWNpbS90ZXh0LzA5L2NoYXAwOTAyLyIsImlkeCI6NjcsInVpZCI6IjA5L2NoYXAwOTAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ5LjMgVGhlIFVuaGVhbGVkIEhlYWxlciIsInVybCI6Ii9hY2ltL3RleHQvMDkvY2hhcDA5MDMvIiwiaWR4Ijo2OCwidWlkIjoiMDkvY2hhcDA5MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDkuNCBUaGUgQXdhcmVuZXNzIG9mIHRoZSBIb2x5IFNwaXJpdCIsInVybCI6Ii9hY2ltL3RleHQvMDkvY2hhcDA5MDQvIiwiaWR4Ijo2OSwidWlkIjoiMDkvY2hhcDA5MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDkuNSBTYWx2YXRpb24gYW5kIEdvZOKAmXMgV2lsbCIsInVybCI6Ii9hY2ltL3RleHQvMDkvY2hhcDA5MDUvIiwiaWR4Ijo3MCwidWlkIjoiMDkvY2hhcDA5MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDkuNiBHcmFuZGV1ciB2ZXJzdXMgR3JhbmRpb3NpdHkiLCJ1cmwiOiIvYWNpbS90ZXh0LzA5L2NoYXAwOTA2LyIsImlkeCI6NzEsInVpZCI6IjA5L2NoYXAwOTA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ5LjcgVGhlIEluY2x1c2l2ZW5lc3Mgb2YgQ3JlYXRpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzA5L2NoYXAwOTA3LyIsImlkeCI6NzIsInVpZCI6IjA5L2NoYXAwOTA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ5LjggVGhlIERlY2lzaW9uIHRvIEZvcmdldCIsInVybCI6Ii9hY2ltL3RleHQvMDkvY2hhcDA5MDgvIiwiaWR4Ijo3MywidWlkIjoiMDkvY2hhcDA5MDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDkuOSBNYWdpYyB2ZXJzdXMgTWlyYWNsZXMiLCJ1cmwiOiIvYWNpbS90ZXh0LzA5L2NoYXAwOTA5LyIsImlkeCI6NzQsInVpZCI6IjA5L2NoYXAwOTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQ5LjEwIFRoZSBEZW5pYWwgb2YgR29kIiwidXJsIjoiL2FjaW0vdGV4dC8wOS9jaGFwMDkxMC8iLCJpZHgiOjc1LCJ1aWQiOiIwOS9jaGFwMDkxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTAgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8xMC9jaGFwMTAwMC8iLCJpZHgiOjc2LCJ1aWQiOiIxMC9jaGFwMTAwMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTAuMSBQcm9qZWN0aW9uIHZlcnN1cyBFeHRlbnNpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzEwL2NoYXAxMDAxLyIsImlkeCI6NzcsInVpZCI6IjEwL2NoYXAxMDAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxMC4yIFRoZSBXaWxsaW5nbmVzcyBmb3IgSGVhbGluZyIsInVybCI6Ii9hY2ltL3RleHQvMTAvY2hhcDEwMDIvIiwiaWR4Ijo3OCwidWlkIjoiMTAvY2hhcDEwMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEwLjMgRnJvbSBEYXJrbmVzcyB0byBMaWdodCIsInVybCI6Ii9hY2ltL3RleHQvMTAvY2hhcDEwMDMvIiwiaWR4Ijo3OSwidWlkIjoiMTAvY2hhcDEwMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEwLjQgVGhlIEluaGVyaXRhbmNlIG9mIEdvZOKAmXMgU29uIiwidXJsIjoiL2FjaW0vdGV4dC8xMC9jaGFwMTAwNC8iLCJpZHgiOjgwLCJ1aWQiOiIxMC9jaGFwMTAwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTAuNSBUaGUg4oCcRHluYW1pY3PigJ0gb2YgdGhlIEVnbyIsInVybCI6Ii9hY2ltL3RleHQvMTAvY2hhcDEwMDUvIiwiaWR4Ijo4MSwidWlkIjoiMTAvY2hhcDEwMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEwLjYgRXhwZXJpZW5jZSBhbmQgUGVyY2VwdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMTAvY2hhcDEwMDYvIiwiaWR4Ijo4MiwidWlkIjoiMTAvY2hhcDEwMDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEwLjcgVGhlIFByb2JsZW0gYW5kIHRoZSBBbnN3ZXIiLCJ1cmwiOiIvYWNpbS90ZXh0LzEwL2NoYXAxMDA3LyIsImlkeCI6ODMsInVpZCI6IjEwL2NoYXAxMDA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxMSBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzExL2NoYXAxMTAwLyIsImlkeCI6ODQsInVpZCI6IjExL2NoYXAxMTAwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxMS4xIFRoZSBKdWRnZW1lbnQgb2YgdGhlIEhvbHkgU3Bpcml0IiwidXJsIjoiL2FjaW0vdGV4dC8xMS9jaGFwMTEwMS8iLCJpZHgiOjg1LCJ1aWQiOiIxMS9jaGFwMTEwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTEuMiBUaGUgTWVjaGFuaXNtIG9mIE1pcmFjbGVzIiwidXJsIjoiL2FjaW0vdGV4dC8xMS9jaGFwMTEwMi8iLCJpZHgiOjg2LCJ1aWQiOiIxMS9jaGFwMTEwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTEuMyBUaGUgSW52ZXN0bWVudCBpbiBSZWFsaXR5IiwidXJsIjoiL2FjaW0vdGV4dC8xMS9jaGFwMTEwMy8iLCJpZHgiOjg3LCJ1aWQiOiIxMS9jaGFwMTEwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTEuNCBTZWVraW5nIGFuZCBGaW5kaW5nIiwidXJsIjoiL2FjaW0vdGV4dC8xMS9jaGFwMTEwNC8iLCJpZHgiOjg4LCJ1aWQiOiIxMS9jaGFwMTEwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTEuNSBUaGUgU2FuZSBDdXJyaWN1bHVtIiwidXJsIjoiL2FjaW0vdGV4dC8xMS9jaGFwMTEwNS8iLCJpZHgiOjg5LCJ1aWQiOiIxMS9jaGFwMTEwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTEuNiBUaGUgVmlzaW9uIG9mIENocmlzdCIsInVybCI6Ii9hY2ltL3RleHQvMTEvY2hhcDExMDYvIiwiaWR4Ijo5MCwidWlkIjoiMTEvY2hhcDExMDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDExLjcgVGhlIEd1aWRlIGZvciBNaXJhY2xlcyIsInVybCI6Ii9hY2ltL3RleHQvMTEvY2hhcDExMDcvIiwiaWR4Ijo5MSwidWlkIjoiMTEvY2hhcDExMDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDExLjggUmVhbGl0eSBhbmQgUmVkZW1wdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMTEvY2hhcDExMDgvIiwiaWR4Ijo5MiwidWlkIjoiMTEvY2hhcDExMDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDExLjkgR3VpbHRsZXNzbmVzcyBhbmQgSW52dWxuZXJhYmlsaXR5IiwidXJsIjoiL2FjaW0vdGV4dC8xMS9jaGFwMTEwOS8iLCJpZHgiOjkzLCJ1aWQiOiIxMS9jaGFwMTEwOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTIgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8xMi9jaGFwMTIwMC8iLCJpZHgiOjk0LCJ1aWQiOiIxMi9jaGFwMTIwMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTIuMSBDcnVjaWZpeGlvbiBieSBHdWlsdCIsInVybCI6Ii9hY2ltL3RleHQvMTIvY2hhcDEyMDEvIiwiaWR4Ijo5NSwidWlkIjoiMTIvY2hhcDEyMDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEyLjIgVGhlIEZlYXIgb2YgUmVkZW1wdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMTIvY2hhcDEyMDIvIiwiaWR4Ijo5NiwidWlkIjoiMTIvY2hhcDEyMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEyLjMgSGVhbGluZyBhbmQgVGltZSIsInVybCI6Ii9hY2ltL3RleHQvMTIvY2hhcDEyMDMvIiwiaWR4Ijo5NywidWlkIjoiMTIvY2hhcDEyMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEyLjQgVGhlIFR3byBFbW90aW9ucyIsInVybCI6Ii9hY2ltL3RleHQvMTIvY2hhcDEyMDQvIiwiaWR4Ijo5OCwidWlkIjoiMTIvY2hhcDEyMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEyLjUgRmluZGluZyB0aGUgUHJlc2VudCIsInVybCI6Ii9hY2ltL3RleHQvMTIvY2hhcDEyMDUvIiwiaWR4Ijo5OSwidWlkIjoiMTIvY2hhcDEyMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEyLjYgQXR0YWlubWVudCBvZiB0aGUgUmVhbCBXb3JsZCIsInVybCI6Ii9hY2ltL3RleHQvMTIvY2hhcDEyMDYvIiwiaWR4IjoxMDAsInVpZCI6IjEyL2NoYXAxMjA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxMyBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzEzL2NoYXAxMzAwLyIsImlkeCI6MTAxLCJ1aWQiOiIxMy9jaGFwMTMwMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTMuMSBUaGUgUm9sZSBvZiBIZWFsaW5nIiwidXJsIjoiL2FjaW0vdGV4dC8xMy9jaGFwMTMwMS8iLCJpZHgiOjEwMiwidWlkIjoiMTMvY2hhcDEzMDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEzLjIgVGhlIFNoYWRvdyBvZiBHdWlsdCIsInVybCI6Ii9hY2ltL3RleHQvMTMvY2hhcDEzMDIvIiwiaWR4IjoxMDMsInVpZCI6IjEzL2NoYXAxMzAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxMy4zIFJlbGVhc2UgYW5kIFJlc3RvcmF0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8xMy9jaGFwMTMwMy8iLCJpZHgiOjEwNCwidWlkIjoiMTMvY2hhcDEzMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEzLjQgVGhlIEd1YXJhbnRlZSBvZiBIZWF2ZW4iLCJ1cmwiOiIvYWNpbS90ZXh0LzEzL2NoYXAxMzA0LyIsImlkeCI6MTA1LCJ1aWQiOiIxMy9jaGFwMTMwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTMuNSBUaGUgVGVzdGltb255IG9mIE1pcmFjbGVzIiwidXJsIjoiL2FjaW0vdGV4dC8xMy9jaGFwMTMwNS8iLCJpZHgiOjEwNiwidWlkIjoiMTMvY2hhcDEzMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDEzLjYgVGhlIEhhcHB5IExlYXJuZXIiLCJ1cmwiOiIvYWNpbS90ZXh0LzEzL2NoYXAxMzA2LyIsImlkeCI6MTA3LCJ1aWQiOiIxMy9jaGFwMTMwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTMuNyBUaGUgRGVjaXNpb24gZm9yIEd1aWx0bGVzc25lc3MiLCJ1cmwiOiIvYWNpbS90ZXh0LzEzL2NoYXAxMzA3LyIsImlkeCI6MTA4LCJ1aWQiOiIxMy9jaGFwMTMwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTMuOCBUaGUgV2F5IG9mIFNhbHZhdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMTMvY2hhcDEzMDgvIiwiaWR4IjoxMDksInVpZCI6IjEzL2NoYXAxMzA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNCBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzE0L2NoYXAxNDAwLyIsImlkeCI6MTEwLCJ1aWQiOiIxNC9jaGFwMTQwMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTQuMSBHdWlsdCBhbmQgR3VpbHRsZXNzbmVzcyIsInVybCI6Ii9hY2ltL3RleHQvMTQvY2hhcDE0MDEvIiwiaWR4IjoxMTEsInVpZCI6IjE0L2NoYXAxNDAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNC4yIE91dCBvZiB0aGUgRGFya25lc3MiLCJ1cmwiOiIvYWNpbS90ZXh0LzE0L2NoYXAxNDAyLyIsImlkeCI6MTEyLCJ1aWQiOiIxNC9jaGFwMTQwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTQuMyBQZXJjZXB0aW9uIHdpdGhvdXQgRGVjZWl0IiwidXJsIjoiL2FjaW0vdGV4dC8xNC9jaGFwMTQwMy8iLCJpZHgiOjExMywidWlkIjoiMTQvY2hhcDE0MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE0LjQgVGhlIFJlY29nbml0aW9uIG9mIEhvbGluZXNzIiwidXJsIjoiL2FjaW0vdGV4dC8xNC9jaGFwMTQwNC8iLCJpZHgiOjExNCwidWlkIjoiMTQvY2hhcDE0MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE0LjUgVGhlIFNoaWZ0IHRvIE1pcmFjbGVzIiwidXJsIjoiL2FjaW0vdGV4dC8xNC9jaGFwMTQwNS8iLCJpZHgiOjExNSwidWlkIjoiMTQvY2hhcDE0MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE0LjYgVGhlIFRlc3Qgb2YgVHJ1dGgiLCJ1cmwiOiIvYWNpbS90ZXh0LzE0L2NoYXAxNDA2LyIsImlkeCI6MTE2LCJ1aWQiOiIxNC9jaGFwMTQwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTUgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8xNS9jaGFwMTUwMC8iLCJpZHgiOjExNywidWlkIjoiMTUvY2hhcDE1MDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE1LjEgVGhlIFVzZXMgb2YgVGltZSIsInVybCI6Ii9hY2ltL3RleHQvMTUvY2hhcDE1MDEvIiwiaWR4IjoxMTgsInVpZCI6IjE1L2NoYXAxNTAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNS4yIFRpbWUgYW5kIEV0ZXJuaXR5IiwidXJsIjoiL2FjaW0vdGV4dC8xNS9jaGFwMTUwMi8iLCJpZHgiOjExOSwidWlkIjoiMTUvY2hhcDE1MDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE1LjMgTGl0dGxlbmVzcyB2ZXJzdXMgTWFnbml0dWRlIiwidXJsIjoiL2FjaW0vdGV4dC8xNS9jaGFwMTUwMy8iLCJpZHgiOjEyMCwidWlkIjoiMTUvY2hhcDE1MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE1LjQgUHJhY3RpY2luZyB0aGUgSG9seSBJbnN0YW50IiwidXJsIjoiL2FjaW0vdGV4dC8xNS9jaGFwMTUwNC8iLCJpZHgiOjEyMSwidWlkIjoiMTUvY2hhcDE1MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE1LjUgVGhlIEhvbHkgSW5zdGFudCBhbmQgU3BlY2lhbCBSZWxhdGlvbnNoaXBzIiwidXJsIjoiL2FjaW0vdGV4dC8xNS9jaGFwMTUwNS8iLCJpZHgiOjEyMiwidWlkIjoiMTUvY2hhcDE1MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE1LjYgVGhlIEhvbHkgSW5zdGFudCBhbmQgdGhlIExhd3Mgb2YgR29kIiwidXJsIjoiL2FjaW0vdGV4dC8xNS9jaGFwMTUwNi8iLCJpZHgiOjEyMywidWlkIjoiMTUvY2hhcDE1MDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE1LjcgVGhlIEhvbHkgSW5zdGFudCBhbmQgQ29tbXVuaWNhdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMTUvY2hhcDE1MDcvIiwiaWR4IjoxMjQsInVpZCI6IjE1L2NoYXAxNTA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNS44IFRoZSBIb2x5IEluc3RhbnQgYW5kIFJlYWwgUmVsYXRpb25zaGlwcyIsInVybCI6Ii9hY2ltL3RleHQvMTUvY2hhcDE1MDgvIiwiaWR4IjoxMjUsInVpZCI6IjE1L2NoYXAxNTA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNS45IFRoZSBUaW1lIG9mIENocmlzdCIsInVybCI6Ii9hY2ltL3RleHQvMTUvY2hhcDE1MDkvIiwiaWR4IjoxMjYsInVpZCI6IjE1L2NoYXAxNTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNS4xMCBUaGUgRW5kIG9mIFNhY3JpZmljZSIsInVybCI6Ii9hY2ltL3RleHQvMTUvY2hhcDE1MTAvIiwiaWR4IjoxMjcsInVpZCI6IjE1L2NoYXAxNTEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNiBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzE2L2NoYXAxNjAwLyIsImlkeCI6MTI4LCJ1aWQiOiIxNi9jaGFwMTYwMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTYuMSBUcnVlIEVtcGF0aHkiLCJ1cmwiOiIvYWNpbS90ZXh0LzE2L2NoYXAxNjAxLyIsImlkeCI6MTI5LCJ1aWQiOiIxNi9jaGFwMTYwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTYuMiBUaGUgTWFnbml0dWRlIG9mIEhvbGluZXNzIiwidXJsIjoiL2FjaW0vdGV4dC8xNi9jaGFwMTYwMi8iLCJpZHgiOjEzMCwidWlkIjoiMTYvY2hhcDE2MDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE2LjMgVGhlIFJld2FyZCBvZiBUZWFjaGluZyIsInVybCI6Ii9hY2ltL3RleHQvMTYvY2hhcDE2MDMvIiwiaWR4IjoxMzEsInVpZCI6IjE2L2NoYXAxNjAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNi40IElsbHVzaW9uIGFuZCBSZWFsaXR5IG9mIExvdmUiLCJ1cmwiOiIvYWNpbS90ZXh0LzE2L2NoYXAxNjA0LyIsImlkeCI6MTMyLCJ1aWQiOiIxNi9jaGFwMTYwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTYuNSBTcGVjaWFsbmVzcyBhbmQgR3VpbHQiLCJ1cmwiOiIvYWNpbS90ZXh0LzE2L2NoYXAxNjA1LyIsImlkeCI6MTMzLCJ1aWQiOiIxNi9jaGFwMTYwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTYuNiBUaGUgQnJpZGdlIHRvIHRoZSBSZWFsIFdvcmxkIiwidXJsIjoiL2FjaW0vdGV4dC8xNi9jaGFwMTYwNi8iLCJpZHgiOjEzNCwidWlkIjoiMTYvY2hhcDE2MDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE2LjcgVGhlIEVuZCBvZiBJbGx1c2lvbnMiLCJ1cmwiOiIvYWNpbS90ZXh0LzE2L2NoYXAxNjA3LyIsImlkeCI6MTM1LCJ1aWQiOiIxNi9jaGFwMTYwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTcgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8xNy9jaGFwMTcwMC8iLCJpZHgiOjEzNiwidWlkIjoiMTcvY2hhcDE3MDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE3LjEgRmFudGFzeSBhbmQgRGlzdG9ydGVkIFBlcmNlcHRpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzE3L2NoYXAxNzAxLyIsImlkeCI6MTM3LCJ1aWQiOiIxNy9jaGFwMTcwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTcuMiBUaGUgRm9yZ2l2ZW4gV29ybGQiLCJ1cmwiOiIvYWNpbS90ZXh0LzE3L2NoYXAxNzAyLyIsImlkeCI6MTM4LCJ1aWQiOiIxNy9jaGFwMTcwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTcuMyBTaGFkb3dzIG9mIHRoZSBQYXN0IiwidXJsIjoiL2FjaW0vdGV4dC8xNy9jaGFwMTcwMy8iLCJpZHgiOjEzOSwidWlkIjoiMTcvY2hhcDE3MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE3LjQgUGVyY2VwdGlvbiBhbmQgdGhlIFR3byBXb3JsZHMiLCJ1cmwiOiIvYWNpbS90ZXh0LzE3L2NoYXAxNzA0LyIsImlkeCI6MTQwLCJ1aWQiOiIxNy9jaGFwMTcwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTcuNSBUaGUgSGVhbGVkIFJlbGF0aW9uc2hpcCIsInVybCI6Ii9hY2ltL3RleHQvMTcvY2hhcDE3MDUvIiwiaWR4IjoxNDEsInVpZCI6IjE3L2NoYXAxNzA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNy42IFByYWN0aWNhbCBGb3JnaXZlbmVzcyIsInVybCI6Ii9hY2ltL3RleHQvMTcvY2hhcDE3MDYvIiwiaWR4IjoxNDIsInVpZCI6IjE3L2NoYXAxNzA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNy43IFRoZSBOZWVkIGZvciBGYWl0aCIsInVybCI6Ii9hY2ltL3RleHQvMTcvY2hhcDE3MDcvIiwiaWR4IjoxNDMsInVpZCI6IjE3L2NoYXAxNzA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxNy44IENvbmRpdGlvbnMgb2YgRm9yZ2l2ZW5lc3MiLCJ1cmwiOiIvYWNpbS90ZXh0LzE3L2NoYXAxNzA4LyIsImlkeCI6MTQ0LCJ1aWQiOiIxNy9jaGFwMTcwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTggSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8xOC9jaGFwMTgwMC8iLCJpZHgiOjE0NSwidWlkIjoiMTgvY2hhcDE4MDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE4LjEgU3Vic3RpdHV0aW9uIGFzIGEgRGVmZW5zZSIsInVybCI6Ii9hY2ltL3RleHQvMTgvY2hhcDE4MDEvIiwiaWR4IjoxNDYsInVpZCI6IjE4L2NoYXAxODAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxOC4yIFRoZSBCYXNpcyBvZiB0aGUgRHJlYW0iLCJ1cmwiOiIvYWNpbS90ZXh0LzE4L2NoYXAxODAyLyIsImlkeCI6MTQ3LCJ1aWQiOiIxOC9jaGFwMTgwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTguMyBMaWdodCBpbiB0aGUgRHJlYW0iLCJ1cmwiOiIvYWNpbS90ZXh0LzE4L2NoYXAxODAzLyIsImlkeCI6MTQ4LCJ1aWQiOiIxOC9jaGFwMTgwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTguNCBUaGUgTGl0dGxlIFdpbGxpbmduZXNzIiwidXJsIjoiL2FjaW0vdGV4dC8xOC9jaGFwMTgwNC8iLCJpZHgiOjE0OSwidWlkIjoiMTgvY2hhcDE4MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE4LjUgVGhlIEhhcHB5IERyZWFtIiwidXJsIjoiL2FjaW0vdGV4dC8xOC9jaGFwMTgwNS8iLCJpZHgiOjE1MCwidWlkIjoiMTgvY2hhcDE4MDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE4LjYgRHJlYW1zIGFuZCB0aGUgQm9keSIsInVybCI6Ii9hY2ltL3RleHQvMTgvY2hhcDE4MDYvIiwiaWR4IjoxNTEsInVpZCI6IjE4L2NoYXAxODA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxOC43IEkgTmVlZCBEbyBOb3RoaW5nIiwidXJsIjoiL2FjaW0vdGV4dC8xOC9jaGFwMTgwNy8iLCJpZHgiOjE1MiwidWlkIjoiMTgvY2hhcDE4MDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE4LjggVGhlIFB1cnBvc2Ugb2YgdGhlIEJvZHkiLCJ1cmwiOiIvYWNpbS90ZXh0LzE4L2NoYXAxODA4LyIsImlkeCI6MTUzLCJ1aWQiOiIxOC9jaGFwMTgwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTguOSBUaGUgRGVsdXNpb25hbCBUaG91Z2h0IFN5c3RlbSIsInVybCI6Ii9hY2ltL3RleHQvMTgvY2hhcDE4MDkvIiwiaWR4IjoxNTQsInVpZCI6IjE4L2NoYXAxODA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxOC4xMCBUaGUgUGFzc2luZyBvZiB0aGUgRHJlYW0iLCJ1cmwiOiIvYWNpbS90ZXh0LzE4L2NoYXAxODEwLyIsImlkeCI6MTU1LCJ1aWQiOiIxOC9jaGFwMTgxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTkgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8xOS9jaGFwMTkwMC8iLCJpZHgiOjE1NiwidWlkIjoiMTkvY2hhcDE5MDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE5LjEgSGVhbGluZyBhbmQgdGhlIE1pbmQiLCJ1cmwiOiIvYWNpbS90ZXh0LzE5L2NoYXAxOTAxLyIsImlkeCI6MTU3LCJ1aWQiOiIxOS9jaGFwMTkwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTkuMiBTaW4gdmVyc3VzIEVycm9yIiwidXJsIjoiL2FjaW0vdGV4dC8xOS9jaGFwMTkwMi8iLCJpZHgiOjE1OCwidWlkIjoiMTkvY2hhcDE5MDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE5LjMgVGhlIFVucmVhbGl0eSBvZiBTaW4iLCJ1cmwiOiIvYWNpbS90ZXh0LzE5L2NoYXAxOTAzLyIsImlkeCI6MTU5LCJ1aWQiOiIxOS9jaGFwMTkwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTkuNCBPYnN0YWNsZXMgdG8gUGVhY2U6PGJyLz5JLiBUaGUgRGVzaXJlIHRvIEdldCBSaWQgb2YgSXQiLCJ1cmwiOiIvYWNpbS90ZXh0LzE5L2NoYXAxOTA0LyIsImlkeCI6MTYwLCJ1aWQiOiIxOS9jaGFwMTkwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTkuNSBUaGUgQXR0cmFjdGlvbiBvZiBHdWlsdCIsInVybCI6Ii9hY2ltL3RleHQvMTkvY2hhcDE5MDUvIiwiaWR4IjoxNjEsInVpZCI6IjE5L2NoYXAxOTA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxOS42IE9ic3RhY2xlcyB0byBQZWFjZTo8YnIvPklJLlRoZSBCZWxpZWYgdGhlIEJvZHkgaXMgVmFsdWFibGUgZm9yIFdoYXQgaXQgT2ZmZXJzIiwidXJsIjoiL2FjaW0vdGV4dC8xOS9jaGFwMTkwNi8iLCJpZHgiOjE2MiwidWlkIjoiMTkvY2hhcDE5MDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE5LjcgUGxlYXN1cmUgYW5kIFBhaW4iLCJ1cmwiOiIvYWNpbS90ZXh0LzE5L2NoYXAxOTA3LyIsImlkeCI6MTYzLCJ1aWQiOiIxOS9jaGFwMTkwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTkuOCBPYnN0YWNsZXMgdG8gUGVhY2U6PGJyLz5JSUkuIFRoZSBBdHRyYWN0aW9uIG9mIERlYXRoIiwidXJsIjoiL2FjaW0vdGV4dC8xOS9jaGFwMTkwOC8iLCJpZHgiOjE2NCwidWlkIjoiMTkvY2hhcDE5MDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDE5LjkgVGhlIEluY29ycnVwdGlibGUgQm9keSIsInVybCI6Ii9hY2ltL3RleHQvMTkvY2hhcDE5MDkvIiwiaWR4IjoxNjUsInVpZCI6IjE5L2NoYXAxOTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQxOS4xMCBPYnN0YWNsZXMgdG8gUGVhY2U6PGJyLz5JVi5UaGUgRmVhciBvZiBHb2QiLCJ1cmwiOiIvYWNpbS90ZXh0LzE5L2NoYXAxOTEwLyIsImlkeCI6MTY2LCJ1aWQiOiIxOS9jaGFwMTkxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMTkuMTEgVGhlIExpZnRpbmcgb2YgdGhlIFZlaWwiLCJ1cmwiOiIvYWNpbS90ZXh0LzE5L2NoYXAxOTExLyIsImlkeCI6MTY3LCJ1aWQiOiIxOS9jaGFwMTkxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjAgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8yMC9jaGFwMjAwMC8iLCJpZHgiOjE2OCwidWlkIjoiMjAvY2hhcDIwMDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIwLjEgSG9seSBXZWVrIiwidXJsIjoiL2FjaW0vdGV4dC8yMC9jaGFwMjAwMS8iLCJpZHgiOjE2OSwidWlkIjoiMjAvY2hhcDIwMDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIwLjIgVGhvcm5zIGFuZCBMaWxpZXMiLCJ1cmwiOiIvYWNpbS90ZXh0LzIwL2NoYXAyMDAyLyIsImlkeCI6MTcwLCJ1aWQiOiIyMC9jaGFwMjAwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjAuMyBTaW4gYXMgYW4gQWRqdXN0bWVudCIsInVybCI6Ii9hY2ltL3RleHQvMjAvY2hhcDIwMDMvIiwiaWR4IjoxNzEsInVpZCI6IjIwL2NoYXAyMDAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMC40IEVudGVyaW5nIHRoZSBBcmsiLCJ1cmwiOiIvYWNpbS90ZXh0LzIwL2NoYXAyMDA0LyIsImlkeCI6MTcyLCJ1aWQiOiIyMC9jaGFwMjAwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjAuNSBIZXJhbGRzIG9mIEV0ZXJuaXR5IiwidXJsIjoiL2FjaW0vdGV4dC8yMC9jaGFwMjAwNS8iLCJpZHgiOjE3MywidWlkIjoiMjAvY2hhcDIwMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIwLjYgVGhlIFRlbXBsZSBvZiB0aGUgSG9seSBTcGlyaXQiLCJ1cmwiOiIvYWNpbS90ZXh0LzIwL2NoYXAyMDA2LyIsImlkeCI6MTc0LCJ1aWQiOiIyMC9jaGFwMjAwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjAuNyBUaGUgQ29uc2lzdGVuY3kgb2YgTWVhbnMgYW5kIEVuZCIsInVybCI6Ii9hY2ltL3RleHQvMjAvY2hhcDIwMDcvIiwiaWR4IjoxNzUsInVpZCI6IjIwL2NoYXAyMDA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMC44IFRoZSBWaXNpb24gb2YgU2lubGVzc25lc3MiLCJ1cmwiOiIvYWNpbS90ZXh0LzIwL2NoYXAyMDA4LyIsImlkeCI6MTc2LCJ1aWQiOiIyMC9jaGFwMjAwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjEgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8yMS9jaGFwMjEwMC8iLCJpZHgiOjE3NywidWlkIjoiMjEvY2hhcDIxMDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIxLjEgVGhlIEltYWdpbmVkIFdvcmxkIiwidXJsIjoiL2FjaW0vdGV4dC8yMS9jaGFwMjEwMS8iLCJpZHgiOjE3OCwidWlkIjoiMjEvY2hhcDIxMDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIxLjIgVGhlIFJlc3BvbnNpYmlsaXR5IGZvciBTaWdodCIsInVybCI6Ii9hY2ltL3RleHQvMjEvY2hhcDIxMDIvIiwiaWR4IjoxNzksInVpZCI6IjIxL2NoYXAyMTAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMS4zIEZhaXRoLCBCZWxpZWYgYW5kIFZpc2lvbiIsInVybCI6Ii9hY2ltL3RleHQvMjEvY2hhcDIxMDMvIiwiaWR4IjoxODAsInVpZCI6IjIxL2NoYXAyMTAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMS40IFRoZSBGZWFyIHRvIExvb2sgV2l0aGluIiwidXJsIjoiL2FjaW0vdGV4dC8yMS9jaGFwMjEwNC8iLCJpZHgiOjE4MSwidWlkIjoiMjEvY2hhcDIxMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIxLjUgUmVhc29uIGFuZCBQZXJjZXB0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8yMS9jaGFwMjEwNS8iLCJpZHgiOjE4MiwidWlkIjoiMjEvY2hhcDIxMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIxLjYgUmVhc29uIGFuZCBDb3JyZWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8yMS9jaGFwMjEwNi8iLCJpZHgiOjE4MywidWlkIjoiMjEvY2hhcDIxMDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIxLjcgUGVyY2VwdGlvbiBhbmQgV2lzaGVzIiwidXJsIjoiL2FjaW0vdGV4dC8yMS9jaGFwMjEwNy8iLCJpZHgiOjE4NCwidWlkIjoiMjEvY2hhcDIxMDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIxLjggVGhlIElubmVyIFNoaWZ0IiwidXJsIjoiL2FjaW0vdGV4dC8yMS9jaGFwMjEwOC8iLCJpZHgiOjE4NSwidWlkIjoiMjEvY2hhcDIxMDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIyIEludHJvZHVjdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMjIvY2hhcDIyMDAvIiwiaWR4IjoxODYsInVpZCI6IjIyL2NoYXAyMjAwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMi4xIFRoZSBNZXNzYWdlIG9mIHRoZSBIb2x5IFJlbGF0aW9uc2hpcCIsInVybCI6Ii9hY2ltL3RleHQvMjIvY2hhcDIyMDEvIiwiaWR4IjoxODcsInVpZCI6IjIyL2NoYXAyMjAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMi4yIFlvdXIgQnJvdGhlcuKAmXMgU2lubGVzc25lc3MiLCJ1cmwiOiIvYWNpbS90ZXh0LzIyL2NoYXAyMjAyLyIsImlkeCI6MTg4LCJ1aWQiOiIyMi9jaGFwMjIwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjIuMyBSZWFzb24gYW5kIHRoZSBIb2x5IFJlbGF0aW9uc2hpcCIsInVybCI6Ii9hY2ltL3RleHQvMjIvY2hhcDIyMDMvIiwiaWR4IjoxODksInVpZCI6IjIyL2NoYXAyMjAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMi40IFRoZSBCcmFuY2hpbmcgb2YgdGhlIFJvYWQiLCJ1cmwiOiIvYWNpbS90ZXh0LzIyL2NoYXAyMjA0LyIsImlkeCI6MTkwLCJ1aWQiOiIyMi9jaGFwMjIwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjIuNSBXZWFrbmVzcyBhbmQgRGVmZW5zaXZlbmVzcyIsInVybCI6Ii9hY2ltL3RleHQvMjIvY2hhcDIyMDUvIiwiaWR4IjoxOTEsInVpZCI6IjIyL2NoYXAyMjA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMi42IEZyZWVkb20gYW5kIHRoZSBIb2x5IFNwaXJpdCIsInVybCI6Ii9hY2ltL3RleHQvMjIvY2hhcDIyMDYvIiwiaWR4IjoxOTIsInVpZCI6IjIyL2NoYXAyMjA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMyBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzIzL2NoYXAyMzAwLyIsImlkeCI6MTkzLCJ1aWQiOiIyMy9jaGFwMjMwMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjMuMSBUaGUgSXJyZWNvbmNpbGFibGUgQmVsaWVmcyIsInVybCI6Ii9hY2ltL3RleHQvMjMvY2hhcDIzMDEvIiwiaWR4IjoxOTQsInVpZCI6IjIzL2NoYXAyMzAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMy4yIFRoZSDigJxMYXdz4oCdIG9mIENoYW9zIiwidXJsIjoiL2FjaW0vdGV4dC8yMy9jaGFwMjMwMi8iLCJpZHgiOjE5NSwidWlkIjoiMjMvY2hhcDIzMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDIzLjMgU2FsdmF0aW9uIHdpdGhvdXQgQ29tcHJvbWlzZSIsInVybCI6Ii9hY2ltL3RleHQvMjMvY2hhcDIzMDMvIiwiaWR4IjoxOTYsInVpZCI6IjIzL2NoYXAyMzAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyMy40IFRoZSBGZWFyIG9mIExpZmUiLCJ1cmwiOiIvYWNpbS90ZXh0LzIzL2NoYXAyMzA0LyIsImlkeCI6MTk3LCJ1aWQiOiIyMy9jaGFwMjMwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjQgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8yNC9jaGFwMjQwMC8iLCJpZHgiOjE5OCwidWlkIjoiMjQvY2hhcDI0MDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI0LjEgU3BlY2lhbG5lc3MgYXMgYSBTdWJzdGl0dXRlIGZvciBMb3ZlIiwidXJsIjoiL2FjaW0vdGV4dC8yNC9jaGFwMjQwMS8iLCJpZHgiOjE5OSwidWlkIjoiMjQvY2hhcDI0MDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI0LjIgVGhlIFRyZWFjaGVyeSBvZiBTcGVjaWFsbmVzcyIsInVybCI6Ii9hY2ltL3RleHQvMjQvY2hhcDI0MDIvIiwiaWR4IjoyMDAsInVpZCI6IjI0L2NoYXAyNDAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNC4zIFRoZSBGb3JnaXZlbmVzcyBvZiBTcGVjaWFsbmVzcyIsInVybCI6Ii9hY2ltL3RleHQvMjQvY2hhcDI0MDMvIiwiaWR4IjoyMDEsInVpZCI6IjI0L2NoYXAyNDAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNC40IFNwZWNpYWxuZXNzIGFuZCBTYWx2YXRpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzI0L2NoYXAyNDA0LyIsImlkeCI6MjAyLCJ1aWQiOiIyNC9jaGFwMjQwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjQuNSBUaGUgUmVzb2x1dGlvbiBvZiB0aGUgRHJlYW0iLCJ1cmwiOiIvYWNpbS90ZXh0LzI0L2NoYXAyNDA1LyIsImlkeCI6MjAzLCJ1aWQiOiIyNC9jaGFwMjQwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjQuNiBTYWx2YXRpb24gZnJvbSBGZWFyIiwidXJsIjoiL2FjaW0vdGV4dC8yNC9jaGFwMjQwNi8iLCJpZHgiOjIwNCwidWlkIjoiMjQvY2hhcDI0MDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI0LjcgVGhlIE1lZXRpbmcgUGxhY2UiLCJ1cmwiOiIvYWNpbS90ZXh0LzI0L2NoYXAyNDA3LyIsImlkeCI6MjA1LCJ1aWQiOiIyNC9jaGFwMjQwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjUgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8yNS9jaGFwMjUwMC8iLCJpZHgiOjIwNiwidWlkIjoiMjUvY2hhcDI1MDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI1LjEgVGhlIEFwcG9pbnRlZCBUYXNrIiwidXJsIjoiL2FjaW0vdGV4dC8yNS9jaGFwMjUwMS8iLCJpZHgiOjIwNywidWlkIjoiMjUvY2hhcDI1MDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI1LjIgVGhlIFNhdmlvciBmcm9tIHRoZSBEYXJrIiwidXJsIjoiL2FjaW0vdGV4dC8yNS9jaGFwMjUwMi8iLCJpZHgiOjIwOCwidWlkIjoiMjUvY2hhcDI1MDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI1LjMgVGhlIEZ1bmRhbWVudGFsIExhdyBvZiBQZXJjZXB0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8yNS9jaGFwMjUwMy8iLCJpZHgiOjIwOSwidWlkIjoiMjUvY2hhcDI1MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI1LjQgVGhlIEpvaW5pbmcgb2YgTWluZHMiLCJ1cmwiOiIvYWNpbS90ZXh0LzI1L2NoYXAyNTA0LyIsImlkeCI6MjEwLCJ1aWQiOiIyNS9jaGFwMjUwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjUuNSBUaGUgU3RhdGUgb2YgU2lubGVzc25lc3MiLCJ1cmwiOiIvYWNpbS90ZXh0LzI1L2NoYXAyNTA1LyIsImlkeCI6MjExLCJ1aWQiOiIyNS9jaGFwMjUwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjUuNiBUaGUgU3BlY2lhbCBGdW5jdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMjUvY2hhcDI1MDYvIiwiaWR4IjoyMTIsInVpZCI6IjI1L2NoYXAyNTA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNS43IENvbW11dGluZyB0aGUgU2VudGVuY2UiLCJ1cmwiOiIvYWNpbS90ZXh0LzI1L2NoYXAyNTA3LyIsImlkeCI6MjEzLCJ1aWQiOiIyNS9jaGFwMjUwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjUuOCBUaGUgUHJpbmNpcGxlIG9mIFNhbHZhdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMjUvY2hhcDI1MDgvIiwiaWR4IjoyMTQsInVpZCI6IjI1L2NoYXAyNTA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNS45IFRoZSBKdXN0aWNlIG9mIEhlYXZlbiIsInVybCI6Ii9hY2ltL3RleHQvMjUvY2hhcDI1MDkvIiwiaWR4IjoyMTUsInVpZCI6IjI1L2NoYXAyNTA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNiBJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzI2L2NoYXAyNjAwLyIsImlkeCI6MjE2LCJ1aWQiOiIyNi9jaGFwMjYwMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjYuMSBUaGUgJ1NhY3JpZmljZScgb2YgT25lbmVzcyIsInVybCI6Ii9hY2ltL3RleHQvMjYvY2hhcDI2MDEvIiwiaWR4IjoyMTcsInVpZCI6IjI2L2NoYXAyNjAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNi4yIFRoZSBGb3JtcyBvZiBFcnJvciIsInVybCI6Ii9hY2ltL3RleHQvMjYvY2hhcDI2MDIvIiwiaWR4IjoyMTgsInVpZCI6IjI2L2NoYXAyNjAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNi4zIFRoZSBCb3JkZXJsYW5kIiwidXJsIjoiL2FjaW0vdGV4dC8yNi9jaGFwMjYwMy8iLCJpZHgiOjIxOSwidWlkIjoiMjYvY2hhcDI2MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI2LjQgV2hlcmUgU2luIEhhcyBMZWZ0IiwidXJsIjoiL2FjaW0vdGV4dC8yNi9jaGFwMjYwNC8iLCJpZHgiOjIyMCwidWlkIjoiMjYvY2hhcDI2MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI2LjUgVGhlIExpdHRsZSBIaW5kcmFuY2UiLCJ1cmwiOiIvYWNpbS90ZXh0LzI2L2NoYXAyNjA1LyIsImlkeCI6MjIxLCJ1aWQiOiIyNi9jaGFwMjYwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjYuNiBUaGUgQXBwb2ludGVkIEZyaWVuZCIsInVybCI6Ii9hY2ltL3RleHQvMjYvY2hhcDI2MDYvIiwiaWR4IjoyMjIsInVpZCI6IjI2L2NoYXAyNjA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNi43IFJldmlldyBvZiBQcmluY2lwbGVzIiwidXJsIjoiL2FjaW0vdGV4dC8yNi9jaGFwMjYwNy8iLCJpZHgiOjIyMywidWlkIjoiMjYvY2hhcDI2MDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI2LjggVGhlIEltbWVkaWFjeSBvZiBTYWx2YXRpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzI2L2NoYXAyNjA4LyIsImlkeCI6MjI0LCJ1aWQiOiIyNi9jaGFwMjYwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjYuOSBGb3IgVGhleSBIYXZlIENvbWUiLCJ1cmwiOiIvYWNpbS90ZXh0LzI2L2NoYXAyNjA5LyIsImlkeCI6MjI1LCJ1aWQiOiIyNi9jaGFwMjYwOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjYuMTAgVGhlIFJlbWFpbmluZyBUYXNrIiwidXJsIjoiL2FjaW0vdGV4dC8yNi9jaGFwMjYxMC8iLCJpZHgiOjIyNiwidWlkIjoiMjYvY2hhcDI2MTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI3IEludHJvZHVjdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMjcvY2hhcDI3MDAvIiwiaWR4IjoyMjcsInVpZCI6IjI3L2NoYXAyNzAwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNy4xIFRoZSBQaWN0dXJlIG9mIENydWNpZml4aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8yNy9jaGFwMjcwMS8iLCJpZHgiOjIyOCwidWlkIjoiMjcvY2hhcDI3MDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI3LjIgVGhlIEZlYXIgb2YgSGVhbGluZyIsInVybCI6Ii9hY2ltL3RleHQvMjcvY2hhcDI3MDIvIiwiaWR4IjoyMjksInVpZCI6IjI3L2NoYXAyNzAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNy4zIFRoZSBTeW1ib2wgb2YgdGhlIEltcG9zc2libGUiLCJ1cmwiOiIvYWNpbS90ZXh0LzI3L2NoYXAyNzAzLyIsImlkeCI6MjMwLCJ1aWQiOiIyNy9jaGFwMjcwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjcuNCBUaGUgUXVpZXQgQW5zd2VyIiwidXJsIjoiL2FjaW0vdGV4dC8yNy9jaGFwMjcwNC8iLCJpZHgiOjIzMSwidWlkIjoiMjcvY2hhcDI3MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI3LjUgVGhlIEhlYWxpbmcgRXhhbXBsZSIsInVybCI6Ii9hY2ltL3RleHQvMjcvY2hhcDI3MDUvIiwiaWR4IjoyMzIsInVpZCI6IjI3L2NoYXAyNzA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyNy42IFRoZSBQdXJwb3NlIG9mIFBhaW4iLCJ1cmwiOiIvYWNpbS90ZXh0LzI3L2NoYXAyNzA2LyIsImlkeCI6MjMzLCJ1aWQiOiIyNy9jaGFwMjcwNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjcuNyBUaGUgSWxsdXNpb24gb2YgU3VmZmVyaW5nIiwidXJsIjoiL2FjaW0vdGV4dC8yNy9jaGFwMjcwNy8iLCJpZHgiOjIzNCwidWlkIjoiMjcvY2hhcDI3MDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI3LjggVGhlICdIZXJvJyBvZiB0aGUgRHJlYW0iLCJ1cmwiOiIvYWNpbS90ZXh0LzI3L2NoYXAyNzA4LyIsImlkeCI6MjM1LCJ1aWQiOiIyNy9jaGFwMjcwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjggSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8yOC9jaGFwMjgwMC8iLCJpZHgiOjIzNiwidWlkIjoiMjgvY2hhcDI4MDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI4LjEgVGhlIFByZXNlbnQgTWVtb3J5IiwidXJsIjoiL2FjaW0vdGV4dC8yOC9jaGFwMjgwMS8iLCJpZHgiOjIzNywidWlkIjoiMjgvY2hhcDI4MDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI4LjIgUmV2ZXJzaW5nIEVmZmVjdCBhbmQgQ2F1c2UiLCJ1cmwiOiIvYWNpbS90ZXh0LzI4L2NoYXAyODAyLyIsImlkeCI6MjM4LCJ1aWQiOiIyOC9jaGFwMjgwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjguMyBUaGUgQWdyZWVtZW50IHRvIEpvaW4iLCJ1cmwiOiIvYWNpbS90ZXh0LzI4L2NoYXAyODAzLyIsImlkeCI6MjM5LCJ1aWQiOiIyOC9jaGFwMjgwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjguNCBUaGUgR3JlYXRlciBKb2luaW5nIiwidXJsIjoiL2FjaW0vdGV4dC8yOC9jaGFwMjgwNC8iLCJpZHgiOjI0MCwidWlkIjoiMjgvY2hhcDI4MDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI4LjUgVGhlIEFsdGVybmF0ZSB0byBEcmVhbXMgb2YgRmVhciIsInVybCI6Ii9hY2ltL3RleHQvMjgvY2hhcDI4MDUvIiwiaWR4IjoyNDEsInVpZCI6IjI4L2NoYXAyODA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyOC42IFRoZSBTZWNyZXQgVm93cyIsInVybCI6Ii9hY2ltL3RleHQvMjgvY2hhcDI4MDYvIiwiaWR4IjoyNDIsInVpZCI6IjI4L2NoYXAyODA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyOC43IFRoZSBCZWF1dGlmdWwgUmVsYXRpb25zaGlwIiwidXJsIjoiL2FjaW0vdGV4dC8yOC9jaGFwMjgwNy8iLCJpZHgiOjI0MywidWlkIjoiMjgvY2hhcDI4MDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI5IEludHJvZHVjdGlvbiIsInVybCI6Ii9hY2ltL3RleHQvMjkvY2hhcDI5MDAvIiwiaWR4IjoyNDQsInVpZCI6IjI5L2NoYXAyOTAwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyOS4xIFRoZSBDbG9zaW5nIG9mIHRoZSBHYXAiLCJ1cmwiOiIvYWNpbS90ZXh0LzI5L2NoYXAyOTAxLyIsImlkeCI6MjQ1LCJ1aWQiOiIyOS9jaGFwMjkwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjkuMiBUaGUgQ29taW5nIG9mIHRoZSBHdWVzdCIsInVybCI6Ii9hY2ltL3RleHQvMjkvY2hhcDI5MDIvIiwiaWR4IjoyNDYsInVpZCI6IjI5L2NoYXAyOTAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyOS4zIEdvZOKAmXMgV2l0bmVzc2VzIiwidXJsIjoiL2FjaW0vdGV4dC8yOS9jaGFwMjkwMy8iLCJpZHgiOjI0NywidWlkIjoiMjkvY2hhcDI5MDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDI5LjQgRHJlYW0gUm9sZXMiLCJ1cmwiOiIvYWNpbS90ZXh0LzI5L2NoYXAyOTA0LyIsImlkeCI6MjQ4LCJ1aWQiOiIyOS9jaGFwMjkwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjkuNSBUaGUgQ2hhbmdlbGVzcyBEd2VsbGluZy1QbGFjZSIsInVybCI6Ii9hY2ltL3RleHQvMjkvY2hhcDI5MDUvIiwiaWR4IjoyNDksInVpZCI6IjI5L2NoYXAyOTA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyOS42IEZvcmdpdmVuZXNzIGFuZCBQZWFjZSIsInVybCI6Ii9hY2ltL3RleHQvMjkvY2hhcDI5MDYvIiwiaWR4IjoyNTAsInVpZCI6IjI5L2NoYXAyOTA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyOS43IFRoZSBMaW5nZXJpbmcgSWxsdXNpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzI5L2NoYXAyOTA3LyIsImlkeCI6MjUxLCJ1aWQiOiIyOS9jaGFwMjkwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMjkuOCBDaHJpc3QgYW5kIHRoZSBBbnRpLUNocmlzdCIsInVybCI6Ii9hY2ltL3RleHQvMjkvY2hhcDI5MDgvIiwiaWR4IjoyNTIsInVpZCI6IjI5L2NoYXAyOTA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQyOS45IFRoZSBGb3JnaXZpbmcgRHJlYW0iLCJ1cmwiOiIvYWNpbS90ZXh0LzI5L2NoYXAyOTA5LyIsImlkeCI6MjUzLCJ1aWQiOiIyOS9jaGFwMjkwOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMzAgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8zMC9jaGFwMzAwMC8iLCJpZHgiOjI1NCwidWlkIjoiMzAvY2hhcDMwMDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMwLjEgUnVsZXMgZm9yIERlY2lzaW9uIiwidXJsIjoiL2FjaW0vdGV4dC8zMC9jaGFwMzAwMS8iLCJpZHgiOjI1NSwidWlkIjoiMzAvY2hhcDMwMDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMwLjIgRnJlZWRvbSBvZiBXaWxsIiwidXJsIjoiL2FjaW0vdGV4dC8zMC9jaGFwMzAwMi8iLCJpZHgiOjI1NiwidWlkIjoiMzAvY2hhcDMwMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMwLjMgQmV5b25kIEFsbCBJZG9scyIsInVybCI6Ii9hY2ltL3RleHQvMzAvY2hhcDMwMDMvIiwiaWR4IjoyNTcsInVpZCI6IjMwL2NoYXAzMDAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQzMC40IFRoZSBUcnV0aCBCZWhpbmQgSWxsdXNpb25zIiwidXJsIjoiL2FjaW0vdGV4dC8zMC9jaGFwMzAwNC8iLCJpZHgiOjI1OCwidWlkIjoiMzAvY2hhcDMwMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMwLjUgVGhlIE9ubHkgUHVycG9zZSIsInVybCI6Ii9hY2ltL3RleHQvMzAvY2hhcDMwMDUvIiwiaWR4IjoyNTksInVpZCI6IjMwL2NoYXAzMDA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQzMC42IFRoZSBKdXN0aWZpY2F0aW9uIGZvciBGb3JnaXZlbmVzcyIsInVybCI6Ii9hY2ltL3RleHQvMzAvY2hhcDMwMDYvIiwiaWR4IjoyNjAsInVpZCI6IjMwL2NoYXAzMDA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQzMC43IFRoZSBOZXcgSW50ZXJwcmV0YXRpb24iLCJ1cmwiOiIvYWNpbS90ZXh0LzMwL2NoYXAzMDA3LyIsImlkeCI6MjYxLCJ1aWQiOiIzMC9jaGFwMzAwNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMzAuOCBDaGFuZ2VsZXNzIFJlYWxpdHkiLCJ1cmwiOiIvYWNpbS90ZXh0LzMwL2NoYXAzMDA4LyIsImlkeCI6MjYyLCJ1aWQiOiIzMC9jaGFwMzAwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJUMzEgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vdGV4dC8zMS9jaGFwMzEwMC8iLCJpZHgiOjI2MywidWlkIjoiMzEvY2hhcDMxMDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMxLjEgVGhlIElsbHVzaW9uIG9mIGFuIEVuZW15IiwidXJsIjoiL2FjaW0vdGV4dC8zMS9jaGFwMzEwMS8iLCJpZHgiOjI2NCwidWlkIjoiMzEvY2hhcDMxMDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMxLjIgVGhlIFNlbGYtQWNjdXNlZCIsInVybCI6Ii9hY2ltL3RleHQvMzEvY2hhcDMxMDIvIiwiaWR4IjoyNjUsInVpZCI6IjMxL2NoYXAzMTAyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQzMS4zIFRoZSBSZWFsIEFsdGVybmF0aXZlIiwidXJsIjoiL2FjaW0vdGV4dC8zMS9jaGFwMzEwMy8iLCJpZHgiOjI2NiwidWlkIjoiMzEvY2hhcDMxMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMxLjQgU2VsZi1Db25jZXB0IHZlcnN1cyBTZWxmIiwidXJsIjoiL2FjaW0vdGV4dC8zMS9jaGFwMzEwNC8iLCJpZHgiOjI2NywidWlkIjoiMzEvY2hhcDMxMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiVDMxLjUgUmVjb2duaXppbmcgdGhlIFNwaXJpdCIsInVybCI6Ii9hY2ltL3RleHQvMzEvY2hhcDMxMDUvIiwiaWR4IjoyNjgsInVpZCI6IjMxL2NoYXAzMTA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQzMS42IFRoZSBTYXZpb3LigJlzIFZpc2lvbiIsInVybCI6Ii9hY2ltL3RleHQvMzEvY2hhcDMxMDYvIiwiaWR4IjoyNjksInVpZCI6IjMxL2NoYXAzMTA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlQzMS43IENob29zZSBPbmNlIEFnYWluIiwidXJsIjoiL2FjaW0vdGV4dC8zMS9jaGFwMzEwNy8iLCJpZHgiOjI3MCwidWlkIjoiMzEvY2hhcDMxMDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfV19fSx7ImlkIjoyLCJiaWQiOiJtYW51YWwiLCJ0aXRsZSI6IkFDSU0gTWFudWFsIGZvciBUZWFjaGVycyIsInVuaXRzIjp7InBhZ2UiOlt7InRpdGxlIjoiQWJvdXQgdGhlIE1hbnVhbCIsInVybCI6Ii9hY2ltL2ludHJvL21hbnVhbCIsImlkeCI6MCwidWlkIjoibWFudWEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vbWFudWFsL2NoYXAwMS8iLCJpZHgiOjEsInVpZCI6ImNoYXAwMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJXaG8gQXJlIEdvZCdzIFRlYWNoZXJzPyIsInVybCI6Ii9hY2ltL21hbnVhbC9jaGFwMDIvIiwiaWR4IjoyLCJ1aWQiOiJjaGFwMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiV2hvIGFyZSB0aGVpciBQdXBpbHM/IiwidXJsIjoiL2FjaW0vbWFudWFsL2NoYXAwMy8iLCJpZHgiOjMsInVpZCI6ImNoYXAwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJXaGF0IGFyZSB0aGUgTGV2ZWxzIG9mIFRlYWNoaW5nPyIsInVybCI6Ii9hY2ltL21hbnVhbC9jaGFwMDQvIiwiaWR4Ijo0LCJ1aWQiOiJjaGFwMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiV2hhdCBhcmUgdGhlIENoYXJhY3RlcmlzdGljcyBvZiBHb2QncyBUZWFjaGVycz8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDA1LyIsImlkeCI6NSwidWlkIjoiY2hhcDA1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkhvdyBpcyBIZWFsaW5nIEFjY29tcGxpc2hlZD8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDA2LyIsImlkeCI6NiwidWlkIjoiY2hhcDA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IklzIEhlYWxpbmcgQ2VydGFpbj8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDA3LyIsImlkeCI6NywidWlkIjoiY2hhcDA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlNob3VsZCBIZWFsaW5nIGJlIFJlcGVhdGVkPyIsInVybCI6Ii9hY2ltL21hbnVhbC9jaGFwMDgvIiwiaWR4Ijo4LCJ1aWQiOiJjaGFwMDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSG93IENhbiB0aGUgUGVyY2VwdGlvbiBvZiBPcmRlciBvZiBEaWZmaWN1bHRpZXMgYmUgQXZvaWRlZD8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDA5LyIsImlkeCI6OSwidWlkIjoiY2hhcDA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkFyZSBDaGFuZ2VzIFJlcXVpcmVkIGluIHRoZSBMaWZlIFNpdHVhdGlvbiBvZiBHb2QncyBUZWFjaGVycz8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDEwLyIsImlkeCI6MTAsInVpZCI6ImNoYXAxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJIb3cgaXMgSnVkZ2VtZW50IFJlbGlucXVpc2hlZD8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDExLyIsImlkeCI6MTEsInVpZCI6ImNoYXAxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJIb3cgaXMgUGVhY2UgUG9zc2libGUgaW4gdGhpcyBXb3JsZD8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDEyLyIsImlkeCI6MTIsInVpZCI6ImNoYXAxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJIb3cgTWFueSBUZWFjaGVycyBvZiBHb2QgYXJlIE5lZWRlZCB0byBTYXZlIHRoZSBXb3JsZD8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDEzLyIsImlkeCI6MTMsInVpZCI6ImNoYXAxMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJXaGF0IGlzIHRoZSBSZWFsIE1lYW5pbmcgb2YgU2FjcmlmaWNlPyIsInVybCI6Ii9hY2ltL21hbnVhbC9jaGFwMTQvIiwiaWR4IjoxNCwidWlkIjoiY2hhcDE0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkhvdyBXaWxsIHRoZSBXb3JsZCBFbmQ/IiwidXJsIjoiL2FjaW0vbWFudWFsL2NoYXAxNS8iLCJpZHgiOjE1LCJ1aWQiOiJjaGFwMTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSXMgRWFjaCBPbmUgdG8gYmUgSnVkZ2VkIGluIHRoZSBFbmQ/IiwidXJsIjoiL2FjaW0vbWFudWFsL2NoYXAxNi8iLCJpZHgiOjE2LCJ1aWQiOiJjaGFwMTYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSG93IFNob3VsZCB0aGUgVGVhY2hlciBvZiBHb2QgU3BlbmQgSGlzIERheT8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDE3LyIsImlkeCI6MTcsInVpZCI6ImNoYXAxNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJIb3cgZG8gR29kJ3MgVGVhY2hlcnMgRGVhbCB3aXRoIHRoZWlyIFB1cGlscycgVGhvdWdodHMgb2YgTWFnaWM/IiwidXJsIjoiL2FjaW0vbWFudWFsL2NoYXAxOC8iLCJpZHgiOjE4LCJ1aWQiOiJjaGFwMTgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSG93IGlzIENvcnJlY3Rpb24gTWFkZT8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDE5LyIsImlkeCI6MTksInVpZCI6ImNoYXAxOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJXaGF0IGlzIEp1c3RpY2U/IiwidXJsIjoiL2FjaW0vbWFudWFsL2NoYXAyMC8iLCJpZHgiOjIwLCJ1aWQiOiJjaGFwMjAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiV2hhdCBpcyB0aGUgUGVhY2Ugb2YgR29kPyIsInVybCI6Ii9hY2ltL21hbnVhbC9jaGFwMjEvIiwiaWR4IjoyMSwidWlkIjoiY2hhcDIxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IldoYXQgaXMgdGhlIFJvbGUgb2YgV29yZHMgaW4gSGVhbGluZz8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDIyLyIsImlkeCI6MjIsInVpZCI6ImNoYXAyMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJIb3cgYXJlIEhlYWxpbmcgYW5kIEF0b25lbWVudCBSZWxhdGVkPyIsInVybCI6Ii9hY2ltL21hbnVhbC9jaGFwMjMvIiwiaWR4IjoyMywidWlkIjoiY2hhcDIzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkRvZXMgSmVzdXMgSGF2ZSBhIFNwZWNpYWwgUGxhY2UgaW4gSGVhbGluZz8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDI0LyIsImlkeCI6MjQsInVpZCI6ImNoYXAyNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJJcyBSZWluY2FybmF0aW9uIFRydWU/IiwidXJsIjoiL2FjaW0vbWFudWFsL2NoYXAyNS8iLCJpZHgiOjI1LCJ1aWQiOiJjaGFwMjUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiQXJlICdQaHljaGljJyBQb3dlcnMgRGVzaXJhYmxlPyIsInVybCI6Ii9hY2ltL21hbnVhbC9jaGFwMjYvIiwiaWR4IjoyNiwidWlkIjoiY2hhcDI2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkNhbiBHb2QgYmUgUmVhY2hlZCBEaXJlY3RseT8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDI3LyIsImlkeCI6MjcsInVpZCI6ImNoYXAyNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJXaGF0IGlzIERlYXRoPyIsInVybCI6Ii9hY2ltL21hbnVhbC9jaGFwMjgvIiwiaWR4IjoyOCwidWlkIjoiY2hhcDI4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IldoYXQgaXMgdGhlIFJlc3VycmVjdGlvbj8iLCJ1cmwiOiIvYWNpbS9tYW51YWwvY2hhcDI5LyIsImlkeCI6MjksInVpZCI6ImNoYXAyOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJBcyBmb3IgdGhlIFJlc3QmaGVsbGlwOyIsInVybCI6Ii9hY2ltL21hbnVhbC9jaGFwMzAvIiwiaWR4IjozMCwidWlkIjoiY2hhcDMwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkZvcmdldCBOb3QmaGVsbGlwOyIsInVybCI6Ii9hY2ltL21hbnVhbC9jaGFwMzEvIiwiaWR4IjozMSwidWlkIjoiY2hhcDMxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX1dfX0seyJpZCI6MywiYmlkIjoid29ya2Jvb2siLCJ0aXRsZSI6IkFDSU0gV29ya2Jvb2sgZm9yIFN0dWRlbnRzIiwidW5pdHMiOnsicGFnZSI6W3sidGl0bGUiOiJXb3JrYm9vayBmb3IgU3R1ZGVudHMiLCJ1cmwiOiIvYWNpbS9pbnRyby93b3JrYm9vayIsImlkeCI6MCwidWlkIjoid29ya2JvbyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJJbnRyb2R1Y3Rpb24gdG8gdGhlIFdvcmtib29rIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svaW50cm9wMS8iLCJpZHgiOjEsInVpZCI6ImludHJvcDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MSwidGl0bGUiOiJOb3RoaW5nIEkgc2VlIG1lYW5zIGFueXRoaW5nLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMDEvIiwiaWR4IjoyLCJ1aWQiOiJsMDAxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIsInRpdGxlIjoiSSBoYXZlIGdpdmVuIGV2ZXJ5dGhpbmcgSSBzZWUgYWxsIHRoZSBtZWFuaW5nIHRoYXQgaXQgaGFzIGZvciBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDAyLyIsImlkeCI6MywidWlkIjoibDAwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozLCJ0aXRsZSI6IkkgZG8gbm90IHVuZGVyc3RhbmQgYW55dGhpbmcgSSBzZWUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAwMy8iLCJpZHgiOjQsInVpZCI6ImwwMDMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NCwidGl0bGUiOiJUaGVzZSB0aG91Z2h0cyBkbyBub3QgbWVhbiBhbnl0aGluZy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDA0LyIsImlkeCI6NSwidWlkIjoibDAwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo1LCJ0aXRsZSI6IkkgYW0gbmV2ZXIgdXBzZXQgZm9yIHRoZSByZWFzb24gSSB0aGluay4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDA1LyIsImlkeCI6NiwidWlkIjoibDAwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo2LCJ0aXRsZSI6IkkgYW0gdXBzZXQgYmVjYXVzZSBJIHNlZSBzb21ldGhpbmcgdGhhdCBpcyBub3QgdGhlcmUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAwNi8iLCJpZHgiOjcsInVpZCI6ImwwMDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NywidGl0bGUiOiJJIHNlZSBvbmx5IHRoZSBwYXN0LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMDcvIiwiaWR4Ijo4LCJ1aWQiOiJsMDA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjgsInRpdGxlIjoiTXkgbWluZCBpcyBwcmVvY2N1cGllZCB3aXRoIHBhc3QgdGhvdWdodHMuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAwOC8iLCJpZHgiOjksInVpZCI6ImwwMDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6OSwidGl0bGUiOiJJIHNlZSBub3RoaW5nIGFzIGl0IGlzIG5vdy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDA5LyIsImlkeCI6MTAsInVpZCI6ImwwMDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTAsInRpdGxlIjoiTXkgdGhvdWdodHMgZG8gbm90IG1lYW4gYW55dGhpbmcuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAxMC8iLCJpZHgiOjExLCJ1aWQiOiJsMDEwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjExLCJ0aXRsZSI6Ik15IG1lYW5pbmdsZXNzIHRob3VnaHRzIGFyZSBzaG93aW5nIG1lIGEgbWVhbmluZ2xlc3Mgd29ybGQuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAxMS8iLCJpZHgiOjEyLCJ1aWQiOiJsMDExIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEyLCJ0aXRsZSI6IkkgYW0gdXBzZXQgYmVjYXVzZSBJIHNlZSBhIG1lYW5pbmdsZXNzIHdvcmxkLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMTIvIiwiaWR4IjoxMywidWlkIjoibDAxMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMywidGl0bGUiOiJBIG1lYW5pbmdsZXNzIHdvcmxkIGVuZ2VuZGVycyBmZWFyLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMTMvIiwiaWR4IjoxNCwidWlkIjoibDAxMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNCwidGl0bGUiOiJHb2QgZGlkIG5vdCBjcmVhdGUgYSBtZWFuaW5nbGVzcyB3b3JsZCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMTQvIiwiaWR4IjoxNSwidWlkIjoibDAxNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNSwidGl0bGUiOiJNeSB0aG91Z2h0cyBhcmUgaW1hZ2VzIHdoaWNoIEkgaGF2ZSBtYWRlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMTUvIiwiaWR4IjoxNiwidWlkIjoibDAxNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNiwidGl0bGUiOiJJIGhhdmUgbm8gbmV1dHJhbCB0aG91Z2h0cy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDE2LyIsImlkeCI6MTcsInVpZCI6ImwwMTYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTcsInRpdGxlIjoiSSBzZWUgbm8gbmV1dHJhbCB0aGluZ3MuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAxNy8iLCJpZHgiOjE4LCJ1aWQiOiJsMDE3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE4LCJ0aXRsZSI6IkkgYW0gbm90IGFsb25lIGluIGV4cGVyaWVuY2luZyB0aGUgZWZmZWN0cyBvZiBteSBzZWVpbmcuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAxOC8iLCJpZHgiOjE5LCJ1aWQiOiJsMDE4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE5LCJ0aXRsZSI6IkkgYW0gbm90IGFsb25lIGluIGV4cGVyaWVuY2luZyB0aGUgZWZmZWN0cyBvZiBteSB0aG91Z2h0cy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDE5LyIsImlkeCI6MjAsInVpZCI6ImwwMTkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjAsInRpdGxlIjoiSSBhbSBkZXRlcm1pbmVkIHRvIHNlZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDIwLyIsImlkeCI6MjEsInVpZCI6ImwwMjAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjEsInRpdGxlIjoiSSBhbSBkZXRlcm1pbmVkIHRvIHNlZSB0aGluZ3MgZGlmZmVyZW50bHkuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAyMS8iLCJpZHgiOjIyLCJ1aWQiOiJsMDIxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIyLCJ0aXRsZSI6IldoYXQgSSBzZWUgaXMgYSBmb3JtIG9mIHZlbmdlYW5jZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDIyLyIsImlkeCI6MjMsInVpZCI6ImwwMjIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjMsInRpdGxlIjoiSSBjYW4gZXNjYXBlIGZyb20gdGhlIHdvcmxkIEkgc2VlIGJ5IGdpdmluZyB1cCBhdHRhY2sgdGhvdWdodHMuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAyMy8iLCJpZHgiOjI0LCJ1aWQiOiJsMDIzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI0LCJ0aXRsZSI6IkkgZG8gbm90IHBlcmNlaXZlIG15IG93biBiZXN0IGludGVyZXN0cy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDI0LyIsImlkeCI6MjUsInVpZCI6ImwwMjQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjUsInRpdGxlIjoiSSBkbyBub3Qga25vdyB3aGF0IGFueXRoaW5nIGlzIGZvci4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDI1LyIsImlkeCI6MjYsInVpZCI6ImwwMjUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjYsInRpdGxlIjoiTXkgYXR0YWNrIHRob3VnaHRzIGFyZSBhdHRhY2tpbmcgbXkgaW52dWxuZXJhYmlsaXR5LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMjYvIiwiaWR4IjoyNywidWlkIjoibDAyNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyNywidGl0bGUiOiJBYm92ZSBhbGwgZWxzZSBJIHdhbnQgdG8gc2VlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMjcvIiwiaWR4IjoyOCwidWlkIjoibDAyNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyOCwidGl0bGUiOiJBYm92ZSBhbGwgZWxzZSBJIHdhbnQgdG8gc2VlIHRoaW5ncyBkaWZmZXJlbnRseS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDI4LyIsImlkeCI6MjksInVpZCI6ImwwMjgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjksInRpdGxlIjoiR29kIGlzIGluIGV2ZXJ5dGhpbmcgSSBzZWUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAyOS8iLCJpZHgiOjMwLCJ1aWQiOiJsMDI5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMwLCJ0aXRsZSI6IkdvZCBpcyBpbiBldmVyeXRoaW5nIEkgc2VlIGJlY2F1c2UgR29kIGlzIGluIG15IG1pbmQuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAzMC8iLCJpZHgiOjMxLCJ1aWQiOiJsMDMwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMxLCJ0aXRsZSI6IkkgYW0gbm90IHRoZSB2aWN0aW0gb2YgdGhlIHdvcmxkIEkgc2VlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMzEvIiwiaWR4IjozMiwidWlkIjoibDAzMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMiwidGl0bGUiOiJJIGhhdmUgaW52ZW50ZWQgdGhlIHdvcmxkIEkgc2VlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMzIvIiwiaWR4IjozMywidWlkIjoibDAzMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMywidGl0bGUiOiJUaGVyZSBpcyBhbm90aGVyIHdheSBvZiBsb29raW5nIGF0IHRoZSB3b3JsZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDMzLyIsImlkeCI6MzQsInVpZCI6ImwwMzMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzQsInRpdGxlIjoiSSBjb3VsZCBzZWUgcGVhY2UgaW5zdGVhZCBvZiB0aGlzLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMzQvIiwiaWR4IjozNSwidWlkIjoibDAzNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozNSwidGl0bGUiOiJNeSBtaW5kIGlzIHBhcnQgb2YgR29k4oCZcy4gSSBhbSB2ZXJ5IGhvbHkuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAzNS8iLCJpZHgiOjM2LCJ1aWQiOiJsMDM1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM2LCJ0aXRsZSI6Ik15IGhvbGluZXNzIGVudmVsb3BzIGV2ZXJ5dGhpbmcgSSBzZWUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDAzNi8iLCJpZHgiOjM3LCJ1aWQiOiJsMDM2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM3LCJ0aXRsZSI6Ik15IGhvbGluZXNzIGJsZXNzZXMgdGhlIHdvcmxkLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMzcvIiwiaWR4IjozOCwidWlkIjoibDAzNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozOCwidGl0bGUiOiJUaGVyZSBpcyBub3RoaW5nIG15IGhvbGluZXNzIGNhbm5vdCBkby4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDM4LyIsImlkeCI6MzksInVpZCI6ImwwMzgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzksInRpdGxlIjoiTXkgaG9saW5lc3MgaXMgbXkgc2FsdmF0aW9uLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwMzkvIiwiaWR4Ijo0MCwidWlkIjoibDAzOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo0MCwidGl0bGUiOiJJIGFtIGJsZXNzZWQgYXMgYSBTb24gb2YgR29kLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNDAvIiwiaWR4Ijo0MSwidWlkIjoibDA0MCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo0MSwidGl0bGUiOiJHb2QgZ29lcyB3aXRoIG1lIHdoZXJldmVyIEkgZ28uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA0MS8iLCJpZHgiOjQyLCJ1aWQiOiJsMDQxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjQyLCJ0aXRsZSI6IkdvZCBpcyBteSBzdHJlbmd0aC4gVmlzaW9uIGlzIEhpcyBnaWZ0LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNDIvIiwiaWR4Ijo0MywidWlkIjoibDA0MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo0MywidGl0bGUiOiJHb2QgaXMgbXkgU291cmNlLiBJIGNhbm5vdCBzZWUgYXBhcnQgZnJvbSBIaW0uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA0My8iLCJpZHgiOjQ0LCJ1aWQiOiJsMDQzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjQ0LCJ0aXRsZSI6IkdvZCBpcyB0aGUgTGlnaHQgaW4gd2hpY2ggSSBzZWUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA0NC8iLCJpZHgiOjQ1LCJ1aWQiOiJsMDQ0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjQ1LCJ0aXRsZSI6IkdvZCBpcyB0aGUgTWluZCB3aXRoIHdoaWNoIEkgdGhpbmsuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA0NS8iLCJpZHgiOjQ2LCJ1aWQiOiJsMDQ1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjQ2LCJ0aXRsZSI6IkdvZCBpcyB0aGUgTG92ZSBpbiB3aGljaCBJIGZvcmdpdmUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA0Ni8iLCJpZHgiOjQ3LCJ1aWQiOiJsMDQ2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjQ3LCJ0aXRsZSI6IkdvZCBpcyB0aGUgU3RyZW5ndGggaW4gd2hpY2ggSSB0cnVzdC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDQ3LyIsImlkeCI6NDgsInVpZCI6ImwwNDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NDgsInRpdGxlIjoiVGhlcmUgaXMgbm90aGluZyB0byBmZWFyLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNDgvIiwiaWR4Ijo0OSwidWlkIjoibDA0OCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo0OSwidGl0bGUiOiJHb2TigJlzIFZvaWNlIHNwZWFrcyB0byBtZSBhbGwgdGhyb3VnaCB0aGUgZGF5LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNDkvIiwiaWR4Ijo1MCwidWlkIjoibDA0OSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo1MCwidGl0bGUiOiJJIGFtIHN1c3RhaW5lZCBieSB0aGUgTG92ZSBvZiBHb2QuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA1MC8iLCJpZHgiOjUxLCJ1aWQiOiJsMDUwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IlJldmlldyBJIEludHJvZHVjdGlvbiIsInVybCI6Ii9hY2ltL3dvcmtib29rL3JldmlldzEvIiwiaWR4Ijo1MiwidWlkIjoicmV2aWV3MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo1MSwidGl0bGUiOiJSZXZpZXcgMSAtIDUiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDUxLyIsImlkeCI6NTMsInVpZCI6ImwwNTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NTIsInRpdGxlIjoiUmV2aWV3IDYgLSAxMCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNTIvIiwiaWR4Ijo1NCwidWlkIjoibDA1MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo1MywidGl0bGUiOiJSZXZpZXcgMTEgLSAxNSIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNTMvIiwiaWR4Ijo1NSwidWlkIjoibDA1MyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo1NCwidGl0bGUiOiJSZXZpZXcgMTYgLSAyMCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNTQvIiwiaWR4Ijo1NiwidWlkIjoibDA1NCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo1NSwidGl0bGUiOiJSZXZpZXcgMjEgLSAyNSIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNTUvIiwiaWR4Ijo1NywidWlkIjoibDA1NSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo1NiwidGl0bGUiOiJSZXZpZXcgMjYgLSAzMCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNTYvIiwiaWR4Ijo1OCwidWlkIjoibDA1NiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo1NywidGl0bGUiOiJSZXZpZXcgMzEgLSAzNSIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNTcvIiwiaWR4Ijo1OSwidWlkIjoibDA1NyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo1OCwidGl0bGUiOiJSZXZpZXcgMzYgLSA0MCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNTgvIiwiaWR4Ijo2MCwidWlkIjoibDA1OCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo1OSwidGl0bGUiOiJSZXZpZXcgNDEgLSA0NSIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNTkvIiwiaWR4Ijo2MSwidWlkIjoibDA1OSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo2MCwidGl0bGUiOiJSZXZpZXcgNDYgLSA1MCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNjAvIiwiaWR4Ijo2MiwidWlkIjoibDA2MCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo2MSwidGl0bGUiOiJJIGFtIHRoZSBsaWdodCBvZiB0aGUgd29ybGQuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA2MS8iLCJpZHgiOjYzLCJ1aWQiOiJsMDYxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjYyLCJ0aXRsZSI6IkZvcmdpdmVuZXNzIGlzIG15IGZ1bmN0aW9uIGFzIHRoZSBsaWdodCBvZiB0aGUgd29ybGQuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA2Mi8iLCJpZHgiOjY0LCJ1aWQiOiJsMDYyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjYzLCJ0aXRsZSI6IlRoZSBsaWdodCBvZiB0aGUgd29ybGQgYnJpbmdzIHBlYWNlIHRvIGV2ZXJ5IG1pbmQgdGhyb3VnaCBteSBmb3JnaXZlbmVzcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDYzLyIsImlkeCI6NjUsInVpZCI6ImwwNjMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NjQsInRpdGxlIjoiTGV0IG1lIG5vdCBmb3JnZXQgbXkgZnVuY3Rpb24uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA2NC8iLCJpZHgiOjY2LCJ1aWQiOiJsMDY0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjY1LCJ0aXRsZSI6Ik15IG9ubHkgZnVuY3Rpb24gaXMgdGhlIG9uZSBHb2QgZ2F2ZSBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDY1LyIsImlkeCI6NjcsInVpZCI6ImwwNjUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NjYsInRpdGxlIjoiTXkgaGFwcGluZXNzIGFuZCBteSBmdW5jdGlvbiBhcmUgb25lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNjYvIiwiaWR4Ijo2OCwidWlkIjoibDA2NiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo2NywidGl0bGUiOiJMb3ZlIGNyZWF0ZWQgbWUgbGlrZSBJdHNlbGYuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA2Ny8iLCJpZHgiOjY5LCJ1aWQiOiJsMDY3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjY4LCJ0aXRsZSI6IkxvdmUgaG9sZHMgbm8gZ3JpZXZhbmNlcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDY4LyIsImlkeCI6NzAsInVpZCI6ImwwNjgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NjksInRpdGxlIjoiTXkgZ3JpZXZhbmNlcyBoaWRlIHRoZSBsaWdodCBvZiB0aGUgd29ybGQgaW4gbWUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA2OS8iLCJpZHgiOjcxLCJ1aWQiOiJsMDY5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjcwLCJ0aXRsZSI6Ik15IHNhbHZhdGlvbiBjb21lcyBmcm9tIG1lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNzAvIiwiaWR4Ijo3MiwidWlkIjoibDA3MCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo3MSwidGl0bGUiOiJPbmx5IEdvZOKAmXMgcGxhbiBmb3Igc2FsdmF0aW9uIHdpbGwgd29yay4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDcxLyIsImlkeCI6NzMsInVpZCI6ImwwNzEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NzIsInRpdGxlIjoiSG9sZGluZyBncmlldmFuY2VzIGlzIGFuIGF0dGFjayBvbiBHb2TigJlzIHBsYW4gZm9yIHNhbHZhdGlvbi4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDcyLyIsImlkeCI6NzQsInVpZCI6ImwwNzIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NzMsInRpdGxlIjoiSSB3aWxsIHRoZXJlIGJlIGxpZ2h0LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNzMvIiwiaWR4Ijo3NSwidWlkIjoibDA3MyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo3NCwidGl0bGUiOiJUaGVyZSBpcyBubyB3aWxsIGJ1dCBHb2TigJlzLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwNzQvIiwiaWR4Ijo3NiwidWlkIjoibDA3NCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo3NSwidGl0bGUiOiJUaGUgbGlnaHQgaGFzIGNvbWUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA3NS8iLCJpZHgiOjc3LCJ1aWQiOiJsMDc1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjc2LCJ0aXRsZSI6IkkgYW0gdW5kZXIgbm8gbGF3cyBidXQgR29k4oCZcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDc2LyIsImlkeCI6NzgsInVpZCI6ImwwNzYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NzcsInRpdGxlIjoiSSBhbSBlbnRpdGxlZCB0byBtaXJhY2xlcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDc3LyIsImlkeCI6NzksInVpZCI6ImwwNzciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6NzgsInRpdGxlIjoiTGV0IG1pcmFjbGVzIHJlcGxhY2UgYWxsIGdyaWV2YW5jZXMuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA3OC8iLCJpZHgiOjgwLCJ1aWQiOiJsMDc4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjc5LCJ0aXRsZSI6IkxldCBtZSByZWNvZ25pemUgdGhlIHByb2JsZW0gc28gaXQgY2FuIGJlIHNvbHZlZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDc5LyIsImlkeCI6ODEsInVpZCI6ImwwNzkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6ODAsInRpdGxlIjoiTGV0IG1lIHJlY29nbml6ZSBteSBwcm9ibGVtcyBoYXZlIGJlZW4gc29sdmVkLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwODAvIiwiaWR4Ijo4MiwidWlkIjoibDA4MCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJSZXZpZXcgSUkgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svcmV2aWV3Mi8iLCJpZHgiOjgzLCJ1aWQiOiJyZXZpZXcyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjgxLCJ0aXRsZSI6IlJldmlldyA2MSAtIDYyIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA4MS8iLCJpZHgiOjg0LCJ1aWQiOiJsMDgxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjgyLCJ0aXRsZSI6IlJldmlldyA2MyAtIDY0IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA4Mi8iLCJpZHgiOjg1LCJ1aWQiOiJsMDgyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjgzLCJ0aXRsZSI6IlJldmlldyA2NSAtIDY2IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA4My8iLCJpZHgiOjg2LCJ1aWQiOiJsMDgzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjg0LCJ0aXRsZSI6IlJldmlldyA2NyAtIDY4IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA4NC8iLCJpZHgiOjg3LCJ1aWQiOiJsMDg0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjg1LCJ0aXRsZSI6IlJldmlldyA2OSAtIDcwIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA4NS8iLCJpZHgiOjg4LCJ1aWQiOiJsMDg1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjg2LCJ0aXRsZSI6IlJldmlldyA3MSAtIDcyIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA4Ni8iLCJpZHgiOjg5LCJ1aWQiOiJsMDg2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjg3LCJ0aXRsZSI6IlJldmlldyA3MyAtIDc0IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA4Ny8iLCJpZHgiOjkwLCJ1aWQiOiJsMDg3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjg4LCJ0aXRsZSI6IlJldmlldyA3NSAtIDc2IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA4OC8iLCJpZHgiOjkxLCJ1aWQiOiJsMDg4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjg5LCJ0aXRsZSI6IlJldmlldyA3NyAtIDc4IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA4OS8iLCJpZHgiOjkyLCJ1aWQiOiJsMDg5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjkwLCJ0aXRsZSI6IlJldmlldyA3OSAtIDgwIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA5MC8iLCJpZHgiOjkzLCJ1aWQiOiJsMDkwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjkxLCJ0aXRsZSI6Ik1pcmFjbGVzIGFyZSBzZWVuIGluIGxpZ2h0LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwOTEvIiwiaWR4Ijo5NCwidWlkIjoibDA5MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo5MiwidGl0bGUiOiJNaXJhY2xlcyBhcmUgc2VlbiBpbiBsaWdodCwgYW5kIGxpZ2h0IGFuZCBzdHJlbmd0aCBhcmUgb25lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwOTIvIiwiaWR4Ijo5NSwidWlkIjoibDA5MiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjo5MywidGl0bGUiOiJMaWdodCBhbmQgam95IGFuZCBwZWFjZSBhYmlkZSBpbiBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDkzLyIsImlkeCI6OTYsInVpZCI6ImwwOTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6OTQsInRpdGxlIjoiSSBhbSBhcyBHb2QgY3JlYXRlZCBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDk0LyIsImlkeCI6OTcsInVpZCI6ImwwOTQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6OTUsInRpdGxlIjoiSSBhbSBPbmUgU2VsZiwgdW5pdGVkIHdpdGggbXkgQ3JlYXRvci4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDk1LyIsImlkeCI6OTgsInVpZCI6ImwwOTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6OTYsInRpdGxlIjoiU2FsdmF0aW9uIGNvbWVzIGZyb20gbXkgT25lIFNlbGYuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDA5Ni8iLCJpZHgiOjk5LCJ1aWQiOiJsMDk2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjk3LCJ0aXRsZSI6IkkgYW0gU3Bpcml0LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwOTcvIiwiaWR4IjoxMDAsInVpZCI6ImwwOTciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6OTgsInRpdGxlIjoiSSB3aWxsIGFjY2VwdCBteSBwYXJ0IGluIEdvZOKAmXMgcGxhbiBmb3Igc2FsdmF0aW9uLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wwOTgvIiwiaWR4IjoxMDEsInVpZCI6ImwwOTgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6OTksInRpdGxlIjoiU2FsdmF0aW9uIGlzIG15IG9ubHkgZnVuY3Rpb24gaGVyZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMDk5LyIsImlkeCI6MTAyLCJ1aWQiOiJsMDk5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEwMCwidGl0bGUiOiJNeSBwYXJ0IGlzIGVzc2VudGlhbCB0byBHb2TigJlzIHBsYW4gZm9yIHNhbHZhdGlvbi4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTAwLyIsImlkeCI6MTAzLCJ1aWQiOiJsMTAwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEwMSwidGl0bGUiOiJHb2TigJlzIFdpbGwgZm9yIG1lIGlzIHBlcmZlY3QgaGFwcGluZXNzLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMDEvIiwiaWR4IjoxMDQsInVpZCI6ImwxMDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTAyLCJ0aXRsZSI6Ikkgc2hhcmUgR29k4oCZcyBXaWxsIGZvciBoYXBwaW5lc3MgZm9yIG1lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMDIvIiwiaWR4IjoxMDUsInVpZCI6ImwxMDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTAzLCJ0aXRsZSI6IkdvZCwgYmVpbmcgTG92ZSwgaXMgYWxzbyBoYXBwaW5lc3MuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDEwMy8iLCJpZHgiOjEwNiwidWlkIjoibDEwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMDQsInRpdGxlIjoiSSBzZWVrIGJ1dCB3aGF0IGJlbG9uZ3MgdG8gbWUgaW4gdHJ1dGguIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDEwNC8iLCJpZHgiOjEwNywidWlkIjoibDEwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMDUsInRpdGxlIjoiR29k4oCZcyBwZWFjZSBhbmQgam95IGFyZSBtaW5lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMDUvIiwiaWR4IjoxMDgsInVpZCI6ImwxMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTA2LCJ0aXRsZSI6IkxldCBtZSBiZSBzdGlsbCBhbmQgbGlzdGVuIHRvIHRoZSB0cnV0aC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTA2LyIsImlkeCI6MTA5LCJ1aWQiOiJsMTA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEwNywidGl0bGUiOiJUcnV0aCB3aWxsIGNvcnJlY3QgYWxsIGVycm9ycyBpbiBteSBtaW5kLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMDcvIiwiaWR4IjoxMTAsInVpZCI6ImwxMDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTA4LCJ0aXRsZSI6IlRvIGdpdmUgYW5kIHRvIHJlY2VpdmUgYXJlIG9uZSBpbiB0cnV0aC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTA4LyIsImlkeCI6MTExLCJ1aWQiOiJsMTA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEwOSwidGl0bGUiOiJJIHJlc3QgaW4gR29kLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMDkvIiwiaWR4IjoxMTIsInVpZCI6ImwxMDkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTEwLCJ0aXRsZSI6IkkgYW0gYXMgR29kIGNyZWF0ZWQgbWUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDExMC8iLCJpZHgiOjExMywidWlkIjoibDExMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJSZXZpZXcgSUlJIEludHJvZHVjdGlvbiIsInVybCI6Ii9hY2ltL3dvcmtib29rL3JldmlldzMvIiwiaWR4IjoxMTQsInVpZCI6InJldmlldzMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTExLCJ0aXRsZSI6IlJldmlldyA5MSAtIDkyIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDExMS8iLCJpZHgiOjExNSwidWlkIjoibDExMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMTIsInRpdGxlIjoiUmV2aWV3IDkzIC0gOTQiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTEyLyIsImlkeCI6MTE2LCJ1aWQiOiJsMTEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjExMywidGl0bGUiOiJSZXZpZXcgOTUgLSA5NiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMTMvIiwiaWR4IjoxMTcsInVpZCI6ImwxMTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTE0LCJ0aXRsZSI6IlJldmlldyA5NyAtIDk4IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDExNC8iLCJpZHgiOjExOCwidWlkIjoibDExNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMTUsInRpdGxlIjoiUmV2aWV3IDk5IC0gMTAwIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDExNS8iLCJpZHgiOjExOSwidWlkIjoibDExNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMTYsInRpdGxlIjoiUmV2aWV3IDEwMSAtIDEwMiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMTYvIiwiaWR4IjoxMjAsInVpZCI6ImwxMTYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTE3LCJ0aXRsZSI6IlJldmlldyAxMDMgLSAxMDQiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTE3LyIsImlkeCI6MTIxLCJ1aWQiOiJsMTE3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjExOCwidGl0bGUiOiJSZXZpZXcgMTA1IC0gMTA2IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDExOC8iLCJpZHgiOjEyMiwidWlkIjoibDExOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMTksInRpdGxlIjoiUmV2aWV3IDEwNyAtIDEwOCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMTkvIiwiaWR4IjoxMjMsInVpZCI6ImwxMTkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTIwLCJ0aXRsZSI6IlJldmlldyAxMDkgLSAxMTAiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTIwLyIsImlkeCI6MTI0LCJ1aWQiOiJsMTIwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEyMSwidGl0bGUiOiJGb3JnaXZlbmVzcyBpcyB0aGUga2V5IHRvIGhhcHBpbmVzcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTIxLyIsImlkeCI6MTI1LCJ1aWQiOiJsMTIxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEyMiwidGl0bGUiOiJGb3JnaXZlbmVzcyBvZmZlcnMgZXZlcnl0aGluZyBJIHdhbnQuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDEyMi8iLCJpZHgiOjEyNiwidWlkIjoibDEyMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMjMsInRpdGxlIjoiSSB0aGFuayBteSBGYXRoZXIgZm9yIEhpcyBnaWZ0cyB0byBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTIzLyIsImlkeCI6MTI3LCJ1aWQiOiJsMTIzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEyNCwidGl0bGUiOiJMZXQgbWUgcmVtZW1iZXIgSSBhbSBvbmUgd2l0aCBHb2QuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDEyNC8iLCJpZHgiOjEyOCwidWlkIjoibDEyNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMjUsInRpdGxlIjoiSW4gcXVpZXQgSSByZWNlaXZlIEdvZOKAmXMgV29yZCB0b2RheS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTI1LyIsImlkeCI6MTI5LCJ1aWQiOiJsMTI1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEyNiwidGl0bGUiOiJBbGwgdGhhdCBJIGdpdmUgaXMgZ2l2ZW4gdG8gbXlzZWxmLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMjYvIiwiaWR4IjoxMzAsInVpZCI6ImwxMjYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTI3LCJ0aXRsZSI6IlRoZXJlIGlzIG5vIGxvdmUgYnV0IEdvZOKAmXMuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDEyNy8iLCJpZHgiOjEzMSwidWlkIjoibDEyNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMjgsInRpdGxlIjoiVGhlcmUgaXMgbm8gbG92ZSBidXQgR29k4oCZcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTI4LyIsImlkeCI6MTMyLCJ1aWQiOiJsMTI4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEyOSwidGl0bGUiOiJCZXlvbmQgdGhpcyB3b3JsZCB0aGVyZSBpcyBhIHdvcmxkIEkgd2FudC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTI5LyIsImlkeCI6MTMzLCJ1aWQiOiJsMTI5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEzMCwidGl0bGUiOiJJdCBpcyBpbXBvc3NpYmxlIHRvIHNlZSB0d28gd29ybGRzLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMzAvIiwiaWR4IjoxMzQsInVpZCI6ImwxMzAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTMxLCJ0aXRsZSI6Ik5vLW9uZSBjYW4gZmFpbCB3aG8gYXNrcyB0byByZWFjaCB0aGUgdHJ1dGguIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDEzMS8iLCJpZHgiOjEzNSwidWlkIjoibDEzMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMzIsInRpdGxlIjoiSSBsb29zZSB0aGUgd29ybGQgZnJvbSBhbGwgSSB0aG91Z2h0IGl0IHdhcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTMyLyIsImlkeCI6MTM2LCJ1aWQiOiJsMTMyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEzMywidGl0bGUiOiJJIHdpbGwgbm90IHZhbHVlIHdoYXQgaXMgdmFsdWVsZXNzLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMzMvIiwiaWR4IjoxMzcsInVpZCI6ImwxMzMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTM0LCJ0aXRsZSI6IkxldCBtZSBwZXJjZWl2ZSBmb3JnaXZlbmVzcyBhcyBpdCBpcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTM0LyIsImlkeCI6MTM4LCJ1aWQiOiJsMTM0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEzNSwidGl0bGUiOiJJZiBJIGRlZmVuZCBteXNlbGYgSSBhbSBhdHRhY2tlZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTM1LyIsImlkeCI6MTM5LCJ1aWQiOiJsMTM1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEzNiwidGl0bGUiOiJTaWNrbmVzcyBpcyBhIGRlZmVuc2UgYWdhaW5zdCB0aGUgdHJ1dGguIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDEzNi8iLCJpZHgiOjE0MCwidWlkIjoibDEzNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMzcsInRpdGxlIjoiV2hlbiBJIGFtIGhlYWxlZCBJIGFtIG5vdCBoZWFsZWQgYWxvbmUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDEzNy8iLCJpZHgiOjE0MSwidWlkIjoibDEzNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxMzgsInRpdGxlIjoiSGVhdmVuIGlzIHRoZSBkZWNpc2lvbiBJIG11c3QgbWFrZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTM4LyIsImlkeCI6MTQyLCJ1aWQiOiJsMTM4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjEzOSwidGl0bGUiOiJJIHdpbGwgYWNjZXB0IEF0b25lbWVudCBmb3IgbXlzZWxmLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxMzkvIiwiaWR4IjoxNDMsInVpZCI6ImwxMzkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTQwLCJ0aXRsZSI6Ik9ubHkgc2FsdmF0aW9uIGNhbiBiZSBzYWlkIHRvIGN1cmUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE0MC8iLCJpZHgiOjE0NCwidWlkIjoibDE0MCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJJbnRyb2R1Y3Rpb24iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9yZXZpZXc0LyIsImlkeCI6MTQ1LCJ1aWQiOiJyZXZpZXc0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE0MSwidGl0bGUiOiJSZXZpZXcgMTIxIC0gMTIyIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE0MS8iLCJpZHgiOjE0NiwidWlkIjoibDE0MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNDIsInRpdGxlIjoiUmV2aWV3IDEyMyAtIDEyNCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNDIvIiwiaWR4IjoxNDcsInVpZCI6ImwxNDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTQzLCJ0aXRsZSI6IlJldmlldyAxMjUgLSAxMjYiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTQzLyIsImlkeCI6MTQ4LCJ1aWQiOiJsMTQzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE0NCwidGl0bGUiOiJSZXZpZXcgMTI3IC0gMTI4IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE0NC8iLCJpZHgiOjE0OSwidWlkIjoibDE0NCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNDUsInRpdGxlIjoiUmV2aWV3IDEyOSAtIDEzMCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNDUvIiwiaWR4IjoxNTAsInVpZCI6ImwxNDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTQ2LCJ0aXRsZSI6IlJldmlldyAxMzEgLSAxMzIiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTQ2LyIsImlkeCI6MTUxLCJ1aWQiOiJsMTQ2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE0NywidGl0bGUiOiJSZXZpZXcgMTMzIC0gMTM0IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE0Ny8iLCJpZHgiOjE1MiwidWlkIjoibDE0NyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNDgsInRpdGxlIjoiUmV2aWV3IDEzNSAtIDEzNiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNDgvIiwiaWR4IjoxNTMsInVpZCI6ImwxNDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTQ5LCJ0aXRsZSI6IlJldmlldyAxMzcgLSAxMzgiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTQ5LyIsImlkeCI6MTU0LCJ1aWQiOiJsMTQ5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE1MCwidGl0bGUiOiJSZXZpZXcgMTM5IC0gMTQwIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE1MC8iLCJpZHgiOjE1NSwidWlkIjoibDE1MCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNTEsInRpdGxlIjoiQWxsIHRoaW5ncyBhcmUgZWNob2VzIG9mIHRoZSBWb2ljZSBvZiBHb2QuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE1MS8iLCJpZHgiOjE1NiwidWlkIjoibDE1MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNTIsInRpdGxlIjoiVGhlIHBvd2VyIG9mIGRlY2lzaW9uIGlzIG15IG93bi4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTUyLyIsImlkeCI6MTU3LCJ1aWQiOiJsMTUyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE1MywidGl0bGUiOiJJbiBteSBkZWZlbnNlbGVzc25lc3MgbXkgc2FmZXR5IGxpZXMuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE1My8iLCJpZHgiOjE1OCwidWlkIjoibDE1MyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNTQsInRpdGxlIjoiSSBhbSBhbW9uZyB0aGUgbWluaXN0ZXJzIG9mIEdvZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTU0LyIsImlkeCI6MTU5LCJ1aWQiOiJsMTU0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE1NSwidGl0bGUiOiJJIHdpbGwgc3RlcCBiYWNrIGFuZCBsZXQgSGltIGxlYWQgdGhlIHdheS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTU1LyIsImlkeCI6MTYwLCJ1aWQiOiJsMTU1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE1NiwidGl0bGUiOiJJIHdhbGsgd2l0aCBHb2QgaW4gcGVyZmVjdCBob2xpbmVzcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTU2LyIsImlkeCI6MTYxLCJ1aWQiOiJsMTU2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE1NywidGl0bGUiOiJJbnRvIEhpcyBQcmVzZW5jZSB3b3VsZCBJIGVudGVyIG5vdy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTU3LyIsImlkeCI6MTYyLCJ1aWQiOiJsMTU3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE1OCwidGl0bGUiOiJUb2RheSBJIGxlYXJuIHRvIGdpdmUgYXMgSSByZWNlaXZlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNTgvIiwiaWR4IjoxNjMsInVpZCI6ImwxNTgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTU5LCJ0aXRsZSI6IkkgZ2l2ZSB0aGUgbWlyYWNsZXMgSSBoYXZlIHJlY2VpdmVkLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNTkvIiwiaWR4IjoxNjQsInVpZCI6ImwxNTkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTYwLCJ0aXRsZSI6IkkgYW0gYXQgaG9tZS4gRmVhciBpcyB0aGUgc3RyYW5nZXIgaGVyZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTYwLyIsImlkeCI6MTY1LCJ1aWQiOiJsMTYwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE2MSwidGl0bGUiOiJHaXZlIG1lIHlvdXIgYmxlc3NpbmcsIGhvbHkgU29uIG9mIEdvZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTYxLyIsImlkeCI6MTY2LCJ1aWQiOiJsMTYxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE2MiwidGl0bGUiOiJJIGFtIGFzIEdvZCBjcmVhdGVkIG1lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNjIvIiwiaWR4IjoxNjcsInVpZCI6ImwxNjIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTYzLCJ0aXRsZSI6IlRoZXJlIGlzIG5vIGRlYXRoLiBUaGUgU29uIG9mIEdvZCBpcyBmcmVlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNjMvIiwiaWR4IjoxNjgsInVpZCI6ImwxNjMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTY0LCJ0aXRsZSI6Ik5vdyBhcmUgd2UgT25lIHdpdGggSGltIFdobyBpcyBvdXIgU291cmNlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNjQvIiwiaWR4IjoxNjksInVpZCI6ImwxNjQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTY1LCJ0aXRsZSI6IkxldCBub3QgbXkgbWluZCBkZW55IHRoZSBUaG91Z2h0IG9mIEdvZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTY1LyIsImlkeCI6MTcwLCJ1aWQiOiJsMTY1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE2NiwidGl0bGUiOiJJIGFtIGVudHJ1c3RlZCB3aXRoIHRoZSBnaWZ0cyBvZiBHb2QuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE2Ni8iLCJpZHgiOjE3MSwidWlkIjoibDE2NiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNjcsInRpdGxlIjoiVGhlcmUgaXMgb25lIGxpZmUsIGFuZCB0aGF0IEkgc2hhcmUgd2l0aCBHb2QuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE2Ny8iLCJpZHgiOjE3MiwidWlkIjoibDE2NyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNjgsInRpdGxlIjoiWW91ciBncmFjZSBpcyBnaXZlbiBtZS4gSSBjbGFpbSBpdCBub3cuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE2OC8iLCJpZHgiOjE3MywidWlkIjoibDE2OCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNjksInRpdGxlIjoiQnkgZ3JhY2UgSSBsaXZlLiBCeSBncmFjZSBJIGFtIHJlbGVhc2VkLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNjkvIiwiaWR4IjoxNzQsInVpZCI6ImwxNjkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTcwLCJ0aXRsZSI6IlRoZXJlIGlzIG5vIGNydWVsdHkgaW4gR29kIGFuZCBub25lIGluIG1lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNzAvIiwiaWR4IjoxNzUsInVpZCI6ImwxNzAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svcmV2aWV3NS8iLCJpZHgiOjE3NiwidWlkIjoicmV2aWV3NSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNzEsInRpdGxlIjoiUmV2aWV3IDE1MSAtIDE1MiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNzEvIiwiaWR4IjoxNzcsInVpZCI6ImwxNzEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTcyLCJ0aXRsZSI6IlJldmlldyAxNTMgLSAxNTQiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTcyLyIsImlkeCI6MTc4LCJ1aWQiOiJsMTcyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE3MywidGl0bGUiOiJSZXZpZXcgMTU1IC0gMTU2IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE3My8iLCJpZHgiOjE3OSwidWlkIjoibDE3MyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNzQsInRpdGxlIjoiUmV2aWV3IDE1NyAtIDE1OCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNzQvIiwiaWR4IjoxODAsInVpZCI6ImwxNzQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTc1LCJ0aXRsZSI6IlJldmlldyAxNTkgLSAxNjAiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTc1LyIsImlkeCI6MTgxLCJ1aWQiOiJsMTc1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE3NiwidGl0bGUiOiJSZXZpZXcgMTYxIC0gMTYyIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE3Ni8iLCJpZHgiOjE4MiwidWlkIjoibDE3NiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxNzcsInRpdGxlIjoiUmV2aWV3IDE2MyAtIDE2NCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxNzcvIiwiaWR4IjoxODMsInVpZCI6ImwxNzciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTc4LCJ0aXRsZSI6IlJldmlldyAxNjUgLSAxNjYiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTc4LyIsImlkeCI6MTg0LCJ1aWQiOiJsMTc4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE3OSwidGl0bGUiOiJSZXZpZXcgMTY3IC0gMTY4IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE3OS8iLCJpZHgiOjE4NSwidWlkIjoibDE3OSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxODAsInRpdGxlIjoiUmV2aWV3IDE2OSAtIDE3MCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxODAvIiwiaWR4IjoxODYsInVpZCI6ImwxODAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiTGVzc29ucyAxODEgLSAyMDAgSW50cm9kdWN0aW9uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svaW50cm8xODEvIiwiaWR4IjoxODcsInVpZCI6ImludHJvMTgxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE4MSwidGl0bGUiOiJJIHRydXN0IG15IGJyb3RoZXJzLCB3aG8gYXJlIG9uZSB3aXRoIG1lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxODEvIiwiaWR4IjoxODgsInVpZCI6ImwxODEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTgyLCJ0aXRsZSI6Ikkgd2lsbCBiZSBzdGlsbCBhbiBpbnN0YW50IGFuZCBnbyBob21lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxODIvIiwiaWR4IjoxODksInVpZCI6ImwxODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTgzLCJ0aXRsZSI6IkkgY2FsbCB1cG9uIEdvZOKAmXMgTmFtZSBhbmQgb24gbXkgb3duLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxODMvIiwiaWR4IjoxOTAsInVpZCI6ImwxODMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTg0LCJ0aXRsZSI6IlRoZSBOYW1lIG9mIEdvZCBpcyBteSBpbmhlcml0YW5jZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTg0LyIsImlkeCI6MTkxLCJ1aWQiOiJsMTg0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE4NSwidGl0bGUiOiJJIHdhbnQgdGhlIHBlYWNlIG9mIEdvZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTg1LyIsImlkeCI6MTkyLCJ1aWQiOiJsMTg1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE4NiwidGl0bGUiOiJTYWx2YXRpb24gb2YgdGhlIHdvcmxkIGRlcGVuZHMgb24gbWUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE4Ni8iLCJpZHgiOjE5MywidWlkIjoibDE4NiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxODcsInRpdGxlIjoiSSBibGVzcyB0aGUgd29ybGQgYmVjYXVzZSBJIGJsZXNzIG15c2VsZi4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTg3LyIsImlkeCI6MTk0LCJ1aWQiOiJsMTg3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE4OCwidGl0bGUiOiJUaGUgcGVhY2Ugb2YgR29kIGlzIHNoaW5pbmcgaW4gbWUgbm93LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxODgvIiwiaWR4IjoxOTUsInVpZCI6ImwxODgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTg5LCJ0aXRsZSI6IkkgZmVlbCB0aGUgTG92ZSBvZiBHb2Qgd2l0aGluIG1lIG5vdy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTg5LyIsImlkeCI6MTk2LCJ1aWQiOiJsMTg5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE5MCwidGl0bGUiOiJJIGNob29zZSB0aGUgam95IG9mIEdvZCBpbnN0ZWFkIG9mIHBhaW4uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE5MC8iLCJpZHgiOjE5NywidWlkIjoibDE5MCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxOTEsInRpdGxlIjoiSSBhbSB0aGUgaG9seSBTb24gb2YgR29kIEhpbXNlbGYuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE5MS8iLCJpZHgiOjE5OCwidWlkIjoibDE5MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxOTIsInRpdGxlIjoiSSBoYXZlIGEgZnVuY3Rpb24gR29kIHdvdWxkIGhhdmUgbWUgZmlsbC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTkyLyIsImlkeCI6MTk5LCJ1aWQiOiJsMTkyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE5MywidGl0bGUiOiJBbGwgdGhpbmdzIGFyZSBsZXNzb25zIEdvZCB3b3VsZCBoYXZlIG1lIGxlYXJuLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxOTMvIiwiaWR4IjoyMDAsInVpZCI6ImwxOTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTk0LCJ0aXRsZSI6IkkgcGxhY2UgdGhlIGZ1dHVyZSBpbiB0aGUgSGFuZHMgb2YgR29kLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxOTQvIiwiaWR4IjoyMDEsInVpZCI6ImwxOTQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTk1LCJ0aXRsZSI6IkxvdmUgaXMgdGhlIHdheSBJIHdhbGsgaW4gZ3JhdGl0dWRlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wxOTUvIiwiaWR4IjoyMDIsInVpZCI6ImwxOTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MTk2LCJ0aXRsZSI6Ikl0IGNhbiBiZSBidXQgbXlzZWxmIEkgY3J1Y2lmeS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTk2LyIsImlkeCI6MjAzLCJ1aWQiOiJsMTk2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE5NywidGl0bGUiOiJJdCBjYW4gYmUgYnV0IG15IGdyYXRpdHVkZSBJIGVhcm4uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDE5Ny8iLCJpZHgiOjIwNCwidWlkIjoibDE5NyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoxOTgsInRpdGxlIjoiT25seSBteSBjb25kZW1uYXRpb24gaW5qdXJlcyBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTk4LyIsImlkeCI6MjA1LCJ1aWQiOiJsMTk4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjE5OSwidGl0bGUiOiJJIGFtIG5vdCBhIGJvZHkuIEkgYW0gZnJlZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMTk5LyIsImlkeCI6MjA2LCJ1aWQiOiJsMTk5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIwMCwidGl0bGUiOiJUaGVyZSBpcyBubyBwZWFjZSBleGNlcHQgdGhlIHBlYWNlIG9mIEdvZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjAwLyIsImlkeCI6MjA3LCJ1aWQiOiJsMjAwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IkludHJvZHVjdGlvbiAxODEgLSAyMDAiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9yZXZpZXc2LyIsImlkeCI6MjA4LCJ1aWQiOiJyZXZpZXc2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIwMSwidGl0bGUiOiJSZXZpZXcgTGVzc29uIDE4MSIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMDEvIiwiaWR4IjoyMDksInVpZCI6ImwyMDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjAyLCJ0aXRsZSI6IlJldmlldyBMZXNzb24gMTgyIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIwMi8iLCJpZHgiOjIxMCwidWlkIjoibDIwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMDMsInRpdGxlIjoiUmV2aWV3IExlc3NvbiAxODMiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjAzLyIsImlkeCI6MjExLCJ1aWQiOiJsMjAzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIwNCwidGl0bGUiOiJSZXZpZXcgTGVzc29uIDE4NCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMDQvIiwiaWR4IjoyMTIsInVpZCI6ImwyMDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjA1LCJ0aXRsZSI6IlJldmlldyBMZXNzb24gMTg1IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIwNS8iLCJpZHgiOjIxMywidWlkIjoibDIwNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMDYsInRpdGxlIjoiUmV2aWV3IExlc3NvbiAxODYiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjA2LyIsImlkeCI6MjE0LCJ1aWQiOiJsMjA2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIwNywidGl0bGUiOiJSZXZpZXcgTGVzc29uIDE4NyIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMDcvIiwiaWR4IjoyMTUsInVpZCI6ImwyMDciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjA4LCJ0aXRsZSI6IlJldmlldyBMZXNzb24gMTg4IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIwOC8iLCJpZHgiOjIxNiwidWlkIjoibDIwOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMDksInRpdGxlIjoiUmV2aWV3IExlc3NvbiAxODkiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjA5LyIsImlkeCI6MjE3LCJ1aWQiOiJsMjA5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIxMCwidGl0bGUiOiJSZXZpZXcgTGVzc29uIDE5MCIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMTAvIiwiaWR4IjoyMTgsInVpZCI6ImwyMTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjExLCJ0aXRsZSI6IlJldmlldyBMZXNzb24gMTkxIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIxMS8iLCJpZHgiOjIxOSwidWlkIjoibDIxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMTIsInRpdGxlIjoiUmV2aWV3IExlc3NvbiAxOTIiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjEyLyIsImlkeCI6MjIwLCJ1aWQiOiJsMjEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIxMywidGl0bGUiOiJSZXZpZXcgTGVzc29uIDE5MyIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMTMvIiwiaWR4IjoyMjEsInVpZCI6ImwyMTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjE0LCJ0aXRsZSI6IlJldmlldyBMZXNzb24gMTk0IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIxNC8iLCJpZHgiOjIyMiwidWlkIjoibDIxNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMTUsInRpdGxlIjoiUmV2aWV3IExlc3NvbiAxOTUiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjE1LyIsImlkeCI6MjIzLCJ1aWQiOiJsMjE1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIxNSwidGl0bGUiOiJSZXZpZXcgTGVzc29uIDE5NiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMTYvIiwiaWR4IjoyMjQsInVpZCI6ImwyMTYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjE3LCJ0aXRsZSI6IlJldmlldyBMZXNzb24gMTk3IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIxNy8iLCJpZHgiOjIyNSwidWlkIjoibDIxNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMTgsInRpdGxlIjoiUmV2aWV3IExlc3NvbiAxOTgiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjE4LyIsImlkeCI6MjI2LCJ1aWQiOiJsMjE4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIxOSwidGl0bGUiOiJSZXZpZXcgTGVzc29uIDE5OSIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMTkvIiwiaWR4IjoyMjcsInVpZCI6ImwyMTkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjIwLCJ0aXRsZSI6IlJldmlldyBMZXNzb24gMjAwIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIyMC8iLCJpZHgiOjIyOCwidWlkIjoibDIyMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJQYXJ0IElJIEludHJvZHVjdGlvbiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2ludHJvcDIvIiwiaWR4IjoyMjksInVpZCI6ImludHJvcDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiV2hhdCBpcyBGb3JnaXZlbmVzcz8iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9mb3JnaXZlbmVzcy8iLCJpZHgiOjIzMCwidWlkIjoiZm9yZ2l2ZW5lc3MiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjIxLCJ0aXRsZSI6IlBlYWNlIHRvIG15IG1pbmQuIExldCBhbGwgbXkgdGhvdWdodHMgYmUgc3RpbGwuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIyMS8iLCJpZHgiOjIzMSwidWlkIjoibDIyMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMjIsInRpdGxlIjoiR29kIGlzIHdpdGggbWUuIEkgbGl2ZSBhbmQgYnJlYXRoZSBpbiBIaW0uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIyMi8iLCJpZHgiOjIzMiwidWlkIjoibDIyMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMjMsInRpdGxlIjoiR29kIGlzIG15IGxpZmUuIEkgaGF2ZSBubyBsaWZlIGJ1dCBIaXMuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIyMy8iLCJpZHgiOjIzMywidWlkIjoibDIyMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMjQsInRpdGxlIjoiR29kIGlzIG15IEZhdGhlciwgYW5kIEhlIGxvdmVzIEhpcyBTb24uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIyNC8iLCJpZHgiOjIzNCwidWlkIjoibDIyNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMjUsInRpdGxlIjoiR29kIGlzIG15IEZhdGhlciwgYW5kIEhpcyBTb24gbG92ZXMgSGltLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMjUvIiwiaWR4IjoyMzUsInVpZCI6ImwyMjUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjI2LCJ0aXRsZSI6Ik15IGhvbWUgYXdhaXRzIG1lLiBJIHdpbGwgaGFzdGVuIHRoZXJlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMjYvIiwiaWR4IjoyMzYsInVpZCI6ImwyMjYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjI3LCJ0aXRsZSI6IlRoaXMgaXMgbXkgaG9seSBpbnN0YW50IG9mIHJlbGVhc2UuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIyNy8iLCJpZHgiOjIzNywidWlkIjoibDIyNyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMjgsInRpdGxlIjoiR29kIGhhcyBjb25kZW1uZWQgbWUgbm90LiBObyBtb3JlIGRvIEkuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIyOC8iLCJpZHgiOjIzOCwidWlkIjoibDIyOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMjksInRpdGxlIjoiTG92ZSwgV2hpY2ggY3JlYXRlZCBtZSwgaXMgd2hhdCBJIGFtLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMjkvIiwiaWR4IjoyMzksInVpZCI6ImwyMjkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjMwLCJ0aXRsZSI6Ik5vdyB3aWxsIEkgc2VlayBhbmQgZmluZCB0aGUgcGVhY2Ugb2YgR29kLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMzAvIiwiaWR4IjoyNDAsInVpZCI6ImwyMzAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiV2hhdCBpcyBTYWx2YXRpb24/IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svc2FsdmF0aW9uLyIsImlkeCI6MjQxLCJ1aWQiOiJzYWx2YXRpb24iLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjMxLCJ0aXRsZSI6IkZhdGhlciwgSSB3aWxsIGJ1dCB0byByZW1lbWJlciBZb3UuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIzMS8iLCJpZHgiOjI0MiwidWlkIjoibDIzMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMzIsInRpdGxlIjoiQmUgaW4gbXkgbWluZCwgbXkgRmF0aGVyLCB0aHJvdWdoIHRoZSBkYXkuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIzMi8iLCJpZHgiOjI0MywidWlkIjoibDIzMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMzMsInRpdGxlIjoiSSBnaXZlIG15IGxpZmUgdG8gR29kIHRvIHJ1biB0b2RheS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjMzLyIsImlkeCI6MjQ0LCJ1aWQiOiJsMjMzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjIzNCwidGl0bGUiOiJGYXRoZXIsIHRvZGF5IEkgYW0gWW91ciBTb24gYWdhaW4uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIzNC8iLCJpZHgiOjI0NSwidWlkIjoibDIzNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMzUsInRpdGxlIjoiR29kIGluIEhpcyBtZXJjeSB3aWxscyB0aGF0IEkgYmUgc2F2ZWQuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIzNS8iLCJpZHgiOjI0NiwidWlkIjoibDIzNSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMzYsInRpdGxlIjoiSSBydWxlIG15IG1pbmQsIHdoaWNoIEkgYWxvbmUgbXVzdCBydWxlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMzYvIiwiaWR4IjoyNDcsInVpZCI6ImwyMzYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjM3LCJ0aXRsZSI6Ik5vdyB3b3VsZCBJIGJlIGFzIEdvZCBjcmVhdGVkIG1lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyMzcvIiwiaWR4IjoyNDgsInVpZCI6ImwyMzciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjM4LCJ0aXRsZSI6Ik9uIG15IGRlY2lzaW9uIGFsbCBzYWx2YXRpb24gcmVzdHMuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIzOC8iLCJpZHgiOjI0OSwidWlkIjoibDIzOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyMzksInRpdGxlIjoiVGhlIGdsb3J5IG9mIG15IEZhdGhlciBpcyBteSBvd24uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDIzOS8iLCJpZHgiOjI1MCwidWlkIjoibDIzOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyNDAsInRpdGxlIjoiRmVhciBpcyBub3QganVzdGlmaWVkIGluIGFueSBmb3JtLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNDAvIiwiaWR4IjoyNTEsInVpZCI6ImwyNDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiV2hhdCBpcyB0aGUgV29ybGQ/IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svd29ybGQvIiwiaWR4IjoyNTIsInVpZCI6IndvcmxkIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI0MSwidGl0bGUiOiJUaGlzIGhvbHkgaW5zdGFudCBpcyBzYWx2YXRpb24gY29tZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjQxLyIsImlkeCI6MjUzLCJ1aWQiOiJsMjQxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI0MiwidGl0bGUiOiJUaGlzIGRheSBpcyBHb2TigJlzLiBJdCBpcyBteSBnaWZ0IHRvIEhpbS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjQyLyIsImlkeCI6MjU0LCJ1aWQiOiJsMjQyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI0MywidGl0bGUiOiJUb2RheSBJIHdpbGwganVkZ2Ugbm90aGluZyB0aGF0IG9jY3Vycy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjQzLyIsImlkeCI6MjU1LCJ1aWQiOiJsMjQzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI0NCwidGl0bGUiOiJJIGFtIGluIGRhbmdlciBub3doZXJlIGluIHRoZSB3b3JsZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjQ0LyIsImlkeCI6MjU2LCJ1aWQiOiJsMjQ0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI0NSwidGl0bGUiOiJZb3VyIHBlYWNlIGlzIHdpdGggbWUsIEZhdGhlci4gSSBhbSBzYWZlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNDUvIiwiaWR4IjoyNTcsInVpZCI6ImwyNDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjQ2LCJ0aXRsZSI6IlRvIGxvdmUgbXkgRmF0aGVyIGlzIHRvIGxvdmUgSGlzIFNvbi4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjQ2LyIsImlkeCI6MjU4LCJ1aWQiOiJsMjQ2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI0NywidGl0bGUiOiJXaXRob3V0IGZvcmdpdmVuZXNzIEkgd2lsbCBzdGlsbCBiZSBibGluZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjQ3LyIsImlkeCI6MjU5LCJ1aWQiOiJsMjQ3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI0OCwidGl0bGUiOiJXaGF0ZXZlciBzdWZmZXJzIGlzIG5vdCBwYXJ0IG9mIG1lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNDgvIiwiaWR4IjoyNjAsInVpZCI6ImwyNDgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjQ5LCJ0aXRsZSI6IkZvcmdpdmVuZXNzIGVuZHMgYWxsIHN1ZmZlcmluZyBhbmQgbG9zcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjQ5LyIsImlkeCI6MjYxLCJ1aWQiOiJsMjQ5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI1MCwidGl0bGUiOiJMZXQgbWUgbm90IHNlZSBteXNlbGYgYXMgbGltaXRlZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjUwLyIsImlkeCI6MjYyLCJ1aWQiOiJsMjUwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IldoYXQgaXMgU2luPyIsInVybCI6Ii9hY2ltL3dvcmtib29rL3Npbi8iLCJpZHgiOjI2MywidWlkIjoic2luIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI1MSwidGl0bGUiOiJJIGFtIGluIG5lZWQgb2Ygbm90aGluZyBidXQgdGhlIHRydXRoLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNTEvIiwiaWR4IjoyNjQsInVpZCI6ImwyNTEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjUyLCJ0aXRsZSI6IlRoZSBTb24gb2YgR29kIGlzIG15IGlkZW50aXR5LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNTIvIiwiaWR4IjoyNjUsInVpZCI6ImwyNTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjUzLCJ0aXRsZSI6Ik15IFNlbGYgaXMgcnVsZXIgb2YgdGhlIHVuaXZlcnNlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNTMvIiwiaWR4IjoyNjYsInVpZCI6ImwyNTMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjU0LCJ0aXRsZSI6IkxldCBldmVyeSB2b2ljZSBidXQgR29k4oCZcyBiZSBzdGlsbCBpbiBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjU0LyIsImlkeCI6MjY3LCJ1aWQiOiJsMjU0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI1NSwidGl0bGUiOiJUaGlzIGRheSBJIGNob29zZSB0byBzcGVuZCBpbiBwZXJmZWN0IHBlYWNlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNTUvIiwiaWR4IjoyNjgsInVpZCI6ImwyNTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjU2LCJ0aXRsZSI6IkdvZCBpcyB0aGUgb25seSBnb2FsIEkgaGF2ZSB0b2RheS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjU2LyIsImlkeCI6MjY5LCJ1aWQiOiJsMjU2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI1NywidGl0bGUiOiJMZXQgbWUgcmVtZW1iZXIgd2hhdCBteSBwdXJwb3NlIGlzLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNTcvIiwiaWR4IjoyNzAsInVpZCI6ImwyNTciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjU4LCJ0aXRsZSI6IkxldCBtZSByZW1lbWJlciB0aGF0IG15IGdvYWwgaXMgR29kLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNTgvIiwiaWR4IjoyNzEsInVpZCI6ImwyNTgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjU5LCJ0aXRsZSI6IkxldCBtZSByZW1lbWJlciB0aGF0IHRoZXJlIGlzIG5vIHNpbi4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjU5LyIsImlkeCI6MjcyLCJ1aWQiOiJsMjU5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI2MCwidGl0bGUiOiJMZXQgbWUgcmVtZW1iZXIgR29kIGNyZWF0ZWQgbWUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDI2MC8iLCJpZHgiOjI3MywidWlkIjoibDI2MCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJXaGF0IGlzIHRoZSBCb2R5PyIsInVybCI6Ii9hY2ltL3dvcmtib29rL2JvZHkvIiwiaWR4IjoyNzQsInVpZCI6ImJvZHkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjYxLCJ0aXRsZSI6IkdvZCBpcyBteSByZWZ1Z2UgYW5kIHNlY3VyaXR5LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNjEvIiwiaWR4IjoyNzUsInVpZCI6ImwyNjEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjYyLCJ0aXRsZSI6IkxldCBtZSBwZXJjZWl2ZSBubyBkaWZmZXJlbmNlcyB0b2RheS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjYyLyIsImlkeCI6Mjc2LCJ1aWQiOiJsMjYyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI2MywidGl0bGUiOiJNeSBob2x5IHZpc2lvbiBzZWVzIGFsbCB0aGluZ3MgYXMgcHVyZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjYzLyIsImlkeCI6Mjc3LCJ1aWQiOiJsMjYzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI2NCwidGl0bGUiOiJJIGFtIHN1cnJvdW5kZWQgYnkgdGhlIExvdmUgb2YgR29kLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNjQvIiwiaWR4IjoyNzgsInVpZCI6ImwyNjQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjY1LCJ0aXRsZSI6IkNyZWF0aW9u4oCZcyBnZW50bGVuZXNzIGlzIGFsbCBJIHNlZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjY1LyIsImlkeCI6Mjc5LCJ1aWQiOiJsMjY1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI2NiwidGl0bGUiOiJNeSBob2x5IFNlbGYgYWJpZGVzIGluIHlvdSwgR29k4oCZcyBTb24uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDI2Ni8iLCJpZHgiOjI4MCwidWlkIjoibDI2NiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyNjcsInRpdGxlIjoiTXkgaGVhcnQgaXMgYmVhdGluZyBpbiB0aGUgcGVhY2Ugb2YgR29kLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNjcvIiwiaWR4IjoyODEsInVpZCI6ImwyNjciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjY4LCJ0aXRsZSI6IkxldCBhbGwgdGhpbmdzIGJlIGV4YWN0bHkgYXMgdGhleSBhcmUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDI2OC8iLCJpZHgiOjI4MiwidWlkIjoibDI2OCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyNjksInRpdGxlIjoiTXkgc2lnaHQgZ29lcyBmb3J0aCB0byBsb29rIHVwb24gQ2hyaXN04oCZcyBmYWNlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNjkvIiwiaWR4IjoyODMsInVpZCI6ImwyNjkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjcwLCJ0aXRsZSI6Ikkgd2lsbCBub3QgdXNlIHRoZSBib2R54oCZcyBleWVzIHRvZGF5LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNzAvIiwiaWR4IjoyODQsInVpZCI6ImwyNzAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiV2hhdCBpcyB0aGUgQ2hyaXN0PyIsInVybCI6Ii9hY2ltL3dvcmtib29rL2NocmlzdC8iLCJpZHgiOjI4NSwidWlkIjoiY2hyaXN0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI3MSwidGl0bGUiOiJDaHJpc3TigJlzIGlzIHRoZSB2aXNpb24gSSB3aWxsIHVzZSB0b2RheS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjcxLyIsImlkeCI6Mjg2LCJ1aWQiOiJsMjcxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI3MiwidGl0bGUiOiJIb3cgY2FuIGlsbHVzaW9ucyBzYXRpc2Z5IEdvZOKAmXMgU29uPyIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNzIvIiwiaWR4IjoyODcsInVpZCI6ImwyNzIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjczLCJ0aXRsZSI6IlRoZSBzdGlsbG5lc3Mgb2YgdGhlIHBlYWNlIG9mIEdvZCBpcyBtaW5lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNzMvIiwiaWR4IjoyODgsInVpZCI6ImwyNzMiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6Mjc0LCJ0aXRsZSI6IlRvZGF5IGJlbG9uZ3MgdG8gTG92ZS4gTGV0IG1lIG5vdCBmZWFyLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNzQvIiwiaWR4IjoyODksInVpZCI6ImwyNzQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6Mjc1LCJ0aXRsZSI6IkdvZOKAmXMgaGVhbGluZyBWb2ljZSBwcm90ZWN0cyBhbGwgdGhpbmdzIHRvZGF5LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNzUvIiwiaWR4IjoyOTAsInVpZCI6ImwyNzUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6Mjc2LCJ0aXRsZSI6IlRoZSBXb3JkIG9mIEdvZCBpcyBnaXZlbiBtZSB0byBzcGVhay4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjc2LyIsImlkeCI6MjkxLCJ1aWQiOiJsMjc2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI3NywidGl0bGUiOiJMZXQgbWUgbm90IGJpbmQgWW91ciBTb24gd2l0aCBsYXdzIEkgbWFkZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjc3LyIsImlkeCI6MjkyLCJ1aWQiOiJsMjc3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI3OCwidGl0bGUiOiJJZiBJIGFtIGJvdW5kLCBteSBGYXRoZXIgaXMgbm90IGZyZWUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDI3OC8iLCJpZHgiOjI5MywidWlkIjoibDI3OCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyNzksInRpdGxlIjoiQ3JlYXRpb27igJlzIGZyZWVkb20gcHJvbWlzZXMgbXkgb3duLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyNzkvIiwiaWR4IjoyOTQsInVpZCI6ImwyNzkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjgwLCJ0aXRsZSI6IldoYXQgbGltaXRzIGNhbiBJIGxheSB1cG9uIEdvZOKAmXMgU29uPyIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyODAvIiwiaWR4IjoyOTUsInVpZCI6ImwyODAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiV2hhdCBpcyB0aGUgSG9seSBTcGlyaXQ/IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svaG9seXNwaXJpdC8iLCJpZHgiOjI5NiwidWlkIjoiaG9seXNwaXJpdCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyODEsInRpdGxlIjoiSSBjYW4gYmUgaHVydCBieSBub3RoaW5nIGJ1dCBteSB0aG91Z2h0cy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjgxLyIsImlkeCI6Mjk3LCJ1aWQiOiJsMjgxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI4MiwidGl0bGUiOiJJIHdpbGwgbm90IGJlIGFmcmFpZCBvZiBsb3ZlIHRvZGF5LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyODIvIiwiaWR4IjoyOTgsInVpZCI6ImwyODIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjgzLCJ0aXRsZSI6Ik15IHRydWUgSWRlbnRpdHkgYWJpZGVzIGluIFlvdS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjgzLyIsImlkeCI6Mjk5LCJ1aWQiOiJsMjgzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI4NCwidGl0bGUiOiJJIGNhbiBlbGVjdCB0byBjaGFuZ2UgYWxsIHRob3VnaHRzIHRoYXQgaHVydC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjg0LyIsImlkeCI6MzAwLCJ1aWQiOiJsMjg0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI4NSwidGl0bGUiOiJNeSBob2xpbmVzcyBzaGluZXMgYnJpZ2h0IGFuZCBjbGVhciB0b2RheS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjg1LyIsImlkeCI6MzAxLCJ1aWQiOiJsMjg1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI4NiwidGl0bGUiOiJUaGUgaHVzaCBvZiBIZWF2ZW4gaG9sZHMgbXkgaGVhcnQgdG9kYXkuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDI4Ni8iLCJpZHgiOjMwMiwidWlkIjoibDI4NiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyODcsInRpdGxlIjoiWW91IGFyZSBteSBnb2FsLCBteSBGYXRoZXIuIE9ubHkgWW91LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyODcvIiwiaWR4IjozMDMsInVpZCI6ImwyODciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6Mjg4LCJ0aXRsZSI6IkxldCBtZSBmb3JnZXQgbXkgYnJvdGhlcuKAmXMgcGFzdCB0b2RheS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjg4LyIsImlkeCI6MzA0LCJ1aWQiOiJsMjg4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI4OSwidGl0bGUiOiJUaGUgcGFzdCBpcyBvdmVyLiBJdCBjYW4gdG91Y2ggbWUgbm90LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyODkvIiwiaWR4IjozMDUsInVpZCI6ImwyODkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjkwLCJ0aXRsZSI6Ik15IHByZXNlbnQgaGFwcGluZXNzIGlzIGFsbCBJIHNlZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjkwLyIsImlkeCI6MzA2LCJ1aWQiOiJsMjkwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IldoYXQgaXMgdGhlIFJlYWwgV29ybGQ/IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svcmVhbHdvcmxkLyIsImlkeCI6MzA3LCJ1aWQiOiJyZWFsd29ybGQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjkxLCJ0aXRsZSI6IlRoaXMgaXMgYSBkYXkgb2Ygc3RpbGxuZXNzIGFuZCBvZiBwZWFjZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjkxLyIsImlkeCI6MzA4LCJ1aWQiOiJsMjkxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI5MiwidGl0bGUiOiJBIGhhcHB5IG91dGNvbWUgdG8gYWxsIHRoaW5ncyBpcyBzdXJlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyOTIvIiwiaWR4IjozMDksInVpZCI6ImwyOTIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MjkzLCJ0aXRsZSI6IkFsbCBmZWFyIGlzIHBhc3QsIGFuZCBvbmx5IGxvdmUgaXMgaGVyZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjkzLyIsImlkeCI6MzEwLCJ1aWQiOiJsMjkzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI5NCwidGl0bGUiOiJNeSBib2R5IGlzIGEgd2hvbGx5IG5ldXRyYWwgdGhpbmcuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDI5NC8iLCJpZHgiOjMxMSwidWlkIjoibDI5NCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyOTUsInRpdGxlIjoiVGhlIEhvbHkgU3Bpcml0IGxvb2tzIHRocm91Z2ggbWUgdG9kYXkuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDI5NS8iLCJpZHgiOjMxMiwidWlkIjoibDI5NSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjoyOTYsInRpdGxlIjoiVGhlIEhvbHkgU3Bpcml0IHNwZWFrcyB0aHJvdWdoIG1lIHRvZGF5LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyOTYvIiwiaWR4IjozMTMsInVpZCI6ImwyOTYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6Mjk3LCJ0aXRsZSI6IkZvcmdpdmVuZXNzIGlzIHRoZSBvbmx5IGdpZnQgSSBnaXZlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wyOTcvIiwiaWR4IjozMTQsInVpZCI6ImwyOTciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6Mjk4LCJ0aXRsZSI6IkkgbG92ZSBZb3UsIEZhdGhlciwgYW5kIEkgbG92ZSBZb3VyIFNvbi4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjk4LyIsImlkeCI6MzE1LCJ1aWQiOiJsMjk4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjI5OSwidGl0bGUiOiJFdGVybmFsIGhvbGluZXNzIGFiaWRlcyBpbiBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMjk5LyIsImlkeCI6MzE2LCJ1aWQiOiJsMjk5IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMwMCwidGl0bGUiOiJPbmx5IGFuIGluc3RhbnQgZG9lcyB0aGlzIHdvcmxkIGVuZHVyZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzAwLyIsImlkeCI6MzE3LCJ1aWQiOiJsMzAwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IldoYXQgaXMgdGhlIFNlY29uZCBDb21pbmc/IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svc2Vjb25kY29taW5nLyIsImlkeCI6MzE4LCJ1aWQiOiJzZWNvbmRjb21pbmciLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzAxLCJ0aXRsZSI6IkFuZCBHb2QgSGltc2VsZiBzaGFsbCB3aXBlIGF3YXkgYWxsIHRlYXJzLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMDEvIiwiaWR4IjozMTksInVpZCI6ImwzMDEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzAyLCJ0aXRsZSI6IldoZXJlIGRhcmtuZXNzIHdhcyBJIGxvb2sgdXBvbiB0aGUgbGlnaHQuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMwMi8iLCJpZHgiOjMyMCwidWlkIjoibDMwMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMDMsInRpdGxlIjoiVGhlIGhvbHkgQ2hyaXN0IGlzIGJvcm4gaW4gbWUgdG9kYXkuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMwMy8iLCJpZHgiOjMyMSwidWlkIjoibDMwMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMDQsInRpdGxlIjoiTGV0IG5vdCBteSB3b3JsZCBvYnNjdXJlIHRoZSBzaWdodCBvZiBDaHJpc3QuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMwNC8iLCJpZHgiOjMyMiwidWlkIjoibDMwNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMDUsInRpdGxlIjoiVGhlcmUgaXMgYSBwZWFjZSB0aGF0IENocmlzdCBiZXN0b3dzIG9uIHVzLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMDUvIiwiaWR4IjozMjMsInVpZCI6ImwzMDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzA2LCJ0aXRsZSI6IlRoZSBnaWZ0IG9mIENocmlzdCBpcyBhbGwgSSBzZWVrIHRvZGF5LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMDYvIiwiaWR4IjozMjQsInVpZCI6ImwzMDYiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzA3LCJ0aXRsZSI6IkNvbmZsaWN0aW5nIHdpc2hlcyBjYW5ub3QgYmUgbXkgd2lsbC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzA3LyIsImlkeCI6MzI1LCJ1aWQiOiJsMzA3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMwOCwidGl0bGUiOiJUaGlzIGluc3RhbnQgaXMgdGhlIG9ubHkgdGltZSB0aGVyZSBpcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzA4LyIsImlkeCI6MzI2LCJ1aWQiOiJsMzA4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMwOSwidGl0bGUiOiJJIHdpbGwgbm90IGZlYXIgdG8gbG9vayB3aXRoaW4gdG9kYXkuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMwOS8iLCJpZHgiOjMyNywidWlkIjoibDMwOSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMTAsInRpdGxlIjoiSW4gZmVhcmxlc3NuZXNzIGFuZCBsb3ZlIEkgc3BlbmQgdG9kYXkuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMxMC8iLCJpZHgiOjMyOCwidWlkIjoibDMxMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJXaGF0IGlzIHRoZSBMYXN0IEp1ZGdlbWVudD8iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sYXN0anVkZ2VtZW50LyIsImlkeCI6MzI5LCJ1aWQiOiJsYXN0anVkZ2VtZW50IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMxMSwidGl0bGUiOiJJIGp1ZGdlIGFsbCB0aGluZ3MgYXMgSSB3b3VsZCBoYXZlIHRoZW0gYmUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMxMS8iLCJpZHgiOjMzMCwidWlkIjoibDMxMSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMTIsInRpdGxlIjoiSSBzZWUgYWxsIHRoaW5ncyBhcyBJIHdvdWxkIGhhdmUgdGhlbSBiZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzEyLyIsImlkeCI6MzMxLCJ1aWQiOiJsMzEyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMxMywidGl0bGUiOiJOb3cgbGV0IGEgbmV3IHBlcmNlcHRpb24gY29tZSB0byBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzEzLyIsImlkeCI6MzMyLCJ1aWQiOiJsMzEzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMxNCwidGl0bGUiOiJJIHNlZWsgYSBmdXR1cmUgZGlmZmVyZW50IGZyb20gdGhlIHBhc3QuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMxNC8iLCJpZHgiOjMzMywidWlkIjoibDMxNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMTUsInRpdGxlIjoiQWxsIGdpZnRzIG15IGJyb3RoZXJzIGdpdmUgYmVsb25nIHRvIG1lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMTUvIiwiaWR4IjozMzQsInVpZCI6ImwzMTUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzE2LCJ0aXRsZSI6IkFsbCBnaWZ0cyBJIGdpdmUgbXkgYnJvdGhlcnMgYXJlIG15IG93bi4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzE2LyIsImlkeCI6MzM1LCJ1aWQiOiJsMzE2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMxNywidGl0bGUiOiJJIGZvbGxvdyBpbiB0aGUgd2F5IGFwcG9pbnRlZCBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzE3LyIsImlkeCI6MzM2LCJ1aWQiOiJsMzE3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMxOCwidGl0bGUiOiJJbiBtZSBzYWx2YXRpb27igJlzIG1lYW5zIGFuZCBlbmQgYXJlIG9uZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzE4LyIsImlkeCI6MzM3LCJ1aWQiOiJsMzE4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMxOSwidGl0bGUiOiJJIGNhbWUgZm9yIHRoZSBzYWx2YXRpb24gb2YgdGhlIHdvcmxkLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMTkvIiwiaWR4IjozMzgsInVpZCI6ImwzMTkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzIwLCJ0aXRsZSI6Ik15IEZhdGhlciBnaXZlcyBhbGwgcG93ZXIgdW50byBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzIwLyIsImlkeCI6MzM5LCJ1aWQiOiJsMzIwIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJ0aXRsZSI6IldoYXQgaXMgQ3JlYXRpb24/IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svY3JlYXRpb24vIiwiaWR4IjozNDAsInVpZCI6ImNyZWF0aW9uIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMyMSwidGl0bGUiOiJGYXRoZXIsIG15IGZyZWVkb20gaXMgaW4gWW91IGFsb25lLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMjEvIiwiaWR4IjozNDEsInVpZCI6ImwzMjEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzIyLCJ0aXRsZSI6IkkgY2FuIGdpdmUgdXAgYnV0IHdoYXQgd2FzIG5ldmVyIHJlYWwuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMyMi8iLCJpZHgiOjM0MiwidWlkIjoibDMyMiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMjMsInRpdGxlIjoiSSBnbGFkbHkgbWFrZSB0aGUg4oCYc2FjcmlmaWNl4oCZIG9mIGZlYXIuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMyMy8iLCJpZHgiOjM0MywidWlkIjoibDMyMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMjQsInRpdGxlIjoiSSBtZXJlbHkgZm9sbG93LCBmb3IgSSB3b3VsZCBub3QgbGVhZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzI0LyIsImlkeCI6MzQ0LCJ1aWQiOiJsMzI0IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMyNSwidGl0bGUiOiJBbGwgdGhpbmdzIEkgdGhpbmsgSSBzZWUgcmVmbGVjdCBpZGVhcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzI1LyIsImlkeCI6MzQ1LCJ1aWQiOiJsMzI1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMyNiwidGl0bGUiOiJJIGFtIGZvcmV2ZXIgYW4gRWZmZWN0IG9mIEdvZC4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzI2LyIsImlkeCI6MzQ2LCJ1aWQiOiJsMzI2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMyNywidGl0bGUiOiJJIG5lZWQgYnV0IGNhbGwgYW5kIFlvdSB3aWxsIGFuc3dlciBtZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzI3LyIsImlkeCI6MzQ3LCJ1aWQiOiJsMzI3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMyOCwidGl0bGUiOiJJIGNob29zZSB0aGUgc2Vjb25kIHBsYWNlIHRvIGdhaW4gdGhlIGZpcnN0LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMjgvIiwiaWR4IjozNDgsInVpZCI6ImwzMjgiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzI5LCJ0aXRsZSI6IkkgaGF2ZSBhbHJlYWR5IGNob3NlbiB3aGF0IFlvdSB3aWxsLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMjkvIiwiaWR4IjozNDksInVpZCI6ImwzMjkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzMwLCJ0aXRsZSI6Ikkgd2lsbCBub3QgaHVydCBteXNlbGYgYWdhaW4gdG9kYXkuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMzMC8iLCJpZHgiOjM1MCwidWlkIjoibDMzMCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJXaGF0IGlzIHRoZSBFZ28/IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svZWdvLyIsImlkeCI6MzUxLCJ1aWQiOiJlZ28iLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzMxLCJ0aXRsZSI6IlRoZXJlIGlzIG5vIGNvbmZsaWN0LCBmb3IgbXkgd2lsbCBpcyBZb3Vycy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzMxLyIsImlkeCI6MzUyLCJ1aWQiOiJsMzMxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMzMiwidGl0bGUiOiJGZWFyIGJpbmRzIHRoZSB3b3JsZC4gRm9yZ2l2ZW5lc3Mgc2V0cyBpdCBmcmVlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMzIvIiwiaWR4IjozNTMsInVpZCI6ImwzMzIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzMzLCJ0aXRsZSI6IkZvcmdpdmVuZXNzIGVuZHMgdGhlIGRyZWFtIG9mIGNvbmZsaWN0IGhlcmUuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMzMy8iLCJpZHgiOjM1NCwidWlkIjoibDMzMyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMzQsInRpdGxlIjoiVG9kYXkgSSBjbGFpbSB0aGUgZ2lmdHMgZm9yZ2l2ZW5lc3MgZ2l2ZXMuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMzNC8iLCJpZHgiOjM1NSwidWlkIjoibDMzNCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMzUsInRpdGxlIjoiSSBjaG9vc2UgdG8gc2VlIG15IGJyb3RoZXLigJlzIHNpbmxlc3NuZXNzLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMzUvIiwiaWR4IjozNTYsInVpZCI6ImwzMzUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzM2LCJ0aXRsZSI6IkZvcmdpdmVuZXNzIGxldHMgbWUga25vdyB0aGF0IG1pbmRzIGFyZSBqb2luZWQuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMzNi8iLCJpZHgiOjM1NywidWlkIjoibDMzNiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMzcsInRpdGxlIjoiTXkgc2lubGVzc25lc3MgcHJvdGVjdHMgbWUgZnJvbSBhbGwgaGFybS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzM3LyIsImlkeCI6MzU4LCJ1aWQiOiJsMzM3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjMzOCwidGl0bGUiOiJJIGFtIGFmZmVjdGVkIG9ubHkgYnkgbXkgdGhvdWdodHMuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDMzOC8iLCJpZHgiOjM1OSwidWlkIjoibDMzOCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozMzksInRpdGxlIjoiSSB3aWxsIHJlY2VpdmUgd2hhdGV2ZXIgSSByZXF1ZXN0LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzMzkvIiwiaWR4IjozNjAsInVpZCI6ImwzMzkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzQwLCJ0aXRsZSI6IkkgY2FuIGJlIGZyZWUgb2Ygc3VmZmVyaW5nIHRvZGF5LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzNDAvIiwiaWR4IjozNjEsInVpZCI6ImwzNDAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiV2hhdCBpcyBhIE1pcmFjbGU/IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbWlyYWNsZS8iLCJpZHgiOjM2MiwidWlkIjoibWlyYWNsZSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozNDEsInRpdGxlIjoiSSBjYW4gYXR0YWNrIGJ1dCBteSBvd24gc2lubGVzc25lc3MiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzQxLyIsImlkeCI6MzYzLCJ1aWQiOiJsMzQxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM0MiwidGl0bGUiOiJJIGxldCBmb3JnaXZlbmVzcyByZXN0IHVwb24gYWxsIHRoaW5ncyIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzNDIvIiwiaWR4IjozNjQsInVpZCI6ImwzNDIiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzQzLCJ0aXRsZSI6IkkgYW0gbm90IGFza2VkIHRvIG1ha2UgYSBzYWNyaWZpY2UiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzQzLyIsImlkeCI6MzY1LCJ1aWQiOiJsMzQzIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM0NCwidGl0bGUiOiJUb2RheSBJIGxlYXJuIHRoZSBsYXcgb2YgbG92ZSIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzNDQvIiwiaWR4IjozNjYsInVpZCI6ImwzNDQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzQ1LCJ0aXRsZSI6Ikkgb2ZmZXIgb25seSBtaXJhY2xlcyB0b2RheSIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzNDUvIiwiaWR4IjozNjcsInVpZCI6ImwzNDUiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzQ2LCJ0aXRsZSI6IlRvZGF5IHRoZSBwZWFjZSBvZiBHb2QgZW52ZWxvcHMgbWUiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzQ2LyIsImlkeCI6MzY4LCJ1aWQiOiJsMzQ2IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM0NywidGl0bGUiOiJBbmdlciBtdXN0IGNvbWUgZnJvbSBqdWRnZW1lbnQiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzQ3LyIsImlkeCI6MzY5LCJ1aWQiOiJsMzQ3IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM0OCwidGl0bGUiOiJJIGhhdmUgbm8gY2F1c2UgZm9yIGFuZ2VyIG9yIGZvciBmZWFyIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDM0OC8iLCJpZHgiOjM3MCwidWlkIjoibDM0OCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozNDksInRpdGxlIjoiVG9kYXkgSSBsZXQgQ2hyaXN04oCZcyB2aXNpb24gbG9vayB1cG9uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDM0OS8iLCJpZHgiOjM3MSwidWlkIjoibDM0OSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozNTAsInRpdGxlIjoiTWlyYWNsZXMgbWlycm9yIEdvZOKAmXMgZXRlcm5hbCBMb3ZlLiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzNTAvIiwiaWR4IjozNzIsInVpZCI6ImwzNTAiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7InRpdGxlIjoiV2hhdCBhbSBJPyIsInVybCI6Ii9hY2ltL3dvcmtib29rL3doYXRhbWkvIiwiaWR4IjozNzMsInVpZCI6IndoYXRhbWkiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzUxLCJ0aXRsZSI6Ik1pcmFjbGVzIG1pcnJvciBHb2TigJlzIGV0ZXJuYWwgTG92ZS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzUxLyIsImlkeCI6Mzc0LCJ1aWQiOiJsMzUxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM1MiwidGl0bGUiOiJKdWRnZW1lbnQgYW5kIGxvdmUgYXJlIG9wcG9zaXRlcy4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzUyLyIsImlkeCI6Mzc1LCJ1aWQiOiJsMzUyIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM1MywidGl0bGUiOiJNeSBleWVzLCBteSB0b25ndWUsIG15IGhhbmRzLCBteSBmZWV0IiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDM1My8iLCJpZHgiOjM3NiwidWlkIjoibDM1MyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozNTQsInRpdGxlIjoiV2Ugc3RhbmQgdG9nZXRoZXIsIENocmlzdCBhbmQgSSIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzNTQvIiwiaWR4IjozNzcsInVpZCI6ImwzNTQiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzU1LCJ0aXRsZSI6IlRoZXJlIGlzIG5vIGVuZCB0byBhbGwgdGhlIHBlYWNlIGFuZCBqb3kiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzU1LyIsImlkeCI6Mzc4LCJ1aWQiOiJsMzU1IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM1NiwidGl0bGUiOiJTaWNrbmVzcyBpcyBidXQgYW5vdGhlciBuYW1lIGZvciBzaW4uIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDM1Ni8iLCJpZHgiOjM3OSwidWlkIjoibDM1NiIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozNTcsInRpdGxlIjoiVHJ1dGggYW5zd2VycyBldmVyeSBjYWxsIHdlIG1ha2UgdG8gR29kIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDM1Ny8iLCJpZHgiOjM4MCwidWlkIjoibDM1NyIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozNTgsInRpdGxlIjoiTm8gY2FsbCB0byBHb2QgY2FuIGJlIHVuaGVhcmQiLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzU4LyIsImlkeCI6MzgxLCJ1aWQiOiJsMzU4IiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM1OSwidGl0bGUiOiJHb2TigJlzIGFuc3dlciBpcyBzb21lIGZvcm0gb2YgcGVhY2UuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDM1OS8iLCJpZHgiOjM4MiwidWlkIjoibDM1OSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozNjAsInRpdGxlIjoiUGVhY2UgYmUgdG8gbWUsIHRoZSBob2x5IFNvbiBvZiBHb2QuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDM2MC8iLCJpZHgiOjM4MywidWlkIjoibDM2MCIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsidGl0bGUiOiJGaW5hbCBMZXNzb25zIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svZmluYWwvIiwiaWR4IjozODQsInVpZCI6ImZpbmFsIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM2MSwidGl0bGUiOiJUaGlzIGhvbHkgaW5zdGFudCB3b3VsZCBJIGdpdmUgdG8gWW91LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzNjEvIiwiaWR4IjozODUsInVpZCI6ImwzNjEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzYyLCJ0aXRsZSI6IlRoaXMgaG9seSBpbnN0YW50IHdvdWxkIEkgZ2l2ZSB0byBZb3UuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDM2MS8iLCJpZHgiOjM4NiwidWlkIjoibDM2MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9LHsibGVzc29uIjozNjMsInRpdGxlIjoiVGhpcyBob2x5IGluc3RhbnQgd291bGQgSSBnaXZlIHRvIFlvdS4iLCJ1cmwiOiIvYWNpbS93b3JrYm9vay9sMzYxLyIsImlkeCI6Mzg3LCJ1aWQiOiJsMzYxIiwiaGFzQXVkaW9UaW1pbmdEYXRhIjpmYWxzZX0seyJsZXNzb24iOjM2NCwidGl0bGUiOiJUaGlzIGhvbHkgaW5zdGFudCB3b3VsZCBJIGdpdmUgdG8gWW91LiIsInVybCI6Ii9hY2ltL3dvcmtib29rL2wzNjEvIiwiaWR4IjozODgsInVpZCI6ImwzNjEiLCJoYXNBdWRpb1RpbWluZ0RhdGEiOmZhbHNlfSx7Imxlc3NvbiI6MzU1LCJ0aXRsZSI6IlRoaXMgaG9seSBpbnN0YW50IHdvdWxkIEkgZ2l2ZSB0byBZb3UuIiwidXJsIjoiL2FjaW0vd29ya2Jvb2svbDM2MS8iLCJpZHgiOjM4OSwidWlkIjoibDM2MSIsImhhc0F1ZGlvVGltaW5nRGF0YSI6ZmFsc2V9XX19XX1dfQo=","base64"))});
}

module.exports = {

  initialize: function(cb) {

    loadConfig(function(err, json) {
      if (err) {
        cb(err);
      }
      else {
        cmiConfig = JSON.parse(json);
        store.set("config", cmiConfig);
        cb(null, "browserify");
      }
    });
  },

  getPageTitle: function(uri) {
    pageInfo.init(uri);
    return pageInfo.getTitle();
  },

  getKey: function(uri) {
    pageInfo.init(uri);
    return pageInfo.getKey();
  },

  getAudio: function(uri) {
    pageInfo.init(uri);
    return pageInfo.getAudio();
  },

  getTitle: function(sid, bid, uid) {
    pageInfo.initParts(sid, bid, uid);
    return pageInfo.getTitle();
  },

  getInfo: function(uri) {
    return pageInfo.get(uri);
  },

  //return array of book bid values sorted by key
  //limit array to books in argument source if present
  getBidArray: function(sid) {
    var srcArray;
    var arr = [];
    var tmpArray;
    var i;

    if (sid) {
      arr = getOrderedArrayOfBids(sid);
    }
    else {
      //get array of sid's
      srcArray = getSourceArray();
      for (i = 0; i < srcArray.length; i++) {
        tmpArray = getOrderedArrayOfBids(srcArray[i]);
        Array.prototype.push.apply(arr, tmpArray);
      }
    }
    //console.log("array of bids: ", arr);
    return arr;
  },

  //endpoint for Search API
  getApiEndpoint: function() {
    return apiEndpoint;
  },

  //endpoint for Index API
  getIdxEndpoint: function() {
    return idxEndpoint;
  },

  //return an array of books for source: sid
  getBooks: function(sid) {
    var books = [];

    for (var s = 0; s < cmiConfig.source.length; s++) {
      if (cmiConfig.source[s].sid === sid) {
        for (var b = 0; b < cmiConfig.source[s].books.length; b++) {
          var book = cmiConfig.source[s].books[b].bid;
          var title = cmiConfig.source[s].books[b].title;

          //nwffacim study group data prefixed with an 'a'
          if (sid === "nwffacim" && book.startsWith("20")) {
            book = "a" + book;
          }
          books.push({sidx: s, bidx: b, bid: book, title: title});
        }
      }
    }

    return books;
  },

  //get the unit title, sidx and bidx are returned getBooks()
  getUnitTitle: function(sidx, bidx, unit) {
    var unitArray = cmiConfig.source[sidx].books[bidx].units.page;
    for (var u = 0; u < unitArray.length; u++) {
      if (unitArray[u].uid === unit) {
        return unitArray[u].title;
      }
    }

    return "Title not found for: " + unit;
  }

};



}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":59,"buffer":30,"store":64,"underscore":78}],85:[function(require,module,exports){
"use strict";

var config = require("./bundle/config/config");

//initialize javascript on page when loaded
document.addEventListener("DOMContentLoaded", function() {

  //initialize application configuration
  config.initialize(function(err, message) {
    if (err) {
      console.log("error in config.initialize: ", err);
      return;
    }
    console.log("config from %s", message);

    if ($(".transcript").length) {
      require("./init/narrative").initialize();
    }
    else if ($("#main > .cmi-search").length) {
      require("./init/search").initialize();
    }
    else if (location.pathname === "/about/") {
      require("./init/about").initialize();
    }
    else if (location.pathname.startsWith("/profile/")) {
      require("./init/profile").initialize();
    }
    else {
      require("./init/common").initialize();
    }
  });
});


},{"./bundle/config/config":84,"./init/about":89,"./init/common":90,"./init/narrative":91,"./init/profile":92,"./init/search":93}],86:[function(require,module,exports){
"use strict";

var _ = require("underscore");

var options = {};
var data = {};

module.exports = {

  init: function(o) {
    options = o;

    data.base = o.base;
    data.title = o.title;
    data.time = [];
  },
  add: function(o) {
    data.time.push(o);
    return data.time.length;
  },

  remove: function(o) {
    var pos = _.findLastIndex(data.time, {id: o.id});

    if (pos === -1) {
      return -1;
    }
    else {
      data.time.splice(pos, 1);
      return data.time.length;
    }
  },
  length: function() {
    return data.time.length;
  },
  getBase: function() {
    return data.base;
  },
  getData: function() {
    return data;
  }

};


},{"underscore":78}],87:[function(require,module,exports){
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


},{}],88:[function(require,module,exports){

"use strict";

var _ = require("underscore");
var wrap = require("wrap-range-text");
var TextQuoteAnchor = require("dom-anchor-text-quote");
var api = require("./api");

/*
 * return the array element from the selectorList containing
 * the specified key.
 *
 * Args: 
 *  selectorList: array of selectors from an annotation
 *  key: the search key
 */
function getSelectorWith(selectorList, key) {
  for (var i=0; i < selectorList.length; i++) {
    if ( selectorList[i].hasOwnProperty(key) ) {
      return selectorList[i];
    }
  }
  return null;
}

/*
 * Find the annotations 'TextQuoteSelector'
 *
 * arg: selectorList is an array of selector objects from an annotation
 * returns the selector object containing the key 'exact'
 */
function getTextQuoteSelector(selectorList) {
  return getSelectorWith(selectorList, "exact");
}

/*
 * Find the annotations 'TextPositionSelector'
 *
 * arg: selectorList is an array of selector objects from an annotation
 * returns the selector object containing the key 'start'
 */
function getTextPositionSelector(selectorList) {
  return getSelectorWith(selectorList, "start");
}

/*
 * Extract data from array of annotations needed for highlighting on a page
 *
 * Args:
 *  dataArray: an array of annotations
 *
 * Returns:
 *  Array of extracted data items from input. Each element can be passed to attach() to 
 *  highlight the annotation on the page
 */
function parse(dataArray) {
  var extract;

  //parse each annotation in the array
  extract = _.map(dataArray, function(item) {
    //
    //get hypothes.is user name
    var user = item.user.replace("acct:","").replace("@hypothes.is","");

    //get the selector array
    var selectorList = item.target[0].selector;

    //get the TextQuoteSelector object from the array
    var textQuoteSelector = getTextQuoteSelector(selectorList);

    //return an empty object if selector not found
    if ( textQuoteSelector === null ) {
      return {
        payload: "",
        message: "Failed to find TextQuoteSelector",
        error: true,
        anno: {
          id: item.id,
          url: item.uri,
          user: user
        }
      };
    }
    else {
      return {
        payload: user + "\n\n" + item.tags.join(", ") + "\n\n" + item.text + "\n\n",
        message: "",
        error: false,
        anno: {
          id: item.id,
          user: user,
          url: item.uri,
          exact: textQuoteSelector.exact,
          prefix: textQuoteSelector.prefix,
          text: item.text,
          tags: item.tags
        }
      };
    }

  });

  return extract;
}

/*
 * Highlight the annotation of the page
 *
 * Args:
 *  item: data for a single annotation from extract()
 *
 * Returns:
 *  value.unwrap() to unwrap what was wrapped
 */
function attach(item) {
  var anno = item.anno;
  var payload = item.payload;

  //check for parse error
  if (item.error) {
    console.log("Error attaching annotation: %s, message: %s", anno.id, item.message);
    return;
  }

  //check if annotation came from current page
  if (! anno.url.endsWith(window.location.pathname)) {
    console.log("Annotation: %s, from a different url: %s", anno.id, item.url);
    return;
  }

  var range = TextQuoteAnchor.toRange(document.body, anno, {prefix: anno.prefix});

  var highlight = document.createElement("mark");
  highlight.setAttribute("data-hypothesis", anno.id);

  // highlight.title = payload;
  // highlight.id = anno.id;
  // highlight.className = bounds + " hypothesis_annotation";

  //return value can be used to unwrap the wrap
  // wrap.unrap()
  return wrap(highlight, range);
}

/*
 * Display a single annotation on the page
 *
 * Args: 
 *  id: annotation id
 *  auth: api token - needed for private group annotations
 *  cb: callback
 */
function showOne(id, auth, cb) {
  var pageUrl;

  // query annotations for current page
  // adjust url for development testing
  if (window.location.origin.search("localhost:4000")) {
    pageUrl = "http://christmind.info" + window.location.pathname;
  }
  else {
    pageUrl = window.location.origin + window.location.pathname;
  }

  //query hypothes.is for all annotations on the current page
  //  - current limitation prevents query by annotation id
  var xhr = api.search("uri=" + pageUrl, auth);

  //handle error
  xhr.addEventListener("error", function() {
    console.log("hypothes.is query Failed: ", this.statusText);
    console.log("query was for page: %s", pageUrl);
    cb(this.statusText);
  });

  // query successful
  xhr.addEventListener("load", function(e) {
    var annotation;
    var queryResult = JSON.parse(this.responseText);
    console.log("queryResult: ", queryResult);

    //look for requested annotation in returned results
    annotation = _.find(queryResult.rows, function(a) {
      return a.id === id;
    });

    // did we find the requested annotation?
    if (annotation) {

      // extractInfo requires an array argument
      var extract = parse([annotation]);

      // check for extraction error
      if (!extract[0].error) {
        cb(null,attach(extract[0]));
      }
      else {
        console.log("Can't display annotation: ", annotation);
        cb(extract[0].message);
      }
    }
    else {
      console.log("Annotation Id: %s was not found", id);
      cb("Annotation id: " + id + " was not found");
    }
  });
}

module.exports = {
  showOne: showOne,
  parse: parse,
  wrap: wrap
};


},{"./api":87,"dom-anchor-text-quote":39,"underscore":78,"wrap-range-text":82}],89:[function(require,module,exports){
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


},{"../ui/bookmark":99,"toastr":77}],90:[function(require,module,exports){
"use strict";

var bookmark = require("../ui/bookmark");

function initPage() {
  switch(location.pathname) {
    case "/wom/intro/questions/":
      console.log("init: /wom/intro/questions/");
      require("../refills/accordion_tabs")();
      break;
  }
}

module.exports = {
  initialize: function() {
    bookmark.initialize();
    initPage();
  }
};



},{"../refills/accordion_tabs":95,"../ui/bookmark":99}],91:[function(require,module,exports){
"use strict";

var audio = require("../ui/mediaElements");
var bookmark = require("../ui/bookmark");
var search = require("../search/search");
var url = require("../util/url");
var wrap = require("../h/wrap");
var share = require("../ui/share");
var index = require("../ui/cmiIndex");
var scroll = require("scroll-into-view");

var unwrap;

function removeHighlight() {
  unwrap.unwrap();
}

/*
 * check if url parm "id" is present and attempt to highlight the
 * annotation with that id on the page.
 */
function showRequestedAnnotation() {
  var auth = "6879-22a8900b365e8885a6e44d9d711839fb";
  var id = url.getQueryString("id");

  if (id) {
    wrap.showOne(id, auth, function(error, hl) {
      if (error) {
        console.log("error: %s", error);
      }
      else {
        unwrap = hl;
        // console.log("unwrap: ", unwrap);
        scroll(unwrap.nodes[0]);

        setTimeout(removeHighlight, 3000);
      }
    });
  }
}

module.exports = {
  initialize: function() {
    var transcriptParagraphs;
    var count = 0;

    //assign id's to all paragraphs in div.transcript
    transcriptParagraphs = $(".transcript p");
    transcriptParagraphs.each(function(idx) {
      if (!$(this).hasClass("omit")) {
        count++;
        $(this).attr("id", "p" + idx);
      }
    });

    //log number of not omitted paragraphs
    console.log("%s", count);

    //display hypothes.is annotation if url contains: id=<annotation id>
    showRequestedAnnotation();

    //init the audio player
    audio.initialize({
      playerId: "#jquery_jplayer_audio_1",
      skinWrapper: "#jp_container_audio_1",
      audioToggle: ".audio-toggle",
      hidePlayer: ".hide-player",
      hilightClass: "hilite"
    });

    search.initialize(audio.setStartTime);

    //init bookmarks feature
    bookmark.initialize(audio.setStartTime);

    //init share feature
    share.initialize();

    //init index feature
    index.initialize();

    //not sure why I have to do this, previously the page would scroll
    //to the hash id when loaded but it doesn't do that anymore. Could be
    //because the hash id is created after the page is loaded.
    if (location.hash) {
      location.href = location.hash;
    }

    //reveal link to review for acim workbook lesson
    // - this happens only when page is linked from the review lesson
    var review = url.getQueryString("r");
    if (review) {
      $(".hide-review").removeClass("hide-review");
    }
  }
};

},{"../h/wrap":88,"../search/search":96,"../ui/bookmark":99,"../ui/cmiIndex":101,"../ui/mediaElements":103,"../ui/share":105,"../util/url":107,"scroll-into-view":62}],92:[function(require,module,exports){
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


},{"../ui/bookmark":99,"store":64,"toastr":77}],93:[function(require,module,exports){
"use strict";

var search = require("../search/site_search");
var bookmark = require("../ui/bookmark");
var store = require("store");

module.exports = {
  initialize: function() {
    var data = store.get("search");

    search.init(data);
    bookmark.initialize();
  }
};


},{"../search/site_search":97,"../ui/bookmark":99,"store":64}],94:[function(require,module,exports){
(function(root,factory){
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        if (typeof root === 'undefined' || root !== Object(root)) {
            throw new Error('puglatizer: window does not exist or is not an object');
        }
        root.puglatizer = factory();
    }
}(this, function () {
    function pug_classes_object(val) { var classString = '', padding = ''; for (var key in val) { if (key && val[key] && pug_has_own_property.call(val, key)) { var classString = classString + padding + key; var padding = ' '; } } return classString; }    function pug_classes_array(val, escaping) { var classString = '', className, padding = '', escapeEnabled = Array.isArray(escaping); for (var i = 0; i < val.length; i++) { var className = pug_classes(val[i]); if (!className) continue; escapeEnabled && escaping[i] && (className = pug_escape(className)); var classString = classString + padding + className; var padding = ' '; } return classString; }    function pug_merge(r,e){if(1===arguments.length){for(var t=r[0],a=1;a<r.length;a++)t=pug_merge(t,r[a]);return t}for(var g in e)if("class"===g){var n=r[g]||[];r[g]=(Array.isArray(n)?n:[n]).concat(e[g]||[])}else if("style"===g){var n=pug_style(r[g]),s=pug_style(e[g]);r[g]=n+s}else r[g]=e[g];return r}
    function pug_classes(s,r){return Array.isArray(s)?pug_classes_array(s,r):s&&"object"==typeof s?pug_classes_object(s):s||""}
    function pug_style(r){if(!r)return"";if("object"==typeof r){var t="";for(var e in r)pug_has_own_property.call(r,e)&&(t=t+e+":"+r[e]+";");return t}return r+="",";"!==r[r.length-1]?r+";":r}
    function pug_attr(t,e,n,f){return e!==!1&&null!=e&&(e||"class"!==t&&"style"!==t)?e===!0?" "+(f?t:t+'="'+t+'"'):("function"==typeof e.toJSON&&(e=e.toJSON()),"string"==typeof e||(e=JSON.stringify(e),n||-1===e.indexOf('"'))?(n&&(e=pug_escape(e))," "+t+'="'+e+'"'):" "+t+"='"+e.replace(/'/g,"&#39;")+"'"):""}
    function pug_attrs(t,r){var a="";for(var s in t)if(pug_has_own_property.call(t,s)){var u=t[s];if("class"===s){u=pug_classes(u),a=pug_attr(s,u,!1,r)+a;continue}"style"===s&&(u=pug_style(u)),a+=pug_attr(s,u,!1,r)}return a}
    function pug_escape(e){var a=""+e,t=(/["&<>]/).exec(a);if(!t)return e;var r,c,n,s="";for(r=t.index,c=0;r<a.length;r++){switch(a.charCodeAt(r)){case 34:n="&quot;";break;case 38:n="&amp;";break;case 60:n="&lt;";break;case 62:n="&gt;";break;default:continue}c!==r&&(s+=a.substring(c,r)),c=r+1,s+=n}return c!==r?s+a.substring(c,r):s}
    function pug_rethrow(n,e,r,t){if(!(n instanceof Error))throw n;if(!("undefined"==typeof window&&e||t))throw n.message+=" on line "+r,n;try{t=t||require("fs").readFileSync(e,"utf8")}catch(i){pug_rethrow(n,null,r)}var a=3,o=t.split("\n"),h=Math.max(r-a,0),s=Math.min(o.length,r+a),a=o.slice(h,s).map(function(n,e){var t=e+h+1;return(t==r?"  > ":"    ")+t+"| "+n}).join("\n");throw n.path=e,n.message=(e||"Pug")+":"+r+"\n"+a+"\n\n"+n.message,n}
    var pug = {
    	merge:function pug_merge(r,e){if(1===arguments.length){for(var t=r[0],a=1;a<r.length;a++)t=pug_merge(t,r[a]);return t}for(var g in e)if("class"===g){var n=r[g]||[];r[g]=(Array.isArray(n)?n:[n]).concat(e[g]||[])}else if("style"===g){var n=pug_style(r[g]),s=pug_style(e[g]);r[g]=n+s}else r[g]=e[g];return r},
    	classes:function pug_classes(s,r){return Array.isArray(s)?pug_classes_array(s,r):s&&"object"==typeof s?pug_classes_object(s):s||""},
    	style:function pug_style(r){if(!r)return"";if("object"==typeof r){var t="";for(var e in r)pug_has_own_property.call(r,e)&&(t=t+e+":"+r[e]+";");return t}return r+="",";"!==r[r.length-1]?r+";":r},
    	attr:function pug_attr(t,e,n,f){return e!==!1&&null!=e&&(e||"class"!==t&&"style"!==t)?e===!0?" "+(f?t:t+'="'+t+'"'):("function"==typeof e.toJSON&&(e=e.toJSON()),"string"==typeof e||(e=JSON.stringify(e),n||-1===e.indexOf('"'))?(n&&(e=pug_escape(e))," "+t+'="'+e+'"'):" "+t+"='"+e.replace(/'/g,"&#39;")+"'"):""},
    	attrs:function pug_attrs(t,r){var a="";for(var s in t)if(pug_has_own_property.call(t,s)){var u=t[s];if("class"===s){u=pug_classes(u),a=pug_attr(s,u,!1,r)+a;continue}"style"===s&&(u=pug_style(u)),a+=pug_attr(s,u,!1,r)}return a},
    	escape:function pug_escape(e){var a=""+e,t=(/["&<>]/).exec(a);if(!t)return e;var r,c,n,s="";for(r=t.index,c=0;r<a.length;r++){switch(a.charCodeAt(r)){case 34:n="&quot;";break;case 38:n="&amp;";break;case 60:n="&lt;";break;case 62:n="&gt;";break;default:continue}c!==r&&(s+=a.substring(c,r)),c=r+1,s+=n}return c!==r?s+a.substring(c,r):s},
    	rethrow:function pug_rethrow(n,e,r,t){if(!(n instanceof Error))throw n;if(!("undefined"==typeof window&&e||t))throw n.message+=" on line "+r,n;try{t=t||require("fs").readFileSync(e,"utf8")}catch(i){pug_rethrow(n,null,r)}var a=3,o=t.split("\n"),h=Math.max(r-a,0),s=Math.min(o.length,r+a),a=o.slice(h,s).map(function(n,e){var t=e+h+1;return(t==r?"  > ":"    ")+t+"| "+n}).join("\n");throw n.path=e,n.message=(e||"Pug")+":"+r+"\n"+a+"\n\n"+n.message,n}
    }

    var puglatizer = {}
    puglatizer["acim"] = function template(e){var a,r,s,t="",i={};try{var o=e||{};(function(e,r,o,n){function c(a){var r,s=e.parseInt(a.substr(4,2),10);switch(s){case 1:r="Introduction";break;case 2:r="Who are God's Teachers?";break;case 3:r="Who are their Pupils?";break;case 4:r="What are the Levels of Teaching?";break;case 5:r="What are the Characteristics of God’s Teachers?";break;case 6:r="How is Healing Accomplished?";break;case 7:r="Is Healing Certain?";break;case 8:r="Should Healing be Repeated?";break;case 9:r="How Can the Perception of Order of Difficulties be Avoided?";break;case 10:r="Are Changes Required in the Life Situation of God’s Teachers?";break;case 11:r="How is Judgement Relinquished?";break;case 12:r="How is Peace Possible in this World?";break;case 13:r="How Many Teachers of God are Needed to Save the World?";break;case 14:r="What is the Real Meaning of Sacrifice?";break;case 15:r="How Will the World End?";break;case 16:r="Is Each One to be Judged in the End?";break;case 17:r="How Should the Teacher of God Spend His Day?";break;case 18:r="How do God’s Teachers Deal with their Pupils’ Thoughts of Magic?";break;case 19:r="How is Correction Made?";break;case 20:r="What is Justice?";break;case 21:r="What is the Peace of God?";break;case 22:r="What is the Role of Words in Healing?";break;case 23:r="How are Healing and Atonement Related?";break;case 24:r="Does Jesus Have a Special Place in Healing?";break;case 25:r="Is Reincarnation True?";break;case 26:r="Are ‘Phychic’ Powers Desirable?";break;case 27:r="Can God be Reached Directly?";break;case 28:r="What is Death?";break;case 29:r="What is the Resurrection?";break;case 30:r="As for the Rest…";break;case 31:r="Forget Not…";break;default:r="????"}return r}function h(a){var r,s=a;if("lastjudgement"===a)s="What is the Last Judgement?";else if("l"===a.charAt(0))r=e.parseInt(a.substr(1,3),10),s="Lesson "+r;else switch(a){case"body":s="What is the Body?";break;case"christ":s="What is the Christ?";break;case"creation":s="What is Creation?";break;case"ego":s="What is the Ego?";break;case"epilog":s="Epilog";break;case"final":s="Final Lessons";break;case"forgiveness":s="What is Forgiveness?";break;case"holyspirit":s="What is the Holy Spirit?";break;case"intro181":s="Lessons 181 - 200 Introduction";break;case"introp1":s="Workbook Introduction";break;case"introp2":s="Workbook Part II Introduction";break;case"miracle":s="What is a Miracle?";break;case"realworld":s="What is the Real World?";break;case"review1":s="Review I Introduction";break;case"review2":s="Review II Introduction";break;case"review3":s="Review III Introduction";break;case"review4":s="Review IV Introduction";break;case"review5":s="Review V Introduction";break;case"review6":s="Review V Introduction";break;case"salvation":s="What is Salvation?";break;case"secondcoming":s="What is the Second Coming?";break;case"sin":s="What is Sin?";break;case"whatami":s="What am I?";break;case"world":s="What is the World?";break;default:s="????"}return s}function b(a,r){var a,s,t,i;switch(a){case 1:t=e.parseInt(r.substr(0,2),10),i=e.parseInt(r.substr(9,2),10),s="T"+t+"."+i;break;case 2:s=c(r);break;case 3:s=h(r);break;default:s="???"}return s}s=1,s=223,i.hitList=a=function(e,r,i){this&&this.block,this&&this.attributes||{};s=224,t+="<h3>",s=224,t=t+pug.escape(null==(a=e)?"":a)+"</h3>",s=225,t+='<ul class="fa-ul">',s=226,function(){var e=i;if("number"==typeof e.length)for(var o=0,n=e.length;n>o;o++){var c=e[o];s=227;var h=c.base+"?s=show"+c.location;s=228;var l=b(r,c.unit);s=229,t+="<li>",s=229,t+='<i class="fa fa-search">',s=230,t=t+"<a"+pug.attr("href",h,!0,!1)+">",s=230,t+="&nbsp; ",s=230,t=t+pug.escape(null==(a=l)?"":a)+"</a>",s=231,t+="<p>",s=231,t=t+(null==(a=c.context)?"":a)+"</p></i></li>"}else{var n=0;for(var o in e){n++;var c=e[o];s=227;var h=c.base+"?s=show"+c.location;s=228;var l=b(r,c.unit);s=229,t+="<li>",s=229,t+='<i class="fa fa-search">',s=230,t=t+"<a"+pug.attr("href",h,!0,!1)+">",s=230,t+="&nbsp; ",s=230,t=t+pug.escape(null==(a=l)?"":a)+"</a>",s=231,t+="<p>",s=231,t=t+(null==(a=c.context)?"":a)+"</p></i></li>"}}}.call(this),t+="</ul>"},s=233,o&&(s=234,i.hitList("ACIM Text",1,o)),s=235,r&&(s=236,i.hitList("ACIM Manual for Teachers",2,r)),s=237,n&&(s=238,i.hitList("ACIM Workbook for Students",3,n))}).call(this,"Number"in o?o.Number:"undefined"!=typeof Number?Number:void 0,"manual"in o?o.manual:"undefined"!=typeof manual?manual:void 0,"text"in o?o.text:"undefined"!=typeof text?text:void 0,"workbook"in o?o.workbook:"undefined"!=typeof workbook?workbook:void 0)}catch(n){pug.rethrow(n,r,s)}return t};

    puglatizer["bookmark"] = function template(a){var e,l,o,r="";try{var i=a||{};(function(a,l){o=1,r+='<ul class="fa-ul">',o=2,function(){var i=a;if("number"==typeof i.length)for(var t=0,u=i.length;u>t;t++){var p=i[t];o=3,l===p.page?(o=4,r+='<li class="bm-list bm-current-page">',o=4,r=r+pug.escape(null==(e=p.title)?"":e)+"</li>"):(o=6,r+='<li class="bm-list">',o=6,r=r+pug.escape(null==(e=p.title)?"":e)+"</li>"),o=8,r+="<ul>",o=9,function(){var a=p.mark;if("number"==typeof a.length)for(var i=0,t=a.length;t>i;i++){var u=a[i];o=10,r+="<li>",o=11,l===p.page?(o=12,r=r+'<a title="Goto Bookmark"'+pug.attr("href","#"+u,!0,!1)+">",o=13,r+='<i class="fa fa-bookmark">',o=13,r+="&nbsp;</i></a>",o=14,r+=pug.escape(null==(e="  Bookmark "+(i+1))?"":e)):(o=16,r=r+'<a title="Goto Bookmark"'+pug.attr("href",p.page+"#"+u,!0,!1)+">",o=17,r+='<i class="fa fa-bookmark">',o=17,r+="&nbsp;</i></a>",o=18,r+=pug.escape(null==(e="  Bookmark "+(i+1))?"":e)),o=20,l===p.page&&p.audio===!0?(o=21,r+=pug.escape(null==(e=": Play audio at bookmark ")?"":e),o=22,r=r+'<a class="audio-from-here" title="Play Audio from Here"'+pug.attr("href",u,!0,!1)+">",o=23,r+='<i class="fa fa-volume-up"></i></a>'):p.audio===!0&&(o=25,r+=pug.escape(null==(e=": Play audio at bookmark ")?"":e),o=26,r=r+'<a title="Play Audio from Here"'+pug.attr("href",p.page+"?play="+u,!0,!1)+">",o=27,r+='<i class="fa fa-volume-up"></i></a>'),r+="</li>"}else{var t=0;for(var i in a){t++;var u=a[i];o=10,r+="<li>",o=11,l===p.page?(o=12,r=r+'<a title="Goto Bookmark"'+pug.attr("href","#"+u,!0,!1)+">",o=13,r+='<i class="fa fa-bookmark">',o=13,r+="&nbsp;</i></a>",o=14,r+=pug.escape(null==(e="  Bookmark "+(i+1))?"":e)):(o=16,r=r+'<a title="Goto Bookmark"'+pug.attr("href",p.page+"#"+u,!0,!1)+">",o=17,r+='<i class="fa fa-bookmark">',o=17,r+="&nbsp;</i></a>",o=18,r+=pug.escape(null==(e="  Bookmark "+(i+1))?"":e)),o=20,l===p.page&&p.audio===!0?(o=21,r+=pug.escape(null==(e=": Play audio at bookmark ")?"":e),o=22,r=r+'<a class="audio-from-here" title="Play Audio from Here"'+pug.attr("href",u,!0,!1)+">",o=23,r+='<i class="fa fa-volume-up"></i></a>'):p.audio===!0&&(o=25,r+=pug.escape(null==(e=": Play audio at bookmark ")?"":e),o=26,r=r+'<a title="Play Audio from Here"'+pug.attr("href",p.page+"?play="+u,!0,!1)+">",o=27,r+='<i class="fa fa-volume-up"></i></a>'),r+="</li>"}}}.call(this),r+="</ul>"}else{var u=0;for(var t in i){u++;var p=i[t];o=3,l===p.page?(o=4,r+='<li class="bm-list bm-current-page">',o=4,r=r+pug.escape(null==(e=p.title)?"":e)+"</li>"):(o=6,r+='<li class="bm-list">',o=6,r=r+pug.escape(null==(e=p.title)?"":e)+"</li>"),o=8,r+="<ul>",o=9,function(){var a=p.mark;if("number"==typeof a.length)for(var i=0,t=a.length;t>i;i++){var u=a[i];o=10,r+="<li>",o=11,l===p.page?(o=12,r=r+'<a title="Goto Bookmark"'+pug.attr("href","#"+u,!0,!1)+">",o=13,r+='<i class="fa fa-bookmark">',o=13,r+="&nbsp;</i></a>",o=14,r+=pug.escape(null==(e="  Bookmark "+(i+1))?"":e)):(o=16,r=r+'<a title="Goto Bookmark"'+pug.attr("href",p.page+"#"+u,!0,!1)+">",o=17,r+='<i class="fa fa-bookmark">',o=17,r+="&nbsp;</i></a>",o=18,r+=pug.escape(null==(e="  Bookmark "+(i+1))?"":e)),o=20,l===p.page&&p.audio===!0?(o=21,r+=pug.escape(null==(e=": Play audio at bookmark ")?"":e),o=22,r=r+'<a class="audio-from-here" title="Play Audio from Here"'+pug.attr("href",u,!0,!1)+">",o=23,r+='<i class="fa fa-volume-up"></i></a>'):p.audio===!0&&(o=25,r+=pug.escape(null==(e=": Play audio at bookmark ")?"":e),o=26,r=r+'<a title="Play Audio from Here"'+pug.attr("href",p.page+"?play="+u,!0,!1)+">",o=27,r+='<i class="fa fa-volume-up"></i></a>'),r+="</li>"}else{var t=0;for(var i in a){t++;var u=a[i];o=10,r+="<li>",o=11,l===p.page?(o=12,r=r+'<a title="Goto Bookmark"'+pug.attr("href","#"+u,!0,!1)+">",o=13,r+='<i class="fa fa-bookmark">',o=13,r+="&nbsp;</i></a>",o=14,r+=pug.escape(null==(e="  Bookmark "+(i+1))?"":e)):(o=16,r=r+'<a title="Goto Bookmark"'+pug.attr("href",p.page+"#"+u,!0,!1)+">",o=17,r+='<i class="fa fa-bookmark">',o=17,r+="&nbsp;</i></a>",o=18,r+=pug.escape(null==(e="  Bookmark "+(i+1))?"":e)),o=20,l===p.page&&p.audio===!0?(o=21,r+=pug.escape(null==(e=": Play audio at bookmark ")?"":e),o=22,r=r+'<a class="audio-from-here" title="Play Audio from Here"'+pug.attr("href",u,!0,!1)+">",o=23,r+='<i class="fa fa-volume-up"></i></a>'):p.audio===!0&&(o=25,r+=pug.escape(null==(e=": Play audio at bookmark ")?"":e),o=26,r=r+'<a title="Play Audio from Here"'+pug.attr("href",p.page+"?play="+u,!0,!1)+">",o=27,r+='<i class="fa fa-volume-up"></i></a>'),r+="</li>"}}}.call(this),r+="</ul>"}}}.call(this),r+="</ul>"}).call(this,"bookmarks"in i?i.bookmarks:"undefined"!=typeof bookmarks?bookmarks:void 0,"thisPageUrl"in i?i.thisPageUrl:"undefined"!=typeof thisPageUrl?thisPageUrl:void 0)}catch(t){pug.rethrow(t,l,o)}return r};

    puglatizer["nwffacim"] = function template(a){var i,t,e,n="",u={};try{var o=a||{};(function(a,t,o,r,d,s,f,p,c,y,h,l,v,m,A,g,I,L){function b(i){var t=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],e=a.parseInt(i.substr(0,2),10),n=a.parseInt(i.substr(4,2),10),u=a.parseInt(i.substr(2,2),10),o=(n>50?"19":"20")+i.substr(4,2),r=t[e]+" "+u+", "+o;return r}function M(a){return"g000002"===a?"Authors Note":"g000003"===a?"Foreword":b(a.substr(1))}function G(a){return"acknowledgements"==a?"Acknowledgements":"foreword"==a?"Foreword":"afterword"==a?"Afterword":b(a)}function S(a){return b(a)}function C(a,i){return"grad"===a?M(i):"yaa"===a?G(i):S(i)}e=1,e=53,u.hitList=i=function(a,t,u){this&&this.block,this&&this.attributes||{};e=54;var o=u.length;e=55,n+="<h3>",e=55,n=n+pug.escape(null==(i=a+" ("+o+")")?"":i)+"</h3>",e=56,n+='<ul class="fa-ul">',e=57,function(){var a=u;if("number"==typeof a.length)for(var o=0,r=a.length;r>o;o++){var d=a[o];e=58;var s=d.base+"?s=show"+d.location;e=59;var f=C(t,d.unit);e=60,n+="<li>",e=60,n+='<i class="fa fa-search">',e=61,n=n+"<a"+pug.attr("href",s,!0,!1)+">",e=61,n+="&nbsp; ",e=61,n=n+pug.escape(null==(i=f)?"":i)+"</a>",e=62,n+="<p>",e=62,n=n+(null==(i=d.context)?"":i)+"</p></i></li>"}else{var r=0;for(var o in a){r++;var d=a[o];e=58;var s=d.base+"?s=show"+d.location;e=59;var f=C(t,d.unit);e=60,n+="<li>",e=60,n+='<i class="fa fa-search">',e=61,n=n+"<a"+pug.attr("href",s,!0,!1)+">",e=61,n+="&nbsp; ",e=61,n=n+pug.escape(null==(i=f)?"":i)+"</a>",e=62,n+="<p>",e=62,n=n+(null==(i=d.context)?"":i)+"</p></i></li>"}}}.call(this),n+="</ul>"},e=64,L&&(e=65,u.hitList("You Are the Answer","yaa",L)),e=66,I&&(e=67,u.hitList("Graduation","grad",I)),e=68,t&&(e=69,u.hitList("ACIM Study Group - 2002","acim",t)),e=70,o&&(e=71,u.hitList("ACIM Study Group - 2003","acim",o)),e=72,r&&(e=73,u.hitList("ACIM Study Group - 2004","acim",r)),e=74,d&&(e=75,u.hitList("ACIM Study Group - 2005","acim",d)),e=76,s&&(e=77,u.hitList("ACIM Study Group - 2006","acim",s)),e=78,f&&(e=79,u.hitList("ACIM Study Group - 2007","acim",f)),e=80,p&&(e=81,u.hitList("ACIM Study Group - 2008","acim",p)),e=82,c&&(e=83,u.hitList("ACIM Study Group - 2009","acim",c)),e=84,y&&(e=85,u.hitList("ACIM Study Group - 2010","acim",y)),e=86,h&&(e=87,u.hitList("ACIM Study Group - 2011","acim",h)),e=88,l&&(e=89,u.hitList("ACIM Study Group - 2012","acim",l)),e=90,v&&(e=91,u.hitList("ACIM Study Group - 2013","acim",v)),e=92,m&&(e=93,u.hitList("ACIM Study Group - 2014","acim",m)),e=94,A&&(e=95,u.hitList("ACIM Study Group - 2015","acim",A)),e=96,g&&(e=97,u.hitList("ACIM Study Group - 2016","acim",g))}).call(this,"Number"in o?o.Number:"undefined"!=typeof Number?Number:void 0,"a2002"in o?o.a2002:"undefined"!=typeof a2002?a2002:void 0,"a2003"in o?o.a2003:"undefined"!=typeof a2003?a2003:void 0,"a2004"in o?o.a2004:"undefined"!=typeof a2004?a2004:void 0,"a2005"in o?o.a2005:"undefined"!=typeof a2005?a2005:void 0,"a2006"in o?o.a2006:"undefined"!=typeof a2006?a2006:void 0,"a2007"in o?o.a2007:"undefined"!=typeof a2007?a2007:void 0,"a2008"in o?o.a2008:"undefined"!=typeof a2008?a2008:void 0,"a2009"in o?o.a2009:"undefined"!=typeof a2009?a2009:void 0,"a2010"in o?o.a2010:"undefined"!=typeof a2010?a2010:void 0,"a2011"in o?o.a2011:"undefined"!=typeof a2011?a2011:void 0,"a2012"in o?o.a2012:"undefined"!=typeof a2012?a2012:void 0,"a2013"in o?o.a2013:"undefined"!=typeof a2013?a2013:void 0,"a2014"in o?o.a2014:"undefined"!=typeof a2014?a2014:void 0,"a2015"in o?o.a2015:"undefined"!=typeof a2015?a2015:void 0,"a2016"in o?o.a2016:"undefined"!=typeof a2016?a2016:void 0,"grad"in o?o.grad:"undefined"!=typeof grad?grad:void 0,"yaa"in o?o.yaa:"undefined"!=typeof yaa?yaa:void 0)}catch(r){pug.rethrow(r,t,e)}return n};

    puglatizer["search"] = function template(e){var a,s,t,i="",n={};try{var o=e||{};(function(e,s,o,r,c,h,l,u){function f(a){var s,t,i,n,o=!1,r=a;if(a.startsWith("chap"))i=e.parseInt(a.substr(4,2),10),t="Chapter "+i;else if(a.startsWith("l0")||a.startsWith("l1"))s=a.substr(1),i=e.parseInt(s),t="Lesson "+i;else switch(a.length>3&&(o=!0,n=a.substr(4),r=a.substr(0,3)),r){case"h01":case"h02":case"h06":case"h07":case"h08":case"h09":case"h10":case"h11":case"h12":t="Way of the Heart: Lesson ",s=e.parseInt(r.substr(1,2),10),t+=s;break;case"t01":case"t06":case"t07":case"t09":case"t11":t="Way of Transformation: Lesson ",s=e.parseInt(r.substr(1,2),10),t+=s;break;case"k02":case"k03":case"k04":case"k06":case"k10":t="Way of Knowing: Lesson ",s=e.parseInt(r.substr(1,2),10),t+=s;break;case"ble":t="The Blessing of Forgiveness";break;case"c2s":t="Choose to See";break;case"com":t="Mastering Communication";break;case"dbc":t="Decide to be Christ";break;case"dth":t="Death and Earth Changes";break;case"fem":t="The Divine Feminine";break;case"gar":t="Grace as Reality";break;case"hea":t="Healing";break;case"hoe":t="Heaven on Earth";break;case"hoi":t="The Holy Instant";break;case"hsp":t="The Holy Spirit";break;case"ign":t="Ignorance is Bliss";break;case"joy":t="1"===a.charAt(3)?"Joy I":"Joy II",o=!1;break;case"moa":t="Meaning of Ascension";break;case"mot":t="Become the Master of Time";break;case"wak":t="Awakening";break;case"wlk":t="Walk with Me";break;default:t=r}return o&&(t=t+" - Question "+n),t}t=1,t=128,n.hitList=a=function(e,s){this&&this.block,this&&this.attributes||{};t=129,i+="<h3>",t=129,i=i+pug.escape(null==(a=e)?"":a)+"</h3>",t=130,i+='<ul class="fa-ul">',t=131,function(){var e=s;if("number"==typeof e.length)for(var n=0,o=e.length;o>n;n++){var r=e[n];t=132;var c=r.base+"?s=show"+r.location;t=133;var h=f(r.unit);t=134,i+="<li>",t=134,i+='<i class="fa fa-search">',t=135,i=i+"<a"+pug.attr("href",c,!0,!1)+">",t=135,i+="&nbsp; ",t=135,i=i+pug.escape(null==(a=h)?"":a)+"</a>",t=136,i+="<p>",t=136,i=i+(null==(a=r.context)?"":a)+"</p></i></li>"}else{var o=0;for(var n in e){o++;var r=e[n];t=132;var c=r.base+"?s=show"+r.location;t=133;var h=f(r.unit);t=134,i+="<li>",t=134,i+='<i class="fa fa-search">',t=135,i=i+"<a"+pug.attr("href",c,!0,!1)+">",t=135,i+="&nbsp; ",t=135,i=i+pug.escape(null==(a=h)?"":a)+"</a>",t=136,i+="<p>",t=136,i=i+(null==(a=r.context)?"":a)+"</p></i></li>"}}}.call(this),i+="</ul>"},t=138,c&&(t=139,n.hitList("Way of the Heart",c)),t=140,u&&(t=141,n.hitList("Way of Transformation",u)),t=142,h&&(t=143,n.hitList("Way of Knowning",h)),t=144,l&&(t=145,n.hitList("Way of the Servant",l)),t=146,r&&(t=147,n.hitList("The Jeshua Letters",r)),t=148,s&&(t=149,n.hitList("The Early Years",s)),t=150,o&&(t=151,n.hitList("Question and Answers",o))}).call(this,"Number"in o?o.Number:"undefined"!=typeof Number?Number:void 0,"early"in o?o.early:"undefined"!=typeof early?early:void 0,"questions"in o?o.questions:"undefined"!=typeof questions?questions:void 0,"tjl"in o?o.tjl:"undefined"!=typeof tjl?tjl:void 0,"woh"in o?o.woh:"undefined"!=typeof woh?woh:void 0,"wok"in o?o.wok:"undefined"!=typeof wok?wok:void 0,"wos"in o?o.wos:"undefined"!=typeof wos?wos:void 0,"wot"in o?o.wot:"undefined"!=typeof wot?wot:void 0)}catch(r){pug.rethrow(r,s,t)}return i};

    puglatizer["wom"] = function template(t){var e,i,n,o="",s={};try{var a=t||{};(function(t,i,a,r,u,l,h,f){function p(e){var i,n,o;return"early"===e?n="Ooops...":e.startsWith("chap")?(o=t.parseInt(e.substr(4,2),10),n="Chapter "+o):(i=e.substr(1),o=t.parseInt(i,10),n="Lesson "+o),n}n=1,n=22,s.hitList=e=function(t,i){this&&this.block,this&&this.attributes||{};n=23,o+="<h3>",n=23,o=o+pug.escape(null==(e=t)?"":e)+"</h3>",n=24,o+='<ul class="fa-ul">',n=25,function(){var t=i;if("number"==typeof t.length)for(var s=0,a=t.length;a>s;s++){var r=t[s];n=26;var u=r.base+"?s=show"+r.location;n=27;var l=p(r.unit);n=28,o+="<li>",n=28,o+='<i class="fa fa-search">',n=29,o=o+"<a"+pug.attr("href",u,!0,!1)+">",n=29,o+="&nbsp; ",n=29,o=o+pug.escape(null==(e=l)?"":e)+"</a>",n=30,o+="<p>",n=30,o=o+(null==(e=r.context)?"":e)+"</p></i></li>"}else{var a=0;for(var s in t){a++;var r=t[s];n=26;var u=r.base+"?s=show"+r.location;n=27;var l=p(r.unit);n=28,o+="<li>",n=28,o+='<i class="fa fa-search">',n=29,o=o+"<a"+pug.attr("href",u,!0,!1)+">",n=29,o+="&nbsp; ",n=29,o=o+pug.escape(null==(e=l)?"":e)+"</a>",n=30,o+="<p>",n=30,o=o+(null==(e=r.context)?"":e)+"</p></i></li>"}}}.call(this),o+="</ul>"},n=32,u&&(n=33,s.hitList("Way of the Heart",u)),n=34,f&&(n=35,s.hitList("Way of Transformation",f)),n=36,l&&(n=37,s.hitList("Way of Knowning",l)),n=38,h&&(n=39,s.hitList("Way of the Servant",h)),n=40,r&&(n=41,s.hitList("The Jeshua Letters",r)),n=42,i&&(n=43,s.hitList("The Early Years",i)),n=44,a&&(n=45,s.hitList("Question and Answers",a))}).call(this,"Number"in a?a.Number:"undefined"!=typeof Number?Number:void 0,"early"in a?a.early:"undefined"!=typeof early?early:void 0,"questions"in a?a.questions:"undefined"!=typeof questions?questions:void 0,"tjl"in a?a.tjl:"undefined"!=typeof tjl?tjl:void 0,"woh"in a?a.woh:"undefined"!=typeof woh?woh:void 0,"wok"in a?a.wok:"undefined"!=typeof wok?wok:void 0,"wos"in a?a.wos:"undefined"!=typeof wos?wos:void 0,"wot"in a?a.wot:"undefined"!=typeof wot?wot:void 0)}catch(r){pug.rethrow(r,i,n)}return o};


    return puglatizer;
}));

},{"fs":29}],95:[function(require,module,exports){
/*
 * support for refills accordion tabs
 */

module.exports = function() {
  console.log("accordion-tabs");

  $(".accordion-tabs").each(function(index) {
    $(this).children("li").first().children("a").addClass("is-active").next().addClass("is-open").show();
  });

  $(".accordion-tabs").on("click", "li > a.tab-link", function(event) {
    if (!$(this).hasClass("is-active")) {
      event.preventDefault();
      var accordionTabs = $(this).closest(".accordion-tabs");
      accordionTabs.find(".is-open").removeClass("is-open").hide();

      $(this).next().toggleClass("is-open").toggle();
      accordionTabs.find(".is-active").removeClass("is-active");
      $(this).addClass("is-active");
    }
   else {
      event.preventDefault();
    }
  });
};


},{}],96:[function(require,module,exports){
"use strict";

var notify = require("toastr");
var store = require("store");
var url = require("../util/url");
var config = require("../bundle/config/config");
var _ = require("underscore");
var setStartTime = function(p) {
  console.error("search.setStartTime(%s) - function not initialized", p);
};

var searchResults;
var currentMatchIndex = 0;
var matchArray = [];
var markFailure = 0;
var notifyMarkFailure = false;

function showMessage(msg) {
  notify.info(msg);
}

//display document info on search navigator
function setSearchDocument(data) {
  $(".search-header > .search-document").html(
    "<p>" +
      config.getTitle(data.source,
      matchArray[currentMatchIndex].book,
      matchArray[currentMatchIndex].unit) +
    "</p>"
  );
}

//display search result info on search navigator
function setSearchTitle(query) {
  $(".search-header > .search-info").html(
    "<p>Search <em>" + query + "</em> (" +
    (currentMatchIndex + 1) + " of " +
    matchArray.length + ")</p>"
  );
}

function getPageInfo(data, thisBook, thisUnit) {
  var i;
  var urlInfo = {};
  var idx = _.findIndex(data.all, function(item) {
    return item.book === this.book && item.unit === this.unit;
  }, {book: thisBook, unit: thisUnit});

  //this should never happen
  if (idx === -1) {
    console.error("getPageInfo() error: Can't find search hit for this page in search results.");
    return urlInfo;
  }

  //console.log("findIndex for %s, %s: found idx: %s, ", thisBook, thisUnit, idx, data.all[idx]);

  //find next page with search results
  for (i=idx; i < data.all.length; i++) {
    //console.log("looking for next: i: %s, book: %s, unit: %s", i, data.all[i].book, data.all[i].unit);
    if (data.all[i].unit !== thisUnit || data.all[i].book !== thisBook) {
      urlInfo.next = data.all[i].base + "?s=show" + data.all[i].location;
      break;
    }
  }

  //find prev page with search results
  for (i=idx; i >= 0; i--) {
    if (data.all[i].unit !== thisUnit || data.all[i].book !== thisBook) {
      urlInfo.prev = data.all[i].base + "?s=show" + data.all[i].location;
      break;
    }
  }

  //console.log("urlInfo: ", urlInfo);
  return urlInfo;
}

// get array for all search hits on the page
function getHitArray(data, book, unit) {
  var pageHits = [];
  var bookHits = [];

  var i;

  bookHits = data[book];

  if (bookHits) {
    for(i = 0; i < bookHits.length; i++) {
      if (bookHits[i].unit === unit) {
        pageHits.push(bookHits[i]);
      }
    }
  }

  return {matches: pageHits};
}

//hilight terms on page for current search
function markSearchHits(searchHits, searchData, state) {
  var mark;
  var i;

  //Note: this regex wont find a string within a string - only finds
  //matches that begin on a word boundary
  //var regex = new RegExp("(?:^|\\b)(" + searchData.query + ")(?:$|\\b)", "gim");
  var regex = new RegExp("(?:^|\\b)(" + searchData.query + ")(?:$|\\b|)", "gim");
  for (i = 0; i < searchHits.length; i++) {
    var id = searchHits[i].location.substr(1);
    var el = document.getElementById(id);

    // a data error is indicated by el == null
    if (!el) {
      markFailure++;
      continue;
    }
    var content = el.innerHTML;

    //remove newline chars in content - they can prevent the
    //query string from being highlighted
    content = content.replace(/[\r\n]/gm," ");
    if (state === "show") {
      el.innerHTML = content.replace(regex, "<mark class='show-mark'>$1</mark>");
    }
    else {
      el.innerHTML = content.replace(regex, "<mark class='hide-mark'>$1</mark>");
    }

    //test if query was highlighted
    if (el.innerHTML === content) {
      console.log("Regex did not match: \"%s\" for %s", searchData.query, id);
      markFailure++;
    }
  }
}

//show hilight terms on page for current search
function showSearchHits() {
  var i;

  $("mark").each(function(idx, el) {
    $(el).removeClass("hide-mark").addClass("show-mark");
  });
}

//hide hilight terms on page for current search
function hideSearchHits() {
  var i;

  $("mark").each(function(idx, el) {
    $(el).removeClass("show-mark").addClass("hide-mark");
  });
}

function initializeNavigator(data) {
  var path = location.pathname.split("/");
  var hash = location.hash;
  var thisBook = path[2];
  var thisUnit = path[3];
  var matchIndex;

  //true for sparkly acim pages
  if (path.length === 6) {
    thisUnit = thisUnit + "/" + path[4];
  }

  console.log("thisUnit: %s", thisUnit);

  //for nwffacim study group books, the array of search hits is prefixed
  //with an 'a'. If we are processing an study group page we adjust the array name
  //accordingly
  var bookArrayName = thisBook;

  //the search result array for acim books starts with an 'a' but
  //the api returns an array identified by year, ie 2002, 2003, so
  //we add an to the 'book' portion of the uri to get the data from
  //the search result set
  if (/^\d/.test(thisBook)) {
    bookArrayName = "a" + thisBook;
  }

  //get array of search matches on the page
  var hitInfo = getHitArray(data, bookArrayName, thisUnit);

  //no hits for this page
  if (hitInfo.matches.length === 0) {
    return hitInfo;
  }
  hitInfo.showPlayer = true;

  //set global matchArray
  matchArray = hitInfo.matches;

  //find the index in hitInfo.matches for location.hash - that's
  //the "current" match
  if (hash) {
    matchIndex = _.findIndex(hitInfo.matches, function(val) {
      return val.location === this.hash;
    }, {hash: hash});

    if (matchIndex > -1) {
      currentMatchIndex = matchIndex;
    }
    else {
      console.error("Error: could not find location.hash in search result array");
    }
  }

  //one hit - change arrow to 'splat' so user can easily navigate to 
  //search hit
  if (hitInfo.matches.length === 1) {
    $(".search-prev-match").addClass("hide-player");

    $(".search-next-match > i").removeClass("fa-arrow-down").addClass("fa-asterisk");

    $(".search-next-match").on("click", function(e) {
      e.preventDefault();
      location.href = matchArray[currentMatchIndex].location;
    });
  }
  else {
    //add event handlers for matches on page
    $(".search-prev-match").on("click", function(e) {
      e.preventDefault();
      currentMatchIndex = currentMatchIndex - 1;
      if (currentMatchIndex < 0) {
        currentMatchIndex = matchArray.length - 1;
      }
      location.href = matchArray[currentMatchIndex].location;
      setSearchTitle(searchResults.query);
    });

    $(".search-next-match").on("click", function(e) {
      e.preventDefault();
      currentMatchIndex = currentMatchIndex + 1;
      if (currentMatchIndex > matchArray.length - 1) {
        currentMatchIndex = 0;
      }
      location.href = matchArray[currentMatchIndex].location;
      setSearchTitle(searchResults.query);
    });
  }

  //listener to play audio at hit location
  if (hitInfo.matches.length > 0) {
    if (typeof window.cmiAudioTimingData !== "undefined") {
      $(".play-this-match").on("click", function(e) {
        e.preventDefault();
        console.log("play: ", matchArray[currentMatchIndex].location.substr(1));
        setStartTime(matchArray[currentMatchIndex].location.substr(1))
      });
    }
    else {
      $(".play-this-match").addClass("hide-player");
    }
  }

  //get next/prev page urls
  var pageUrl = getPageInfo(data, thisBook, thisUnit);

  if (pageUrl.next) {
    $(".search-next-page").attr("href", pageUrl.next);
  }
  else {
    $(".search-next-page").addClass("hide-player");
  }

  if (pageUrl.prev) {
    $(".search-prev-page").attr("href", pageUrl.prev);
  }
  else {
    $(".search-prev-page").addClass("hide-player");
  }

  //create navigator 'close' event handler
  $(".search-dialog-close").on("click", function(e) {
    e.preventDefault();
    console.log("search-dialog-close clicked");
    hideSearchHits();
    $(".search-results-wrapper").addClass("hide-player");
  });

  return hitInfo;
}

module.exports = {
  //search/search.js
  initialize: function(setStartTimeFunc) {
    var searchMatchInfo;
    var s;

    //if there are no search results hide 'search navigator' sidebar option
    searchResults = store.get("search");

    //if no search data just return
    if (!searchResults) {
      return;
    }

    $(".search-navigator").removeClass("hide-player");

    //init navigator - continue initialization if array.length > 0
    console.log("initializeNavigator");
    searchMatchInfo = initializeNavigator(searchResults);
    if (searchMatchInfo.matches.length > 0) {
      s = url.getQueryString("s");

      //if url contains ?s=show then mark search terms on page and
      //show the navigator
      if (s) {
        markSearchHits(searchMatchInfo.matches, searchResults, "show");

        if (searchMatchInfo.showPlayer) {
          $(".search-results-wrapper").removeClass("hide-player");

          //notify user some search hits failed to be highlighted
          if (markFailure > 0) {
            showMessage("Failed to highlight " + markFailure + " search matche(s)");
            notifyMarkFailure = true;
          }
        }
      }
      else {
        markSearchHits(searchMatchInfo.matches, searchResults, "hide");
      }

      if (setStartTimeFunc) {
        setStartTime = setStartTimeFunc;
      }

      //setup navigator show/hide event listener
      setSearchTitle(searchResults.query);
      setSearchDocument(searchResults);
      $(".search-navigator").on("click", function(e) {
        e.preventDefault();
        console.log("search-navigator clicked");
        if ($(".search-results-wrapper").hasClass("hide-player")) {
          $(".search-results-wrapper").removeClass("hide-player");
          showSearchHits();

          if (markFailure > 0 && !notifyMarkFailure) {
            showMessage("Failed to highlight " + markFailure + " search matche(s)");
            notifyMarkFailure = true;
          }
        }
        else {
          $(".search-results-wrapper").addClass("hide-player");
          hideSearchHits();
        }
      });
    }
    else {
      $(".search-navigator").addClass("hide-player");
    }
  }
};

},{"../bundle/config/config":84,"../util/url":107,"store":64,"toastr":77,"underscore":78}],97:[function(require,module,exports){
"use strict";

var url = require("../util/url");
var axios = require("axios");
var store = require("store");
var runtime = require("pug-runtime");
var config = require("../bundle/config/config");
var templates = require("../pug/templates");

var searchApi = config.getApiEndpoint();
var msgField;

function doSearch(queryInfo) {
  console.log("queryInfo: ", queryInfo);
  return axios.post(searchApi, queryInfo);
}

function processSearchResults(queryInfo, response) {
  displayMessage("Search of " + queryInfo.source.toUpperCase() + " for <em>"
     + queryInfo.query + "</em> found "
     + response.count + " matches.");

  //console.log("search results: ", response);
  if (response.count > 0) {
    saveResults(response);
    showSearchResults(response);
  }
}

function reportSearchError(queryInfo) {
  displayMessage("Search of " + queryInfo.source.toUpperCase() + " for <em>"
     + queryInfo.query + "</em> ended with an error.");
}

//combine book specific arrays into one to simplify navigation on
//transcript pages - then store results
function saveResults(data) {
  var books = config.getBidArray(data.source);
  //console.log("bidArray: ", books);
  var all = [];
  for (var i = 0; i < books.length; i++) {
    var book = books[i];

    //if an array starts with a digit put an 'a' in front of it
    if (/^\d/.test(book)) {
      book = "a" + book;
    }
    if (data[book]) {
      all = all.concat(data[book]);
    }
  }

  //add concatenated array to results and save
  data.all = all;
  store.set("search", data);

  //console.log("saving results: ", data);
}

function showSearchResults(data) {
  console.log("showSearchResults(): ", data);
  var html;

  // searchResults is a function created by pug
  //var html = searchResults(data);
  if (data.source === "wom") {
    console.log("applying wom template");
    html = templates.search(data);
  }
  else if (data.source === "nwffacim") {
    console.log("applying nwffacim template");
    html = templates.nwffacim(data);
  }
  else if (data.source === "acim") {
    console.log("applying acim template");
    html = templates.acim(data);
  }
  var resultsDiv = document.getElementById("search-results");
  resultsDiv.innerHTML = html;
}

function displayMessage(message, spinner) {
  var showSpinner = spinner || false;
  var p = "<p>";

  if (showSpinner) {
    p = "<p><i class='fa fa-spinner fa-spin'></i>&nbsp";
  }

  msgField.innerHTML = p+message+"</p>";
}

function clearMessage() {
  msgField.innerHTML = "";
}

module.exports = {
  //search/site-search.js
  init: function(data) {
    msgField = document.getElementById("search-message");
    var submit = document.querySelector("form.search-bar");

    submit.addEventListener("submit", function(e) {
      e.preventDefault();
      //console.log("submit event handler");
      var query = document.querySelector(".requested-search-string");
      var source = $(".search-options").val();

      if (query.value === "") {
        //console.log("query value is empty");
        return;
      }

      //console.log("calling API with search: %s", query.value);
      //console.log("searching %s", source);

      var queryInfo = {
        source: source,
        query: query.value,
        width: 30
      };

      displayMessage("Please wait...", true);
      doSearch(queryInfo).then(function(response) {
        //console.log("query count: %s", response.data.count);
        processSearchResults(queryInfo, response.data);
        query.value = "";
      }).catch(function(error) {
        console.log("Error calling search API: %s", error.message);
        reportSearchError(queryInfo, error);
      })
    });

    var source = url.getQueryString("s");

    //check if source specified as a url parameter and set search
    //source accordingly
    if (source) {
      $("#option-select-" + source).prop("selected", true);
    }

    var q = url.getQueryString("q");
    var query;

    //check if query specified as a url parameter
    if (q) {
      query = document.querySelector(".requested-search-string");
      query.value = decodeURI(q);

      $("#option-select-" + source).prop("selected", true);
    }

    //init select2
    $(".search-options").select2({
      theme: "classic"
    });

    //when page loads, display results from last search if present
    if (data) {
      displayMessage("Search of " + data.source.toUpperCase() + " for <em>"
          + data.query + "</em> found "
          + data.count + " matches.");
      showSearchResults(data);
    }
    else {
      displayMessage("Welcome...");
    }
  }
};


},{"../bundle/config/config":84,"../pug/templates":94,"../util/url":107,"axios":2,"pug-runtime":60,"store":64}],98:[function(require,module,exports){

//these are used for highlight
var textPosition = require("dom-anchor-text-position");
var textQuote = require('dom-anchor-text-quote');
var wrapRange = require("wrap-range-text");
var uuid = require("uuid/v4");

function highlight(annotation) {
  //const anno_id = "anno-" + btoa(annotation.id);
  var anno_id = annotation.id;
  if (annotation.target.source) {
    var selectors = annotation.target.selector;
    for (var i = 0 ; i < selectors.length ; i++) {
      var selector = selectors[i];
      var type = selector.type;
      switch (type) {
        case "TextPositionSelector":
          // skip existing marks
          var existing_marks = document.querySelectorAll("[data-annotation-id='"+anno_id + "']");
          if (existing_marks.length === 0) {
            var mark = document.createElement("mark");
            mark.dataset["annotationId"] = anno_id;
            mark.classList.add("page-notes");
            var range = textPosition.toRange(document.body, selector);
            wrapRange(mark, range);
          }
          break;
      }
    }
  }
}

function getAnnotation(range) {
  var pathArray = location.pathname.split("/");
  if (range.collapsed) return;

  var textPositionSelector = textPosition.fromRange(document.body, range);
  Object.assign(textPositionSelector, {type: 'TextPositionSelector'});

  var textQuoteSelector = textQuote.fromRange(document.body, range);
  Object.assign(textQuoteSelector, {type: 'TextQuoteSelector'});

  var annotation = {
    type: 'Annotation',
    id: uuid(),
    url: location.origin + location.pathname,
    pid: range.startContainer.parentNode.id,
    source: pathArray[1],
    book: pathArray[2],
    unit: pathArray[3],
    target: {
      type: 'SpecificResource',
      source: window.location.href,
      selector: [
        textPositionSelector,
        textQuoteSelector,
      ]
    }
  };


  return annotation;
}

module.exports = {
  getAnnotation: getAnnotation,
  highlight: highlight
};


},{"dom-anchor-text-position":36,"dom-anchor-text-quote":39,"uuid/v4":81,"wrap-range-text":82}],99:[function(require,module,exports){
/* eslint no-alert: off, no-unreachable: off */
/* ui/bookmark.js */

"use strict";

var notify = require("toastr");
var store = require("store");
var _ = require("underscore");
var config = require("../bundle/config/config");
var templates = require("../pug/templates");
var setStartTime = function(p) {
  console.error("bookmark.setStartTime(%s) - function not initialized", p);
};

function showMessage(msg) {
  notify.info(msg);
}

function addBookmarkDialogCloseListener() {
  $(".bookmark-close").on("click", function(e) {
    e.preventDefault();
    $(".bookmark-dialog").addClass("hide-player");
    $(".audio-from-here").off();
  });
}

function prepareBookmarks(bm) {
  var i;

  console.log("prepareBookmarks");
  for (i = 0; i < bm.length; i++) {
    bm[i].title = config.getPageTitle(bm[i].page);
    bm[i].key = config.getKey(bm[i].page);
    bm[i].audio = config.getAudio(bm[i].page);
  }

  bm.sort(function(a,b) {
    return a.key - b.key;
  });

  return bm;
}

function showBookmarkDialog() {
  var data;
  var bmarks;
  var html;

  //dialog is aleady open - close it
  if (!$(".bookmark-dialog").hasClass("hide-player")) {
    $(".bookmark-dialog").addClass("hide-player");
    return;
  }

  data = store.get("bookmarks");
  if (!data || data.location.length === 0) {
    showMessage("You don't have any bookmarks");
    return;
  }

  bmarks = prepareBookmarks(data.location);
  //console.log("bmarks: ", bmarks);

  // generateBookmarkList is a function created by pug
  //html = template({
  html = templates.bookmark({
    thisPageUrl: location.pathname,
    bookmarks: bmarks
  });

  var list = document.getElementById("bookmark-list");
  list.innerHTML = html;

  //set event handler for audio-from-here that
  //allows playing audio starting from bookmark position
  // ** handler is removed when the dialog is closed
  $(".audio-from-here").on("click", function(e) {
    e.preventDefault();
    var p = $(this).attr("href");
    console.log("Play audio-from-here requested for %s", p);
    if (!setStartTime(p)) {
      showMessage("Failed to set audio start time to bookmark");
    }
    else {
      //close dialog box
      $(".bookmark-close").trigger("click");
    }
  });

  $(".bookmark-dialog").removeClass("hide-player");
}

//the sidebar 'Bookmark' option - toggles display of
//paragraph bookmarks
function addBookmarkToggleListener() {
  $(".bookmark").on("click", function(e) {
    e.preventDefault();
    $(".transcript p i.bkmark").each(function(idx) {
      if ($(this).hasClass("bkmark-hide")) {
        $(this).removeClass("bkmark-hide");
      }
      else {
        //don't hide set bookmarks
        if ($(this).hasClass("fa-bookmark-o")) {
          $(this).addClass("bkmark-hide");
        }
      }
    });
  });
}

function addShowBookmarkDialogListener() {
  $(".list-bookmarks").on("click", function(e) {
    e.preventDefault();
    showBookmarkDialog();
  });
}

function addBookMarkers() {
  $(".transcript p").each(function(idx) {
    if (!$(this).hasClass("omit")) {
      $(this).prepend("<i class='bkmark bkmark-hide fa fa-pull-left fa-bookmark-o'></i>");
    }
  });
}

function showBookmarks() {
  var bookmarks = store.get("bookmarks");
  var page;
  var id;
  var i;

  if (!bookmarks) {
    return;
  }

  page = _.findIndex(bookmarks.location, function(val) {
    return val.page === this.pathname;
  }, {pathname: location.pathname});

  if (page === -1) {
    return;
  }

  for(i = 0; i < bookmarks.location[page].mark.length; i++) {
    id = bookmarks.location[page].mark[i];
    $("#"+id+" i.bkmark").removeClass("fa-bookmark-o").addClass("fa-bookmark").removeClass("bkmark-hide");
  }

}

function storeBookmark(id) {
  console.log("storeBookmark: %s", id);
  var bookmarks = store.get("bookmarks");
  var page = 0;

  if (!bookmarks) {
    console.log("Adding first bookmark");
    bookmarks = { location: [{
        page: location.pathname,
        mark: [id]
      }]
    };
  }
  else {
    page = _.findIndex(bookmarks.location, function(val) {
      return val.page === this.pathname;
    }, {pathname: location.pathname});

    //bookmark for new page
    if (page === -1) {
      bookmarks.location.push({page: location.pathname, mark: [id]});
      page = bookmarks.location.length - 1;
    }
    else {
      bookmarks.location[page].mark.push(id);
    }
  }

  store.set("bookmarks", bookmarks);
  console.log("Page has %s bookmarks", bookmarks.location[page].mark.length);
  //console.log(bookmarks);
}

function removeBookmark(id) {
  console.log("removeBookmark: %s", id);
  var bookmarks = store.get("bookmarks");
  var page = 0;
  var mark;

  if (!bookmarks) {
    console.log("No bookmarks to remove");
  }
  else {
    page = _.findIndex(bookmarks.location, function(val) {
      return val.page === this.pathname;
    }, {pathname: location.pathname});

    if (page === -1) {
      console.log("page has no bookmarks to remove");
      return;
    }
    else {
      mark = _.findIndex(bookmarks.location[page].mark, function(val) {
        return val === this.id;
      }, {id: id});

      if (mark === -1) {
        console.log("bookmark %s not set on page");
        return;
      }
      else {
        bookmarks.location[page].mark.splice(mark, 1);

        //if page has no more bookmarks then remove page from bookmarks
        if (bookmarks.location[page].mark.length === 0) {
          bookmarks.location.splice(page,1);
        }
      }
    }
  }

  store.set("bookmarks", bookmarks);
  //console.log(bookmarks);
}

function addBookmarkListener() {
  $(".transcript p i.bkmark").each(function(idx) {
    $(this).on("click", function(e) {
      var id;
      e.preventDefault();
      if ($(this).hasClass("fa-bookmark-o")) {
        $(this).removeClass("fa-bookmark-o").addClass("fa-bookmark");
        id = $(this).parent().attr("id");
        storeBookmark(id);
      }
      else {
        $(this).removeClass("fa-bookmark").addClass("fa-bookmark-o");
        id = $(this).parent().attr("id");
        removeBookmark(id);
      }
    });
  });
}

module.exports = {
  //bookmark.js
  initialize: function(audioStartTimeFunc) {
    console.log("bookmark init");

    if ($(".transcript").length > 0) {
      setStartTime = audioStartTimeFunc;
      addBookMarkers();
      showBookmarks();
      addBookmarkListener();
      addBookmarkToggleListener();
    }
    else {
      //hide sidebar bookmark option
      $(".sidebar-nav-item.bookmark").addClass("hide-player");
    }
    addShowBookmarkDialogListener();
    addBookmarkDialogCloseListener();
  }
};


},{"../bundle/config/config":84,"../pug/templates":94,"store":64,"toastr":77,"underscore":78}],100:[function(require,module,exports){

"use strict";

//var kb = require("keyboardjs");
var notify = require("toastr");
var _ = require("underscore");
var modal = require("./modal");
var hilight = require("./hilight");
var capture = require("../ds/capture");
var ays = require("../util/are-you-sure");
var config = require("../bundle/config/config");
var store = require("store");

var jPlayer;
var currentPlayTime = 0;

var audioPlaying = false;
var captureRequested = false;
var captureId = "";

var increaseSpeed = true;

function DeleteException(message) {
  this.message = message;
  this.name = "deleteException";
}

function StateException(message) {
  this.message = message;
  this.name = "stateException";
}

//when we know audio times, they can be automatically
//captured calling autoCapture()
//- this is true for p0 which we default to time: 0 but it
//  may actually start later in the recording. We can use this
//  info to jump to the p0 time so user doesn"t have to listen
//  to dead space
function autoCapture(o) {
  captureRequested = true;
  markParagraph(o);
}

//called only when captureRequested == true
function markParagraph(o) {
  var pi = $("#" + o.id).children("i");
  var captureLength;

  if (!captureRequested) {
    return;
  }

  //mark as captured
  if (pi.hasClass("fa-bullseye")) {
    pi.removeClass("fa-bullseye").addClass("fa-check");
    capture.add(o);
    //timeTest.enable();
    console.log("%s captured at %s", o.id, o.seconds);
  }
  //user clicked a captured paragraph, mark for delete
  else if (pi.hasClass("fa-check")) {
    pi.removeClass("fa-check").addClass("fa-bullseye");

    captureLength = capture.remove(o);
    if (captureLength === -1) {
      throw new DeleteException("can't find id to delete in capture array");
    }
    else {
      console.log("%s deleted at %s", o.id, o.seconds);
      if (captureLength < 2) {
        //timeTest.disable();
      }
    }
  }
  else {
    throw new StateException("unknown paragraph state for: %s", o.id);
  }

  captureRequested = false;

  //keep track if captured timing data needs to be submitted and 
  //warn user if they attempt to leave the page without having 
  //submitted the data
  ays.dataEvent(capture.length() - 1);
}

//add option to sidebar to capture audio play time
function enableSidebarTimeCapture() {

  //transcript_format_complete is defined globally
  if (!transcriptFormatComplete) {
    console.log("Formatting for this transcript is incomplete, capture disabled");
    return;
  }

  //check if timing data collection is reserved to a specific user
  var pageInfo = config.getInfo(location.pathname);
  //console.log("Page Info: ", pageInfo);
  if (pageInfo.timer && pageInfo.timer !== "none") {

    //don't enable time collection if current user is not registered user
    var userInfo = store.get("userInfo");
    if (!userInfo) {
      //user not registered
      console.log("capture disabled, assigned to: %s", pageInfo.timer);
      return;
    }

    if (userInfo.uid !== pageInfo.timer) {
      //user not assigned to data collection for this page
      console.log("capture disabled, assigned to: %s", pageInfo.timer);
      return;
    }
  }

  //show sidebar menu option
  $(".pmarker-wrapper").css("display", "block");

  //toggle display of paragraph markers used
  //to record audio playback time
  //console.log("setting up .pmarker-toggle listener");
  $(".pmarker-toggle").on("click", function(e) {
    var ct = $(".pmarker-toggle");
    e.preventDefault();
    if (ct.children("i").hasClass("fa-toggle-off")) {
      ct.html("<i class='fa fa-toggle-on'></i>&nbsp;Disable Time Capture");
    }
    else {
      ct.html("<i class='fa fa-toggle-off'></i>&nbsp;Enable Time Capture");
    }

    toggleMarkers();
  });

  //init unsubmitted data warning
  ays.init();

  $(".time-lister").on("click", function(e) {
    var data;
    e.preventDefault();

    if (capture.length() < 2) {
      data = "No data captured yet.";
    }
    else {
      data = JSON.stringify(capture.getData());
      data = "var cmiAudioTimingData = " + data + ";";
    }

    $("#audio-data-form").attr("action", capture.getBase());
    $("#captured-audio-data").html(data);
    $(".submit-message").html("");
    $("#modal-1").trigger("click");
  });

  //initialize modal window
  modal.initialize("#modal-1");

  //submit time submit form in modal window
  $("#audio-data-form").submit(function(e) {
    e.preventDefault();

    //if no data yet captured, cancel submit
    if (capture.length() < 2) {
      $(".submit-message").html("No data captured yet!");
      return;
    }

    var $form = $(this);
    $.post($form.attr("action"), $form.serialize())
      //.then(function() {
      .done(function() {
        notify.success("Thank you!");
        $(".modal-close").trigger("click");

        //signal data submitted
        ays.dataEvent(0);
      })
      .fail(function(e) {
        $(".submit-message").html("Drat! Your submit failed.");
      });
  });
}

//create listeners for each paragraph and
//show rewind and speed player controls
function createListener() {
  //$(".transcript p i.fa").each(function(idx) {
  $(".transcript p i.timing").each(function(idx) {
    $(this).on("click", function(e) {
      e.preventDefault();
      captureRequested = true;
      captureId = e.target.parentElement.id;

      if (!audioPlaying) {
        //notify user action won"t happen until audio plays
        //and only the last action is honored
        notify.info("action pending until audio playback begins");
      }
    });
  });

  //enable rewind and faster buttons on audio player
  //console.log("showing cmi audio controls");
  $(".cmi-audio-controls").removeClass("hide-cmi-controls");

  //set rewind control
  $(".audio-rewind").on("click", function(e) {
    e.preventDefault();
    var skipAmt = 8;
    var newTime = currentPlayTime - skipAmt;
    if (newTime <= 0) {
      newTime = 0;
    }
    console.log("rewinding playback to %s from %s", newTime, currentPlayTime);
    jPlayer.jPlayer("play", newTime);

  });

  //set playbackRate control
  $(".audio-faster").on("click", function(e) {
    var currentRate = jPlayer.jPlayer("option", "playbackRate");
    var newRate, displayRate;
    e.preventDefault();

    //normal = 0, slow = -1 and -2, fast = +1 and +2
    switch (currentRate) {
      case 0.8:
        increaseSpeed = true;
        newRate = 0.9;
        displayRate = "-1";
        break;
      case 0.9:
        newRate = increaseSpeed? 1: 0.8;
        displayRate = increaseSpeed? " 0": "-2";
        break;
      case 1:
        newRate = increaseSpeed? 2: 0.9;
        displayRate = increaseSpeed? "+1": "-1";
        break;
      case 2:
        newRate = increaseSpeed? 3: 1;
        displayRate = increaseSpeed? "+2": " 0";
        break;
      case 3:
        increaseSpeed = false;
        newRate = 2;
        displayRate = "+1";
        break;
    }

    jPlayer.jPlayer("option", "playbackRate", newRate);
    $(this).html(displayRate);
  });
}

function toggleMarkers() {
  var ids = $(".transcript p").attr("id");
  var fa = $(".transcript p i.timing");
  //var fa = $(".transcript p i.fa");

  //create markers is not on page
  //- do markers exist?
  if (fa.length !== 0) {
    //yes - toggle display
    //$(".transcript p i.fa").toggle();
    $(".transcript p i.timing").toggle();
    if ($(".transcript").hasClass("capture")) {
      $(".transcript").removeClass("capture");
    }
    else {
      $(".transcript").addClass("capture");
    }
  }
  else if (typeof ids !== "undefined") {
    $(".transcript p").each(function(idx) {
      if (!$(this).hasClass("omit")) {
        $(this).prepend("<i class='timing fa fa-2x fa-border fa-pull-left fa-bullseye'></i>");
      }
    });

    //automatically record a time of 0 for paragraph 0. This allows user to change
    //the p0 time when it doesn"t start at 0.
    autoCapture({id: "p0", seconds: 0});

    $(".transcript").addClass("capture");
    createListener();
  }
}

module.exports = {
  //ui/capture.js

  initialize: function(player) {
    var captureOptions = {
      base: window.location.pathname,
      title: $(".post-title").text()
    };

    jPlayer = player;
    capture.init(captureOptions);
  },

  play: function(t) {
    audioPlaying = true;
  },

  pause: function(t) {
    audioPlaying = false;
  },

  ended: function(t) {
    audioPlaying = false;
  },

  //the audio player calls this every 250ms with the
  //current play time
  currentTime: function(t) {
    //store current time
    currentPlayTime = t;

    if (captureRequested) {
      markParagraph({
        id: captureId,
        seconds: t
      });
    }
  },

  //show sidebar menu option to enable time capture
  enableSidebarTimeCapture: enableSidebarTimeCapture

};

},{"../bundle/config/config":84,"../ds/capture":86,"../util/are-you-sure":106,"./hilight":102,"./modal":104,"store":64,"toastr":77,"underscore":78}],101:[function(require,module,exports){
"use strict";

//var store = require("store");
var url = require("../util/url");
var scroll = require("scroll-into-view");
var indexApi = require("../api/cmiapi");
var annotation = require("./annotation");

module.exports = {
  initialize: function() {
    var query = url.getQueryString("idx");

    if (query) {
      indexApi.getAnnotation(query)
      .then(function(response) {
        if (response.data.pid) {
          //console.log("getAnnotation response: ", response);
          var el = document.getElementById(response.data.pid);
          annotation.highlight(response.data);
          scroll(el);
        }
        else {
          console.log("idx:%s not found", query);
        }
      });
    }
  }
};


},{"../api/cmiapi":83,"../util/url":107,"./annotation":98,"scroll-into-view":62}],102:[function(require,module,exports){
/*
 * NOTE:
 *
 * Declared globally: cmiAudioTimingData
 */

"use strict";

var scroll = require("scroll-into-view");
var _ = require("underscore");

//default class to highlight transcript paragraphs during audio playback
var hilightClass = "hilite";
var player;
var enabled = false;
var seeking = false;
var seekSnap = false;

//real or test data
var timingData;

//paragraph timing pointers
var locptr = -1;
var prevptr = -1;

function processSeek(time) {

  console.log("seek requested to: ", time);

  //we don"t know if seeked time is earlier or later than
  //the current time so we look through the timing array
  locptr = _.findIndex(timingData.time, function(t) {
    return t.seconds >= time;
  });

  if (locptr === -1) {
    locptr++;
    console.log("adjusted index: %s", locptr);
    console.log("seek time: %s > %s (last ptime)", time,
        timingData.time[timingData.time.length - 1].seconds);
  }

  console.log("[ptr:%s] seeking to %s which begins at %s", 
    locptr, timingData.time[locptr].id, timingData.time[locptr].seconds);

  //check if we"ve found a beginning of the paragraph
  // - if so, don"t need to snap
  console.log("snap time diff=%s", Math.abs(time - timingData.time[locptr].seconds));
  //if (time === timingData.time[locptr].seconds) {
  if (Math.abs(time - timingData.time[locptr].seconds) < 1) {
    showNscroll(locptr);
    seeking = false;
  }
  else {
    //snap play to start time of paragraph
    console.log("snapping from requested %s to %s",
                time, timingData.time[locptr].seconds);
    seekSnap = true;
    player.setCurrentTime(timingData.time[locptr].seconds);
  }
}

function processSeekSnap(time) {

  console.log("snap complete: snap time: %s, ptime: %s", time, timingData.time[locptr].seconds);
  showNscroll(locptr);

  console.log("-------------------------");

  seekSnap = false;
  seeking = false;
}

function removeCurrentHilight() {
  if (prevptr > -1) {
    $("#" + timingData.time[prevptr].id).removeClass(hilightClass);
  }
}

function showNscroll(idx) {
  var tinfo = timingData.time[idx];

  //scroll into view
  scroll(document.getElementById(tinfo.id));

  if (prevptr > -1) {
    $("#" + timingData.time[prevptr].id).removeClass(hilightClass);
  }

  $("#" + tinfo.id).addClass(hilightClass);
  prevptr = idx;
}

function getTime(idx) {
  if (idx < 0 || idx >= timingData.time.length ) {
    return 60 * 60 *24; //return a big number
  }

  return timingData.time[idx].seconds;
}

function getTimeInfo(idx) {
  if (idx < 0 || idx >= timingData.time.length ) {
    return {id: "xx", seconds: 0};
  }

  return timingData.time[idx];
}

//audio is playing: play time at arg: current
function processCurrentTime(current) {
  if (locptr === -1 || current > getTime(locptr + 1)) {
    debugPlayPosition("hilight event", current);
    locptr++;
    showNscroll(locptr);
  }
}

function debugPlayPosition(msg, time) {
  var now = time || "?.?";
  var prev = getTimeInfo(locptr - 1),
      current = getTimeInfo(locptr),
      next = getTimeInfo(locptr + 1);

  console.log("%s [%s:%s]: p:%s/%s, c:%s/%s, n:%s/%s", msg, time, locptr, prev.id, prev.seconds, current.id, current.seconds, next.id, next.seconds);

}

module.exports = {
  //hilight.js

  //highlight supported when timing data available
  initialize: function(cssClass) {
    var rc = {};

    if (typeof window.cmiAudioTimingData !== "undefined") {
      console.log("timing data available");

      timingData = cmiAudioTimingData;
      rc.startTime = timingData.time[0].seconds;

      //indicate timing data available
      enabled = true;
    }

    if (typeof cssClass !== "undefined") {
      hilightClass = cssClass;
    }

    rc.enabled = enabled;
    return rc;
  },

  setAudioPlayer: function(p) {
    //we need this to adjust seeking
    player = p;
  },

  //don"t process time event when seeking
  updateTime: function(time) {
    if (!enabled || seeking) {
      return;
    }
    processCurrentTime(time);
  },
  play: function(time) {
    console.log("play pressed at %s", time);
  },
  pause: function(time) {
    console.log("pause pressed at %s", time);
  },
  seeking: function(time) {
    if (!enabled) {
      return;
    }
    //console.log("%s seeking", time);

    //disable hilight event handling
    seeking = true;
  },
  seeked: function(time) {
    if (!enabled) {
      return;
    }

    //seek is a two step process
    //1. user initiated, seeks to arbitrary time
    //2. snap: adjust to start of paragraph seeked to
    if (!seekSnap) {
      processSeek(time);
    }
    else {
      processSeekSnap(time);
    }

  },
  ended: function(time) {
    console.log("play ended at: %s", time);

    if (!enabled) {
      return;
    }

    //remove hilight
    removeCurrentHilight();

    //reset pointers
    locptr = -1;
    prevptr = -1;
  },

  //get start time for paragraph p
  getTime: function(p) {
    var pTime = 0;
    var info = _.find(timingData.time, function(item) {
      return item.id === p;
    });

    if (info) {
      pTime = info.seconds;
    }
    else {
      console.error("hilight.getTime(%s) failed to get paragraph start time.", p);
    }
    return pTime;
  }

};


},{"scroll-into-view":62,"underscore":78}],103:[function(require,module,exports){
"use strict";

var url = require("../util/url");
var hilight = require("./hilight");
var capture = require("./capture");

var player;
var playing = false;
var audioStartTime = 0;
var initialized = false;
var haveTimingData = false;

function showPlayer() {
  if ($(".audio-player-wrapper").hasClass("hide-player")) {
    $(".audio-player-wrapper").removeClass("hide-player");
  }
}

//this is called only when we have audio timing data
function initPlayFromHere() {
  var store = require("store");

  /*
  var playFromHere = store.get("play-from-here");
  console.log("playFromHere: %s", playFromHere);

  if (!playFromHere) {
    return;
  }
  */

  // add markers to each paragraph
  $(".transcript p").each(function(idx) {
    //don't add marker to p's with class = omit
    if (!$(this).hasClass("omit")) {
      $(this).prepend("<i class='playmark playmark-hide fa fa-pull-left fa-play'></i>");
    }
  });

  //show sidebar 'play-from-here' menu option
  $(".sidebar-nav-item.playmark").removeClass("hide-player");

  //add show/hide play-from-here icons
  $(".sidebar-nav-item.playmark").on("click", function(e) {
    e.preventDefault();
    $(".transcript p i.playmark").each(function(idx) {
      if (!$(this).hasClass("omit")) {
        if ($(this).hasClass("playmark-hide")) {
          $(this).removeClass("playmark-hide");
        }
        else {
          $(this).addClass("playmark-hide");
        }
      }
    });
  });

  //add play-from-here listener
  $(".transcript p i.playmark").each(function(idx) {
    $(this).on("click", function(e) {
      var id;
      e.preventDefault();
      id = $(this).parent().attr("id");
      console.log("play-from-here: %s", id);
      setStartTime(id);
    });
  });
}

function createPlayerDisplayToggle(config) {
  // setup "display player" toggle

  $(config.audioToggle).on("click", function(e) {
    e.preventDefault();
    //$(config.hidePlayer).toggle();
    if ($(".audio-player-wrapper").hasClass("hide-player")) {
      $(".audio-player-wrapper").removeClass("hide-player");
    }
    else {
      $(".audio-player-wrapper").addClass("hide-player");
    }
  });
}

function initPlayer(config) {
  var audioUrl;
  var audioElement = $("audio.mejs-player");
  var features;

  if (!initialized && audioElement.length !== 0) {
    //setup toggle for player display
    createPlayerDisplayToggle(config);

    //configure player
    audioUrl = $(config.audioToggle).attr("href");
    audioElement.attr("src", audioUrl);

    //player controls when we have timing data
    if (typeof window.cmi_audio_timing_data !== "undefined") {
      features = ["playpause", "stop", "progress", "current"];
    }
    //if we don"t allow time capture
    else if (!transcriptFormatComplete) {
      features = ["playpause", "stop", "progress", "current"];
    }
    //when user may capture time
    else {
      features = ["playpause", "stop", "current", "skipback", "jumpforward", "speed"];
    }

    $("#cmi-audio-player").mediaelementplayer({
      pluginPath: "/public/js/lib/mediaelement/build/",
      skipBackInterval: 15,
      jumpForwardInterval: 15,
      features: features,
      success: function(mediaElement, originalNode) {

        //hilight supported when paragraph timing data is loaded
        // - returns object indicating whether enabled and audio start time
        var hinfo = hilight.initialize(config.hilightClass);

        //if we don"t have timing data enable support to get it
        if (!hinfo.enabled) {
          capture.enableSidebarTimeCapture();
        }
        else {
          //we've got timing data
          audioStartTime = hinfo.startTime;
          haveTimingData = true;
        }
      }
    });

    var playerId = $("#cmi-audio-player").closest(".mejs__container").attr("id");
    player = mejs.players[playerId];
    hilight.setAudioPlayer(player);

    //get play time updates from player
    player.media.addEventListener("timeupdate", function(e) {
      var time = this.getCurrentTime();
      if (!playing) {
        //console.log("timeupdate: not playing");
        return;
      }

      //if (time < audioStartTime) {
      //if (time < audioStartTime && (Math.abs(time - audioStartTime) > 1)) {
      if (audioStartTime > 0 && Math.abs(time - audioStartTime) > 1.5) {
        console.log("adjusting play time: ct: %s/%s, diff: %s",
            time, audioStartTime, Math.abs(time - audioStartTime));
        this.setCurrentTime(audioStartTime);
        audioStartTime = 0;
      }
      else {
        //console.log("playing: %s, current time %s", playing, time);
        hilight.updateTime(time);
        capture.currentTime(time);
      }
    });

    //get notified when player is playing
    player.media.addEventListener("playing", function(e) {
      playing = true;
      //console.log("playing...");
      $(".audio-player-wrapper").addClass("player-fixed");
      capture.play(this.getCurrentTime);
    });

    //get notified when player is paused
    player.media.addEventListener("paused", function(e) {
      //this doesn"t get called
      console.log("type: %s, player paused", e.type);
    });

    //get notified when media play has ended
    player.media.addEventListener("ended", function(e) {
      playing = false;
      $(".audio-player-wrapper").removeClass("player-fixed");
      capture.ended(this.getCurrentTime);

      hilight.ended(this.getCurrentTime);
    });

    //get notified when seek start
    player.media.addEventListener("seeking", function(e) {
      if (!playing) {
        return;
      }
      var time = this.getCurrentTime();
      hilight.seeking(time);
    });

    //get notified when seek ended
    player.media.addEventListener("seeked", function(e) {
      if (!playing) {
        return;
      }
      var time = this.getCurrentTime();
      hilight.seeked(time);
    });

    //set event listener for click on player stop button
    $(".mejs__stop-button").on("click", function(e) {
      $(".audio-player-wrapper").removeClass("player-fixed");

      playing = false;
      hilight.ended(0);
    });

    capture.initialize(player);
    initialized = true;
  }

  return initialized;
}

function init(config) {
  return initPlayer(config);
}

//this is called to sync the audio start time to a bookmarked paragraph
//and begin playing the audio
function setStartTime(p) {
  var newTime;
  if (!initialized) {
    console.error("audio.setStartTime(%s): audio player not initialized", p);
    return false;
  }
  newTime = hilight.getTime(p);

  if (newTime === 0 && p !== "p0") {
    console.error("No timing data for paragraph %s, audio playback time not changed", p);
    return false;
  }

  //audioStartTime = hilight.getTime(p);
  audioStartTime = newTime;
  console.log("Audio start time set to %s for paragraph: %s", audioStartTime, p);

  showPlayer();
  player.play();
  return true;
}

module.exports = {
  //mediaElements.js
  initialize: function(config) {
    init(config);

    if (haveTimingData) {
      initPlayFromHere();

      //check if audio requested on page load with ?play=<p#>
      var play = url.getQueryString("play");
      if (play) {
        console.log("play %s requested on url", play);
        if (!setStartTime(play)) {
          console.error("Failed to play audio from %s", play);
        }
      }
    }
  },

  setStartTime: setStartTime

};


},{"../util/url":107,"./capture":100,"./hilight":102,"store":64}],104:[function(require,module,exports){
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


},{}],105:[function(require,module,exports){
"use strict";

//Not working with require but it is by loading the js by <script>
//var WebClip = require("webclip");

var notify = require("toastr");
var Clipboard = require("clipboard");
var annotation = require("./annotation");
var indexApi = require("../api/cmiapi");

var clipboard;
var clipText = "not initialized";

function initClipboard() {
  clipboard = new Clipboard(".clipboard-copy", {
    text: function(trigger) {
      return clipText;
    }
  });
  clipboard.on("success", function(e) {
    notify.info("Selection copied to clipboard.");
  });
  clipboard.on('error', function(e) {
    console.error("clipboard error: ", e);
  });
}

function copyToClipboard(text) {
  clipText = text;
  $(".clipboard-copy").trigger("click");
}

module.exports = {
  //ui/share.js

  initialize: function() {
    var clip;
    var parts = location.pathname.split("/");
    var transcript = document.querySelector(".transcript");

    //setup sharing feature
    if (transcript) {
      console.log("share init");
      clip = new WebClip(transcript);
      initClipboard();

      var search = {
        name: "Search",
        description: "Search this site",
        icon: "search",
        action: function(value) {
          location.href = "/search/?q=" + value + "&s=" + parts[1];
        }
      };

      var clipboard = {
        name: "Clipboard",
        description: "Copy to Clipboard",
        icon: "clipboard",
        action: function(value, range) {
          var ann;
          var link;

          ann = annotation.getAnnotation(range);
          indexApi.storeAnnotation(ann).then(function(response) {
            console.log("indexApi.storeAnnotation(%s): ", response.data.id);
          });
          link = location.origin + location.pathname + "?idx=" +  ann.id;
          copyToClipboard(value + "\n" + link);
        }
      };

      clip.use([search, clipboard]);
    }
  }
};


},{"../api/cmiapi":83,"./annotation":98,"clipboard":32,"toastr":77}],106:[function(require,module,exports){
"use strict";

var isDirty = false;
var message = "Please submit your timing data before leaving the page! To do so, " +
  "open the side bar menu and click on the 'send icon' next to the 'capture' option.";

module.exports = {
  //utilare-you-sure.js

  init: function() {
    window.onload = function() {
      window.addEventListener("beforeunload", function (e) {
        if (!isDirty) {
          return undefined;
        }

        (e || window.event).returnValue = message; //Gecko + IE
        return message; //Gecko + Webkit, Safari, Chrome etc.
      });
    };
  },

  //we alert the user only if data has been collected and not submitted
  dataEvent: function(size) {
    isDirty = false;
    if (size > 0) {
      isDirty = true;
    }
  }
};

},{}],107:[function(require,module,exports){
/*
 * Url utilities
 */
module.exports = {
  //util/url.js

  //return domain without subdomain of argument
  getDomain: function(url) {
    if (url) {
      url = input.replace(/(www\.)/i, "");
      if( !url.replace(/(www\.)/i, "") ) {
        url = "http://" + url;
      }

      var reg = /:\/\/(.[^/]+)/;
      return url.match(reg)[1];
    }
    return "";
  },

  parse: function(url) {
    var u = document.createElement("a");
    u.href = url;
    return u;
  },

  // get query string from window.location unless the arg 'qString' is not
  // null, in that case it represents the query string
  getQueryString: function(key, qString) {
    var queryString;

    if (qString) {
      queryString = qString.substring(1);
    }
    else {
      queryString = window.location.search.substring(1);
    }
    var vars = queryString.split("&");

    for(var i=0; i<vars.length; i++) {
      var getValue = vars[i].split("=");
      if (getValue[0] === key) {
        return getValue[1];
      }
    }
    return null;
  }

};

},{}]},{},[85]);

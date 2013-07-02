/**
 * Private utility that handles HTTP requests on behalf of other
 * modules.
 * @ignore
 */

var request = require('request')
  , HewError = require('./errors').HewError
  ;

// the User-Agent string
var packageJson = require('../package.json');
var USER_AGENT = packageJson.name + '-' + packageJson.version +
  ' (https://github.com/natesilva/hew)';


function sendRequest(tokenId, options, stream, callback) {
  if (tokenId) { options.headers['X-Auth-Token'] = tokenId; }

  if (stream) {
    // caller wants us to return a stream
    callback(null, request(options));
  } else {
    // caller wants us to return response and body objects
    request(options, function(err, response, body) {
      if (err) { return callback(err); }
      if (response.statusCode < 200 || response.statusCode > 299) {
        var message = options.method + ' to ' + options.uri + ' returned ' +
          response.statusCode;
        var e = new HewError(message);
        e.statusCode = response.statusCode;
        e.body = body;
        return callback(e);
      }
      if (response.headers['content-type'] === 'application/json' &&
        typeof body === 'string')
      {
        body = JSON.parse(body);
      }
      callback(null, response, body);
    });
  }
}

function makeRequest(method, uri, authToken, config, callback) {
  // deal with optional config argument
  if (typeof config === 'function') {
    callback = config;
    config = null;
  }
  config = config || {};

  // convert header names to lowercase to ease upcoming checks
  var headers = {};
  if (config.headers) {
    Object.keys(config.headers).forEach(function(key) {
      headers[key.toLowerCase()] = config.headers[key];
    });
  }

  // configure the HTTP request
  var options = {
    method: method,
    uri: uri,
    strictSSL: true,
    headers: headers,
    timeout: 3600000
  };

  if (!('user-agent' in options.headers)) {
    options.headers['user-agent'] = USER_AGENT;
  }

  if (!('accept' in options.headers)) {
    options.headers['accept'] = 'application/json';
  }

  if (config.body) {
    options.body = config.body;
  } else if (!config.stream) {
    options.json = config.json || {};
  }
  if (config.buffer) { options.encoding = null; }

  if (!authToken) {
    sendRequest(null, options, config.stream, callback);
  } else {
    authToken.getTokenId(function(err, tokenId) {
      if (err) { return callback(err); }
      sendRequest(tokenId, options, config.stream, callback);
    });
  }
}

// convenience functions
exports.GET = function(uri, authToken, config, callback) {
  makeRequest('GET', uri, authToken, config, callback);
};

exports.POST = function(uri, authToken, config, callback) {
  if (typeof config === 'function') {
    callback = config;
    config = { json: {} };
  }
  makeRequest('POST', uri, authToken, config, callback);
};

exports.PUT = function(uri, authToken, config, callback) {
  if (typeof config === 'function') {
    callback = config;
    config = { json: {} };
  }
  makeRequest('PUT', uri, authToken, config, callback);
};

exports.DELETE = function(uri, authToken, config, callback) {
  makeRequest('DELETE', uri, authToken, config, callback);
};

exports.HEAD = function(uri, authToken, config, callback) {
  makeRequest('HEAD', uri, authToken, config, callback);
};

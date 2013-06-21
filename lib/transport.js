// Do HTTP requests to HP Cloud.

var request = require('request')
  , HewError = require('./errors').HewError
  ;

// the User-Agent string
var packageJson = require('../package.json');
var USER_AGENT = packageJson.name + '-' + packageJson.version +
  ' (https://github.com/natesilva/hew)';

// convenience wrapper for the request() method
function doRequest(options, callback) {
  request(options, function(err, response, body) {
    if (err) { return callback(err); }
    if (response.statusCode < 200 || response.statusCode > 299) {
      var e = new HewError();
      e.body = body;
      return callback(e);
    }
    callback(null, body, response);
  });
}

function makeRequest(method, uri, authToken, json, headers, callback) {
  if (typeof json === 'function') {
    callback = json;
    json = {};
  }

  if (typeof headers === 'function') {
    callback = headers;
    headers = null;
  }

  headers = headers || {};

  var options = {
    method: method,
    json: json,
    uri: uri,
    strictSSL: true,
    headers: headers
  };
  options.headers['User-Agent'] = USER_AGENT;

  if (!authToken) { return doRequest(options, callback); }

  authToken.getTokenId(function(err, tokenId) {
    if (err) { return callback(err); }
    if (tokenId) { options.headers['X-Auth-Token'] = tokenId; }
    doRequest(options, callback);
  });
}

// convenience functions
exports.GET = function(uri, authToken, json, callback) {
  makeRequest('GET', uri, authToken, json, callback);
};

exports.POST = function(uri, authToken, json, callback) {
  makeRequest('POST', uri, authToken, json, callback);
};

exports.PUT = function(uri, authToken, json, callback) {
  makeRequest('PUT', uri, authToken, json, callback);
};

exports.DELETE = function(uri, authToken, json, callback) {
  makeRequest('DELETE', uri, authToken, json, callback);
};

exports.HEAD = function(uri, authToken, json, callback) {
  makeRequest('HEAD', uri, authToken, json, callback);
};

// same as above, but allows you to pass headers as well
exports.headersPOST = function(uri, authToken, json, headers, callback) {
  makeRequest('POST', uri, authToken, json, headers, callback);
};


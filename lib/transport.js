// Do HTTP requests to HP Cloud.

var request = require('request')
  , HewError = require('./errors').HewError
  , async = require('async')
  ;

// the User-Agent string
var packageJson = require('../package.json');
var USER_AGENT = packageJson.name + '-' + packageJson.version +
  ' (https://github.com/natesilva/hew)';


function makeRequest(method, uri, authToken, config, callback) {
  // deal with optional config argument
  if (typeof config === 'function') {
    callback = config;
    config = null;
  }
  config = config || {};

  // configure the HTTP request
  var options = {
    method: method,
    uri: uri,
    strictSSL: true,
    headers: config.headers || {}
  };

  options.headers['User-Agent'] = USER_AGENT;

  if (config.body) {
    options.body = config.body;
  } else if (!config.stream) {
    options.json = config.json || {};
  }
  if (config.buffer) { options.encoding = null; }

  async.series({
    tokenId: function(cb) {
      // get the token ID (or not, for unauthenticated requests)
      if (!authToken) { return process.nextTick(cb); }
      authToken.getTokenId(cb);
    }
  },
  function(err, results) {
    if (err) { return callback(err); }
    if (authToken) { options.headers['X-Auth-Token'] = results.tokenId; }

    if (config.stream) {
      // caller wants us to return a stream
      callback(null, request(options));
    } else {
      // caller wants us to return response and body objects
      request(options, function(err, response, body) {
        if (response.statusCode < 200 || response.statusCode > 299) {
          var e = new HewError();
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
  });
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

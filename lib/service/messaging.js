var transport = require('../transport')
  , NotProvisioned = require('../errors').NotProvisioned
  , ServiceError = require('../errors').ServiceError
  ;

var SERVICE_TYPE = 'hpext:messaging';
var SERVICE_VERSION = '1.1';

/**
 * # Interface to HP Cloud Messaging as a Service (MSGaaS)
 *
 * The messaging service is a simple FIFO (first-in, first-out) queue. You
 * create as many queues as needed and post and retrieve messages from them.
 *
 * Internally, the only supported message type is a string. Usually you’ll want
 * to pass something else, like a JavaScript object.
 *
 * The Messaging class automatically serializes messages to and from JSON
 * when you call {@link Messaging#send} and {@link Messaging#receive}, allowing
 * you to pass a JavaScript object, array, number, or string as a message.
 *
 * If you’re dealing with non-JSON messages for some reason, use the
 * {@link Messaging#sendString} and {@link Messaging#receiveString} methods,
 * which deal in plain strings. It’s then up to you to ensure they are
 * serialized or de-serialized.
 *
 * @constructor
 * Constructor.
 * @param {AuthToken} authToken a valid AuthToken object
 */
function Messaging(authToken) {
  this.authToken = authToken;
}

/**
 * Get a list of message queues for the current tenant.
 * @param {Function} callback `callback(err, queuesArray)`
 * @param {Mixed} callback.err
 * @param {String[]} callback.queuesArray example response:
 *
 *     [ "some-queue-name", "another-queue-name" ]
 */
Messaging.prototype.listQueues = function(callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/queues';
    transport.GET(uri, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      var result = body.queues.map(function(q) { return q.name; });
      callback(null, result);
    });
  });
};

/**
 * Create a message queue.
 * @param {String} qname the queue name
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Messaging.prototype.createQueue = function(qname, callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/queues/' + encodeURIComponent(qname);
    transport.PUT(uri, authToken, function(err) {
      if (err) { return callback(err); }
      callback(null);
    });
  });
};

/**
 * Delete a message queue and all messages in it.
 *
 * <span style="color:red;">**Danger:** This method permanently deletes
 * data.</span>
 * @param {String} qname the queue name
 * @param {Function} callback `callback(err)`
 * @param {Mixed} callback.err
 */
Messaging.prototype.deleteQueue = function(qname, callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/queues/' + encodeURIComponent(qname);
    transport.DELETE(uri, authToken, function(err) {
      if (err) { return callback(err); }
      callback(null);
    });
  });
};

/**
 * Send an unserialized message to the named message queue. To send serialized
 * messages, use {@link Messaging#send}.
 * @param {String} qname the queue name
 * @param {String} data must be a string
 * @param {Function} callback `callback(err, messageId)`
 * @param {Mixed} callback.err
 * @param {String} callback.messageId the internal ID that was assigned to the
 *     message
 */
Messaging.prototype.sendString = function(qname, data, callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var json = { body: data };
    var options = { json: json };

    var uri = endpoint + '/queues/' + encodeURIComponent(qname) + '/messages';
    transport.POST(uri, authToken, options, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body.id);
    });
  });
};

/**
 * Receive an unserialized message from the named message queue, if a message is
 * available. To receive JSON-serialized messages, use
 * {@link Messaging#receive}.
 * @param {String} qname the queue name
 * @param {Function} callback `callback(err, messageStruct)`
 * @param {Mixed} callback.err
 * @param {Object | null} callback.messageStruct receives `null` if no mesasge
 *     is available. Example response:
 *
 *     {
 *       "id": "12345678",
 *       "body": "Hello World!"
 *     }
 */
Messaging.prototype.receiveString = function(qname, callback) {
  var authToken = this.authToken;
  authToken.getServiceEndpoint(SERVICE_TYPE, SERVICE_VERSION,
    function(err, endpoint)
  {
    if (err) { return callback(err); }
    if (!endpoint) { return callback(new NotProvisioned(SERVICE_TYPE)); }

    var uri = endpoint + '/queues/' + encodeURIComponent(qname) + '/messages';
    transport.GET(uri, authToken, function(err, response, body) {
      if (err) { return callback(err); }
      callback(null, body);
    });
  });
};

/**
 * Send a message to the named message queue. The data will be serialized as
 * JSON.
 * @param {String} qname the queue name
 * @param {Mixed} data any serializable JavaScript data type
 * @param {Function} callback `callback(err, messageId)`
 * @param {Mixed} callback.err
 * @param {String} callback.messageId the internal ID that was assigned to the
 *     message
 */
Messaging.prototype.send = function(qname, data, callback) {
  this.sendString(qname, JSON.stringify(data), callback);
};

/**
 * Receive a message from the named message queue, if a message is available.
 * The message `body` is automatically parsed as JSON.
 * @param {String} qname the queue name
 * @param {Function} callback `callback(err, messageStruct)`
 * @param {Mixed} callback.err
 * @param {Object | null} callback.messageStruct receives `null` if no mesasge
 *     is available. Example response:
 *
 *     {
 *       "id": "12345678",
 *       "body": { "location": "Palo Alto", "temperature": 22, "units": "C" }
 *     }
 */
Messaging.prototype.receive = function(qname, callback) {
  this.receiveString(qname, function(err, result) {
    if (err) { return callback(err); }
    if (result && result.body) {
      try {
        result.body = JSON.parse(result.body);
      } catch (err) {
        var e = new ServiceError('invalid JSON message body');
        e.body = result.body;
        e.outerError = err;
        return callback(e);
      }
    }
    callback(null, result);
  });
};

module.exports = Messaging;

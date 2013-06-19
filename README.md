# Hew

Unofficial Node interface to [HP Cloud](https://www.hpcloud.com/). (The official interface is [here](http://hpcloud.github.io/hpcloud-js/).)

## Status

Currently Hew supports a subset of the [HP Cloud API](http://docs.hpcloud.com/api/):

* ✔ Authentication Tokens — *complete*
* ✔ Messaging — *complete*
* Identity — in progress
* DNS — in progress

See `api.md`.

## Install

    npm install hew

## Example usage

For clarity, examples use the popular [`async`](https://npmjs.org/package/async) module. `Hew` works just as well without it, or with an alternative async utility.

```js
var Hew = require('hew')
  , async = require('async')
  ;
  
// things you need to set
var yourRegion = Hew.DEFAULT_REGION;
var yourAccessKey = '…';
var yourSecretKey = '…';
var yourTenantName = '…';
var qname = 'my-test-message-queue';

// obtain an authentication token
var token = new Hew.AuthToken(yourRegion, yourAccessKey, yourSecretKey,
  yourTenantName);

// create a Messaging controller
var messaging = new Hew.Messaging(token);

async.series([
  // create the test queue
  function(cb) { messaging.createQueue(qname, cb); },

  // post a message to the queue
  function(cb) {
    var message = {
      temperature: 22,
      scale: 'Celsius',
      weather: 'sunny'
    };
    messaging.send(qname, message, cb);
  },

  // retrieve a message from the queue
  function(cb) {
    messaging.receive(qname, function(err, message) {
      if (err) { return cb(err); }
      console.log(message);
      cb();
    });
  },

  // delete the test queue
  function(cb) { messaging.deleteQueue(qname, cb); }
],
function(err) {
  if (err) { console.error('error:', err); }
  else { console.log('done'); }
});

```

## Unit tests

**Warning:** Do not run unit tests against your production HP Cloud account. Create an additional account for testing. Testing will create, update and delete resources in your HP Cloud account. While the tests try to avoid affecting “real” data, and they do clean up after themselves, there is no guarantee that everything will work properly.

1. Check out the Hew git repo.
1. Create `tests/config.json` (an example is provided).
1. Add the following key to `tests/config.json`:
  * `"i-created-this-account-for-testing-only": true`
1. From the the top of the repo, run `npm test`.

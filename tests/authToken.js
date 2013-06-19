// Unit tests. Run with mocha.

/*global describe:true it:true */


var should = require('should')
  , Hew = require('../index')
  ;

try {
  var config = require('./config.json');
  if (config['i-created-this-account-for-testing-only'] !== true) {
    console.error('Do not run tests against a live account. Please see the ' +
      'README.md file');
    process.exit(1);
  }
} catch (e) {
  console.error('Please add a config.json file to the tests directory.');
  process.exit(1);
}

describe('AuthToken', function() {
  describe('authentication', function() {

    it('should authenticate (master account)', function(done) {
      var token = new Hew.AuthToken(null, config.apiKey, config.secretKey);
      token.getTokenId(function(err, result) {
        should.not.exist(err);
        should.exist(result);
        done();
      });
    });

    it('should authenticate (tenant)', function(done) {
      var token = new Hew.AuthToken(null, config.apiKey, config.secretKey,
        config.tenantName);
      token.getTokenId(function(err, result) {
        should.not.exist(err);
        should.exist(result);
        done();
      });
    });

    it('should fail to authenticate with a bad password', function(done) {
      var token = new Hew.AuthToken(null, config.apiKey,
        'X' + config.secretKey);
      token.getTokenId(function(err, result) {
        should.exist(err);
        should.not.exist(result);
        err.should.be.an.instanceOf(Hew.Error);
        done();
      });
    });

    it ('should get an endpoint for the "identity" service', function(done) {
      var token = new Hew.AuthToken(null, config.apiKey, config.secretKey);
      token.getServiceEndpoint('identity', '2.0', function(err, result) {
        should.not.exist(err);
        result.slice(0, 6).should.equal('https:');
        done();
      });
    });

    it ('should not get an endpoint for the "foo" service', function(done) {
      var token = new Hew.AuthToken(null, config.apiKey, config.secretKey);
      token.getServiceEndpoint('foo', '1.0', function(err, result) {
        should.not.exist(err);
        should.not.exist(result);
        done();
      });
    });
  });

  it('should return the same token ID on second call', function(done) {
    var token = new Hew.AuthToken(null, config.apiKey, config.secretKey);
    token.getTokenId(function(err, result1) {
      should.not.exist(err);
      should.exist(result1);
      token.getTokenId(function(err, result2) {
        should.not.exist(err);
        result1.should.equal(result2);
        done();
      });
    });
  });
});

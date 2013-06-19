// Unit tests. Run with mocha.

/*global describe:true it:true before:true after:true */


var should = require('should')
  , Hew = require('../index')
  , crypto = require('crypto')
  ;

try {
  var config = require('./config.json');
  if (!config['i-created-this-account-for-testing-only'] === true) {
    console.error('Do not run tests against a live account. Please see the ' +
      'README.md file');
    process.exit(1);
  }
} catch (e) {
  console.error('Please add a config.json file to the tests directory.');
  process.exit(1);
}

function randomName() {
  var shasum = crypto.createHash('sha1');
  shasum.update(crypto.randomBytes(512));
  return shasum.digest('hex').slice(0, 10);
}

describe('DNS', function() {
  // DNS functions can take a while to complete
  this.timeout(10000);

  var token = new Hew.AuthToken(null, config.apiKey, config.secretKey,
    config.tenantName);
  var dns = new Hew.DNS(token);
  var dname = 'test-' + randomName() + '.com.';

  before(function(done) {
    dns.createDomain(dname, 'administrator@company.com', done);
  });

  after(function(done) {
    dns.deleteDomain(dname, done);
  });

  describe('listDomains', function() {

    it('should get a list of domains', function(done) {
      dns.listDomains(function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.not.be.empty;
        done();
      });
    });
  });

  describe('getDomain', function() {
    it('should get one domain', function(done) {
      dns.getDomain(dname, function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.name.should.equal(dname);
        done();
      });
    });

  });

  describe('updateDomain', function() {
    it('should update TTL for a domain', function(done) {
      var newTtl = 400;
      dns.updateDomain(dname, 'administrator@company.com', newTtl,
        function(err, result)
      {
        should.not.exist(err);
        should.exist(result);
        result.name.should.equal(dname);
        result.ttl.should.equal(newTtl);
        done();
      });
    });
  });

  describe('getServers', function() {
    it('should get servers for a domain', function(done) {
      dns.getServers(dname, function(err, result)
      {
        should.not.exist(err);
        should.exist(result);
        result.should.not.be.empty;
        done();
      });
    });
  });
});

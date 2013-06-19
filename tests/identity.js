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

describe('Identity', function() {
  var token = new Hew.AuthToken(null, config.apiKey, config.secretKey);

  describe('listTenants', function() {

    it('should get a list of tenants', function(done) {
      var id = new Hew.Identity(token);
      id.listTenants(function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.not.be.empty;
        done();
      });
    });

  });
});

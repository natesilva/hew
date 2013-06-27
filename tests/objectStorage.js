// Unit tests. Run with mocha.

/*global describe:true it:true before:true*/


var should = require('should')
  , Hew = require('../index')
  , crypto = require('crypto')
  , fs = require('fs')
  , Stream = require('stream')
  , path = require('path')
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

function randomName() {
  var shasum = crypto.createHash('sha1');
  shasum.update(crypto.randomBytes(512));
  return shasum.digest('hex').slice(0, 10);
}

describe('Object Storage', function() {
  // file transfer functions can take a while to complete
  this.timeout(20000);

  var token = new Hew.AuthToken(null, config.apiKey, config.secretKey,
    config.tenantName);
  var os = new Hew.ObjectStorage(token);
  var cname = 'test-' + randomName();
  var container = null;

  before(function(done) {
    os.createContainer(cname, function(err, cont) {
      if (err) { return done(err); }
      container = cont;
      done();
    });
  });

  after(function(done) {
    os.deleteContainerAndAllContents(cname, done);
  });

  describe('listContainers', function() {

    it('should get a list of containers', function(done) {
      os.listContainers(function(err, result) {
        should.not.exist(err);
        should.exist(result);
        result.should.not.be.empty;
        var names = result.map(function(r) {
          return r.name;
        });
        names.should.include(cname);
        done();
      });
    });

  });

  describe('meta values', function() {

    it('should set and delete an account-level metadata value', function(done) {
      os.setMetaValue('Test-Account-Data', 'testvalue', function(err) {
        should.not.exist(err);
        os.getMetaValue('Test-Account-Data', function(err, value) {
          should.not.exist(err);
          should.exist(value);
          value.should.equal('testvalue');

          os.deleteMetaValue('X-Account-Meta-Test-Account-Data', function(err) {
            should.not.exist(err);
            os.getMetaValue('Test-Account-Data', function(err, value) {
              should.not.exist(err);
              should.not.exist(value);
              done();
            });
          });
        });
      });
    });

    it('should set and delete a container-level metadata value', function(done)
    {
      container.setMetaValue('Test-Container-Data', 'testvalue', function(err) {
        should.not.exist(err);
        container.getMetaValue('Test-Container-Data', function(err, value) {
          should.not.exist(err);
          should.exist(value);
          value.should.equal('testvalue');

          container.deleteMetaValue('X-Container-Meta-Test-Container-Data',
            function(err)
          {
            should.not.exist(err);
            container.getMetaValue('Test-Container-Data', function(err, value) {
              should.not.exist(err);
              should.not.exist(value);
              done();
            });
          });
        });
      });
    });

  });


  describe('container', function() {

    it('should get the test container', function(done) {
      os.getContainer(cname, function(err, cont) {
        should.not.exist(err);
        should.exist(cont);
        cont.should.be.an.instanceOf(Hew.Container);
        done();
      });
    });

    it('should upload and download a file as a Buffer', function(done)
    {
      var contents = fs.readFileSync(path.join(__dirname, 'objectStorage.js'));
      contents.should.be.an.instanceOf(Buffer);
      container.put('objectStorage.js', contents, 'application/javascript',
        function(err)
      {
        should.not.exist(err);
        container.get('objectStorage.js', function(err, headers, buff) {
          should.not.exist(err);
          should.exist(headers);
          should.exist(buff);
          headers.should.be.an.instanceOf(Object);
          buff.should.be.an.instanceOf(Buffer);
          headers.should.include({'content-type': 'application/javascript'});
          headers.should.include(
            {'content-length': contents.length.toString()});

          // downloaded file contents must be identical to uploaded
          var hash1 = crypto.createHash('sha1');
          hash1.update(buff);

          var hash2 = crypto.createHash('sha1');
          hash2.update(contents);

          hash1.digest('hex').should.equal(hash2.digest('hex'));

          done();
        });
      });
    });

    it('should upload and download a file as a Stream', function(done)
    {
      var contents = fs.createReadStream(path.join(__dirname, 'dns.js'));
      contents.should.be.an.instanceOf(Stream);
      container.putStream('dns.js', contents,
        'application/javascript', function(err)
      {
        should.not.exist(err);
        container.getStream('dns.js', function(err, str) {
          should.not.exist(err);
          should.exist(str);
          str.should.be.an.instanceOf(Stream);

          // downloaded file contents must be identical to uploaded
          var hash1 = crypto.createHash('sha1');

          str.on('error', done);
          str.on('data', function(chunk) { hash1.update(chunk); });
          str.on('end', function() {
            var hash2 = crypto.createHash('sha1');
            var contents = fs.createReadStream(path.join(__dirname, 'dns.js'));

            contents.on('error', done);
            contents.on('data', function(chunk) { hash2.update(chunk); });
            contents.on('end', function() {
              hash1.digest('hex').should.equal(hash2.digest('hex'));
              done();
            });
          });
        });
      });
    });

  });
});

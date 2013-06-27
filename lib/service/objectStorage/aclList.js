// Helper for dealing with container ACLs

// Constructor
function AclList(headerValue) {
  this.acls = {};
  this.parse(headerValue || '');
}

AclList.prototype.parse = function(headerValue) {
  var that = this;
  this.acls = {};

  var acls = headerValue.split(',');

  // convert to map
  acls.forEach(function(acl) {
    if (acl) {
      var parts = acl.split(':');
      if (parts.length === 2) {
        var rights = parts[0];
        var user = parts[1];
        that.acls[user] = rights;
      } else {
        that.acls[parts[0]] = '';
      }
    }
  });
};

AclList.prototype.setUserRights = function(user, rights) {
  rights = rights || '*';
  this.acls[user] = rights;
};

AclList.prototype.deleteUser = function(user) {
  if (user in this.acls) { delete this.acls[user]; }
};

AclList.prototype.allowWorldListing = function() {
  this.acls['.rlistings'] = '';
};

AclList.prototype.denyWorldListing = function() {
  if ('.rlistings' in this.acls) { delete this.acls['.rlistings']; }
};

AclList.prototype.toHeaderString = function() {
  var that = this;
  var resultArray = Object.keys(this.acls).map(function(user) {
    var rights = that.acls[user];
    if (rights) { return rights + ':' + user; }
    else { return user; }
  });
  return resultArray.join(',');
};


module.exports = AclList;
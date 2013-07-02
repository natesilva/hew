/**
 * @class ObjectStorage.Permissions
 * # Container permissions for HP Cloud Object Storage
 *
 * Obtain a container's current permissions by calling the container's
 * {@link ObjectStorage.Container#getPermissions getPermissions} method, which
 * will return a {@link ObjectStorage.Permissions Permissions} object.
 *
 * Set permissions by calling the container's
 * {@link ObjectStorage.Container#setPermissions setPermissions} method, passing
 * a {@link ObjectStorage.Permissions Permissions} object that represents the
 * ACLs you want to set.
 *
 * ACLs are those found in the HP Cloud API
 * [documentation](http://docs.hpcloud.com/api/object-storage/#general_acls-jumplink-span)
 * and are generally a subset of those permitted by
 * OpenStack Swift. In addition, HP Cloud supports cross-tenant ACLs.
 *
 * @constructor
 * Constructor. Optionally, initialize with the current state of a container's
 * permissions by passing `xContainerRead` and `xContainerWrite` arguments.
 * @param {String} [xContainerRead] the current value of the `X-Container-Read`
 *     header for the container
 * @param {String} [xContainerWrite] the current value of the
 *     `X-Container-Write` header for the container
 */
function Permissions(xContainerRead, xContainerWrite) {
  xContainerRead = xContainerRead || '';
  xContainerWrite = xContainerWrite || '';

  var readSettings = Permissions._parse(xContainerRead);
  var writeSettings = Permissions._parse(xContainerWrite);

  this.read = readSettings.users;
  this.write = writeSettings.users;
  this.worldListable = readSettings.worldListable;
}

/**
 * Parse an `X-Container-Read` or `X-Container-Write` header value.
 * @ignore
 */
Permissions._parse = function(headerValue) {
  var worldListable = false;
  var users = [];
  var acls = headerValue.split(',');
  acls.forEach(function(acl) {
    var parts = acl.split(':');
    if (parts.length === 2) {
      var user = parts[1];
      users.push(user);
    } else {
      if (parts[0] === '.rlistings') { worldListable = true; }
    }
  });
  return {users: users, worldListable: worldListable};
};

/**
 * Get the value that should be assigned to the `X-Container-Read` header to
 * enforce the currently-assigned ACLs for reading objects in this container.
 * @returns {String} the value that you should assign to the `X-Container-Read`
 *     header
 */
Permissions.prototype.getContainerReadHeader = function() {
  var resultArray = this.read.map(function(user) {
    if (user === '*') {
      return '.r:*';
    } else {
      return '*:' + user;
    }
  });

  if (this.worldListable) {
    resultArray.push('.rlistings');
  }

  return resultArray.join(',');
};

/**
 * Get the value that should be assigned to the `X-Container-Write` header to
 * enforce the currently-assigned ACLs for writing to objects in this container.
 * @returns {String} the value that you should assign to the `X-Container-Write`
 *     header
 */
Permissions.prototype.getContainerWriteHeader = function() {
  var resultArray = this.write.map(function(user) {
    if (user === '*') {
      return '.r:*';
    } else {
      return '*:' + user;
    }
  });
  return resultArray.join(',');
};

/**
 * Grant read access to the named user.
 * @param {String} user the user
 * @chainable
 */
Permissions.prototype.grantRead = function(user) {
  if (this.read.indexOf(user) === -1) { this.read.push(user); }
  return this;
};

/**
 * Revoke read access for the named user.
 * @param {String} user the user
 * @chainable
 */
Permissions.prototype.revokeRead = function(user) {
  var index = this.read.indexOf(user);
  if (index !== -1) { this.read.splice(index, 1); }
  return this;
};

/**
 * Grant write access to the named user.
 * @param {String} user the user
 * @chainable
 */
Permissions.prototype.grantWrite = function(user) {
  if (this.write.indexOf(user) === -1) { this.write.push(user); }
  return this;
};

/**
 * Revoke write access for the named user.
 * @param {String} user the user
 * @chainable
 */
Permissions.prototype.revokeWrite = function(user) {
  var index = this.write.indexOf(user);
  if (index !== -1) { this.write.splice(index, 1); }
  return this;
};

/**
 * Grant read access to the world.
 * @chainable
 */
Permissions.prototype.grantPublicRead = function() {
  this.grantRead('*');
  return this;
};

/**
 * Revoke world read access.
 * @chainable
 */
Permissions.prototype.revokePublicRead = function() {
  this.revokeRead('*');
  return this;
};

/**
 * Grant write access to the world.
 * @chainable
 */
Permissions.prototype.grantPublicWrite = function() {
  this.grantWrite('*');
  return this;
};

/**
 * Revoke world write access.
 * @chainable
 */
Permissions.prototype.revokePublicWrite = function() {
  this.revokeWrite('*');
  return this;
};

/**
 * Grant world listing access.
 * @chainable
 */
Permissions.prototype.grantWorldListing = function() {
  this.worldListable = true;
  return this;
};

/**
 * Revoke world listing access.
 * @chainable
 */
Permissions.prototype.revokeWorldListing = function() {
  this.worldListable = false;
  return this;
};

/**
 * Clear ALL read ACLs.
 * @chainable
 */
Permissions.prototype.clearReadPermissions = function() {
  this.read = [];
  return this;
};

/**
 * Clear ALL write ACLs.
 * @chainable
 */
Permissions.prototype.clearWritePermissions = function() {
  this.write = [];
  return this;
};

module.exports = Permissions;

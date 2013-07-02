# Release Notes

## Release 0.0.7

2013-07-02

### Breaking Changes

The API is still being developed. When `0.1.0` is released, no further breaking changes will occur until the next major version.

In the meantime, most of the following deprecated methods still work, and will continue to work until `0.1.0`. If you are using any of them, please update your code now to prepare.

* All `Container`-level methods for manipulating objects (files) have been **deprecated**. Although the old methods still work, they will be removed from a future release.
    * Object manipulations are now done using `ObjectStorage.StoredObject`.
    * **Impact:** Change all code that uses methods like `Container.get()`, `Container.put()` or `Container.setObjectHeader()` to use the equivalent method in `ObjectStorage.StoredObject`.
    * Example: If you used `Container.get()`, now you would call `Container.getObject()`, which returns a `StoredObject`. Then you would call the `StoredObject`’s `get()` method.
* The `Container` permissions-manipulation methods have been **deprecated** and replaced by `Container.getPermissions` and `Container.setPermissions`. Although the old methods still work, they will be removed from a future release.
    * **Impact:** Change all code that uses methods like `Container.grantReadToUser` or `Container.grantReadToWorld` to use the new permissions system. While there were a wide range of very specific permissions functions before, they have all been replaced by `Container.getPermissions` and `Container.setPermissions`.
    * The ACLs themselves are expressed using methods on the `ObjectStorage.Permissions` class.
    * For convenience, the `Container.makePublic` and `Container.makePrivate` methods have not been deprecated and will be maintained.
* The `Container` class is now `ObjectStorage.Container`.
    * **Impact:** This should not break existing code unless you were doing something like `c instanceof Hew.Container`,  in which case you must change `Hew.Container` to `Hew.ObjectStorage.Container`.


### Fixes

* User-set `Content-Type` headers are no longer overridden.
* If you attempt to delete a non-existent stored object (for example, an item that has already been removed by scheduled deletion, but is still showing up in listings), no error is returned.

### Enhancements

* You can now specify an HTTP proxy to the `AuthToken` constructor.
* More useful error messages on transport failures.
* In object storage, object (file) headers and metadata can now be set.
* Objects can be set to “self destruct” using scheduled deletion.

## Release 0.0.6

2013-06-28


### Fixes

* On a connection error, pass the error up the callback chain instead of throwing it.
* Don’t throw on JSON parse errors.
* The Container `delete()` method is renamed to `deleteObject()` because `delete` is a JavaScript reserved word. For backward compatibility The `delete` method remains as an alias of `deleteObject`.

### Enhancements

* New Container method `getTempUrl()` to retrieve a temporary URL for an object that expires after a pre-determined length of time.
* Add Accept headers to all REST requests.

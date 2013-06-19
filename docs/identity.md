# Hew Documentation: Identity

## Status

… Partial: Missing methods for managing user access keys.

## Constructor

#### Identity(token)

Create an Identity controller object.

**Parameters:**

* **`token`**
  - A previously-created [`AuthToken`](authtoken.md).

## Methods

#### listTenants(callback)

Retrieve a list of tenants for the current authenticated user.

**Parameters:**

* **`callback`**
  - `function(err, tenantArray)`
  - Each element in the `tenantArray` will be metadata representing one tenant.

**Example Response:**

```json
[
    {
      "id": "39595655514446",
      "name": "Banking Tenant Services",
      "description": "Banking Tenant Services for TimeWarner",
      "enabled": true,
      "created": "2011-11-29T16:59:52.635Z",
      "updated": "2011-11-29T16:59:52.635Z"
    }
]
```

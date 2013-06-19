# Hew Documentation: AuthToken

## Constructor

### **`AuthToken(region, accessKey, secretKey, [tenant])`**

Create an authentication token. The actual authentication does not happen immediately (“lazy auth”), but will happen as-needed when other methods are called or when the current token expires.

**Parameters:**

* **`region`**
  - If `null`, defaults to `region-a.geo-1`.
* **`accessKey`**
* **`secretKey`**
* **`tenant`**
  - Also known as “project” in some parts of the HP Cloud interface.
  - Can be specified either as the tenant name or as the tenant numeric ID.


## Methods

### **`getTokenId(callback)`**

Primarily for internal use by other classes. Retrieves the current auth token ID, which can be passed as the `X-Auth-Token` header for authenticated requests.

**Parameters:**

* **`callback`**
  - `function(err, tokenId)`

### **`getServiceEndpoint(serviceType, versionId, callback)`**

Primarily for internal use by other classes. Retrieve the given service endpoint for the current region. The `callback` receives `null` if no matching endpoint is found.

**Parameters:**

* **`serviceType`**
  - The internal service identifier, such as `identity` or `hpext:dns`.
* **`versionId`**
  - The API version to retrieve, such as `1.1`.
* **`callback`**
  - `function(err, endpointPublicURL)`
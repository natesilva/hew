# Hew Documentation: AuthToken

## Status

✔ Complete: All planned methods for this class are implemented and have unit tests.

## Constructor

#### Messaging(token)

Create a Messaging controller object.

**Parameters:**

* **`token`**
  - A previously-created [`AuthToken`](authtoken.md).

## Methods

#### listQueues(callback)

List the available message queues.

**Parameters:**

* **`callback`**
  - `function(err, queuesArray)`
  - Each element in the `queuesArray` will be metadata representing one queue.

**Example Response:**

```json
[
     {
       "name":"foo",
     },
     {
       "name":"bar",
     }
]
```

#### createQueue(qname, callback)

Create a message queue.

**Parameters:**

* **`qname`**
* **`callback`**
  - `function(err)`

#### deleteQueue(qname, callback)

:fire: Destructive operation

Delete a message queue and all messages contained within it.

**Parameters:**

* **`qname`**
* **`callback`**
  - `function(err)`

#### send(qname, body, callback)

Post a JSON message to the named queue.

**Parameters:**

* **`qname`**
* **`body`**
  - Any data that can be serialized to JSON.
  - To do your own serialization, see `sendString`.
* **`callback`**
  - function(err, response)
  - The response contains metadata about the posted message, including its `id`.

#### receive(qname, callback)

Receive a JSON message from the named queue.

**Parameters:**

* **`qname`**
* **`callback`**
  - `function(err, data)`
  - If no message is available, `data` will be null.
  - If a message was received, `data` will be a JavaScript object containing the message `id` and `body`. The `body` is the message payload.
  - The body will be parsed as JSON and passed to the callback as a native JavaScript value, array or object.
  - `receive` will fail if non-valid-JSON data is received. See `receiveString` if you want to do your own serialization.

**Example Response:**

```json
{
  "id": "12345678",
  "body": "Hello World!"
}
```

#### sendString(qname, body, callback)

Post a `string` message to the named queue. To pass anything other than a string, you need to serialize the data yourself (e.g., using JSON or XML).

In most cases, use the `send` method instead, which auto-serializes using JSON.

* **`qname`**
* **`body`**
  - must be a string
* **`callback`**
  - `function(err, response)`
  - The response contains metadata about the posted message, including its `id`.

#### receiveString(qname, callback)

Receive a `string` message from the named queue. Internally, HP Cloud Messaging treats all messages as strings. If the message was serialized somehow, you will need to de-serialize it.

In most cases, use the `receive` method instead, which auto-parses the message as JSON.

* **`qname`**
* **`callback`**
  - `function(err, data)`
  - If no message is available, `data` will be null.
  - If a message was received, `data` will be a JavaScript object containing the message `id` and `body`. The `body` is the message payload, which will be a string.

# Hew Documentation

## 10-Second Overview

Use `AuthToken` to create an authentication token:

    var token = new AuthToken(…);

Then create instances of other classes (like `Messaging` or `DNS`), passing the `AuthToken` to the constructor:

    var messaging = new Messaging(token);

Then call methods of the class. Everything is asynchronous. As is typical for Node.js, most methods take a callback:

    messaging.createQueue(queueName, yourCallback);

## Classes

* [**AuthToken**](authtoken.md): Used to authenticate with your HP Cloud account
* [**Identity**](identity.md): Manage tenants (projects), users and access keys in your HP Cloud account
* [**DNS**](dns.md): Globally-distributed DNS
* [**Messaging**](messaging.md): HP Cloud’s message queue service

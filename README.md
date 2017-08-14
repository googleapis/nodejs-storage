## Google Cloud Storage: Node.js Client

Google Cloud Storage allows world-wide storage and retrieval of any amount
of data at any time. You can use Google Cloud Storage for a range of scenarios,
including serving website content, storing data for archival and disaster
recovery, or distributing large data objects to users via direct download.

- [Node.js API Reference][node-storage-docs]
- [Google Cloud Storage Documentation][cloud-storage-docs]


## Installation

```sh
$ npm install --save @google-cloud/storage
```

## Quick Start

### Instantiate a client

```js
var gcs = require('@google-cloud/storage')({
  projectId: 'grape-spaceship-123',
  keyFilename: '/path/to/keyfile.json'
});
```

### Managing Buckets

```js
// Create a new bucket.
gcs.createBucket('my-new-bucket').then(data => {
  var bucket = data[0];
  // "my-new-bucket" was successfully created.
});

// Reference an existing bucket.
var bucket = gcs.bucket('my-existing-bucket');
```

### Upload a file

```js
bucket.upload('/photos/zoo/zebra.jpg').then(data => {
  var file = data[0];
  // "zebra.jpg" is now in your bucket.
});
```

### Download a file

```js
bucket.file('giraffe.jpg').download({
  destination: '/photos/zoo/giraffe.jpg'
}).then(() => {
  // Do something with the file.
});
```

### Use streams to upload or download files

```js
var fs = require('fs');

// Download a file.
var remoteReadStream = bucket.file('giraffe.jpg').createReadStream();
var localWriteStream = fs.createWriteStream('/photos/zoo/giraffe.jpg');
remoteReadStream.pipe(localWriteStream);

// Upload a file.
var localReadStream = fs.createReadStream('/photos/zoo/zebra.jpg');
var remoteWriteStream = bucket.file('zebra.jpg').createWriteStream();
localReadStream.pipe(remoteWriteStream);
```

### Use your own Promise library

```js
var gcs = require('@google-cloud/storage')({
  promise: require('bluebird'),
});
```

### Use callbacks instead of Promises

```js
// If you provide a callback, then the library will use this style in
// lieu of promises.
bucket.upload('/photos/zoo/zebra.jpg', (err, data) => {
  if (!err) {
    let file = data[0];    
  }
});
```

## Authentication

It's incredibly easy to get authenticated and start using Google's APIs. You
can set your credentials on a global basis as well as on a per-API basis. See
each individual API section below to see how you can auth on a per-API-basis.
This is useful if you want to use different accounts for different Cloud
services.

### On Google Cloud Platform

If you are running this client on Google Cloud Platform, we handle
authentication for you with no configuration. You just need to make sure that
when you [set up the GCE instance][gce-how-to], you add the correct scopes for
the APIs you want to access.

``` js
var gcs = require('@google-cloud/storage')();
// ...you're good to go!
```

### Elsewhere

If you are not running this client on Google Cloud Platform, you need a
Google Developers service account. To create a service account:

1. Visit the [Google Developers Console][dev-console].
2. Create a new project or click on an existing project.
3. Navigate to  **APIs & auth** > **APIs section** and turn on the following
   APIs (you may need to enable billing in order to use these services):
    * Google Cloud Storage
    * Google Cloud Storage JSON API
4. Navigate to **APIs & auth** >  **Credentials** and then:
    * If you want to use a new service account key, click on
      **Create credentials** and select **Service account key**. After the
      account key is created, you will be prompted to download the JSON key
      file that the library uses to authenticate your requests.
    * If you want to generate a new service account key for an existing
      service account, click on **Generate new JSON key** and download the
      JSON key file.

``` js
var projectId = process.env.GCLOUD_PROJECT; // e.g. 'grape-spaceship-123'

var gcs = require('@google-cloud/storage')({
  projectId: projectId,

  // The path to your key file:
  keyFilename: '/path/to/keyfile.json',

  // Or the contents of the key file:
  credentials: require('./path/to/keyfile.json'),
});

// ...you're good to go!
```


[google-cloud]: https://github.com/GoogleCloudPlatform/google-cloud-node/
[gce-how-to]: https://cloud.google.com/compute/docs/authentication#using
[dev-console]: https://console.developers.google.com/project
[node-storage-docs]: https://googlecloudplatform.github.io/google-cloud-node/#/docs/storage
[cloud-storage-docs]: https://cloud.google.com/storage/docs/overview

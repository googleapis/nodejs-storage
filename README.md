<img src="https://avatars2.githubusercontent.com/u/2810941?v=3&s=96" alt="Google Cloud Platform logo" title="Google Cloud Platform" align="right" height="96" width="96"/>

# Google Cloud Storage: Node.js Client

[![Release quality](https://img.shields.io/badge/Release%20quality-General%20Availability%20%28GA%29-brightgreen.svg?style&#x3D;flat)](https://cloud.google.com/terms/launch-stages)
[![CircleCI](https://img.shields.io/circleci/project/github/GoogleCloudPlatform/google-cloud-node-storage.svg?style=flat)](https://circleci.com/gh/GoogleCloudPlatform/google-cloud-node-storage)
[![codecov](https://img.shields.io/codecov/c/github/GoogleCloudPlatform/google-cloud-node-storage/repo-migration.svg?style=flat)](https://codecov.io/gh/GoogleCloudPlatform/google-cloud-node-storage)

> Node.js idiomatic client for [Cloud Storage][product-docs].

[Cloud Storage](https://cloud.google.com/storage/docs) allows world-wide storage and retrieval of any amount of data at any time. You can use Google Cloud Storage for a range of scenarios including serving website content, storing data for archival and disaster recovery, or distributing large data objects to users via direct download.

* [Cloud Storage Node.js Client API Reference][client-docs]
* [Cloud Storage Documentation][product-docs]

Read more about the client libraries for Cloud APIs, including the older
Google APIs Client Libraries, in [Client Libraries Explained][explained].

[explained]: https://cloud.google.com/apis/docs/client-libraries-explained

**Table of contents:**

* [QuickStart](#quickstart)
  * [Before you begin](#before-you-begin)
  * [Installing the client library](#installing-the-client-library)
  * [Using the client library](#using-the-client-library)
* [Samples](#samples)
  * [ACL (Access Control Lists)](#acl-access-control-lists)
  * [Buckets](#buckets)
  * [Encryption](#encryption)
  * [Files](#files)
* [Versioning](#versioning)
* [Contributing](#contributing)
* [License](#license)

## Quickstart

### Before you begin

1.  Select or create a Cloud Platform project.

    [Go to the projects page][projects]

1.  Enable billing for your project.

    [Enable billing][billing]

1.  Enable the Google Cloud Storage API.

    [Enable the API][enable_api]

1.  [Set up authentication with a service account][auth] so you can access the
    API from your local workstation.

[projects]: https://console.cloud.google.com/project
[billing]: https://support.google.com/cloud/answer/6293499#enable-billing
[enable_api]: https://console.cloud.google.com/flows/enableapi?apiid=storage-api.googleapis.com
[auth]: https://cloud.google.com/docs/authentication/getting-started

### Installing the client library

    npm install --save @google-cloud/storage

### Using the client library

```js
// Imports the Google Cloud client library
const Storage = require('@google-cloud/storage');

// Your Google Cloud Platform project ID
const projectId = 'YOUR_PROJECT_ID';

// Instantiates a client
const storage = Storage({
  projectId: projectId
});

// The name for the new bucket
const bucketName = 'my-new-bucket';

// Creates the new bucket
storage.createBucket(bucketName)
  .then(() => {
    console.log(`Bucket ${bucketName} created.`);
  })
  .catch((err) => {
    console.error('ERROR:', err);
  });
```

## Samples

Samples are in the [`samples/`](https://github.com/blob/master/samples) directory. The samples' `README.md`
has instructions for running the samples.

### ACL (Access Control Lists)
View the [documentation][acl_0_docs] or the [source code][acl_0_code].

[acl_0_docs]: https://cloud.google.com/storage/docs/access-control/create-manage-lists
[acl_0_code]: https://github.com/GoogleCloudPlatform/google-cloud-node-storage/blob/master/samples/acl.js

### Buckets
View the [documentation][buckets_1_docs] or the [source code][buckets_1_code].

[buckets_1_docs]: https://cloud.google.com/storage/docs
[buckets_1_code]: https://github.com/GoogleCloudPlatform/google-cloud-node-storage/blob/master/samples/buckets.js

### Encryption
View the [documentation][encryption_2_docs] or the [source code][encryption_2_code].

[encryption_2_docs]: https://cloud.google.com/storage/docs
[encryption_2_code]: https://github.com/GoogleCloudPlatform/google-cloud-node-storage/blob/master/samples/encryption.js

### Files
View the [documentation][files_3_docs] or the [source code][files_3_code].

[files_3_docs]: https://cloud.google.com/storage/docs
[files_3_code]: https://github.com/GoogleCloudPlatform/google-cloud-node-storage/blob/master/samples/files.js

## Versioning

This library follows [Semantic Versioning](http://semver.org/).

Please note it is currently under active development. Any release versioned
`0.x.y` is subject to backwards-incompatible changes at any time.

**GA**: Libraries defined at the **General Availability (GA)** quality level are
stable. The code surface will not change in backwards-incompatible ways unless
absolutely necessary (e.g. because of critical security issues) or with an
extensive deprecation period. Issues and requests against **GA** libraries are
addressed with the highest priority.

Please note that the auto-generated portions of the **GA** libraries (the ones
in modules such as `v1` or `v2`) are considered to be of **Beta** quality, even
if the libraries that wrap them are **GA**.

**Beta**: Libraries defined at the **Beta** quality level are expected to be
mostly stable, while we work towards their release candidate. We will address
issues and requests with a higher priority.

**Alpha**: Libraries defined at the **Alpha** quality level are still a
work-in-progress and are more likely to get backwards-incompatible updates.

See also: [Google Cloud Platform Launch Stages][launch_stages]

[launch_stages]: https://cloud.google.com/terms/launch-stages

## Contributing

Contributions welcome! See the [Contributing Guide](.github/CONTRIBUTING.md).

## License

Apache Version 2.0

See [LICENSE](LICENSE)

[client-docs]: https://cloud.google.com/storage/docs/reference/nodejs/
[product-docs]: https://cloud.google.com/storage/docs

// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// sample-metadata:
//   title: Storage Make Bucket Public.
//   description: Storage Make Bucket Public.
//   usage: node makeBucketPublic.js <BUCKET_NAME>

function main(bucketName = 'my-bucket') {
  // [START storage_set_bucket_public_iam]
  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // const bucketName = 'Name of a bucket, e.g. my-bucket';

  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  async function makeBucketPublic() {
    const bucket = storage.bucket(bucketName);

    const [policy] = await bucket.iam.getPolicy();
    policy.bindings.push({
      role: 'roles/storage.objectViewer',
      members: ['allUsers'],
    });

    await bucket.iam.setPolicy(policy);

    console.log(`Bucket ${bucketName} is now publicly readable.`);
  }

  makeBucketPublic().catch(console.error);
  // [END storage_set_bucket_public_iam]
}
main(...process.argv.slice(2));

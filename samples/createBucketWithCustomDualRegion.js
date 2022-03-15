/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// sample-metadata:
//   title: Create Bucket With Custom Dual Region
//   description: Create Bucket With Storage Class and Location.
//   usage: node createBucketWithCustomDualRegion.js <BUCKET_NAME> <LOCATION1> <LOCATION2>

function main(
  bucketName = 'my-bucket',
  location1 = 'US-EAST1',
  location2 = 'US-WEST1'
) {
  // [START storage_create_bucket_custom_dual_region]
  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // The ID of your GCS bucket
  // const bucketName = 'your-unique-bucket-name';

  // The bucket's locations. Case-insensitive.
  // See this documentation for other valid locations:
  // https://cloud.google.com/storage/docs/locations
  // const location1 = 'US-EAST1';
  // const location2 = 'US-WEST1';

  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  // The bucket in the sample below will be created in the project associated with this client.
  // For more information, please see https://cloud.google.com/docs/authentication/production or https://googleapis.dev/nodejs/storage/latest/Storage.html
  const storage = new Storage();

  async function createBucketWithCustomDualRegion() {
    // For regions supporting custom dual regions see: https://cloud.google.com/storage/docs/locations
    const [bucket] = await storage.createBucket(bucketName, {
      location: [location1, location2], // can also be passed as a string, e.g. `US-EAST1+US-WEST1`
    });

    console.log(`${bucket.name} created in '${location1}+${location2}'`);
  }

  createBucketWithCustomDualRegion().catch(console.error);
  // [END storage_create_bucket_custom_dual_region]
}

process.on('unhandledRejection', err => {
  console.error(err.message);
  process.exitCode = 1;
});
main(...process.argv.slice(2));

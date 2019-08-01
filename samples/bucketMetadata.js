Skip to content

Search or jump to…

Pull requests
Issues
Marketplace
Explore

@frankyn
1,019
21
140 84 googleapis/nodejs-bigquery
 Code  Issues 13  Pull requests 1  Actions  Security  Insights
nodejs-bigquery/samples/getModel.js
@steffnay steffnay docs(samples): Adds samples (#488)
06f5981 29 days ago
49 lines (41 sloc)  1.52 KB

/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

// sample-metadata:
//   title: Storage Get Bucket Metadata.
//   description: Get bucket metadata.
//   usage: node bucketMetadata.js <BUCKET_NAME>

function main(bucketName = 'my-bucket') {
  // [START storage_get_bucket_metadata]
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  async function getBucketMetadata(bucketName) {
    // Get bucket metadata.
    /**
     * TODO(developer): Uncomment the following line before running the sample.
     */
    // const bucketName = 'Name of a bucket, e.g. my-bucket';

    // Get Bucket Metadata
    const [metadata] = await storage.bucket(bucketName).getMetadata();

    for (let [key, value] of Object.entries(metadata)) {
      console.log(`${key}: ${value}`);
    }
  }
  // [END storage_get_bucket_metadata]
  getBucketMetadata();
}

main(...process.argv.slice(1));

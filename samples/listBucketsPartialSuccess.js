/**
 * Copyright 2025 Google LLC
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

function main() {
  // [START storage_list_buckets_partial_success]
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  async function listBucketsPartialSuccess() {
    const option = {
      returnPartialSuccess: true,
      maxResults: 5,
    };
    const [buckets, nextQuery, apiResponse, unreachable] =
      await storage.getBuckets(option);

    if (apiResponse && Object.keys(apiResponse).length > 0) {
      console.log('API Response:');
      if (nextQuery && nextQuery.pageToken) {
        console.log(`Next Page Token: ${nextQuery.pageToken}`);
      }
      console.log(`Buckets Found: ${apiResponse.items.length} total.`);
      if (unreachable && unreachable.length > 0) {
        console.log(
          `Unreachable Buckets: ${apiResponse.unreachable.length} failed to retrieve.`
        );
      }
    }

    console.log('\nBuckets:');
    buckets.forEach(bucket => {
      console.log(bucket.name);
    });

    if (unreachable && unreachable.length > 0) {
      console.log('\nUnreachable Buckets:');
      unreachable.forEach(item => {
        console.log(item);
      });
    }
  }

  listBucketsPartialSuccess().catch(console.error);
  // [END storage_list_buckets_partial_success]
}

main(...process.argv.slice(2));

// Copyright 2021 Google LLC
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

const {
  IdempotencyStrategy,
} = require('@google-cloud/storage/build/src/storage');

/**
 * This application demonstrates how to perform basic operations on buckets with
 * the Google Cloud Storage API.
 *
 * For more information, see the README.md under /storage and the documentation
 * at https://cloud.google.com/storage/docs.
 */

function main() {
  // [START storage_configure_retries]
  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage({
    retryOptions: {
      autoRetry: true, //If this is false, requests will not retry and the setting of the below parameters will not have any effect.
      retryDelayMultiplier: 3, //The multiplier by which to increase the delay time between the completion of failed requests, and the initiation of the subsequent retrying request.
      totalTimeout: 500, //The total time, starting from when the initial request is sent, after which an error will be returned, regardless of the retrying attempts made meanwhile.
      maxRetryDelay: 60, //The maximum delay time between requests. When this value is reached, retryDelayMultiplier will no longer be used to increase delay time.
      maxRetries: 2, //	Maximum number of automatic retries attempted before returning the error.
      idempotencyStrategy: IdempotencyStrategy.RetryAlways, // Will respect other retry settings and attempt to retry conditionally idempotent operations.
    },
  });
  console.log(
    'Functions are customized to be retried according to the following parameters:'
  );
  console.log(`Auto Retry: ${storage.retryOptions.autoRetry}`);
  console.log(
    `Retry delay multiplier: ${storage.retryOptions.retryDelayMultiplier}`
  );
  console.log(`Total timeout: ${storage.retryOptions.totalTimeout}`);
  console.log(`Maximum retry delay: ${storage.retryOptions.maxRetryDelay}`);
  console.log(`Maximum retries: ${storage.retryOptions.maxRetries}`);
  console.log(
    `Idempotency strategy: ${storage.retryOptions.idempotencyStrategy}`
  );
  // [END storage_configure_retries]
}
main(...process.argv.slice(2));

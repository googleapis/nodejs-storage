// Copyright 2026 Google LLC
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
//   title: Remove All Bucket Encryption Enforcement
//   description: Removes all encryption enforcement configurations and resets to default behavior.
//   usage: node removeAllBucketEncryptionEnforcementConfig.js <BUCKET_NAME>

function main(bucketName = 'my-bucket') {
  // [START storage_remove_all_encryption_enforcement_config]
  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // The ID of your GCS bucket
  // const bucketName = 'your-unique-bucket-name';

  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  // Setting these to null explicitly removes the enforcement policy.
  // We also include defaultKmsKeyName: null to fully reset the bucket encryption state.
  async function removeAllBucketEncryptionEnforcementConfig() {
    const options = {
      encryption: {
        defaultKmsKeyName: null,
        googleManagedEncryptionEnforcementConfig: null,
        customerSuppliedEncryptionEnforcementConfig: null,
        customerManagedEncryptionEnforcementConfig: null,
      },
    };

    await storage.bucket(bucketName).setMetadata(options);

    console.log(
      `Encryption enforcement configuration removed from bucket ${bucketName}.`
    );
  }

  removeAllBucketEncryptionEnforcementConfig().catch(console.error);
  // [END storage_remove_all_encryption_enforcement_config]
}
main(...process.argv.slice(2));

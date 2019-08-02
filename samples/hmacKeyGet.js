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
//   title: Get HMAC SA Key Metadata.
//   description: Get HMAC SA Key Metadata.
//   usage: node hmacKeyGet.js <hmacKeyAccessId>

function main(hmacKeyAccessId = 'GOOG0234230X00') {
  // [START storage_deactivate_hmac_key]
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  // Get HMAC SA Key Metadata
  async function getHmacKey() {
    /**
     * TODO(developer): Uncomment the following line before running the sample.
     */
    // const hmacKeyAccessId = 'HMAC Access Key Id to get, e.g. GOOG0234230X00';

    const [hmacKeyMetadata] = await storage.hmacKey(hmacKeyAccessId);

    console.log(`The HMAC key metadata is: `);
    console.log(
      `Service Account Email: ${hmacKeyMetadata.serviceAccountEmail}`
    );
    console.log(`Access Id: ${hmacKeyMetadata.accessId}`);
    console.log(`State: ${hmacKeyMetadata.state}`);
    console.log(`Etag: ${hmacKeyMetadata.etag}`);
  }
  // [END storage_get_hmac_key]
  getHmacKey();
}

main(...process.argv.slice(2));

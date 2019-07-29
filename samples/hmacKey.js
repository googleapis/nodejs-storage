/**
 * Copyright 2019, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Thisdfoijsoidjf some geberish to make me fix later.
 * For more information read the documentation
 * at
 */

'use strict';
async function listHmacKeys() {
  // [START storage_list_hmac_keys]
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  storage.getHmacKeys(function(err, hmacKeys) {
    if (err) {
      console.error(err);
    }

    // hmacKeys is an array of HmacKey objects.
    for (hmacKey in hmacKeys) {
      console.log(`Service Account Email: ${hmacKey.serviceAccountEmail}`);
      console.log(`Access Id: ${hmacKey.accessId}`);
    }
  });
  // [END storage_list_hmac_keys]
}

async function createHmacKey(serviceAccountEmail) {
  // [START storage_create_hmac_key]
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  /**
   * TODO(developer): Uncomment the following line before running the sample.
   */
  // const serviceAccountEmail = 'Service Account Email to associate HMAC Key';

  storage.createHmacKey(serviceAccountEmail, function(err, hmacKey, secret) {
    if (err) {
      console.error(err);
    }

    console.log(`The base64 encoded secret is: ${secret}`);
    console.log(`Do not miss that secret, there is no API to recover it.`);
    console.log(`The HMAC key metadata is: ${hmacKey}`);
  });
  // [END storage_create_hmac_key]
}

async function deleteHmacKey(hmacKeyAccessId) {
  // [START storage_delete_hmac_key]
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  /**
   * TODO(developer): Uncomment the following line before running the sample.
   */
  // const hmacKeyAccessId = 'HMAC Access Key Id to delete, e.g. GOOG0234230X00';

  const [hmacKey] = await storage.hmacKey(hmacKeyAccessId);

  hmacKey.delete(err => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(
      `The key is deleted, though it may still appear in getHmacKeys() results.`
    );
  });
  // [END storage_delete_hmac_key]
}

async function getHmacKey(hmacKeyAccessId) {
  // [START storage_get_hmac_key]
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  /**
   * TODO(developer): Uncomment the following line before running the sample.
   */
  // const hmacKeyAccessId = 'HMAC Access Key Id to get, e.g. GOOG0234230X00';

  const [hmacKeyMetadata] = await storage.hmacKey(hmacKeyAccessId);

  console.log(`The HMAC key metadata is: `);
  console.log(`Service Account Email: ${hmacKeyMetadata.serviceAccountEmail}`);
  console.log(`Access Id: ${hmacKeyMetadata.accessId}`);
  console.log(`State: ${hmacKeyMetadata.state}`);
  console.log(`Etag: ${hmacKeyMetadata.etag}`);
  // [END storage_get_hmac_key]
}

async function activateHmacKey(hmacKeyAccessId) {
  // [START storage_activate_hmac_key]
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  /**
   * TODO(developer): Uncomment the following line before running the sample.
   */
  // const hmacKeyAccessId = 'HMAC Access Key Id to update, e.g. GOOG0234230X00';

  const [hmacKey] = await storage.hmacKey(hmacKeyAccessId);

  hmacKey.update({state: 'ACTIVE'}, (err, hmacKeyMetadata) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`The HMAC key is now active.`);
  });
  // [END storage_activate_hmac_key]
}

async function deactivateHmacKey(hmacKeyAccessId) {
  // [START storage_deactivate_hmac_key]
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  /**
   * TODO(developer): Uncomment the following line before running the sample.
   */
  // const hmacKeyAccessId = 'HMAC Access Key Id to update, e.g. GOOG0234230X00';

  const [hmacKey] = await storage.hmacKey(hmacKeyAccessId);

  hmacKey.update({state: 'INACTIVE'}, (err, hmacKeyMetadata) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`The HMAC key is now inactive.`);
  });
  // [END storage_deactivate_hmac_key]
}

async function main() {
  require(`yargs`)
    .demand(1)
    .command(
      `list-hmac-keys`,
      `List HMAC Keys for the project provided by credentials.`,
      {},
      opts => listHmacKeys()
    )
    .command(
      `get-hmac-key <hmacKeyAccessId>`,
      `Get HMAC Key..`,
      {},
      opts => getHmacKey(opts.hmacKeyAccessId)
    )
    .command(
      `create-hmac-key <serviceAccountEmail>`,
      `Create..`,
      {},
      opts => createHmacKey(opts.serviceAccountEmail)
    )
    .command(
      `activate-hmac-key <hmacKeyAccessId>`,
      `Activate an HMAC key`,
      {},
      opts => activateHmacKey(opts.hmacKeyAccessId)
    )
    .command(
      `deactivate-hmac-key <hmacKeyAccessId>`,
      `Deactivate an HMAC key`,
      {},
      opts => deactivateHmacKey(opts.hmacKeyAccessId)
    )
    .example(
      `node $0 list-hmac-keys`,
      `Get list of HMAC Keys for project set in GOOGLE_CLOUD_PROJECT.`
    )
    .example(
      `node $0 create-hmac-key service-account@example.com`,
      `Create a new HMAC key for service-account@example.com`
    )
    .example(
      `node $0 delete-hmac-key GOOG0234230X00`,
      `Delete HMAC key with ID GOOG0234230X00`
    )
    .example(
      `node $0 deactivate-hmac-key GOOG0234230X00`,
      `Deactivate HMAC key GOOG0234230X00`
    )
    .example(
      `node $0 activate-hmac-key GOOG0234230X00`,
      `Activate HMAC key GOOG0234230X00`
    )
    .wrap(120)
    .recommendCommands()
    .epilogue(`For more information, see https://cloud.google.com/storage/docs`)
    .help()
    .strict().argv;
}

main().catch(console.error);

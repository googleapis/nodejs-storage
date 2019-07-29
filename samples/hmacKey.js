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

  const hmacKey = await storage.hmacKey(hmacKeyAccessId);

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

  const [hmacKey] = await storage.hmacKey(hmacKeyAccessId);

  // [END storage_get_hmac_key]
}

async function updateHmacKey(hmacKeyAccessId, state) {
  // [START storage_update_hmac_key]
  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  /**
   * TODO(developer): Uncomment the following line before running the sample.
   */
  // const hmacKeyAccessId = 'HMAC Access Key Id to update, e.g. GOOG0234230X00';
  // const state = `HMAC Key State, e.g. either ACTIVE or INACTIVE.`;

  const [hmacKey] = await storage.hmacKey(hmacKeyAccessId);
  //const hmacKey = storage.hmacKey('ACCESS_ID');
  hmacKey.update({state: state}, (err, hmacKeyMetadata) => {});
  // [END storage_update_hmac_key]
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
      `release-temporary-hold <bucketName> <fileName>`,
      `Release a temporary hold for a given file.`,
      {},
      opts => releaseTemporaryHold(opts.bucketName, opts.fileName)
    )
    .example(
      `node $0 set-retention-policy my-bucket 5`,
      `Defines a retention policy of 5 seconds on a "my-bucket".`
    )
    .example(
      `node $0 remove-retention-policy my-bucket`,
      `Removes a retention policy from "my-bucket".`
    )
    .example(
      `node $0 get-retention-policy my-bucket`,
      `Get the retention policy for "my-bucket".`
    )
    .example(
      `node $0 lock-retention-policy my-bucket`,
      `Lock the retention policy for "my-bucket".`
    )
    .example(
      `node $0 enable-default-event-based-hold my-bucket`,
      `Enable a default event-based hold for "my-bucket".`
    )
    .example(
      `node $0 disable-default-event-based-hold my-bucket`,
      `Disable a default-event based hold for "my-bucket".`
    )
    .example(
      `node $0 get-default-event-based-hold my-bucket`,
      `Get the value of a default-event-based hold for "my-bucket".`
    )
    .example(
      `node $0 set-event-based-hold my-bucket my-file`,
      `Sets an event-based hold on "my-file".`
    )
    .example(
      `node $0 release-event-based-hold my-bucket my-file`,
      `Releases an event-based hold on "my-file".`
    )
    .example(
      `node $0 set-temporary-hold my-bucket my-file`,
      `Sets a temporary hold on "my-file".`
    )
    .example(
      `node $0 release-temporary-hold my-bucket my-file`,
      `Releases a temporary hold on "my-file".`
    )
    .wrap(120)
    .recommendCommands()
    .epilogue(`For more information, see https://cloud.google.com/storage/docs`)
    .help()
    .strict().argv;
}

main().catch(console.error);

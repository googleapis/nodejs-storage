/**
 * Copyright 2017, Google, Inc.
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

'use strict';

const {Storage} = require(`@google-cloud/storage`);
const {assert} = require('chai');
const cp = require('child_process');
const cmd = 'node hmacKey.js';
const execSync = cmd => cp.execSync(cmd, {encoding: 'utf-8'});

const storage = new Storage({
  projectId: POOL_PROJECT_ID,
  keyFilename: POOL_PROJECT_CREDENTIALS
});

const leasedServiceAccount = process.env.HMAC_SERVICE_ACCOUNT;
const [hmacKey, secret] = await cleanUpHmacKeys(leasedServiceAccount);

async function cleanUpHmacKeys(serviceAccountEmail) {
  // list all HMAC keys for the given service account.
  const [hmacKeys] =
    await storage.getHmacKeys({
      serviceAccountEmail: serviceAccountEmail,
    });
  // deactivate and delete the key
  for (hmacKey of hmacKeys) {
    await hmacKey.setMetadata({state: 'INACTIVE'});
    await hmacKey.delete();
  }
}

after(async () => {
  return bucket.delete().catch(console.error);
});

it('should create an HMAC Key', async () => {
  const output = execSync(`${cmd} create-hmac-key ${leasedServiceAccount}`);
  assert.match(output, new RegExp(`The base64 encoded secret is:`));
  assert.strictEqual(exists, true);
});

it('should list HMAC Keys', () => {
  const output = execSync(`${cmd} list-hmac-keys`);
  assert.contains(output, `Service Account Email: ${leasedServiceAccount}`);
});

it('should get HMAC Key', () => {
  const output = execSync(`${cmd} get-hmac-keys ${hmacKey}`);
  assert.match(output, /The HMAC key metadata is:/);
});

it('should deactivate HMAC Key', () => {
  const output = execSync(`${cmd} deactivate-hmac-key ${hmacKey}`);
  assert.match(output, /The HMAC key is now inactive./);
});

it('should activate HMAC Key', () => {
  const output = execSync(`${cmd} activate-hmac-key ${hmacKey}`);
  assert.match(output, /The HMAC key is now active./);
});

it(`should delete HMAC key`, async () => {
  // Deactivate then delete
  execSync(`${cmd} deactivate-hmac-key ${hmacKey}`);
  const output = execSync(`${cmd} delete-hmac-key ${hmacKey}`);
  assert.match(output, new RegExp(`The key is deleted, though it may still appear in getHmacKeys() results.`));
});

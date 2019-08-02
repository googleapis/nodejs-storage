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

const execSync = cmd => cp.execSync(cmd, {encoding: 'utf-8'});
const poolProjectId = process.env.POOL_PROJECT_ID;
const poolProjectCredentials = process.env.POOL_PROJECT_CREDENTIALS;

const storage = new Storage({
  projectId: poolProjectId,
  keyFilename: poolProjectCredentials,
});
const leasedServiceAccount = process.env.HMAC_SERVICE_ACCOUNT;

describe.only('HMAC SA Key samples', () => {
  let hmacKey;

  before(async () => {
    await cleanUpHmacKeys(leasedServiceAccount);
    [hmacKey] = await storage.createHmacKey(leasedServiceAccount);
  });

  async function cleanUpHmacKeys(serviceAccountEmail) {
    // list all HMAC keys for the given service account.
    const [hmacKeys] = await storage.getHmacKeys({
      serviceAccountEmail: serviceAccountEmail,
    });
    // deactivate and delete the key
    for (const hmacKey of hmacKeys) {
      await hmacKey.setMetadata({state: 'INACTIVE'});
      await hmacKey.delete();
    }
  }

  after(async () => {
    await cleanUpHmacKeys(leasedServiceAccount);
  });

  it('should create an HMAC Key', async () => {
    const output = execSync(
      `node hmacKeyCreate.js ${poolProjectId} ${poolProjectCredentials} ${leasedServiceAccount}`
    );
    assert.include(output, 'The base64 encoded secret is:');
  });

  it('should list HMAC Keys', async () => {
    const output = execSync(
      `node hmacKeysList.js ${poolProjectId} ${poolProjectCredentials}`
    );
    assert.include(output, `Service Account Email: ${leasedServiceAccount}`);
  });

  it('should get HMAC Key', async () => {
    const output = execSync(`node hmacKeyGet.js ${hmacKey.metadata.accessId}`);
    assert.include(output, 'The HMAC key metadata is:');
  });

  it('should deactivate HMAC Key', async () => {
    const output = execSync(
      `node hmacKeyDeactivate.js ${hmacKey.metadata.accessId}`
    );
    assert.include(output, 'The HMAC key is now inactive.');
  });

  it('should activate HMAC Key', async () => {
    const output = execSync(
      `node hmacKeyActivate.js ${hmacKey.metadata.accessId}`
    );
    assert.include(output, 'The HMAC key is now active.');
  });

  it(`should delete HMAC key`, async () => {
    // Deactivate then delete
    execSync(`node hmacKeyDeactivate.js ${hmacKey.metadata.accessId}`);
    const output = execSync(
      `node hmacKeyDelete.js ${hmacKey.metadata.accessId}`
    );
    assert.include(
      output,
      `The key is deleted, though it may still appear in getHmacKeys() results.`
    );
  });
});

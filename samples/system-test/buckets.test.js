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

const path = require(`path`);
const { Storage } = require(`@google-cloud/storage`);
const assert = require('assert');
const tools = require(`@google-cloud/nodejs-repo-tools`);
const uuid = require(`uuid`);

const storage = new Storage();
const cwd = path.join(__dirname, `..`);
const bucketName = `nodejs-storage-samples-${uuid.v4()}`;
const defaultKmsKeyName = process.env.GOOGLE_CLOUD_KMS_KEY_ASIA;
const bucket = storage.bucket(bucketName);
const cmd = `node buckets.js`;

before(tools.checkCredentials);
after(async () => {
  try {
    await bucket.delete();
  } catch (err) { } // ignore error
});

beforeEach(tools.stubConsole);
afterEach(tools.restoreConsole);

it(`should create a bucket`, async () => {
  const results = await tools.runAsyncWithIO(
    `${cmd} create ${bucketName}`,
    cwd
  );
  assert.strictEqual(
    (results.stdout + results.stderr).includes(`Bucket ${bucketName} created.`),
    true
  );
  const [exists] = await bucket.exists();
  assert.strictEqual(exists, true);
});

it(`should list buckets`, async () => {
  await tools
    .tryTest(async assert => {
      const results = await tools.runAsyncWithIO(`${cmd} list`, cwd);
      const output = results.stdout + results.stderr;
      assert(
        output.includes(`Buckets:`),
        `"${output}" should include "Buckets:"`
      );
      assert(
        output.includes(bucketName),
        `"${output}" should include "${bucketName}"`
      );
    })
    .start();
});

it(`should set a bucket's default KMS key`, async () => {
  const results = await tools.runAsyncWithIO(
    `${cmd} enable-default-kms-key ${bucketName} ${defaultKmsKeyName}`,
    cwd
  );
  assert.strictEqual(
    (results.stdout + results.stderr).includes(
      `Default KMS key for ${bucketName} was set to ${defaultKmsKeyName}.`
    ),
    true
  );
  const metadata = await bucket.getMetadata();
  assert.strictEqual(
    metadata[0].encryption.defaultKmsKeyName,
    defaultKmsKeyName
  );
});

it(`should enable a bucket's Bucket Policy Only`, async () => {
  // Remove the following setMetadata request after prod fix is released.
  await bucket.setMetadata(
    { defaultObjectAcl: null }, { predefinedDefaultObjectAcl: "private" }
  );

  const results = await tools.runAsyncWithIO(
    `${cmd} enable-bucket-policy-only ${bucketName}`,
    cwd
  );
  assert.strictEqual(
    (results.stdout + results.stderr).includes(
      `Bucket Policy Only was enabled for ${bucketName}.`
    ),
    true
  );
  const metadata = await bucket.getMetadata();
  assert.strictEqual(
    metadata[0].iamConfiguration.bucketPolicyOnly.enabled,
    true
  );
});

it(`should get a bucket's Bucket Policy Only metadata`, async () => {
  const results = await tools.runAsyncWithIO(
    `${cmd} get-bucket-policy-only ${bucketName}`,
    cwd
  );

  assert.strictEqual(
    (results.stdout + results.stderr).includes(
      `Bucket Policy Only is enabled for ${bucketName}.`
    ),
    true
  );
  const [metadata] = await bucket.getMetadata();
  assert.strictEqual(
    metadata.iamConfiguration.bucketPolicyOnly.enabled,
    true
  );
  assert.strictEqual(
    metadata.iamConfiguration.bucketPolicyOnly.lockedTime != null,
    true
  );
});

it(`should disable a bucket's Bucket Policy Only`, async () => {
  const results = await tools.runAsyncWithIO(
    `${cmd} disable-bucket-policy-only ${bucketName}`,
    cwd
  );
  assert.strictEqual(
    (results.stdout + results.stderr).includes(
      `Bucket Policy Only was disabled for ${bucketName}.`
    ),
    true
  );
  const metadata = await bucket.getMetadata();
  assert.strictEqual(
    metadata[0].iamConfiguration.bucketPolicyOnly.enabled,
    false
  );
});



it(`should delete a bucket`, async () => {
  const results = await tools.runAsyncWithIO(
    `${cmd} delete ${bucketName}`,
    cwd
  );
  assert.strictEqual(
    (results.stdout + results.stderr).includes(`Bucket ${bucketName} deleted.`),
    true
  );
  const [exists] = await bucket.exists();
  assert.strictEqual(exists, false);
});

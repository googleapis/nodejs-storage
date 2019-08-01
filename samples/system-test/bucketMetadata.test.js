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

const {Storage} = require('@google-cloud/storage');
const {assert} = require('chai');
const cp = require('child_process');
const uuid = require('uuid');

const execSync = cmd => cp.execSync(cmd, {encoding: 'utf-8'});

const storage = new Storage();

describe(`Buckets`, () => {
  const bucketName = `nodejs-storage-samples-${uuid.v4()}`;
  const bucket = storage.bucket(bucketName);

  before(async () => {
    await storage.createBucket(bucketName, {
      location: 'ASIA',
      storageClass: 'STANDARD',
    });
  });

  after(async () => {
    return bucket.delete().catch(console.error);
  });

  it('should get bucket metadata', () => {
    const output = execSync(`node bucketMetadata.js ${bucketName}`);
    assert.match(output, /name: ${bucketName}/);
    assert.match(output, new RegExp(bucketName));
  });
});
/*!
 * Copyright 2019 Google LLC. All Rights Reserved.
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
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

import {Storage} from '../src/';

const testCases = JSON.parse(fs.readFileSync(
  path.join(
    __dirname,
    '../../conformance-test/test-data/v4SignedUrl.json',
  ), 'utf-8'));

const SERVICE_ACCOUNT = path.join(
  __dirname,
  '../../conformance-test/fixtures/signing-service-account.json');

describe('v4 signed url', () => {
  let storage: Storage;

  before(() => {
    storage = new Storage({ keyFilename: SERVICE_ACCOUNT })
  });

  // tslint:disable-next-line:no-any
  testCases.forEach((testCase: any) => {
    it(testCase.description, () => {
      const bucket = storage.bucket(testCase.bucket);
      const file = bucket.file(testCase.object);

      file.getDate = () => new Date(testCase.timestamp);

      const action = ({
        GET: 'read',
        POST: 'resumable',
        PUT: 'write',
        DELETE: 'delete',
      } as {[index: string]: 'read'|'resumable'|'write'|'delete'})[testCase.method];

      const expires = new Date(testCase.timestamp).valueOf() + testCase.expiration * 1000;

      return file
        .getSignedUrl({
          version: 'v4',
          action,
          expires,
          extensionHeaders: testCase.headers,
        })
        .then(([signedUrl]) => {
          assert.strictEqual(signedUrl, testCase.expectedUrl);
        })
    });
  });
});

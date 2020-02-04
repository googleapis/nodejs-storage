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
import {describe, it} from 'mocha';
import * as dateFormat from 'date-and-time';
import * as fs from 'fs';
import {OutgoingHttpHeaders} from 'http';
import * as path from 'path';
import * as sinon from 'sinon';

import {Storage} from '../src/';

interface V4SignedURLConformanceTestCases {
  description: string;
  bucket: string;
  object: string;
  headers?: OutgoingHttpHeaders;
  method: string;
  expiration: number;
  timestamp: string;
  expectedUrl: string;
}

interface FileAction {
  [key: string]: 'read' | 'resumable' | 'write' | 'delete';
}

interface BucketAction {
  [key: string]: 'list';
}

const testFile = fs.readFileSync(
  path.join(__dirname, '../../conformance-test/test-data/v4SignedUrl.json'),
  'utf-8'
);

const testCases = JSON.parse(testFile) as V4SignedURLConformanceTestCases[];

const SERVICE_ACCOUNT = path.join(
  __dirname,
  '../../conformance-test/fixtures/signing-service-account.json'
);

describe('v4 signed url', () => {
  const storage = new Storage({keyFilename: SERVICE_ACCOUNT});

  testCases.forEach(testCase => {
    it(testCase.description, async () => {
      const NOW = dateFormat.parse(
        testCase.timestamp,
        'YYYYMMDD HHmmss ',
        true
      );

      const fakeTimer = sinon.useFakeTimers(NOW);
      const bucket = storage.bucket(testCase.bucket);
      const expires = NOW.valueOf() + testCase.expiration * 1000;

      if (testCase.object) {
        const file = bucket.file(testCase.object);

        const action = ({
          GET: 'read',
          POST: 'resumable',
          PUT: 'write',
          DELETE: 'delete',
        } as FileAction)[testCase.method];

        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action,
          expires,
          extensionHeaders: testCase.headers,
        });

        assert.strictEqual(signedUrl, testCase.expectedUrl);
      } else {
        // bucket operation
        const action = ({
          GET: 'list',
        } as BucketAction)[testCase.method];

        const [signedUrl] = await bucket.getSignedUrl({
          version: 'v4',
          action,
          expires,
          extensionHeaders: testCase.headers,
        });

        assert.strictEqual(signedUrl, testCase.expectedUrl);
      }

      fakeTimer.restore();
    });
  });
});

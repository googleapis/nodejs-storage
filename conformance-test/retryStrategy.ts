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
import {describe, it} from 'mocha';
import * as fs from 'fs';
import * as path from 'path';

import {
  Storage,
} from '../src/';

interface RetryTestCasesScenarioOne { //probably should give it a more descriptive name. maybe instead of scenario we want it to be bucket, file, etc?
  description: string;
  bucket: string; 
  queryParameters?: {[key: string]: string};
  method: Function;
}

const testFile = fs.readFileSync(
  path.join(__dirname, '../../conformance-test/test-data/v4SignedUrl.json'), //TODO change to new file
  'utf-8'
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testCases = JSON.parse(testFile);
const retryTestCasesScenarioOne: RetryTestCasesScenarioOne[] = testCases.retryTestCases;

const SERVICE_ACCOUNT = path.join(
  __dirname,
  '../../conformance-test/fixtures/signing-service-account.json' //TODO change to new service account 
);

const storage = new Storage({keyFilename: SERVICE_ACCOUNT});

describe('retry conformance testing', () => {
  describe('scenario one', () => { //not sure this is how we want to do it
    retryTestCasesScenarioOne.forEach(testCase => {
      it(testCase.description, async () => {
        const bucket = storage.bucket(testCase.bucket);
        const result = testCase.method(bucket);
      });
    });
  });
});

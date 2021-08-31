/*!
 * Copyright 2021 Google LLC. All Rights Reserved.
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
import * as uuid from 'uuid';
import pLimit = require('p-limit');

require('conformance-test/libraryMethods.ts');
import {Bucket, File, Iam, Notification, Storage} from '../src/';

interface RetryCase {
  instructions: string[];
}

interface Method {
  name: String;
  resources: String[];
}

interface RetryTestCase {
  id: number;
  description: string;
  retryCases: RetryCase[];
  methods: Method[];
  preconditionProvided: boolean;
  expectSuccess: boolean;
}

interface MethodMap {
  jsonApi: string;
  nodejsStorageMethods: string[];
}

const testFile = fs.readFileSync(
  //TODO change to require
  path.join(
    __dirname,
    '../../conformance-test/test-data/retryStrategyTestData.json'
  ),
  'utf-8'
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testFileParsed = JSON.parse(testFile);
const retryTestCases: RetryTestCase[] = testFileParsed.retryStrategyTests;

const jsonToNodeApiMapping = fs.readFileSync(
  //TODO change to require
  path.join(
    __dirname,
    '../../conformance-test/test-data/retryInvocationMap.json'
  ),
  'utf-8'
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const methodMap: Map<String, String[]> = JSON.parse(jsonToNodeApiMapping);

const storage = new Storage(); //TODO: add apiEndpoint

describe('retry conformance testing', () => {
  const TESTS_PREFIX = `storage-retry-tests-${shortUUID()}-`;
  const RETENTION_DURATION_SECONDS = 10;
  for (
    let testCaseIndex = 0;
    testCaseIndex < retryTestCases.length;
    testCaseIndex++
  ) {
    const testCase = retryTestCases[testCaseIndex];
    describe(`Scenario ${testCase.id}`, () => {
      retryTestCases.retryCases.forEach((instructionSet: RetryCase) => {
        const instructions = instructionSet.instructions;
        //TODO set emulator based on instructions
        testCase.methods.forEach(jsonMethod => {
          const jsonMethodName = jsonMethod.name;
          const jsonMethodResources = jsonMethod.resources;
          const functionList = methodMap.get(jsonMethodName);
          functionList?.forEach(storageMethod => {
            function generateName(bucketOrFile: string) {
              return TESTS_PREFIX + storageMethod + bucketOrFile + shortUUID();
            }

            let bucket: Bucket;
            let file: File;
            let iam: Iam;
            let notification: Notification;
            let storage: Storage;
            beforeEach(() => {
              bucket = storage.bucket(generateName('bucket'));
              file = bucket.file(generateName('file'));
              notification = bucket.notification('notification');
              // set preconditions if test says so
            });

            it(`${storageMethod}`, async () => {
              //if there are multiple cases, we're going to run into duplicate names here
              const result = storageMethod(bucket);
              // based on expectSuccess, make sure the right thing happens
            });

            after(() => {
              return Promise.all([deleteAllBucketsAsync()]);
            });
          });
        });
      });
    });

    async function deleteAllBucketsAsync() {
      const [buckets] = await storage.getBuckets({prefix: TESTS_PREFIX});
      const limit = pLimit(10);
      await new Promise(resolve =>
        setTimeout(resolve, RETENTION_DURATION_SECONDS * 1000)
      );
      return Promise.all(
        buckets.map(bucket => limit(() => deleteBucketAsync(bucket)))
      );
    }

    async function deleteBucketAsync(bucket: Bucket, options?: {}) {
      // After files are deleted, eventual consistency may require a bit of a
      // delay to ensure that the bucket recognizes that the files don't exist
      // anymore.
      const CONSISTENCY_DELAY_MS = 250;

      options = Object.assign({}, options, {
        versions: true,
      });

      await bucket.deleteFiles(options);
      await new Promise(resolve => setTimeout(resolve, CONSISTENCY_DELAY_MS));
      await bucket.delete();
    }
  }
});

function shortUUID() {
  return uuid.v1().split('-').shift();
}

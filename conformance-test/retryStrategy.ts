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
import * as assert from 'assert';
import * as libraryMethods from './libraryMethods';

import {Bucket, File, Iam, Notification, Storage} from '../src/';

interface RetryCase {
  instructions: String[];
}

interface Method {
  name: String;
  resources: String[];
}

interface RetryTestCase {
  id: number;
  description: String;
  cases: RetryCase[];
  methods: Method[];
  preconditionProvided: boolean;
  expectSuccess: boolean;
}

type LibraryMethodsModuleType = typeof import('./libraryMethods');

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
const methodMap: Map<String, String[]> = new Map(
  Object.entries(JSON.parse(jsonToNodeApiMapping))
);
const storage = new Storage({apiEndpoint: 'http://localhost:9000/'}); //TODO: add apiEndpoint

const TESTS_PREFIX = `storage-retry-tests-${shortUUID()}-`;
const RETENTION_DURATION_SECONDS = 10;
const OPTIONS = {
  preconditionOpts: {
    ifGenerationMatch: 100,
    ifMetagenerationMatch: 100,
  },
};

describe('retry conformance testing', () => {
  for (
    let testCaseIndex = 0;
    testCaseIndex < retryTestCases.length;
    testCaseIndex++
  ) {
    const testCase: RetryTestCase = retryTestCases[testCaseIndex];
    describe(`Scenario ${testCase.id}`, () => {
      excecuteScenario(testCase);
    });
  }
});

function excecuteScenario(testCase: RetryTestCase) {
  testCase.cases.forEach((instructionSet: RetryCase) => {
    configureTestBench(instructionSet.instructions);
    testCase.methods.forEach(jsonMethod => {
      const functionList = methodMap.get(jsonMethod?.name);
      functionList?.forEach(storageMethodString => {
        const storageMethodObject =
          libraryMethods[storageMethodString as keyof LibraryMethodsModuleType];
        let bucket: Bucket;
        let file: File;
        let notification: Notification;
        let storage: Storage;
        beforeEach(async () => {
          bucket = await createBucketForTest(
            testCase.preconditionProvided,
            storageMethodString
          );
          file = createFileForTest(
            testCase.preconditionProvided,
            storageMethodString,
            bucket
          );
          notification = bucket.notification('notification');
        });

        it(`${storageMethodString}`, async () => {
          if (testCase.expectSuccess) {
            assert.ifError(
              await storageMethodObject(bucket, file, notification)
            );
          } else {
            assert.throws(async () => {
              await storageMethodObject(bucket, file, notification);
            });
          }
        });
      });
    });
  });
}

async function createBucketForTest(
  preconditionProvided: boolean,
  storageMethodString: String
) {
  const bucket = preconditionProvided
    ? storage.bucket(generateName(storageMethodString, 'bucket'), OPTIONS)
    : storage.bucket(generateName(storageMethodString, 'bucket'));
  await bucket.create();
  return bucket;
}

function createFileForTest(
  preconditionProvided: boolean,
  storageMethodString: String,
  bucket: Bucket
) {
  return preconditionProvided
    ? bucket.file(generateName(storageMethodString, 'file'), OPTIONS)
    : bucket.file(generateName(storageMethodString, 'file'));
}

function generateName(storageMethodString: String, bucketOrFile: string) {
  return `${TESTS_PREFIX}${storageMethodString.toLowerCase()}${bucketOrFile}`;
}

function configureTestBench(instructions: String[]) {
  console.log('configure test bench not implemented');
}

function shortUUID() {
  return uuid.v1().split('-').shift();
}

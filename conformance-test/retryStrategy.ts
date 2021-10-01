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
import * as assert from 'assert';
import * as libraryMethods from './libraryMethods';
import fetch from 'node-fetch';

import {Bucket, File, Iam, Notification, Storage} from '../src/';
import {
  getTestBenchDockerImage,
  runTestBenchDockerImage,
} from './test-bench-util';
import {DecorateRequestOptions} from '@google-cloud/common';

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

const TESTS_PREFIX = `storage-retry-tests-${shortUUID()}-`;
const OPTIONS = {
  preconditionOpts: {
    ifGenerationMatch: 0,
    ifMetagenerationMatch: 0,
  },
};

const TESTBENCH_HOST =
  process.env.STORAGE_EMULATOR_HOST || 'http://localhost:9000/';

describe('retry conformance testing', () => {
  before(async () => {
    await getTestBenchDockerImage();
    await runTestBenchDockerImage();
  });

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
    testCase.methods.forEach(async jsonMethod => {
      const functionList = methodMap.get(jsonMethod?.name);
      functionList?.forEach(storageMethodString => {
        const storageMethodObject =
          libraryMethods[storageMethodString as keyof LibraryMethodsModuleType];
        let bucket: Bucket;
        let file: File;
        let notification: Notification;
        let creationResult: any;
        let storage: Storage;
        before(async () => {
          storage = new Storage({apiEndpoint: TESTBENCH_HOST});
          bucket = await createBucketForTest(
            storage,
            testCase.preconditionProvided,
            storageMethodString
          );
          file = await createFileForTest(
            testCase.preconditionProvided,
            storageMethodString,
            bucket
          );
          notification = bucket.notification(`${TESTS_PREFIX}`);
          await notification.create();

          creationResult = await createTestBenchRetryTest(
            instructionSet.instructions,
            jsonMethod?.name.toString()
          );
          storage.interceptors.push({
            request: requestConfig => {
              requestConfig.headers = requestConfig.headers || {};
              Object.assign(requestConfig.headers, {
                'x-retry-test-id': creationResult.id,
              });
              return requestConfig as DecorateRequestOptions;
            },
          });
        });

        it(`${storageMethodString}`, async () => {
          if (testCase.expectSuccess) {
            assert.ifError(
              await storageMethodObject(bucket, file, notification, storage)
            );
          } else {
            assert.throws(async () => {
              await storageMethodObject(bucket, file, notification, storage);
            });
          }
          const testBenchResult = await getTestBenchRetryTest(
            creationResult.id
          );
          assert.strictEqual(testBenchResult.completed, true);
        });
      });
    });
  });
}

async function createBucketForTest(
  storage: Storage,
  preconditionProvided: boolean,
  storageMethodString: String
) {
  const name = generateName(storageMethodString, 'bucket');
  const bucket = preconditionProvided
    ? storage.bucket(name, OPTIONS)
    : storage.bucket(name);
  await bucket.create();
  return bucket;
}

async function createFileForTest(
  preconditionProvided: boolean,
  storageMethodString: String,
  bucket: Bucket
) {
  const name = generateName(storageMethodString, 'file');
  const file = preconditionProvided
    ? bucket.file(name, OPTIONS)
    : bucket.file(name);
  await file.save(name);
  return file;
}

function generateName(storageMethodString: String, bucketOrFile: string) {
  return `${TESTS_PREFIX}${storageMethodString.toLowerCase()}${bucketOrFile}`;
}

async function createTestBenchRetryTest(
  instructions: String[],
  methodName: string
) {
  const requestBody = {instructions: {[methodName]: instructions}};
  const response = await fetch(`${TESTBENCH_HOST}retry_test`, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: {'Content-Type': 'application/json'},
  });
  return response.json();
}

async function getTestBenchRetryTest(testId: string) {
  const response = await fetch(`${TESTBENCH_HOST}retry_test/${testId}`, {
    method: 'GET',
  });

  return response.json();
}

function shortUUID() {
  return uuid.v1().split('-').shift();
}
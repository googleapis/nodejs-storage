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
import * as jsonToNodeApiMapping from './test-data/retryInvocationMap.json';
import * as libraryMethods from './libraryMethods';
import {Bucket, File, HmacKey, Notification, Storage} from '../src';
import * as uuid from 'uuid';
import * as assert from 'assert';
import {
  StorageRequestOptions,
  StorageTransport,
  StorageTransportCallback,
} from '../src/storage-transport';
interface RetryCase {
  instructions: String[];
}

interface Method {
  name: String;
  resources: String[];
  group?: String;
}

export interface RetryTestCase {
  id: number;
  description: String;
  cases: RetryCase[];
  methods: Method[];
  preconditionProvided: boolean;
  expectSuccess: boolean;
}

interface ConformanceTestCreationResult {
  id: string;
}

interface ConformanceTestResult {
  completed: boolean;
}

type LibraryMethodsModuleType = typeof import('./libraryMethods');
const methodMap: Map<String, String[]> = new Map(
  Object.entries(jsonToNodeApiMapping),
);

const DURATION_SECONDS = 600; // 10 mins.
const TESTS_PREFIX = `storage.retry.tests.${shortUUID()}.`;
const TESTBENCH_HOST =
  process.env.STORAGE_EMULATOR_HOST || 'http://localhost:9000/';
const CONF_TEST_PROJECT_ID = 'my-project-id';
const TIMEOUT_FOR_INDIVIDUAL_TEST = 20000;
const RETRY_MULTIPLIER_FOR_CONFORMANCE_TESTS = 0.01;

export function executeScenario(testCase: RetryTestCase) {
  for (
    let instructionNumber = 0;
    instructionNumber < testCase.cases.length;
    instructionNumber++
  ) {
    const instructionSet: RetryCase = testCase.cases[instructionNumber];
    testCase.methods.forEach(async jsonMethod => {
      const functionList =
        jsonMethod?.group !== undefined
          ? methodMap.get(jsonMethod?.group)
          : methodMap.get(jsonMethod?.name);
      functionList?.forEach(storageMethodString => {
        const storageMethodObject =
          libraryMethods[storageMethodString as keyof LibraryMethodsModuleType];
        let bucket: Bucket;
        let file: File;
        let notification: Notification;
        let creationResult: ConformanceTestCreationResult;
        let storage: Storage;
        let hmacKey: HmacKey;
        let storageTransport: StorageTransport;

        describe(`${storageMethodString}`, async () => {
          beforeEach(async () => {
            const rawStorageTransport = new StorageTransport({
              apiEndpoint: TESTBENCH_HOST,
              authClient: undefined,
              baseUrl: TESTBENCH_HOST,
              packageJson: {name: 'test-package', version: '1.0.0'},
              retryOptions: {
                retryDelayMultiplier: RETRY_MULTIPLIER_FOR_CONFORMANCE_TESTS,
                maxRetries: 3,
                maxRetryDelay: 32,
                totalTimeout: TIMEOUT_FOR_INDIVIDUAL_TEST,
              },
              scopes: [
                'http://www.googleapis.com/auth/devstorage.full_control',
              ],
              projectId: CONF_TEST_PROJECT_ID,
              userAgent: 'retry-test',
              useAuthWithCustomEndpoint: true,
              customEndpoint: true,
              timeout: DURATION_SECONDS,
            });

            creationResult = await createTestBenchRetryTest(
              instructionSet.instructions,
              jsonMethod?.name.toString(),
              rawStorageTransport,
            );
            if (!creationResult || !creationResult.id) {
              throw new Error('Failed to get a valid test ID from test bench.');
            }

            // Create a Proxy around rawStorageTransport to intercept makeRequest
            storageTransport = new Proxy(rawStorageTransport, {
              get(target, prop, receiver) {
                if (prop === 'makeRequest') {
                  return async <T>(
                    reqOpts: StorageRequestOptions,
                    callback?: StorageTransportCallback<T>,
                  ): Promise<void | T> => {
                    const config = reqOpts;
                    config.headers = config.headers || {};

                    if (creationResult && creationResult.id) {
                      const retryId = creationResult.id;
                      if (config.headers instanceof Headers) {
                        config.headers.set('x-retry-test-id', retryId);
                      } else if (
                        typeof config.headers === 'object' &&
                        config.headers !== null &&
                        !Array.isArray(config.headers)
                      ) {
                        config.headers = {
                          ...(config.headers as {
                            [key: string]: string | string[];
                          }),
                          'x-retry-test-id': retryId,
                        };
                      } else {
                        config.headers = {'x-retry-test-id': retryId};
                      }
                    }
                    return Reflect.apply(
                      rawStorageTransport.makeRequest,
                      rawStorageTransport,
                      [config, callback],
                    );
                  };
                }
                return Reflect.get(target, prop, receiver);
              },
            });

            storage = new Storage({
              apiEndpoint: TESTBENCH_HOST,
              projectId: CONF_TEST_PROJECT_ID,
              retryOptions: {
                retryDelayMultiplier: RETRY_MULTIPLIER_FOR_CONFORMANCE_TESTS,
              },
            });

            if (storageMethodString.includes('InstancePrecondition')) {
              bucket = await createBucketForTest(
                storage,
                testCase.preconditionProvided &&
                  !storageMethodString.includes('combine'),
                storageMethodString,
              );
              file = await createFileForTest(
                testCase.preconditionProvided,
                storageMethodString,
                bucket,
              );
            } else {
              bucket = await createBucketForTest(
                storage,
                false,
                storageMethodString,
              );
              file = await createFileForTest(
                false,
                storageMethodString,
                bucket,
              );
            }
            notification = bucket.notification(TESTS_PREFIX);
            await notification.create();

            [hmacKey] = await storage.createHmacKey(
              `${TESTS_PREFIX}@email.com`,
            );
          });

          it(`${instructionNumber}`, async () => {
            const methodParameters: libraryMethods.ConformanceTestOptions = {
              storage: storage,
              bucket: bucket,
              file: file,
              storageTransport: storageTransport,
              notification: notification,
              hmacKey: hmacKey,
              projectId: CONF_TEST_PROJECT_ID,
            };
            if (testCase.preconditionProvided) {
              methodParameters.preconditionRequired = true;
            }

            if (testCase.expectSuccess) {
              await storageMethodObject(methodParameters);
              const testBenchResult = await getTestBenchRetryTest(
                creationResult.id,
                storageTransport,
              );
              assert.strictEqual(testBenchResult.completed, true);
            } else {
              await assert.rejects(async () => {
                await storageMethodObject(methodParameters);
              }, undefined);
            }
          }).timeout(TIMEOUT_FOR_INDIVIDUAL_TEST);
        });
      });
    });
  }
}

async function createBucketForTest(
  storage: Storage,
  preconditionShouldBeOnInstance: boolean,
  storageMethodString: String,
) {
  const name = generateName(storageMethodString, 'bucket');
  const bucket = storage.bucket(name);
  await bucket.create();
  await bucket.setRetentionPeriod(DURATION_SECONDS);

  if (preconditionShouldBeOnInstance) {
    return new Bucket(storage, bucket.name, {
      preconditionOpts: {
        ifMetagenerationMatch: 2,
      },
    });
  }
  return bucket;
}

async function createFileForTest(
  preconditionShouldBeOnInstance: boolean,
  storageMethodString: String,
  bucket: Bucket,
) {
  const name = generateName(storageMethodString, 'file');
  const file = bucket.file(name);
  await file.save(name);
  if (preconditionShouldBeOnInstance) {
    return new File(bucket, file.name, {
      preconditionOpts: {
        ifMetagenerationMatch: file.metadata.metageneration,
        ifGenerationMatch: file.metadata.generation,
      },
    });
  }
  return file;
}

function generateName(storageMethodString: String, bucketOrFile: string) {
  return `${TESTS_PREFIX}${storageMethodString.toLowerCase()}${bucketOrFile}.${shortUUID()}`;
}

async function createTestBenchRetryTest(
  instructions: String[],
  methodName: string,
  storageTransport: StorageTransport,
): Promise<ConformanceTestCreationResult> {
  const requestBody = {instructions: {[methodName]: instructions}};

  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: 'retry_test',
    body: JSON.stringify(requestBody),
    headers: {'Content-Type': 'application/json'},
    timeout: 10000,
  };

  const response = await storageTransport.makeRequest(requestOptions);
  return response as unknown as ConformanceTestCreationResult;
}

async function getTestBenchRetryTest(
  testId: string,
  storageTransport: StorageTransport,
): Promise<ConformanceTestResult> {
  const requestOptions: StorageRequestOptions = {
    url: `retry_test/${testId}`,
    method: 'GET',
    retry: true,
    headers: {
      'x-retry-test-id': testId,
    },
  };
  const response = await storageTransport.makeRequest(requestOptions);
  return response as unknown as ConformanceTestResult;
}

function shortUUID() {
  return uuid.v1().split('-').shift();
}

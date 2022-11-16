/*!
 * Copyright 2022 Google LLC. All Rights Reserved.
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

import yargs from 'yargs';
import {promises as fsp} from 'fs';
import {
  Bucket,
  DownloadOptions,
  DownloadResponse,
  Storage,
  UploadOptions,
} from '../src';
import {performance} from 'perf_hooks';
// eslint-disable-next-line node/no-unsupported-features/node-builtins
import {parentPort} from 'worker_threads';
import {
  DEFAULT_PROJECT_ID,
  generateRandomDirectoryStructure,
  getValidationType,
  performanceTestSetup,
  TestResult,
} from './performanceUtils';
import {TRANSFER_MANAGER_TEST_TYPES} from './performanceTest';

const TEST_NAME_STRING = 'nodejs-perf-metrics';
const DEFAULT_NUMBER_OF_WRITES = 1;
const DEFAULT_NUMBER_OF_READS = 3;
const DEFAULT_BUCKET_NAME = 'nodejs-perf-metrics-shaffeeullah';
const DEFAULT_SMALL_FILE_SIZE_BYTES = 5120;
const DEFAULT_LARGE_FILE_SIZE_BYTES = 2.147e9;
const BLOCK_SIZE_IN_BYTES = 1024;
const NODE_DEFAULT_HIGHWATER_MARK_BYTES = 16384;

let stg: Storage;
let bucket: Bucket;

const checkType = getValidationType();

const argv = yargs(process.argv.slice(2))
  .options({
    bucket: {type: 'string', default: DEFAULT_BUCKET_NAME},
    small: {type: 'number', default: DEFAULT_SMALL_FILE_SIZE_BYTES},
    large: {type: 'number', default: DEFAULT_LARGE_FILE_SIZE_BYTES},
    projectid: {type: 'string', default: DEFAULT_PROJECT_ID},
  })
  .parseSync();

/**
 * Main entry point. This function performs a test iteration and posts the message back
 * to the parent thread.
 */
async function main() {
  let results: TestResult[] = [];
  ({bucket} = await performanceTestSetup(argv.projectid, argv.bucket));

  switch (argv.testtype) {
    case TRANSFER_MANAGER_TEST_TYPES.APPLICATION_UPLOAD_MULTIPLE_OBJECTS:
      results = await performWriteTest();
      break;
    case TRANSFER_MANAGER_TEST_TYPES.APPLICATION_DOWNLOAD_MULTIPLE_OBJECTS:
      results = await performReadTest();
      break;
    // case TRANSFER_MANAGER_TEST_TYPES.APPLICATION_LARGE_FILE_DOWNLOAD:
    //   results = await performLargeReadTest();
    //   break;
    default:
      break;
  }
  parentPort?.postMessage(results);
}

async function uploadInParallel(
  bucket: Bucket,
  paths: string[],
  options: UploadOptions
) {
  const promises = [];
  for (const index in paths) {
    const path = paths[index];
    const stat = await fsp.lstat(path);
    if (stat.isDirectory()) {
      continue;
    }
    options.destination = path;
    promises.push(bucket.upload(path, options));
  }
  await Promise.all(promises).catch(console.error);
}

async function downloadInParallel(bucket: Bucket, options: DownloadOptions) {
  const promises: Promise<DownloadResponse>[] = [];
  const [files] = await bucket.getFiles();
  files.forEach(file => {
    promises.push(file.download(options));
  });
  await Promise.all(promises).catch(console.error);
}

/**
 * Performs an iteration of the Write multiple objects test.
 *
 * @returns {Promise<TestResult[]>} Promise that resolves to an array of test results for the iteration.
 */
async function performWriteTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const directory = TEST_NAME_STRING;
  const directories = generateRandomDirectoryStructure(10, directory);

  for (let j = 0; j < DEFAULT_NUMBER_OF_WRITES; j++) {
    let start = 0;
    let end = 0;

    const iterationResult: TestResult = {
      op: 'WRITE',
      objectSize: BLOCK_SIZE_IN_BYTES, //note this is wrong
      appBufferSize: BLOCK_SIZE_IN_BYTES,
      libBufferSize: NODE_DEFAULT_HIGHWATER_MARK_BYTES,
      crc32Enabled: false,
      md5Enabled: false,
      apiName: 'JSON',
      elapsedTimeUs: 0,
      cpuTimeUs: -1,
      status: '[OK]',
    };

    bucket = stg.bucket(argv.bucket, {
      preconditionOpts: {
        ifGenerationMatch: 0,
      },
    });

    await bucket.deleteFiles(); //cleanup anything old
    start = performance.now();
    await uploadInParallel(bucket, directories.paths, {validation: checkType});
    end = performance.now();

    iterationResult.elapsedTimeUs = Math.round((end - start) * 1000);
    results.push(iterationResult);
  }
  return results;
}

/**
 * Performs an iteration of the read multiple objects test.
 *
 * @returns {Promise<TestResult[]>} Promise that resolves to an array of test results for the iteration.
 */
async function performReadTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  bucket = stg.bucket(argv.bucket);
  for (let j = 0; j < DEFAULT_NUMBER_OF_READS; j++) {
    let start = 0;
    let end = 0;
    const iterationResult: TestResult = {
      op: `READ[${j}]`,
      objectSize: 0, //this is wrong
      appBufferSize: BLOCK_SIZE_IN_BYTES,
      libBufferSize: NODE_DEFAULT_HIGHWATER_MARK_BYTES,
      crc32Enabled: false,
      md5Enabled: false,
      apiName: 'JSON',
      elapsedTimeUs: 0,
      cpuTimeUs: -1,
      status: '[OK]',
    };

    start = performance.now();
    await downloadInParallel(bucket, {validation: checkType});
    end = performance.now();

    iterationResult.elapsedTimeUs = Math.round((end - start) * 1000);
    results.push(iterationResult);
  }
  return results;
}

main();

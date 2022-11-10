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

// eslint-disable-next-line node/no-unsupported-features/node-builtins
import {parentPort} from 'worker_threads';
import yargs from 'yargs';
import {Bucket, Storage, TransferManager} from '../src';
import {TRANSFER_MANAGER_TEST_TYPES} from './performanceTest';
import {
  cleanupFile,
  DEFAULT_LARGE_FILE_SIZE_BYTES,
  DEFAULT_SMALL_FILE_SIZE_BYTES,
  generateRandomDirectoryStructure,
  generateRandomFile,
  generateRandomFileName,
} from './performanceUtils';

const TEST_NAME_STRING = 'transfer-manager-perf-metrics';
const DEFAULT_BUCKET_NAME = 'nodejs-transfer-manager-perf-metrics';
const DEFAULT_NUMBER_OF_PROMISES = 2;
const DEFAULT_NUMBER_OF_OBJECTS = 1000;
const DEFAULT_CHUNK_SIZE_BYTES = 16 * 1024 * 1024;

export interface TransferManagerTestResult {
  numberOfObjects: number;
}

let stg: Storage;
let bucket: Bucket;
let tm: TransferManager;

const argv = yargs(process.argv.slice(2))
  .options({
    bucket: {type: 'string', default: DEFAULT_BUCKET_NAME},
    small: {type: 'number', default: DEFAULT_SMALL_FILE_SIZE_BYTES},
    large: {type: 'number', default: DEFAULT_LARGE_FILE_SIZE_BYTES},
    numpromises: {type: 'number', default: DEFAULT_NUMBER_OF_PROMISES},
    numobjects: {type: 'number', default: DEFAULT_NUMBER_OF_OBJECTS},
    chunksize: {type: 'number', default: DEFAULT_CHUNK_SIZE_BYTES},
    projectid: {type: 'string'},
    testtype: {
      type: 'string',
      choices: [
        TRANSFER_MANAGER_TEST_TYPES.UPLOAD_MULTIPLE_OBJECTS,
        TRANSFER_MANAGER_TEST_TYPES.DOWNLOAD_MULTIPLE_OBJECTS,
        TRANSFER_MANAGER_TEST_TYPES.LARGE_FILE_DOWNLOAD,
      ],
    },
  })
  .parseSync();

async function main() {
  let results: TransferManagerTestResult[] = [];
  await performTestSetup();

  switch (argv.testtype) {
    case TRANSFER_MANAGER_TEST_TYPES.UPLOAD_MULTIPLE_OBJECTS:
      results = await performUploadMultipleObjectsTest();
      break;
    case TRANSFER_MANAGER_TEST_TYPES.DOWNLOAD_MULTIPLE_OBJECTS:
      results = await performDownloadMultipleObjectsTest();
      break;
    case TRANSFER_MANAGER_TEST_TYPES.LARGE_FILE_DOWNLOAD:
      results = await performDownloadLargeFileTest();
      break;
    default:
      break;
  }
  parentPort?.postMessage(results);
}

async function performTestSetup() {
  stg = new Storage({projectId: argv.projectid});
  bucket = stg.bucket(argv.bucket);
  if (!(await bucket.exists())[0]) {
    await bucket.create();
  }
  tm = new TransferManager(bucket);
}

async function performUploadMultipleObjectsTest(): Promise<
  TransferManagerTestResult[]
> {
  const results: TransferManagerTestResult[] = [];
  const paths = generateRandomDirectoryStructure(
    argv.numobjects,
    TEST_NAME_STRING,
    argv.small,
    argv.large
  );
  const uploadResults = await tm.uploadMulti(paths, {
    concurrencyLimit: argv.numpromises,
  });

  return results;
}

async function performDownloadMultipleObjectsTest(): Promise<
  TransferManagerTestResult[]
> {
  const results: TransferManagerTestResult[] = [];

  return results;
}

async function performDownloadLargeFileTest(): Promise<
  TransferManagerTestResult[]
> {
  const results: TransferManagerTestResult[] = [];
  try {
    const fileName = generateRandomFileName(TEST_NAME_STRING);
    generateRandomFile(fileName, argv.small, argv.large, __dirname);
    const file = bucket.file(`${fileName}`);

    await bucket.upload(`${__dirname}/${fileName}`);
    cleanupFile(fileName);
    const start = performance.now();
    await tm.downloadLargeFile(file, {
      concurrencyLimit: argv.numpromises,
      chunkSizeBytes: argv.chunksize,
    });
    const end = performance.now();
    console.log(Math.round((end - start) * 1000));
  } catch (e) {
    console.error(e);
  }

  return results;
}

main();

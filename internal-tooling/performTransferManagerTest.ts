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
  BLOCK_SIZE_IN_BYTES,
  cleanupFile,
  DEFAULT_LARGE_FILE_SIZE_BYTES,
  DEFAULT_SMALL_FILE_SIZE_BYTES,
  generateRandomDirectoryStructure,
  generateRandomFile,
  generateRandomFileName,
  NODE_DEFAULT_HIGHWATER_MARK_BYTES,
  TestResult,
} from './performanceUtils';
import {performance} from 'perf_hooks';
import {rmSync} from 'fs';

const TEST_NAME_STRING = 'tm-perf-metrics';
const DEFAULT_BUCKET_NAME = 'nodejs-transfer-manager-perf-metrics';
const DEFAULT_NUMBER_OF_PROMISES = 2;
const DEFAULT_NUMBER_OF_OBJECTS = 1000;
const DEFAULT_CHUNK_SIZE_BYTES = 16 * 1024 * 1024;
const DIRECTORY_PROBABILITY = 0.1;

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
        TRANSFER_MANAGER_TEST_TYPES.TRANSFER_MANAGER_UPLOAD_MULTIPLE_OBJECTS,
        TRANSFER_MANAGER_TEST_TYPES.TRANSFER_MANAGER_DOWNLOAD_MULTIPLE_OBJECTS,
        TRANSFER_MANAGER_TEST_TYPES.TRANSFER_MANAGER_LARGE_FILE_DOWNLOAD,
      ],
    },
  })
  .parseSync();

async function main() {
  let result: TestResult = {
    op: '',
    objectSize: 0,
    appBufferSize: 0,
    libBufferSize: 0,
    crc32Enabled: false,
    md5Enabled: false,
    apiName: 'JSON',
    elapsedTimeUs: 0,
    cpuTimeUs: 0,
    status: '[OK]',
  };
  await performTestSetup();

  switch (argv.testtype) {
    case TRANSFER_MANAGER_TEST_TYPES.TRANSFER_MANAGER_UPLOAD_MULTIPLE_OBJECTS:
      result = await performUploadMultipleObjectsTest();
      break;
    case TRANSFER_MANAGER_TEST_TYPES.TRANSFER_MANAGER_DOWNLOAD_MULTIPLE_OBJECTS:
      result = await performDownloadMultipleObjectsTest();
      break;
    case TRANSFER_MANAGER_TEST_TYPES.TRANSFER_MANAGER_LARGE_FILE_DOWNLOAD:
      result = await performDownloadLargeFileTest();
      break;
    default:
      break;
  }
  parentPort?.postMessage(result);
  await performTestCleanup();
}

async function performTestSetup() {
  stg = new Storage({projectId: argv.projectid});
  bucket = stg.bucket(argv.bucket);
  if (!(await bucket.exists())[0]) {
    await bucket.create();
  }
  tm = new TransferManager(bucket);
}

async function performTestCleanup() {
  await bucket.deleteFiles();
}

async function performUploadMultipleObjectsTest(): Promise<TestResult> {
  const result: TestResult = {
    op: 'WRITE',
    objectSize: 0,
    appBufferSize: BLOCK_SIZE_IN_BYTES,
    libBufferSize: NODE_DEFAULT_HIGHWATER_MARK_BYTES,
    crc32Enabled: false,
    md5Enabled: false,
    apiName: 'JSON',
    elapsedTimeUs: 0,
    cpuTimeUs: -1,
    status: '[OK]',
  };
  const creationInfo = generateRandomDirectoryStructure(
    argv.numobjects,
    TEST_NAME_STRING,
    argv.small,
    argv.large,
    DIRECTORY_PROBABILITY
  );
  result.objectSize = creationInfo.totalSizeInBytes;
  const start = performance.now();
  await tm.uploadMulti(creationInfo.paths, {
    concurrencyLimit: argv.numpromises,
  });
  const end = performance.now();

  result.elapsedTimeUs = Math.round((end - start) * 1000);
  rmSync(TEST_NAME_STRING, {recursive: true, force: true});

  return result;
}

async function performDownloadMultipleObjectsTest(): Promise<TestResult> {
  const result: TestResult = {
    op: 'READ',
    objectSize: 0,
    appBufferSize: BLOCK_SIZE_IN_BYTES,
    libBufferSize: NODE_DEFAULT_HIGHWATER_MARK_BYTES,
    crc32Enabled: false,
    md5Enabled: false,
    apiName: 'JSON',
    elapsedTimeUs: 0,
    cpuTimeUs: -1,
    status: '[OK]',
  };

  const creationInfo = generateRandomDirectoryStructure(
    argv.numobjects,
    TEST_NAME_STRING,
    argv.small,
    argv.large,
    DIRECTORY_PROBABILITY
  );
  result.objectSize = creationInfo.totalSizeInBytes;
  await tm.uploadMulti(creationInfo.paths, {
    concurrencyLimit: argv.numpromises,
  });
  rmSync(TEST_NAME_STRING, {recursive: true, force: true});
  const getFilesResult = await bucket.getFiles();
  const start = performance.now();
  await tm.downloadMulti(getFilesResult[0], {
    concurrencyLimit: argv.numpromises,
    prefix: __dirname,
  });
  const end = performance.now();

  result.elapsedTimeUs = Math.round((end - start) * 1000);
  //rmSync(TEST_NAME_STRING, {recursive: true, force: true});

  return result;
}

async function performDownloadLargeFileTest(): Promise<TestResult> {
  const fileName = generateRandomFileName(TEST_NAME_STRING);
  const sizeInBytes = generateRandomFile(
    fileName,
    argv.small,
    argv.large,
    __dirname
  );
  const result: TestResult = {
    op: 'READ',
    objectSize: sizeInBytes,
    appBufferSize: BLOCK_SIZE_IN_BYTES,
    libBufferSize: NODE_DEFAULT_HIGHWATER_MARK_BYTES,
    crc32Enabled: false,
    md5Enabled: false,
    apiName: 'JSON',
    elapsedTimeUs: 0,
    cpuTimeUs: -1,
    status: '[OK]',
  };
  const file = bucket.file(`${fileName}`);

  await bucket.upload(`${__dirname}/${fileName}`);
  cleanupFile(fileName);
  const start = performance.now();
  await tm.downloadLargeFile(file, {
    concurrencyLimit: argv.numpromises,
    chunkSizeBytes: argv.chunksize,
    path: `${__dirname}`,
  });
  const end = performance.now();

  result.elapsedTimeUs = Math.round((end - start) * 1000);
  cleanupFile(fileName);

  return result;
}

main();

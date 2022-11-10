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
import * as uuid from 'uuid';
import {execSync} from 'child_process';
import {unlinkSync, opendirSync} from 'fs';
import {Bucket, DownloadOptions, DownloadResponse, File, Storage} from '../src';
import {performance} from 'perf_hooks';
// eslint-disable-next-line node/no-unsupported-features/node-builtins
import {parentPort} from 'worker_threads';
import path = require('path');
import { generateRandomDirectoryStructure, generateRandomFileName, TestResult } from './performanceUtils';

const TEST_NAME_STRING = 'nodejs-perf-metrics';
const DEFAULT_NUMBER_OF_WRITES = 1;
const DEFAULT_NUMBER_OF_READS = 3;
const DEFAULT_BUCKET_NAME = 'nodejs-perf-metrics-shaffeeullah';
const DEFAULT_SMALL_FILE_SIZE_BYTES = 5120;
const DEFAULT_LARGE_FILE_SIZE_BYTES = 2.147e9;
const BLOCK_SIZE_IN_BYTES = 1024;
const NODE_DEFAULT_HIGHWATER_MARK_BYTES = 16384;


/**
 * Create a uniformly distributed random integer beween the inclusive min and max provided.
 *
 * @param {number} minInclusive lower bound (inclusive) of the range of random integer to return.
 * @param {number} maxInclusive upper bound (inclusive) of the range of random integer to return.
 * @returns {number} returns a random integer between minInclusive and maxInclusive
 */
const randomInteger = (minInclusive: number, maxInclusive: number) => {
  // Utilizing Math.random will generate uniformly distributed random numbers.
  return (
    Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive
  );
};

const argv = yargs(process.argv.slice(2))
  .options({
    bucket: {type: 'string', default: DEFAULT_BUCKET_NAME},
    small: {type: 'number', default: DEFAULT_SMALL_FILE_SIZE_BYTES},
    large: {type: 'number', default: DEFAULT_LARGE_FILE_SIZE_BYTES},
    projectid: {type: 'string'},
  })
  .parseSync();

/**
 * Main entry point. This function performs a test iteration and posts the message back
 * to the parent thread.
 */
async function main() {
  const results = await performWriteReadTest();
  parentPort?.postMessage(results);
}

async function uploadInParallel(bucket: Bucket, directory: string, validation: Object) {

  const promises = [];
  let openedDir = opendirSync(directory);  
  console.log("\nPath of the directory:", openedDir.path);
  console.log("Files Present in directory:");
  let filesLeft = true;
  while (filesLeft) {
    // Read a file as fs.Dirent object
    let fileDirent = openedDir.readSync();
    
    // If readSync() does not return null
    // print its filename
    if (fileDirent != null) {
      console.log("Name:", fileDirent.name);
      promises.push(bucket.upload(`${directory}/${fileDirent!.name}`, validation))
    }
    // If the readSync() returns null
    // stop the loop
    else filesLeft = false;
  }
  await Promise.all(promises).catch(console.error);
}

async function downloadInParallel(bucket: Bucket, options: DownloadOptions) {
  const promises: Promise<DownloadResponse> [] = [];
  const [files] = await bucket.getFiles();
  files.forEach(file => {
    promises.push(file.download(options));
  });
  await Promise.all(promises).catch(console.error);
}

/**
 * Performs an iteration of the Write 1 / Read 3 performance measuring test.
 *
 * @returns {Promise<TestResult[]} Promise that resolves to an array of test results for the iteration.
 */
async function performWriteReadTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const directory = TEST_NAME_STRING;//"/node-test-files"
  generateRandomDirectoryStructure(10, directory);
  const checkType = randomInteger(0, 2);

  const stg = new Storage({
    projectId: argv.projectid,
  });

  let bucket = stg.bucket(argv.bucket);
  if (!(await bucket.exists())[0]) {
    await bucket.create();
  }

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

    await bucket.deleteFiles();

    if (checkType === 0) {
      start = performance.now();
      await uploadInParallel(bucket, `${directory}`, {validation: false});
      end = performance.now();
    } else if (checkType === 1) {
      iterationResult.crc32Enabled = true;
      start = performance.now();
      await uploadInParallel(bucket, `${directory}`, {validation: 'crc32c'});
      end = performance.now();
    } else {
      iterationResult.md5Enabled = true;
      start = performance.now();
      await uploadInParallel(bucket, `${directory}`, {validation: 'md5'});
      end = performance.now();
    }

    iterationResult.elapsedTimeUs = Math.round((end - start) * 1000);
    results.push(iterationResult);
  }

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

    const destinationFileName = "TODO"
    const destination = path.join(__dirname, destinationFileName);
    if (checkType === 0) {
      start = performance.now();
      await downloadInParallel(bucket, {validation: false, destination});
      end = performance.now();
    } else if (checkType === 1) {
      iterationResult.crc32Enabled = true;
      start = performance.now();
      await downloadInParallel(bucket, {validation: 'crc32c', destination});
      end = performance.now();
    } else {
      iterationResult.md5Enabled = true;
      start = performance.now();
      await downloadInParallel(bucket, {validation: 'md5', destination});
      end = performance.now();
    }
    iterationResult.elapsedTimeUs = Math.round((end - start) * 1000);
    results.push(iterationResult);
  }
  return results;
}

main();

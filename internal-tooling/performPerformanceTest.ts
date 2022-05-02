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
import {unlinkSync} from 'fs';
import {Storage} from '../src';
import {performance} from 'perf_hooks';
// eslint-disable-next-line node/no-unsupported-features/node-builtins
import {parentPort} from 'worker_threads';
import path = require('path');

const TEST_NAME_STRING = 'nodejs-perf-metrics';
const DEFAULT_NUMBER_OF_WRITES = 1;
const DEFAULT_NUMBER_OF_READS = 3;
const DEFAULT_BUCKET_NAME = 'nodejs-perf-metrics';
const DEFAULT_SMALL_FILE_SIZE_BYTES = 5120;
const DEFAULT_LARGE_FILE_SIZE_BYTES = 2.147e9;
const BLOCK_SIZE_IN_BYTES = 1024;
const NODE_DEFAULT_HIGHWATER_MARK_BYTES = 16384;

export interface TestResult {
  op: string;
  objectSize: number;
  appBufferSize: number;
  libBufferSize: number;
  crc32Enabled: boolean;
  md5Enabled: boolean;
  apiName: 'JSON' | 'XML';
  elapsedTimeUs: number;
  cpuTimeUs: number;
  status: '[OK]';
}

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

async function main() {
  const results = await performWriteReadTest();
  parentPort?.postMessage(results);
}

async function performWriteReadTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const fileName = generateRandomFileName();
  const sizeInBytes = generateRandomFile(fileName);
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

    bucket = stg.bucket(argv.bucket, {
      preconditionOpts: {
        ifGenerationMatch: 0,
      },
    });

    if (checkType === 0) {
      start = performance.now();
      await bucket.upload(`${__dirname}/${fileName}`, {validation: false});
      end = performance.now();
    } else if (checkType === 1) {
      iterationResult.crc32Enabled = true;
      start = performance.now();
      await bucket.upload(`${__dirname}/${fileName}`, {validation: 'crc32c'});
      end = performance.now();
    } else {
      iterationResult.md5Enabled = true;
      start = performance.now();
      await bucket.upload(`${__dirname}/${fileName}`, {validation: 'md5'});
      end = performance.now();
    }

    iterationResult.elapsedTimeUs = Math.round((end - start) * 1000);
    results.push(iterationResult);
  }

  bucket = stg.bucket(argv.bucket);
  for (let j = 0; j < DEFAULT_NUMBER_OF_READS; j++) {
    let start = 0;
    let end = 0;
    const file = bucket.file(`${fileName}`);
    const iterationResult: TestResult = {
      op: `READ[${j}]`,
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

    const destinationFileName = generateRandomFileName();
    const destination = path.join(__dirname, destinationFileName);
    if (checkType === 0) {
      start = performance.now();
      await file.download({validation: false, destination});
      end = performance.now();
    } else if (checkType === 1) {
      iterationResult.crc32Enabled = true;
      start = performance.now();
      await file.download({validation: 'crc32c', destination});
      end = performance.now();
    } else {
      iterationResult.md5Enabled = true;
      start = performance.now();
      await file.download({validation: 'md5', destination});
      end = performance.now();
    }
    cleanupFile(destinationFileName);
    iterationResult.elapsedTimeUs = Math.round((end - start) * 1000);
    results.push(iterationResult);
  }

  cleanupFile(fileName);

  return results;
}

function generateRandomFile(fileName: string) {
  const fileSizeBytes = randomInteger(argv.small, argv.large);
  const numberNeeded = Math.ceil(fileSizeBytes / BLOCK_SIZE_IN_BYTES);
  const cmd = `dd if=/dev/urandom of=${__dirname}/${fileName} bs=${BLOCK_SIZE_IN_BYTES} count=${numberNeeded} status=none iflag=fullblock`;
  execSync(cmd);

  return fileSizeBytes;
}

function generateRandomFileName(): string {
  return `${TEST_NAME_STRING}.${uuid.v4()}`;
}

function cleanupFile(fileName: string) {
  unlinkSync(`${__dirname}/${fileName}`);
}

main();

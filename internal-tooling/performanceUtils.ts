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

import {execSync} from 'child_process';
import {mkdirSync} from 'fs';
import path = require('path');
import * as uuid from 'uuid';

export const BLOCK_SIZE_IN_BYTES = 1024;
export const DEFAULT_SMALL_FILE_SIZE_BYTES = 5120;
export const DEFAULT_LARGE_FILE_SIZE_BYTES = 2.147e9;

const CREATE_DIRECTORY = 1;

/**
 * Create a uniformly distributed random integer beween the inclusive min and max provided.
 *
 * @param {number} minInclusive lower bound (inclusive) of the range of random integer to return.
 * @param {number} maxInclusive upper bound (inclusive) of the range of random integer to return.
 * @returns {number} returns a random integer between minInclusive and maxInclusive
 */
export function randomInteger(minInclusive: number, maxInclusive: number) {
  // Utilizing Math.random will generate uniformly distributed random numbers.
  return (
    Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive
  );
}

/**
 * Creates a random file name by appending a UUID to the baseName.
 *
 * @param {string} baseName the base file name. A random uuid will be appended to this value.
 *
 * @returns {string} random file name that was generated.
 */
export function generateRandomFileName(baseName: string): string {
  return `${baseName}.${uuid.v4()}`;
}

/**
 * Creates a file with a size between the small (default 5120 bytes) and large (2.147e9 bytes) parameters.
 * The file is filled with random data.
 *
 * @param {string} fileName name of the file to generate.
 * @param {number} fileSizeLowerBoundBytes minimum size of file to generate.
 * @param {number} fileSizeUpperBoundBytes maximum size of file to generate.
 * @param {string} currentDirectory the directory in which to generate the file.
 *
 * @returns {number} the size of the file generated.
 */
export function generateRandomFile(
  fileName: string,
  fileSizeLowerBoundBytes: number = DEFAULT_SMALL_FILE_SIZE_BYTES,
  fileSizeUpperBoundBytes: number = DEFAULT_LARGE_FILE_SIZE_BYTES,
  currentDirectory: string = __dirname
) {
  const fileSizeBytes = randomInteger(
    fileSizeLowerBoundBytes,
    fileSizeUpperBoundBytes
  );
  const numberNeeded = Math.ceil(fileSizeBytes / BLOCK_SIZE_IN_BYTES);
  const cmd = `dd if=/dev/urandom of=${currentDirectory}/${fileName} bs=${BLOCK_SIZE_IN_BYTES} count=${numberNeeded} status=none iflag=fullblock`;
  execSync(cmd);

  return fileSizeBytes;
}

/**
 * Creates a random directory structure consisting of subdirectories and random files.
 *
 * @param {number} maxObjects the total number of subdirectories and files to generate.
 * @param {string} baseName the starting directory under which everything else is added. File names will have this value prepended.
 * @param {number} fileSizeLowerBoundBytes minimum size of file to generate.
 * @param {number} fileSizeUpperBoundBytes maximum size of file to generate.
 */
export function generateRandomDirectoryStructure(
  maxObjects: number,
  baseName: string,
  fileSizeLowerBoundBytes: number = DEFAULT_SMALL_FILE_SIZE_BYTES,
  fileSizeUpperBoundBytes: number = DEFAULT_LARGE_FILE_SIZE_BYTES
) {
  let curPath = baseName;
  for (let i = 0; i < maxObjects; i++) {
    const dirOrFile = randomInteger(0, 1);
    if (dirOrFile === CREATE_DIRECTORY) {
      curPath = path.join(curPath, uuid.v4());
      mkdirSync(curPath, {recursive: true});
    } else {
      generateRandomFile(
        generateRandomFileName(baseName),
        fileSizeLowerBoundBytes,
        fileSizeUpperBoundBytes,
        curPath
      );
    }
  }
}

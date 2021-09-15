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
import {execSync} from 'child_process';
import {URL} from 'url';

const HOST = process.env.STORAGE_EMULATOR_HOST || 'http://localhost:9000';
const PORT = new URL(HOST).port;
const DEFAULT_IMAGE_NAME =
  'gcr.io/cloud-devrel-public-resources/storage-testbench';
const DEFAULT_IMAGE_TAG = 'latest';
const DOCKER_IMAGE = `${DEFAULT_IMAGE_NAME}:${DEFAULT_IMAGE_TAG}`;
const PULL_CMD = `docker pull ${DOCKER_IMAGE}`;
const RUN_CMD = `docker run --rm -d -p ${PORT} ${DOCKER_IMAGE}`;

export function getTestBenchDockerImage(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      resolve(execSync(PULL_CMD));
    } catch (err) {
      reject(err);
    }
  });
}

export function runTestBenchDockerImage(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      resolve(execSync(RUN_CMD));
    } catch (err) {
      reject(err);
    }
  });
}

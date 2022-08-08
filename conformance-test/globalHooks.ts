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
import {
  getTestBenchDockerImage,
  runTestBenchDockerImage,
  stopTestBenchDockerImage,
} from './testBenchUtil';

const TIMEOUT_FOR_DOCKER_OPS = 60000;
const TIME_TO_WAIT_FOR_CONTAINER_READY = 10000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function mochaGlobalSetup(this: any) {
  // Increase the timeout for this before block so that the docker images have time to download and run.
  this.suite._timeout = TIMEOUT_FOR_DOCKER_OPS;
  await getTestBenchDockerImage();
  await runTestBenchDockerImage();
  await new Promise(resolve =>
    setTimeout(resolve, TIME_TO_WAIT_FOR_CONTAINER_READY)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function mochaGlobalTeardown(this: any) {
  // Increase the timeout for this block so that docker has time to stop the container.
  this.suite._timeout = TIMEOUT_FOR_DOCKER_OPS;
  await stopTestBenchDockerImage();
}

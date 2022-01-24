import {
  getTestBenchDockerImage,
  runTestBenchDockerImage,
  stopTestBenchDockerImage,
} from './testBenchUtil';

const TIMEOUT_FOR_DOCKER_OPS = 60000;

export async function mochaGlobalSetup(this: any) {
  // Increase the timeout for this before block so that the docker images have time to download and run.
  this.suite._timeout = TIMEOUT_FOR_DOCKER_OPS;
  await getTestBenchDockerImage();
  await runTestBenchDockerImage();
}

export async function mochaGlobalTeardown(this: any) {
  // Increase the timeout for this block so that docker has time to stop the container.
  this.suite._timeout = TIMEOUT_FOR_DOCKER_OPS;
  await stopTestBenchDockerImage();
}

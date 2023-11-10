// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  assertEquals,
  assertStrictEquals,
} from 'https://deno.land/std@0.205.0/assert/mod.ts';
import {join} from 'https://deno.land/std@0.205.0/path/mod.ts';
import {
  afterEach,
  beforeEach,
  afterAll,
  beforeAll,
  describe,
  it,
} from 'https://deno.land/std@0.205.0/testing/bdd.ts';
import {Buffer} from 'https://deno.land/std@0.177.0/node/buffer.ts';
import {
  Storage,
  LifecycleRule,
  UploadOptions,
  ApiError,
} from 'npm:@google-cloud/storage';
import * as fs from 'node:fs';

const PROJECT_ID = 'deno-system-test';
const CONTAINER_NAME = 'storage-testbench-deno';
const HOST = Deno.env.get('STORAGE_EMULATOR_HOST') || 'http://localhost:9000';
const PORT = new URL(HOST).port;
const DEFAULT_IMAGE_NAME =
  'gcr.io/cloud-devrel-public-resources/storage-testbench';
const DEFAULT_IMAGE_TAG = 'v0.39.0';
const DOCKER_IMAGE = `${DEFAULT_IMAGE_NAME}:${DEFAULT_IMAGE_TAG}`;
const PULL_ARGS = ['pull', `${DOCKER_IMAGE}`];
const RUN_ARGS = [
  'run',
  '--rm',
  '-d',
  '-p',
  `${PORT}:${PORT}`,
  '--name',
  `${CONTAINER_NAME}`,
  `${DOCKER_IMAGE}`,
];
const STOP_ARGS = ['stop', `${CONTAINER_NAME}`];

describe('Storage', () => {
  const storage = new Storage({
    apiEndpoint: HOST,
    projectId: PROJECT_ID,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FILES: {[index: string]: any} = {
    logo: {
      path: new URL(
        join(import.meta.url, '../../data/CloudPlatform_128px_Retina.png')
      )
        .toString()
        .replace('file://', ''),
    },
    big: {
      path: new URL(join(import.meta.url, '../../data/three-mb-file.tif'))
        .toString()
        .replace('file://', ''),
      hash: undefined,
    },
    html: {
      path: new URL(join(import.meta.url, '../../data/long-html-file.html'))
        .toString()
        .replace('file://', ''),
    },
    empty: {
      path: new URL(join(import.meta.url, '../../data/empty-file.txt'))
        .toString()
        .replace('file://', ''),
    },
  };

  beforeAll(async () => {
    const pullCmd = new Deno.Command('docker', {args: PULL_ARGS});
    await pullCmd.output();
    const runCmd = new Deno.Command('docker', {args: RUN_ARGS});
    await runCmd.output();
  });

  afterAll(async () => {
    const stopCmd = new Deno.Command('docker', {args: STOP_ARGS});
    await stopCmd.output();
  });

  describe('bucket', () => {
    const RETENTION_DURATION_SECONDS = 10;
    const corsEntry = [
      {
        maxAgeSeconds: 1600,
      },
      {
        maxAgeSeconds: 3600,
        method: ['GET', 'POST'],
        origin: ['*'],
        responseHeader: ['Content-Type', 'Access-Control-Allow-Origin'],
      },
    ];
    const lifecycle = {
      rule: [
        {
          action: {
            type: 'Delete',
          },
          condition: {
            age: 30,
            isLive: true,
          },
        },
      ],
    };

    describe('creation', () => {
      const BUCKET_NAME = 'deno-bucket-tests';
      const bucket = storage.bucket(BUCKET_NAME);

      afterEach(async () => {
        await bucket.delete();
      });

      it('should create a bucket without versioning set', async () => {
        const response = await bucket.create();
        await bucket.getMetadata();

        assertStrictEquals(response[0].name, BUCKET_NAME);
        assertStrictEquals(bucket.metadata.versioning, undefined);
      });

      it('should create a bucket with versioning enabled', async () => {
        await bucket.create({versioning: {enabled: true}});
        await bucket.getMetadata();

        assertStrictEquals(bucket.metadata.versioning?.enabled, true);
      });

      it('should create a bucket with a retention policy', async () => {
        await bucket.create({
          retentionPolicy: {retentionPeriod: RETENTION_DURATION_SECONDS},
        });
        await bucket.getMetadata();

        assertStrictEquals(
          bucket.metadata.retentionPolicy!.retentionPeriod,
          `${RETENTION_DURATION_SECONDS}`
        );
      });

      it('should create a bucket with requester pays functionality', async () => {
        await bucket.create({
          billing: {
            requesterPays: true,
          },
        });
        await bucket.getMetadata();

        assertStrictEquals(bucket.metadata.billing!.requesterPays, true);
      });

      it('should create a bucket with a CORS configuration', async () => {
        await bucket.create({
          cors: corsEntry,
        });
        await bucket.getMetadata();

        assertEquals(bucket.metadata.cors, corsEntry);
      });

      it('should create a bucket with a lifecycle rule', async () => {
        await bucket.create({
          lifecycle,
        });
        await bucket.getMetadata();

        assertEquals(
          bucket.metadata.lifecycle?.rule![0],
          lifecycle.rule[0] as LifecycleRule
        );
      });
    });

    describe('metadata operations', () => {
      const BUCKET_NAME = 'deno-bucket-metadata-tests';
      const bucket = storage.bucket(BUCKET_NAME);

      beforeEach(async () => {
        await bucket.create();
      });

      afterEach(async () => {
        await bucket.delete();
      });

      it('should allow setting metadata on a bucket', async () => {
        const metadata = {
          website: {
            mainPageSuffix: 'http://fakeuri',
            notFoundPage: 'http://fakeuri/404.html',
          },
        };

        const [meta] = await bucket.setMetadata(metadata);
        assertEquals(meta.website, metadata.website);
      });

      it('should set a retention policy', async () => {
        await bucket.getMetadata();
        assertStrictEquals(bucket.metadata.retentionPolicy, undefined);
        await bucket.setRetentionPeriod(RETENTION_DURATION_SECONDS);
        await bucket.getMetadata();

        assertStrictEquals(
          bucket.metadata!.retentionPolicy!.retentionPeriod,
          `${RETENTION_DURATION_SECONDS}`
        );
      });

      it('should remove a retention policy', async () => {
        await bucket.setRetentionPeriod(RETENTION_DURATION_SECONDS);
        await bucket.getMetadata();
        assertStrictEquals(
          bucket.metadata!.retentionPolicy!.retentionPeriod,
          `${RETENTION_DURATION_SECONDS}`
        );
        await bucket.removeRetentionPeriod();
        await bucket.getMetadata();

        assertStrictEquals(bucket.metadata.retentionPolicy, undefined);
      });

      it('should set a CORS configuration', async () => {
        await bucket.setCorsConfiguration(corsEntry);
        await bucket.getMetadata();

        assertEquals(bucket.metadata.cors, corsEntry);
      });

      it('should remove a CORS configuration', async () => {
        await bucket.setCorsConfiguration(corsEntry);
        await bucket.getMetadata();
        assertEquals(bucket.metadata.cors, corsEntry);
        await bucket.setCorsConfiguration([]);
        await bucket.getMetadata();

        assertEquals(bucket.metadata.cors, undefined);
      });

      it('should add a lifecycle rule', async () => {
        await bucket.addLifecycleRule(
          lifecycle.rule as unknown as LifecycleRule
        );

        assertEquals(
          bucket.metadata.lifecycle?.rule![0],
          lifecycle.rule[0] as LifecycleRule
        );
      });

      it('should remove a lifecycle rule', async () => {
        await bucket.addLifecycleRule(
          lifecycle.rule as unknown as LifecycleRule
        );
        assertEquals(
          bucket.metadata.lifecycle?.rule![0],
          lifecycle.rule[0] as LifecycleRule
        );

        await bucket.setMetadata({
          lifecycle: null,
        });

        assertEquals(bucket.metadata.lifecycle, undefined);
      });
    });

    describe('bucket file related operations', async () => {
      const BUCKET_NAME = 'deno-bucket-metadata-tests';
      const bucket = storage.bucket(BUCKET_NAME);

      beforeEach(async () => {
        await bucket.create();
      });

      afterEach(async () => {
        await bucket.deleteFiles();
        await bucket.delete();
      });

      it('should get all files in the bucket', async () => {
        await bucket.upload(FILES.logo.path, {
          destination: '1.png',
        } as UploadOptions);

        await bucket.upload(FILES.logo.path, {
          destination: '2.png',
        } as UploadOptions);

        const [files] = await bucket.getFiles();
        assertStrictEquals(files.length, 2);
      });

      it('should combine multiple files into one', async () => {
        const filesToUpload = [
          {file: bucket.file('file-one.txt'), contents: '123'},
          {file: bucket.file('file-two.txt'), contents: '456'},
        ];
        const sourceFiles = filesToUpload.map(f => f.file);

        await Promise.all(filesToUpload.map(f => f.file.save(f.contents)));
        await bucket.combine(sourceFiles, 'file-one-and-two.txt');
        const [files] = await bucket.getFiles();

        assertStrictEquals(files.length, 3);
      });
    });
  });

  describe('file', () => {
    const BUCKET_NAME = 'deno-file-tests';
    const bucket = storage.bucket(BUCKET_NAME);

    describe('data related operations', async () => {
      beforeEach(async () => {
        await bucket.create();
      });

      afterEach(async () => {
        await bucket.deleteFiles({force: true});
        await bucket.delete();
      });

      it('should read/write from/to a file in a directory', async () => {
        const file = bucket.file('directory/file');
        const contents = 'test';
        let data = Buffer.from('', 'utf8');

        await file.save(contents);
        await new Promise((res, rej) => {
          file
            .createReadStream()
            .on('error', rej)
            .on('data', (chunk: Buffer) => {
              data = Buffer.concat([data, chunk]);
            })
            .on('end', () => {
              assertStrictEquals(data.toString(), contents);
              res(true);
            });
        });
      });

      it('should not push data when a file cannot be read', async () => {
        const file = bucket.file('non-existent-file');
        let dataEmitted = false;

        await new Promise(res => {
          file
            .createReadStream()
            .on('data', () => {
              dataEmitted = true;
            })
            .on('error', (err: ApiError) => {
              assertStrictEquals(dataEmitted, false);
              assertStrictEquals((err as ApiError).code, 404);
              res(true);
            });
        });
      });

      it('should read a byte range from a file', async () => {
        const [file] = await bucket.upload(FILES.logo.path);
        const fileSize = parseInt(file!.metadata.size!.toString());
        const byteRange = {
          start: Math.floor((fileSize * 1) / 3),
          end: Math.floor((fileSize * 2) / 3),
        };
        const expectedContentSize = byteRange.start + 1;

        let sizeStreamed = 0;
        await new Promise((res, rej) => {
          file
            .createReadStream(byteRange)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on('data', (chunk: any) => {
              sizeStreamed += chunk.length;
            })
            .on('error', rej)
            .on('end', () => {
              assertStrictEquals(sizeStreamed, expectedContentSize + 1);
              res(true);
            });
        });
      });

      it('should download a file to memory', async () => {
        const fileContents = fs.readFileSync(FILES.logo.path);
        const [file] = await bucket.upload(FILES.logo.path);
        const [remoteContents] = await file.download();
        assertStrictEquals(String(fileContents), String(remoteContents));
      });
    });
  });
});

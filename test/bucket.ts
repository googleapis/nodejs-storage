// Copyright 2019 Google LLC
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
  ApiError,
  DecorateRequestOptions,
  ServiceObject,
  util,
} from '../src/nodejs-common';
import * as assert from 'assert';
import {describe, it, beforeEach, afterEach} from 'mocha';
import * as mime from 'mime-types';
import * as path from 'path';
import * as stream from 'stream';
import {Bucket, Channel, Notification, CRC32C, Iam} from '../src';
import {CreateWriteStreamOptions, File, FileOptions} from '../src/file';
import {
  GetBucketSignedUrlConfig,
  AvailableServiceObjectMethods,
  BucketExceptionMessages,
  BucketMetadata,
  LifecycleRule,
  DeleteFilesOptions,
  EnableLoggingOptions,
  GetLabelsCallback,
  SetLabelsCallback,
} from '../src/bucket';
import * as sinon from 'sinon';
import {Transform} from 'stream';
import {IdempotencyStrategy, Storage} from '../src/storage';
import {convertObjKeysToSnakeCase} from '../src/util';
import {SetMetadataOptions} from '../src/nodejs-common/service-object';
import {CoreOptions} from 'teeny-request';
import * as fs from 'fs';
import {SignerGetSignedUrlConfig, URLSigner} from '../src/signer';

const fakeUtil = Object.assign({}, util);
fakeUtil.noop = util.noop;
class HTTPError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

describe('Bucket', () => {
  let bucket: Bucket;

  const STORAGE = sinon.createStubInstance(Storage);
  STORAGE.retryOptions = {
    autoRetry: true,
    maxRetries: 3,
    retryDelayMultiplier: 2,
    totalTimeout: 600,
    maxRetryDelay: 60,
    retryableErrorFn: (err: ApiError) => {
      return err.code === 500;
    },
    idempotencyStrategy: IdempotencyStrategy.RetryConditional,
  };

  const BUCKET_NAME = 'test-bucket';

  beforeEach(() => {
    bucket = new Bucket(STORAGE, BUCKET_NAME);
  });

  describe('instantiation', () => {
    it('should remove a leading gs://', () => {
      const bucket = new Bucket(STORAGE, 'gs://bucket-name');
      assert.strictEqual(bucket.name, 'bucket-name');
    });

    it('should remove a trailing /', () => {
      const bucket = new Bucket(STORAGE, 'bucket-name/');
      assert.strictEqual(bucket.name, 'bucket-name');
    });

    it('should localize the name', () => {
      assert.strictEqual(bucket.name, BUCKET_NAME);
    });

    it('should localize the storage instance', () => {
      assert.strictEqual(bucket.storage, STORAGE);
    });

    describe('ACL objects', () => {
      beforeEach(() => {
        bucket = new Bucket(STORAGE, BUCKET_NAME);
      });

      it('should create an ACL object', () => {
        assert.strictEqual(bucket.acl.pathPrefix, '/acl');
      });

      it('should create a default ACL object', () => {
        assert.strictEqual(bucket.acl.default.pathPrefix, '/defaultObjectAcl');
      });
    });

    it('should inherit from ServiceObject', done => {
      const storageInstance = Object.assign({}, STORAGE, {
        createBucket: {
          bind(context: {}) {
            assert.strictEqual(context, storageInstance);
            done();
          },
        },
      });

      const bucket = new Bucket(storageInstance, BUCKET_NAME);
      // Using assert.strictEqual instead of assert to prevent
      // coercing of types.
      assert.strictEqual(bucket instanceof ServiceObject, true);
      assert.strictEqual(bucket.parent, storageInstance);
      assert.strictEqual(bucket.baseUrl, '/b');
      assert.strictEqual(bucket.id, BUCKET_NAME);
      assert.deepStrictEqual(bucket['methods'], {
        create: {reqOpts: {qs: {}}},
        delete: {reqOpts: {qs: {}}},
        exists: {reqOpts: {qs: {}}},
        get: {reqOpts: {qs: {}}},
        getMetadata: {reqOpts: {qs: {}}},
        setMetadata: {reqOpts: {qs: {}}},
      });
    });

    it('should set the correct query string with a userProject', () => {
      const options = {userProject: 'user-project'};
      const bucket = new Bucket(STORAGE, BUCKET_NAME, options);

      assert.deepStrictEqual(bucket['methods'], {
        create: {reqOpts: {qs: options}},
        delete: {reqOpts: {qs: options}},
        exists: {reqOpts: {qs: options}},
        get: {reqOpts: {qs: options}},
        getMetadata: {reqOpts: {qs: options}},
        setMetadata: {reqOpts: {qs: options}},
      });
    });

    it('should set the correct query string with ifGenerationMatch', () => {
      const options = {preconditionOpts: {ifGenerationMatch: 100}};
      const bucket = new Bucket(STORAGE, BUCKET_NAME, options);

      assert.deepStrictEqual(bucket['methods'], {
        create: {reqOpts: {qs: options.preconditionOpts}},
        delete: {reqOpts: {qs: options.preconditionOpts}},
        exists: {reqOpts: {qs: options.preconditionOpts}},
        get: {reqOpts: {qs: options.preconditionOpts}},
        getMetadata: {reqOpts: {qs: options.preconditionOpts}},
        setMetadata: {reqOpts: {qs: options.preconditionOpts}},
      });
      assert.deepStrictEqual(
        bucket.instancePreconditionOpts,
        options.preconditionOpts
      );
    });

    it('should set the correct query string with ifGenerationNotMatch', () => {
      const options = {preconditionOpts: {ifGenerationNotMatch: 100}};
      const bucket = new Bucket(STORAGE, BUCKET_NAME, options);

      assert.deepStrictEqual(bucket['methods'], {
        create: {reqOpts: {qs: options.preconditionOpts}},
        delete: {reqOpts: {qs: options.preconditionOpts}},
        exists: {reqOpts: {qs: options.preconditionOpts}},
        get: {reqOpts: {qs: options.preconditionOpts}},
        getMetadata: {reqOpts: {qs: options.preconditionOpts}},
        setMetadata: {reqOpts: {qs: options.preconditionOpts}},
      });
      assert.deepStrictEqual(
        bucket.instancePreconditionOpts,
        options.preconditionOpts
      );
    });

    it('should set the correct query string with ifMetagenerationMatch', () => {
      const options = {preconditionOpts: {ifMetagenerationMatch: 100}};
      const bucket = new Bucket(STORAGE, BUCKET_NAME, options);

      assert.deepStrictEqual(bucket['methods'], {
        create: {reqOpts: {qs: options.preconditionOpts}},
        delete: {reqOpts: {qs: options.preconditionOpts}},
        exists: {reqOpts: {qs: options.preconditionOpts}},
        get: {reqOpts: {qs: options.preconditionOpts}},
        getMetadata: {reqOpts: {qs: options.preconditionOpts}},
        setMetadata: {reqOpts: {qs: options.preconditionOpts}},
      });
      assert.deepStrictEqual(
        bucket.instancePreconditionOpts,
        options.preconditionOpts
      );
    });

    it('should set the correct query string with ifMetagenerationNotMatch', () => {
      const options = {preconditionOpts: {ifMetagenerationNotMatch: 100}};
      const bucket = new Bucket(STORAGE, BUCKET_NAME, options);

      assert.deepStrictEqual(bucket['methods'], {
        create: {reqOpts: {qs: options.preconditionOpts}},
        delete: {reqOpts: {qs: options.preconditionOpts}},
        exists: {reqOpts: {qs: options.preconditionOpts}},
        get: {reqOpts: {qs: options.preconditionOpts}},
        getMetadata: {reqOpts: {qs: options.preconditionOpts}},
        setMetadata: {reqOpts: {qs: options.preconditionOpts}},
      });
      assert.deepStrictEqual(
        bucket.instancePreconditionOpts,
        options.preconditionOpts
      );
    });

    it('should localize an Iam instance', () => {
      assert.strictEqual(bucket.iam instanceof Iam, true);
    });

    it('should localize userProject if provided', () => {
      const fakeUserProject = 'grape-spaceship-123';
      const bucket = new Bucket(STORAGE, BUCKET_NAME, {
        userProject: fakeUserProject,
      });

      assert.strictEqual(bucket.userProject, fakeUserProject);
    });

    it('should accept a `crc32cGenerator`', () => {
      const crc32cValidatorStub = sinon.createStubInstance(CRC32C);
      const crc32cGenerator = () => crc32cValidatorStub;

      const bucket = new Bucket(STORAGE, 'bucket-name', {crc32cGenerator});
      assert.strictEqual(bucket.crc32cGenerator, crc32cGenerator);
    });

    it("should use storage's `crc32cGenerator` by default", () => {
      assert.strictEqual(bucket.crc32cGenerator, STORAGE.crc32cGenerator);
    });
  });

  describe('cloudStorageURI', () => {
    it('should return the appropriate `gs://` URI', () => {
      const bucket = new Bucket(STORAGE, BUCKET_NAME);

      assert(bucket.cloudStorageURI instanceof URL);
      assert.equal(bucket.cloudStorageURI.host, BUCKET_NAME);
    });
  });

  describe('addLifecycleRule', () => {
    let getMetadataStub: sinon.SinonStub;
    let setMetadataStub: sinon.SinonStub;

    beforeEach(() => {
      getMetadataStub = sinon
        .stub(bucket, 'getMetadata')
        .callsFake(callback => {
          callback(null, {});
        });
    });

    afterEach(() => {
      getMetadataStub.restore();
      setMetadataStub.restore();
    });

    it('should accept raw input', done => {
      const rule: LifecycleRule = {
        action: {
          type: 'Delete',
        },
        condition: {},
      };

      setMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.deepStrictEqual(metadata.lifecycle!.rule, [rule]);
          done();
        });

      bucket.addLifecycleRule(rule, assert.ifError);
    });

    it('should properly set condition', done => {
      const rule: LifecycleRule = {
        action: {
          type: 'Delete',
        },
        condition: {
          age: 30,
        },
      };

      setMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.deepStrictEqual(metadata.lifecycle?.rule, [
            {
              action: {
                type: 'Delete',
              },
              condition: rule.condition,
            },
          ]);
          done();
        });

      bucket.addLifecycleRule(rule, assert.ifError);
    });

    it('should convert Date object to date string for condition', done => {
      const date = new Date();

      const rule: LifecycleRule = {
        action: {
          type: 'Delete',
        },
        condition: {
          createdBefore: date,
        },
      };

      setMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          const expectedDateString = date.toISOString().replace(/T.+$/, '');

          const rule = metadata!.lifecycle!.rule![0];
          assert.strictEqual(rule.condition.createdBefore, expectedDateString);

          done();
        });

      bucket.addLifecycleRule(rule, assert.ifError);
    });

    it('should optionally overwrite existing rules', done => {
      const rule: LifecycleRule = {
        action: {
          type: 'Delete',
        },
        condition: {},
      };

      const options = {
        append: false,
      };

      getMetadataStub.restore();
      getMetadataStub = sinon.stub(bucket, 'getMetadata').callsFake(() => {
        done(new Error('Metadata should not be refreshed.'));
      });

      setMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.strictEqual(metadata!.lifecycle!.rule!.length, 1);
          assert.deepStrictEqual(metadata.lifecycle?.rule, [rule]);
          done();
        });

      bucket.addLifecycleRule(rule, options, assert.ifError);
    });

    it('should combine rule with existing rules by default', done => {
      const existingRule: LifecycleRule = {
        action: {
          type: 'Delete',
        },
        condition: {},
      };

      const newRule: LifecycleRule = {
        action: {
          type: 'Delete',
        },
        condition: {},
      };

      getMetadataStub.restore();
      getMetadataStub = sinon
        .stub(bucket, 'getMetadata')
        .callsFake(callback => {
          callback(null, {lifecycle: {rule: [existingRule]}});
        });

      setMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.strictEqual(metadata!.lifecycle!.rule!.length, 2);
          assert.deepStrictEqual(metadata.lifecycle?.rule, [
            existingRule,
            newRule,
          ]);
          done();
        });

      bucket.addLifecycleRule(newRule, assert.ifError);
    });

    it('should accept multiple rules', done => {
      const existingRule: LifecycleRule = {
        action: {
          type: 'Delete',
        },
        condition: {},
      };

      const newRules: LifecycleRule[] = [
        {
          action: {
            type: 'Delete',
          },
          condition: {},
        },
        {
          action: {
            type: 'Delete',
          },
          condition: {},
        },
      ];

      getMetadataStub.restore();
      getMetadataStub = sinon
        .stub(bucket, 'getMetadata')
        .callsFake(callback => {
          callback(null, {lifecycle: {rule: [existingRule]}});
        });

      setMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.strictEqual(metadata!.lifecycle!.rule!.length, 3);
          assert.deepStrictEqual(metadata.lifecycle?.rule, [
            existingRule,
            newRules[0],
            newRules[1],
          ]);
          done();
        });

      bucket.addLifecycleRule(newRules, assert.ifError);
    });

    it('should pass error from getMetadata to callback', done => {
      const error = new Error('from getMetadata');
      const rule: LifecycleRule = {
        action: {
          type: 'Delete',
        },
        condition: {},
      };

      getMetadataStub.restore();
      getMetadataStub = sinon
        .stub(bucket, 'getMetadata')
        .callsFake(callback => {
          callback(error);
        });

      setMetadataStub = sinon.stub(bucket, 'setMetadata').callsFake(() => {
        done(new Error('Metadata should not be set.'));
      });

      bucket.addLifecycleRule(rule, (err?: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });
  });

  describe('combine', () => {
    it('should throw if invalid sources are provided', () => {
      assert.rejects(async () => {
        bucket.combine([], 'destination'),
          BucketExceptionMessages.PROVIDE_SOURCE_FILE;
      });
    });

    it('should throw if a destination is not provided', () => {
      assert.rejects(async () => {
        bucket.combine(['1', '2'], ''),
          BucketExceptionMessages.DESTINATION_FILE_NOT_SPECIFIED;
      });
    });

    it('should use content type from the destination metadata', done => {
      const destination = bucket.file('destination.txt');

      sinon.stub(destination, 'request').callsFake(reqOpts => {
        assert.strictEqual(
          reqOpts.json.destination.contentType,
          mime.contentType(destination.name)
        );

        done();
      });

      bucket.combine(['1', '2'], destination);
    });

    it('should use content type from the destination metadata', done => {
      const destination = bucket.file('destination.txt');
      destination.metadata = {contentType: 'content-type'};

      sinon.stub(destination, 'request').callsFake(reqOpts => {
        assert.strictEqual(
          reqOpts.json.destination.contentType,
          destination.metadata.contentType
        );

        done();
      });

      bucket.combine(['1', '2'], destination);
    });

    it('should detect dest content type if not in metadata', done => {
      const destination = bucket.file('destination.txt');

      sinon.stub(destination, 'request').callsFake(reqOpts => {
        assert.strictEqual(
          reqOpts.json.destination.contentType,
          mime.contentType(destination.name)
        );

        done();
      });

      bucket.combine(['1', '2'], destination);
    });

    it('should make correct API request', done => {
      const sources = [bucket.file('1.txt'), bucket.file('2.txt')];
      const destination = bucket.file('destination.txt');

      sinon.stub(destination, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.uri, '/compose');
        assert.deepStrictEqual(reqOpts.json, {
          destination: {contentType: mime.contentType(destination.name)},
          sourceObjects: [{name: sources[0].name}, {name: sources[1].name}],
        });

        done();
      });

      bucket.combine(sources, destination);
    });

    it('should encode the destination file name', done => {
      const sources = [bucket.file('1.txt'), bucket.file('2.txt')];
      const destination = bucket.file('needs encoding.jpg');

      sinon.stub(destination, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.uri.indexOf(destination.name), -1);
        done();
      });

      bucket.combine(sources, destination);
    });

    it('should send a source generation value if available', done => {
      const sources = [bucket.file('1.txt'), bucket.file('2.txt')];
      sources[0].metadata = {generation: 1};
      sources[1].metadata = {generation: 2};

      const destination = bucket.file('destination.txt');
      sinon.stub(destination, 'request').callsFake(reqOpts => {
        assert.deepStrictEqual(reqOpts.json.sourceObjects, [
          {name: sources[0].name, generation: sources[0].metadata.generation},
          {name: sources[1].name, generation: sources[1].metadata.generation},
        ]);

        done();
      });

      bucket.combine(sources, destination);
    });

    it('should accept userProject option', done => {
      const options = {
        userProject: 'user-project-id',
      };

      const sources = [bucket.file('1.txt'), bucket.file('2.txt')];
      const destination = bucket.file('destination.txt');

      sinon.stub(destination, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.qs, options);
        done();
      });

      bucket.combine(sources, destination, options, assert.ifError);
    });

    it('should accept precondition options', done => {
      const options = {
        ifGenerationMatch: 100,
        ifGenerationNotMatch: 101,
        ifMetagenerationMatch: 102,
        ifMetagenerationNotMatch: 103,
      };

      const sources = [bucket.file('1.txt'), bucket.file('2.txt')];
      const destination = bucket.file('destination.txt');

      sinon.stub(destination, 'request').callsFake(reqOpts => {
        assert.strictEqual(
          reqOpts.qs.ifGenerationMatch,
          options.ifGenerationMatch
        );
        assert.strictEqual(
          reqOpts.qs.ifGenerationNotMatch,
          options.ifGenerationNotMatch
        );
        assert.strictEqual(
          reqOpts.qs.ifMetagenerationMatch,
          options.ifMetagenerationMatch
        );
        assert.strictEqual(
          reqOpts.qs.ifMetagenerationNotMatch,
          options.ifMetagenerationNotMatch
        );
        done();
      });

      bucket.combine(sources, destination, options, assert.ifError);
    });

    it('should execute the callback', done => {
      const sources = [bucket.file('1.txt'), bucket.file('2.txt')];
      const destination = bucket.file('destination.txt');

      sinon.stub(destination, 'request').callsFake((reqOpts, callback) => {
        callback(null);
      });

      bucket.combine(sources, destination, done);
    });

    it('should execute the callback with an error', done => {
      const sources = [bucket.file('1.txt'), bucket.file('2.txt')];
      const destination = bucket.file('destination.txt');

      const error = new Error('Error.');

      sinon.stub(destination, 'request').callsFake((reqOpts, callback) => {
        callback(error);
      });

      bucket.combine(sources, destination, (err: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should execute the callback with apiResponse', done => {
      const sources = [bucket.file('1.txt'), bucket.file('2.txt')];
      const destination = bucket.file('destination.txt');
      const resp = {success: true};

      sinon.stub(destination, 'request').callsFake((reqOpts, callback) => {
        callback(null, resp);
      });

      bucket.combine(
        sources,
        destination,
        (_err: Error | null, newFile?: File | null, apiResponse?: unknown) => {
          assert.strictEqual(resp, apiResponse);
          done();
        }
      );
    });

    it('should set maxRetries to 0 when ifGenerationMatch is undefined', done => {
      const sources = [bucket.file('1.txt'), bucket.file('2.txt')];
      const destination = bucket.file('destination.txt');

      sinon.stub(destination, 'request').callsFake((reqOpts, callback) => {
        assert.strictEqual(reqOpts.maxRetries, 0);
        callback(null);
      });

      bucket.combine(sources, destination, done);
    });
  });

  describe('createChannel', () => {
    const ID = 'id';
    const CONFIG = {
      address: 'https://...',
    };
    let bucketRequestStub: sinon.SinonStub;

    afterEach(() => {
      if (bucketRequestStub) {
        bucketRequestStub.restore();
      }
    });

    it('should throw if an ID is not provided', () => {
      assert.rejects(async () => {
        bucket.createChannel('', CONFIG),
          BucketExceptionMessages.CHANNEL_ID_REQUIRED;
      });
    });

    it('should make the correct request', done => {
      const config = Object.assign({}, CONFIG, {
        a: 'b',
        c: 'd',
      });
      const originalConfig = Object.assign({}, config);

      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(reqOpts.uri, '/o/watch');

        const expectedJson = Object.assign({}, config, {
          id: ID,
          type: 'web_hook',
        });
        assert.deepStrictEqual(reqOpts.json, expectedJson);
        assert.deepStrictEqual(config, originalConfig);

        done();
      });

      bucket.createChannel(ID, config, assert.ifError);
    });

    it('should accept userProject option', done => {
      const options = {
        userProject: 'user-project-id',
      };

      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.qs, options);
        done();
      });

      bucket.createChannel(ID, CONFIG, options, assert.ifError);
    });

    describe('error', () => {
      const error = new Error('Error.');
      const apiResponse = {};

      beforeEach(() => {
        bucketRequestStub = sinon
          .stub(bucket, 'request')
          .callsFake((reqOpts, callback) => {
            callback(error, apiResponse);
          });
      });

      it('should execute callback with error & API response', done => {
        bucket.createChannel(
          ID,
          CONFIG,
          (
            err: Error | null,
            channel: Channel | null,
            apiResponse_: unknown
          ) => {
            assert.strictEqual(err, error);
            assert.strictEqual(channel, null);
            assert.strictEqual(apiResponse_, apiResponse);

            done();
          }
        );
      });
    });

    describe('success', () => {
      const apiResponse = {
        resourceId: 'resource-id',
      };

      beforeEach(() => {
        bucketRequestStub = sinon
          .stub(bucket, 'request')
          .callsFake((reqOpts, callback) => {
            callback(null, apiResponse);
          });
      });

      it('should exec a callback with Channel & API response', done => {
        const channel: Channel = sinon.createStubInstance(Channel);

        (bucket.storage.channel as sinon.SinonStub).restore();
        sinon.stub(bucket.storage, 'channel').callsFake((id, resourceId) => {
          assert.strictEqual(id, ID);
          assert.strictEqual(resourceId, apiResponse.resourceId);
          return channel;
        });

        bucket.createChannel(
          ID,
          CONFIG,
          (
            err: Error | null,
            channel_: Channel | null,
            apiResponse_: unknown
          ) => {
            assert.ifError(err);
            assert.strictEqual(channel_, channel);
            assert.strictEqual(channel_.metadata, apiResponse);
            assert.strictEqual(apiResponse_, apiResponse);
            done();
          }
        );
      });
    });
  });

  describe('createNotification', () => {
    const PUBSUB_SERVICE_PATH = '//pubsub.googleapis.com/';
    const TOPIC = 'my-topic';
    const FULL_TOPIC_NAME =
      PUBSUB_SERVICE_PATH + 'projects/{{projectId}}/topics/' + TOPIC;
    let bucketRequestStub: sinon.SinonStub;

    beforeEach(() => {
      fakeUtil.isCustomType = util.isCustomType;
    });

    afterEach(() => {
      if (bucketRequestStub) {
        bucketRequestStub.restore();
      }
    });

    it('should throw an error if a valid topic is not provided', () => {
      assert.rejects(async () => {
        bucket.createNotification({} as unknown as string),
          BucketExceptionMessages.TOPIC_NAME_REQUIRED;
      });
    });

    it('should make the correct request', done => {
      const topic = 'projects/my-project/topics/my-topic';
      const options = {payloadFormat: 'NONE'};
      const expectedTopic = PUBSUB_SERVICE_PATH + topic;
      const expectedJson = Object.assign(
        {topic: expectedTopic},
        convertObjKeysToSnakeCase(options)
      );

      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(reqOpts.uri, '/notificationConfigs');
        assert.deepStrictEqual(reqOpts.json, expectedJson);
        assert.notStrictEqual(reqOpts.json, options);
        done();
      });

      bucket.createNotification(topic, options, assert.ifError);
    });

    it('should accept incomplete topic names', done => {
      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.json.topic, FULL_TOPIC_NAME);
        done();
      });

      bucket.createNotification(TOPIC, {}, assert.ifError);
    });

    it('should set a default payload format', done => {
      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.json.payload_format, 'JSON_API_V1');
        done();
      });

      bucket.createNotification(TOPIC, {}, assert.ifError);
    });

    it('should optionally accept options', done => {
      const expectedJson = {
        topic: FULL_TOPIC_NAME,
        payload_format: 'JSON_API_V1',
      };

      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.deepStrictEqual(reqOpts.json, expectedJson);
        done();
      });

      bucket.createNotification(TOPIC, assert.ifError);
    });

    it('should accept a userProject', done => {
      const options = {
        userProject: 'grape-spaceship-123',
      };

      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.qs.userProject, options.userProject);
        done();
      });

      bucket.createNotification(TOPIC, options, assert.ifError);
    });

    it('should return errors to the callback', done => {
      const error = new Error('err');
      const response = {};

      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(error, response);
        });

      bucket.createNotification(
        TOPIC,
        (
          err: Error | null,
          notification: Notification | null,
          resp: unknown
        ) => {
          assert.strictEqual(err, error);
          assert.strictEqual(notification, null);
          assert.strictEqual(resp, response);
          done();
        }
      );
    });

    it('should return a notification object', done => {
      const fakeId = '123';
      const response = {id: fakeId};
      const fakeNotification: Notification =
        sinon.createStubInstance(Notification);

      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(null, response);
        });

      sinon.stub(bucket, 'notification').callsFake(id => {
        assert.strictEqual(id, fakeId);
        return fakeNotification;
      });

      bucket.createNotification(
        TOPIC,
        (
          err: Error | null,
          notification: Notification | null,
          resp: unknown
        ) => {
          assert.ifError(err);
          assert.strictEqual(notification, fakeNotification);
          assert.strictEqual(notification.metadata, response);
          assert.strictEqual(resp, response);
          done();
        }
      );
    });
  });

  describe('deleteFiles', () => {
    let readCount: number;

    beforeEach(() => {
      readCount = 0;
    });

    it('should accept only a callback', done => {
      const files = [bucket.file('1'), bucket.file('2')].map(file => {
        sinon.stub(file, 'delete').resolves();
        return file;
      });

      const readable = new stream.Readable({
        objectMode: true,
        read() {
          if (readCount < 1) {
            this.push(files[readCount]);
            readCount++;
          } else {
            this.push(null);
          }
        },
      });

      bucket.getFilesStream = (query: {}) => {
        assert.deepStrictEqual(query, {});
        return readable;
      };

      bucket.deleteFiles(done);
    });

    it('should get files from the bucket', done => {
      const query: DeleteFilesOptions = {force: true};

      const files = [bucket.file('1'), bucket.file('2')].map(file => {
        sinon.stub(file, 'delete').resolves();
        return file;
      });

      const readable = new stream.Readable({
        objectMode: true,
        read() {
          if (readCount < 1) {
            this.push(files[readCount]);
            readCount++;
          } else {
            this.push(null);
          }
        },
      });

      bucket.getFilesStream = (query_: {}) => {
        assert.deepStrictEqual(query_, query);
        return readable;
      };

      bucket.deleteFiles(query, done);
    });

    it('should delete the files', done => {
      const query = {};
      let timesCalled = 0;

      const files = [bucket.file('1'), bucket.file('2')].map(file => {
        sinon.stub(file, 'delete').callsFake(query_ => {
          timesCalled++;
          assert.strictEqual(query_, query);
          return Promise.resolve();
        });
        return file;
      });

      const readable = new stream.Readable({
        objectMode: true,
        read() {
          if (readCount < files.length) {
            this.push(files[readCount]);
            readCount++;
          } else {
            this.push(null);
          }
        },
      });

      bucket.getFilesStream = (query_: {}) => {
        assert.strictEqual(query_, query);
        return readable;
      };

      bucket.deleteFiles(query, (err: Error | Error[] | null) => {
        assert.ifError(err);
        assert.strictEqual(timesCalled, files.length);
        done();
      });
    });

    it('should execute callback with error from getting files', done => {
      const error = new Error('Error.');
      const readable = new stream.Readable({
        objectMode: true,
        read() {
          this.destroy(error);
        },
      });

      bucket.getFilesStream = () => {
        return readable;
      };

      bucket.deleteFiles({}, (err: Error | Error[] | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should execute callback with error from deleting file', done => {
      const error = new Error('Error.');

      const files = [bucket.file('1'), bucket.file('2')].map(file => {
        file.delete = () => Promise.reject(error);
        return file;
      });

      const readable = new stream.Readable({
        objectMode: true,
        read() {
          if (readCount < files.length) {
            this.push(files[readCount]);
            readCount++;
          } else {
            this.push(null);
          }
        },
      });

      bucket.getFilesStream = () => {
        return readable;
      };

      bucket.deleteFiles({}, (err: Error | Error[] | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should execute callback with queued errors', done => {
      const error = new Error('Error.');

      const files = [bucket.file('1'), bucket.file('2')].map(file => {
        file.delete = () => Promise.reject(error);
        return file;
      });

      const readable = new stream.Readable({
        objectMode: true,
        read() {
          if (readCount < files.length) {
            this.push(files[readCount]);
            readCount++;
          } else {
            this.push(null);
          }
        },
      });

      bucket.getFilesStream = () => {
        return readable;
      };

      bucket.deleteFiles({force: true}, (errs: Error | Error[] | null) => {
        errs = errs as Error[];
        assert.strictEqual(errs[0], error);
        assert.strictEqual(errs[1], error);
        done();
      });
    });
  });

  describe('deleteLabels', () => {
    describe('all labels', () => {
      let bucketGetLabelsStub: sinon.SinonStub;
      let bucketSetLabelsStub: sinon.SinonStub;

      afterEach(() => {
        if (bucketGetLabelsStub) {
          bucketGetLabelsStub.restore();
        }
        if (bucketSetLabelsStub) {
          bucketSetLabelsStub.restore();
        }
      });

      it('should get all of the label names', done => {
        bucketGetLabelsStub = sinon.stub(bucket, 'getLabels').callsFake(() => {
          done();
        });

        bucket.deleteLabels(assert.ifError);
      });

      it('should return an error from getLabels()', done => {
        const error = new Error('Error.');

        bucketGetLabelsStub = sinon
          .stub(bucket, 'getLabels')
          .callsFake(callback => {
            (callback as GetLabelsCallback)(error, null);
          });

        bucket.deleteLabels((err?: Error | null) => {
          assert.strictEqual(err, error);
          done();
        });
      });

      it('should call setLabels with all label names', done => {
        const labels = {
          labelone: 'labelonevalue',
          labeltwo: 'labeltwovalue',
        };

        bucketGetLabelsStub = sinon
          .stub(bucket, 'getLabels')
          .callsFake(callback => {
            (callback as GetLabelsCallback)(null, labels);
          });

        bucketSetLabelsStub = sinon
          .stub(bucket, 'setLabels')
          .callsFake((labels, callback) => {
            assert.deepStrictEqual(labels, {
              labelone: null,
              labeltwo: null,
            });
            (callback as SetLabelsCallback)(null); // done()
          });

        bucket.deleteLabels(done);
      });
    });

    describe('single label', () => {
      const LABEL = 'labelname';
      let bucketSetLabelsStub: sinon.SinonStub;

      afterEach(() => {
        bucketSetLabelsStub.restore();
      });

      it('should call setLabels with a single label', done => {
        bucketSetLabelsStub = sinon
          .stub(bucket, 'setLabels')
          .callsFake((labels, callback) => {
            assert.deepStrictEqual(labels, {
              [LABEL]: null,
            });
            (callback as SetLabelsCallback)(); // done()
          });

        bucket.deleteLabels(LABEL, {}, done);
      });
    });

    describe('multiple labels', () => {
      const LABELS = ['labelonename', 'labeltwoname'];
      let bucketSetLabelsStub: sinon.SinonStub;

      afterEach(() => {
        bucketSetLabelsStub.restore();
      });

      it('should call setLabels with multiple labels', done => {
        bucketSetLabelsStub = sinon
          .stub(bucket, 'setLabels')
          .callsFake((labels, callback) => {
            assert.deepStrictEqual(labels, {
              labelonename: null,
              labeltwoname: null,
            });
            (callback as SetLabelsCallback)(); // done()
          });

        bucket.deleteLabels(LABELS, {}, done);
      });
    });
  });

  describe('disableRequesterPays', () => {
    let bucketSetMetadataStub: sinon.SinonStub;

    afterEach(() => {
      bucketSetMetadataStub.restore();
    });

    it('should call setMetadata correctly', done => {
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options, callback) => {
          assert.deepStrictEqual(metadata, {
            billing: {
              requesterPays: false,
            },
          });
          Promise.resolve([]).then(resp => callback(null, ...resp));
        });

      bucket.disableRequesterPays(done);
    });

    it('should set autoRetry to false when ifMetagenerationMatch is undefined', done => {
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(() => {
          Promise.resolve().then(() => {
            assert.strictEqual(bucket.storage.retryOptions.autoRetry, false);
            done();
          });
        });
      bucket.disableRequesterPays();
    });
  });

  describe('enableLogging', () => {
    const PREFIX = 'prefix';
    let iamGetPolicyStub: sinon.SinonStub;
    let iamSetPolicyStub: sinon.SinonStub;
    let bucketSetMetadataStub: sinon.SinonStub;

    beforeEach(() => {
      iamGetPolicyStub = sinon
        .stub(bucket.iam, 'getPolicy')
        .resolves([{bindings: []}]);
      iamSetPolicyStub = sinon.stub(bucket.iam, 'setPolicy').resolves();
      bucketSetMetadataStub = sinon.stub(bucket, 'setMetadata').resolves([]);
    });

    afterEach(() => {
      iamGetPolicyStub.restore();
      iamSetPolicyStub.restore();
      bucketSetMetadataStub.restore();
    });

    it('should throw if a config object is not provided', () => {
      assert.rejects(async () => {
        bucket.enableLogging('hello world' as unknown as EnableLoggingOptions),
          BucketExceptionMessages.CONFIGURATION_OBJECT_PREFIX_REQUIRED;
      });
    });

    it('should throw if config is a function', () => {
      assert.rejects(async () => {
        bucket.enableLogging(assert.ifError as unknown as EnableLoggingOptions),
          BucketExceptionMessages.CONFIGURATION_OBJECT_PREFIX_REQUIRED;
      });
    });

    it('should throw if a prefix is not provided', () => {
      assert.rejects(async () => {
        bucket.enableLogging(
          {
            bucket: 'bucket-name',
            prefix: 'bucket-name-prefix',
          },
          assert.ifError
        ),
          BucketExceptionMessages.CONFIGURATION_OBJECT_PREFIX_REQUIRED;
      });
    });

    it('should add IAM permissions', done => {
      const policy = {
        bindings: [{}],
      };
      iamGetPolicyStub.restore();
      iamGetPolicyStub = sinon.stub(bucket.iam, 'getPolicy').resolves([policy]);
      iamSetPolicyStub.restore();
      iamSetPolicyStub = sinon
        .stub(bucket.iam, 'setPolicy')
        .callsFake(policy_ => {
          assert.deepStrictEqual(policy, policy_);
          assert.deepStrictEqual(policy_.bindings, [
            policy.bindings[0],
            {
              members: ['group:cloud-storage-analytics@google.com'],
              role: 'roles/storage.objectCreator',
            },
          ]);
          setImmediate(done);
          return Promise.resolve();
        });

      bucket.enableLogging({prefix: PREFIX}, assert.ifError);
    });

    it('should return an error from getting the IAM policy', done => {
      const error = new Error('Error.');

      iamGetPolicyStub.restore();
      iamGetPolicyStub = sinon.stub(bucket.iam, 'getPolicy').throws(error);

      bucket.enableLogging({prefix: PREFIX}, (err?: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should return an error from setting the IAM policy', done => {
      const error = new Error('Error.');

      iamSetPolicyStub.restore();
      iamSetPolicyStub = sinon.stub(bucket.iam, 'setPolicy').throws(error);

      bucket.enableLogging({prefix: PREFIX}, (err?: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should update the logging metadata configuration', done => {
      bucketSetMetadataStub.restore();
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.deepStrictEqual(metadata.logging, {
            logBucket: bucket.id,
            logObjectPrefix: PREFIX,
          });
          setImmediate(done);
          return Promise.resolve([]);
        });

      bucket.enableLogging({prefix: PREFIX}, assert.ifError);
    });

    it('should allow a custom bucket to be provided', done => {
      const bucketName = 'bucket-name';
      bucketSetMetadataStub.restore();
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.deepStrictEqual(metadata!.logging!.logBucket, bucketName);
          setImmediate(done);
          return Promise.resolve([]);
        });

      bucket.enableLogging(
        {
          prefix: PREFIX,
          bucket: bucketName,
        },
        assert.ifError
      );
    });

    it('should accept a Bucket object', done => {
      const bucketForLogging = new Bucket(STORAGE, 'bucket-name');
      bucketSetMetadataStub.restore();
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.deepStrictEqual(
            metadata!.logging!.logBucket,
            bucketForLogging.id
          );
          setImmediate(done);
          return Promise.resolve([]);
        });

      bucket.enableLogging(
        {
          prefix: PREFIX,
          bucket: bucketForLogging,
        },
        assert.ifError
      );
    });

    it('should execute the callback with the setMetadata response', done => {
      const setMetadataResponse = {};
      bucketSetMetadataStub.restore();
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options, callback) => {
          Promise.resolve([setMetadataResponse]).then(resp =>
            callback(null, ...resp)
          );
        });

      bucket.enableLogging(
        {prefix: PREFIX},
        (err?: Error | null, metadata?: BucketMetadata) => {
          assert.ifError(err);
          assert.strictEqual(metadata, setMetadataResponse);
          done();
        }
      );
    });

    it('should return an error from the setMetadata call failing', done => {
      const error = new Error('Error.');
      bucketSetMetadataStub.restore();
      bucketSetMetadataStub = sinon.stub(bucket, 'setMetadata').throws(error);

      bucket.enableLogging({prefix: PREFIX}, (err?: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });
  });

  describe('enableRequesterPays', () => {
    let bucketSetMetadataStub: sinon.SinonStub;

    afterEach(() => {
      bucketSetMetadataStub.restore();
    });

    it('should call setMetadata correctly', done => {
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options, callback) => {
          assert.deepStrictEqual(metadata, {
            billing: {
              requesterPays: true,
            },
          });
          Promise.resolve([]).then(resp => callback(null, ...resp));
        });

      bucket.enableRequesterPays(done);
    });
  });

  describe('file', () => {
    const FILE_NAME = 'remote-file-name.jpg';
    let file: File;
    const options: FileOptions = {userProject: 'hello-world'};

    beforeEach(() => {
      file = bucket.file(FILE_NAME, options);
    });

    it('should throw if no name is provided', () => {
      assert.rejects(async () => {
        bucket.file(''), BucketExceptionMessages.SPECIFY_FILE_NAME;
      });
    });

    it('should return a File object', () => {
      assert.strictEqual(file instanceof File, true);
    });

    it('should pass bucket to File object', () => {
      assert.deepStrictEqual(file.bucket, bucket);
    });

    it('should pass filename to File object', () => {
      assert.strictEqual(file.name, FILE_NAME);
    });
  });

  describe('getFiles', () => {
    let bucketRequestStub: sinon.SinonStub;

    afterEach(() => {
      bucketRequestStub.restore();
    });

    it('should get files without a query', done => {
      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.uri, '/o');
        assert.deepStrictEqual(reqOpts.qs, {});
        done();
      });

      bucket.getFiles(util.noop);
    });

    it('should get files with a query', done => {
      const token = 'next-page-token';
      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.deepStrictEqual(reqOpts.qs, {maxResults: 5, pageToken: token});
        done();
      });

      bucket.getFiles({maxResults: 5, pageToken: token}, util.noop);
    });

    it('should return nextQuery if more results exist', () => {
      const token = 'next-page-token';
      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(null, {nextPageToken: token, items: []});
        });

      bucket.getFiles(
        {maxResults: 5},
        (_err: Error | null, files?: File[], nextQuery?: {}) => {
          assert.strictEqual(
            (nextQuery as unknown as {pageToken: string}).pageToken,
            token
          );
          assert.strictEqual(
            (nextQuery as unknown as {maxResults: number}).maxResults,
            5
          );
        }
      );
    });

    it('should return null nextQuery if there are no more results', () => {
      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(null, {items: []});
        });
      bucket.getFiles(
        {maxResults: 5},
        (_err: Error | null, Files?: File[], nextQuery?: {}) => {
          assert.strictEqual(nextQuery, null);
        }
      );
    });

    it('should return File objects', done => {
      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(null, {
            items: [{name: 'fake-file-name', generation: 1}],
          });
        });
      bucket.getFiles((err: Error | null, files?: File[]) => {
        assert.ifError(err);
        assert(files![0] instanceof File);
        assert.strictEqual(typeof files![0].generation, 'undefined');
        done();
      });
    });

    it('should return versioned Files if queried for versions', done => {
      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(null, {
            items: [{name: 'fake-file-name', generation: 1}],
          });
        });

      bucket.getFiles({versions: true}, (err: Error | null, files?: File[]) => {
        assert.ifError(err);
        assert(files![0] instanceof File);
        assert.strictEqual(files![0].generation, 1);
        done();
      });
    });

    it('should set kmsKeyName on file', done => {
      const kmsKeyName = 'kms-key-name';
      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(null, {
            items: [{name: 'fake-file-name', kmsKeyName}],
          });
        });

      bucket.getFiles({versions: true}, (err: Error | null, files?: File[]) => {
        assert.ifError(err);
        assert.strictEqual(files![0].kmsKeyName, kmsKeyName);
        done();
      });
    });

    it('should return apiResponse in callback', done => {
      const resp = {
        items: [{name: 'fake-file-name'}, {name: 'fake-file-name-two'}],
      };
      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(null, resp);
        });
      bucket.getFiles(
        {maxResults: 1},
        (
          _err: Error | null,
          _files?: File[],
          _nextQuery?: {},
          apiResponse?: unknown
        ) => {
          assert.deepStrictEqual(resp, apiResponse);
          done();
        }
      );
    });

    it('should execute callback with error & API response', done => {
      const error = new Error('Error.');
      const apiResponse = {};
      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(error, apiResponse);
        });

      bucket.getFiles(
        {maxResults: 1},
        (
          err: Error | null,
          files?: File[],
          nextQuery?: {},
          apiResponse_?: unknown
        ) => {
          assert.strictEqual(err, error);
          assert.strictEqual(files, null);
          assert.strictEqual(nextQuery, null);
          assert.strictEqual(apiResponse_, apiResponse);

          done();
        }
      );
    });

    it('should populate returned File object with metadata', done => {
      const fileMetadata = {
        name: 'filename',
        contentType: 'x-zebra',
        metadata: {
          my: 'custom metadata',
        },
      };
      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(null, {items: [fileMetadata]});
        });
      bucket.getFiles((err: Error | null, files?: File[]) => {
        assert.ifError(err);
        assert.deepStrictEqual(files![0].metadata, fileMetadata);
        done();
      });
    });
  });

  describe('getLabels', () => {
    let bucketGetMetadataStub: sinon.SinonStub;

    afterEach(() => {
      if (bucketGetMetadataStub) {
        bucketGetMetadataStub.restore();
      }
    });

    it('should refresh metadata', done => {
      bucketGetMetadataStub = sinon
        .stub(bucket, 'getMetadata')
        .callsFake(() => {
          done();
        });

      bucket.getLabels(assert.ifError);
    });

    it('should accept an options object', done => {
      const options = {};
      bucketGetMetadataStub = sinon
        .stub(bucket, 'getMetadata')
        .callsFake(options_ => {
          assert.strictEqual(options_, options);
          done();
        });

      bucket.getLabels(options, assert.ifError);
    });

    it('should return error from getMetadata', () => {
      const error = new Error('Error.');

      assert.rejects(async () => {
        bucket.getLabels(), error;
      });
    });
  });

  describe('getNotifications', () => {
    let bucketRequestStub: sinon.SinonStub;

    afterEach(() => {
      bucketRequestStub.restore();
    });

    it('should make the correct request', done => {
      const options = {};
      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.uri, '/notificationConfigs');
        assert.strictEqual(reqOpts.qs, options);
        done();
      });

      bucket.getNotifications(options, assert.ifError);
    });

    it('should optionally accept options', done => {
      bucketRequestStub = sinon.stub(bucket, 'request').callsFake(reqOpts => {
        assert.deepStrictEqual(reqOpts.qs, {});
        done();
      });

      bucket.getNotifications(assert.ifError);
    });

    it('should return any errors to the callback', done => {
      const error = new Error('err');
      const response = {};

      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(error, response);
        });

      bucket.getNotifications(
        (
          err: Error | null,
          notifications: Notification[] | null,
          resp: unknown
        ) => {
          assert.strictEqual(err, error);
          assert.strictEqual(notifications, null);
          assert.strictEqual(resp, response);
          done();
        }
      );
    });

    it('should return a list of notification objects', done => {
      const fakeItems = [{id: '1'}, {id: '2'}, {id: '3'}];
      const response = {items: fakeItems};

      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(null, response);
        });

      let callCount = 0;
      const fakeNotifications: Notification[] = [
        sinon.createStubInstance(Notification),
        sinon.createStubInstance(Notification),
        sinon.createStubInstance(Notification),
      ];

      bucket.notification = (id: string) => {
        const expectedId = fakeItems[callCount].id;
        assert.strictEqual(id, expectedId);
        return fakeNotifications[callCount++];
      };

      bucket.getNotifications(
        (
          err: Error | null,
          notifications: Notification[] | null,
          resp: unknown
        ) => {
          assert.ifError(err);
          notifications!.forEach((notification, i) => {
            assert.strictEqual(notification, fakeNotifications[i]);
            assert.strictEqual(notification.metadata, fakeItems[i]);
          });
          assert.strictEqual(resp, response);
          done();
        }
      );
    });
  });

  describe('getSignedUrl', () => {
    const EXPECTED_SIGNED_URL = 'signed-url';
    const CNAME = 'https://www.example.com';

    let sandbox: sinon.SinonSandbox;
    let SIGNED_URL_CONFIG: GetBucketSignedUrlConfig;
    let getSignedUrlStub: sinon.SinonStub<
      [SignerGetSignedUrlConfig],
      Promise<string>
    >;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      const date = new Date();
      SIGNED_URL_CONFIG = {
        version: 'v4',
        expires: date.setDate(date.getDate() + 1),
        action: 'list',
        cname: CNAME,
      };

      getSignedUrlStub = sandbox
        .stub<[SignerGetSignedUrlConfig], Promise<string>>()
        .resolves(EXPECTED_SIGNED_URL);
      bucket.signer = sandbox.createStubInstance(URLSigner, {
        getSignedUrl: getSignedUrlStub,
      });
    });

    afterEach(() => sandbox.restore());

    it('should construct a URLSigner and call getSignedUrl', done => {
      // assert signer is lazily-initialized.
      //assert.strictEqual(bucket.signer, {});
      bucket.getSignedUrl(
        SIGNED_URL_CONFIG,
        (err: Error | null, signedUrl?: string) => {
          assert.ifError(err);
          assert.strictEqual(signedUrl, EXPECTED_SIGNED_URL);
          const getSignedUrlArgs = getSignedUrlStub.getCall(0).args;
          assert.deepStrictEqual(getSignedUrlArgs[0], {
            method: 'GET',
            version: 'v4',
            expires: SIGNED_URL_CONFIG.expires,
            extensionHeaders: {},
            queryParams: {},
            cname: CNAME,
          });
          done();
        }
      );
    });
  });

  describe('lock', () => {
    let bucketRequestStub: sinon.SinonStub;

    afterEach(() => {
      if (bucketRequestStub) {
        bucketRequestStub.restore();
      }
    });

    it('should throw if a metageneration is not provided', () => {
      assert.rejects(async () => {
        bucket.lock(assert.ifError as unknown as string),
          BucketExceptionMessages.METAGENERATION_NOT_PROVIDED;
      });
    });

    it('should make the correct request', done => {
      const metageneration = 8;

      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          assert.deepStrictEqual(reqOpts, {
            method: 'POST',
            uri: '/lockRetentionPolicy',
            qs: {
              ifMetagenerationMatch: metageneration,
            },
          });

          callback(null); // done()
        });

      bucket.lock(metageneration, done);
    });
  });

  describe('makePrivate', () => {
    let bucketSetMetadataStub: sinon.SinonStub;
    let bucketMakeAllPubPrivStub: sinon.SinonStub;

    afterEach(() => {
      bucketSetMetadataStub.restore();
      bucketMakeAllPubPrivStub.restore();
    });

    it('should set predefinedAcl & privatize files', done => {
      let didSetPredefinedAcl = false;
      let didMakeFilesPrivate = false;
      const opts = {
        includeFiles: true,
        force: true,
      };

      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options, callback) => {
          assert.deepStrictEqual(metadata, {acl: null});
          assert.deepStrictEqual(options, {predefinedAcl: 'projectPrivate'});

          didSetPredefinedAcl = true;
          bucket.makeAllFilesPublicPrivate_(
            opts,
            callback as unknown as (
              err?: Error | Error[] | null,
              files?: File[]
            ) => void
          );
        });

      bucketMakeAllPubPrivStub = sinon
        .stub(bucket, 'makeAllFilesPublicPrivate_')
        .callsFake((options, callback) => {
          assert.strictEqual(opts.force, true);
          assert.strictEqual(opts.includeFiles, true);
          didMakeFilesPrivate = true;
          callback();
        });

      bucket.makePrivate(opts, (err?: Error | null) => {
        assert.ifError(err);
        assert(didSetPredefinedAcl);
        assert(didMakeFilesPrivate);
        done();
      });
    });

    it('should accept metadata', done => {
      const options = {
        metadata: {a: 'b', c: 'd'},
      };

      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.deepStrictEqual(metadata, {
            acl: null,
            ...options.metadata,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          assert.strictEqual(typeof (options.metadata as any).acl, 'undefined');
          done();
        });

      bucket.makePrivate(options, assert.ifError);
    });

    it('should accept userProject', done => {
      const options: SetMetadataOptions = {
        userProject: 'user-project-id',
      };

      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options_: SetMetadataOptions) => {
          assert.deepStrictEqual(options_, {
            predefinedAcl: 'projectPrivate',
            userProject: 'user-project-id',
          });
          done();
        });

      bucket.makePrivate(options, done);
    });

    it('should not make files private by default', done => {
      bucket.parent.request = (
        _reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback();
      };

      bucket.makeAllFilesPublicPrivate_ = () => {
        throw new Error('Please, no. I do not want to be called.');
      };

      bucket.makePrivate(done);
    });

    it('should execute callback with error', done => {
      const error = new Error('Error.');

      bucket.parent.request = (
        _reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(error);
      };

      bucket.makePrivate((err?: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });
  });

  describe('makePublic', () => {
    let bucketRequestStub: sinon.SinonStub;
    let aclAddStub: sinon.SinonStub;
    let aclDefaultAddStub: sinon.SinonStub;
    let bucketMakePubPrivStub: sinon.SinonStub;

    beforeEach(() => {
      bucketRequestStub = sinon
        .stub(bucket, 'request')
        .callsFake((reqOpts, callback) => {
          callback(null);
        });
    });

    afterEach(() => {
      bucketRequestStub.restore();
      aclAddStub.restore();
      aclDefaultAddStub.restore();
      bucketMakePubPrivStub.restore();
    });

    it('should set ACL, default ACL, and publicize files', done => {
      let didSetAcl = false;
      let didSetDefaultAcl = false;
      let didMakeFilesPublic = false;

      aclAddStub = sinon.stub(bucket.acl, 'add').callsFake(opts => {
        assert.strictEqual(opts.entity, 'allUsers');
        assert.strictEqual(opts.role, 'READER');
        didSetAcl = true;
        return Promise.resolve();
      });

      aclDefaultAddStub = sinon
        .stub(bucket.acl.default, 'add')
        .callsFake(opts => {
          assert.strictEqual(opts.entity, 'allUsers');
          assert.strictEqual(opts.role, 'READER');
          didSetDefaultAcl = true;
          return Promise.resolve();
        });

      bucketMakePubPrivStub = sinon
        .stub(bucket, 'makeAllFilesPublicPrivate_')
        .callsFake((opts, callback) => {
          assert.strictEqual(opts.public, true);
          assert.strictEqual(opts.force, true);
          didMakeFilesPublic = true;
          callback();
        });

      bucket.makePublic(
        {
          includeFiles: true,
          force: true,
        },
        (err?: Error | null) => {
          assert.ifError(err);
          assert(didSetAcl);
          assert(didSetDefaultAcl);
          assert(didMakeFilesPublic);
          done();
        }
      );
    });

    it('should not make files public by default', done => {
      aclAddStub = sinon.stub(bucket.acl, 'add').resolves();
      aclDefaultAddStub = sinon.stub(bucket.acl.default, 'add').resolves();
      bucketMakePubPrivStub = sinon
        .stub(bucket, 'makeAllFilesPublicPrivate_')
        .callsFake(() => {
          throw new Error('Please, no. I do not want to be called.');
        });
      bucket.makePublic(done);
    });

    it('should execute callback with error', done => {
      const error = new Error('Error.');
      bucket.acl.add = () => Promise.reject(error);
      bucket.makePublic((err?: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });
  });

  describe('notification', () => {
    it('should throw an error if an id is not provided', () => {
      assert.rejects(async () => {
        bucket.notification({} as unknown as string),
          BucketExceptionMessages.SUPPLY_NOTIFICATION_ID;
      });
    });

    it('should return a Notification object', () => {
      const fakeId = '123';
      const notification = bucket.notification(fakeId);

      assert(notification instanceof Notification);
      assert.strictEqual(notification.id, fakeId);
    });
  });

  describe('removeRetentionPeriod', () => {
    let bucketSetMetadataStub: sinon.SinonStub;

    afterEach(() => {
      bucketSetMetadataStub.restore();
    });

    it('should call setMetadata correctly', done => {
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options, callback) => {
          assert.deepStrictEqual(metadata, {
            retentionPolicy: null,
          });

          Promise.resolve([]).then(resp => callback(null, ...resp));
        });

      bucket.removeRetentionPeriod(done);
    });
  });

  describe('setLabels', () => {
    let bucketSetMetadataStub: sinon.SinonStub;

    afterEach(() => {
      bucketSetMetadataStub.restore();
    });

    it('should correctly call setMetadata', done => {
      const labels = {};
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options, callback) => {
          assert.strictEqual(metadata.labels, labels);
          Promise.resolve([]).then(resp => callback(null, ...resp));
        });

      bucket.setLabels(labels, done);
    });

    it('should accept an options object', done => {
      const labels = {};
      const options = {};
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options_) => {
          assert.strictEqual(options_, options);
          done();
        });

      bucket.setLabels(labels, options, done);
    });
  });

  describe('setRetentionPeriod', () => {
    let bucketSetMetadataStub: sinon.SinonStub;

    afterEach(() => {
      bucketSetMetadataStub.restore();
    });

    it('should call setMetadata correctly', done => {
      const duration = 90000;
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options, callback) => {
          assert.deepStrictEqual(metadata, {
            retentionPolicy: {
              retentionPeriod: `${duration}`,
            },
          });

          Promise.resolve([]).then(resp => callback(null, ...resp));
        });

      bucket.setRetentionPeriod(duration, done);
    });
  });

  describe('setCorsConfiguration', () => {
    let bucketSetMetadataStub: sinon.SinonStub;

    afterEach(() => {
      bucketSetMetadataStub.restore();
    });

    it('should call setMetadata correctly', done => {
      const corsConfiguration = [{maxAgeSeconds: 3600}];
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options, callback) => {
          assert.deepStrictEqual(metadata, {
            cors: corsConfiguration,
          });

          return Promise.resolve([]).then(resp => callback(null, ...resp));
        });

      bucket.setCorsConfiguration(corsConfiguration, done);
    });
  });

  describe('setStorageClass', () => {
    const STORAGE_CLASS = 'NEW_STORAGE_CLASS';
    const OPTIONS = {};
    const CALLBACK = util.noop;
    let bucketSetMetadataStub: sinon.SinonStub;

    afterEach(() => {
      bucketSetMetadataStub.restore();
    });

    it('should convert camelCase to snake_case', done => {
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.strictEqual(metadata.storageClass, 'CAMEL_CASE');
          done();
        });

      bucket.setStorageClass('camelCase', OPTIONS, CALLBACK);
    });

    it('should convert hyphenate to snake_case', done => {
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake(metadata => {
          assert.strictEqual(metadata.storageClass, 'HYPHENATED_CLASS');
          done();
        });

      bucket.setStorageClass('hyphenated-class', OPTIONS, CALLBACK);
    });

    it('should call setMetdata correctly', () => {
      bucketSetMetadataStub = sinon
        .stub(bucket, 'setMetadata')
        .callsFake((metadata, options, callback) => {
          assert.deepStrictEqual(metadata, {storageClass: STORAGE_CLASS});
          assert.strictEqual(options, OPTIONS);
          Promise.resolve([]).then(resp => callback(null, ...resp));
        });

      bucket.setStorageClass(STORAGE_CLASS, OPTIONS, CALLBACK);
    });
  });

  describe('setUserProject', () => {
    const USER_PROJECT = 'grape-spaceship-123';

    it('should set the userProject property', () => {
      bucket.setUserProject(USER_PROJECT);
      assert.strictEqual(bucket.userProject, USER_PROJECT);
    });

    it('should set the userProject on the global request options', () => {
      const methods = [
        'create',
        'delete',
        'exists',
        'get',
        'getMetadata',
        'setMetadata',
      ];
      methods.forEach(method => {
        assert.strictEqual(
          (bucket['methods'][method] as {reqOpts: CoreOptions}).reqOpts.qs
            .userProject,
          undefined
        );
      });
      bucket.setUserProject(USER_PROJECT);
      methods.forEach(method => {
        assert.strictEqual(
          (bucket['methods'][method] as {reqOpts: CoreOptions}).reqOpts.qs
            .userProject,
          USER_PROJECT
        );
      });
    });
  });

  describe('upload', () => {
    const basename = 'testfile.json';
    const filepath = path.join(__dirname, '../../test/testdata/' + basename);
    const nonExistentFilePath = path.join(
      __dirname,
      '../../test/testdata/',
      'non-existent-file'
    );
    const metadata = {
      metadata: {
        a: 'b',
        c: 'd',
      },
    };

    beforeEach(() => {
      bucket.file = (name: string, options?: FileOptions) => {
        const file = new File(bucket, name, options);
        sinon.stub(file, 'createWriteStream').callsFake(() => {
          file.metadata = metadata;
          return new stream.Writable();
        });
        return file;
      };
    });

    it('should return early in snippet sandbox', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any)['GCLOUD_SANDBOX_ENV'] = true;
      const returnValue = bucket.upload(filepath, assert.ifError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any)['GCLOUD_SANDBOX_ENV'];
      assert.strictEqual(returnValue, undefined);
    });

    it('should accept a path & cb', done => {
      bucket.upload(filepath, (err?: Error | null, file?: File | null) => {
        assert.ifError(err);
        assert.strictEqual(file!.bucket.name, bucket.name);
        assert.strictEqual(file!.name, basename);
        done();
      });
    });

    it('should accept a path, metadata, & cb', done => {
      const options = {
        metadata,
        encryptionKey: 'key',
        kmsKeyName: 'kms-key-name',
      };
      bucket.upload(
        filepath,
        options,
        (err?: Error | null, file?: File | null) => {
          assert.ifError(err);
          assert.strictEqual(file!.bucket.name, bucket.name);
          assert.deepStrictEqual(file!.metadata, metadata);
          assert.strictEqual(file!['encryptionKey'], options.encryptionKey);
          assert.strictEqual(file!.kmsKeyName, options.kmsKeyName);
          done();
        }
      );
    });

    it('should accept a path, a string dest, & cb', done => {
      const newFileName = 'new-file-name.png';
      const options = {
        destination: newFileName,
        encryptionKey: 'key',
        kmsKeyName: 'kms-key-name',
      };
      bucket.upload(
        filepath,
        options,
        (err?: Error | null, file?: File | null) => {
          assert.ifError(err);
          assert.strictEqual(file!.bucket.name, bucket.name);
          assert.strictEqual(file!.name, newFileName);
          assert.strictEqual(file!['encryptionKey'], options.encryptionKey);
          assert.strictEqual(file!.kmsKeyName, options.kmsKeyName);
          done();
        }
      );
    });

    it('should accept a path, a string dest, metadata, & cb', done => {
      const newFileName = 'new-file-name.png';
      const options = {
        destination: newFileName,
        metadata,
        encryptionKey: 'key',
        kmsKeyName: 'kms-key-name',
      };
      bucket.upload(
        filepath,
        options,
        (err?: Error | null, file?: File | null) => {
          assert.ifError(err);
          assert.strictEqual(file!.bucket.name, bucket.name);
          assert.strictEqual(file!.name, newFileName);
          assert.deepStrictEqual(file!.metadata, metadata);
          assert.strictEqual(file!['encryptionKey'], options.encryptionKey);
          assert.strictEqual(file!.kmsKeyName, options.kmsKeyName);
          done();
        }
      );
    });

    it('should accept a path, a File dest, & cb', done => {
      const fakeFile = bucket.file('file-name');
      const options = {destination: fakeFile};
      bucket.upload(
        filepath,
        options,
        (err?: Error | null, file?: File | null) => {
          assert.ifError(err);
          assert.strictEqual(file?.name, 'file-name');
          assert.strictEqual(file.bucket.name, bucket.name);
          done();
        }
      );
    });

    it('should accept a path, a File dest, metadata, & cb', done => {
      const fakeFile = bucket.file('file-name');
      const options = {destination: fakeFile, metadata};
      bucket.upload(
        filepath,
        options,
        (err?: Error | null, file?: File | null) => {
          assert.ifError(err);
          assert.deepStrictEqual(file!.metadata, metadata);
          done();
        }
      );
    });

    describe('resumable uploads', () => {
      let statStub: sinon.SinonStub;

      class DelayedStream500Error extends Transform {
        retryCount: number;
        constructor(retryCount: number) {
          super();
          this.retryCount = retryCount;
        }
        _transform(chunk: string | Buffer, _encoding: string, done: Function) {
          this.push(chunk);
          setTimeout(() => {
            if (this.retryCount === 1) {
              done(new HTTPError('first error', 500));
            } else {
              done();
            }
          }, 5);
        }
      }

      beforeEach(() => {
        statStub = sinon
          .stub(fs, 'stat')
          .callsFake((path, options, callback) => {
            callback(
              null,
              sinon.createStubInstance(fs.Stats, {
                size: 1, // Small size to guarantee simple upload
              })
            );
          });
      });

      afterEach(() => {
        statStub.restore();
      });

      it('should respect setting a resumable upload to false', done => {
        const fakeFile = new File(bucket, 'file-name');
        const options = {destination: fakeFile, resumable: false};
        fakeFile.createWriteStream = (options_: CreateWriteStreamOptions) => {
          const ws = new stream.Writable();
          ws.write = () => true;
          setImmediate(() => {
            assert.strictEqual(options_.resumable, options.resumable);
            done();
          });
          return ws;
        };
        bucket.upload(filepath, options, assert.ifError);
      });

      it('should not retry a nonretryable error code', done => {
        const fakeFile = new File(bucket, 'file-name');
        const options = {destination: fakeFile, resumable: true};
        let retryCount = 0;
        fakeFile.createWriteStream = (options_: CreateWriteStreamOptions) => {
          class DelayedStream403Error extends Transform {
            _transform(
              chunk: string | Buffer,
              _encoding: string,
              done: Function
            ) {
              this.push(chunk);
              setTimeout(() => {
                retryCount++;
                if (retryCount === 1) {
                  done(new HTTPError('first error', 403));
                } else {
                  done();
                }
              }, 5);
            }
          }
          setImmediate(() => {
            assert.strictEqual(options_.resumable, true);
            retryCount++;
            done();
          });
          return new DelayedStream403Error();
        };

        bucket.upload(filepath, options, (err: Error | null) => {
          assert.strictEqual(err!.message, 'first error');
          assert.ok(retryCount === 2);
          done();
        });
      });

      it('resumable upload should retry', done => {
        const fakeFile = new File(bucket, 'file-name');
        const options = {destination: fakeFile, resumable: true};
        let retryCount = 0;
        fakeFile.createWriteStream = (options_: CreateWriteStreamOptions) => {
          setImmediate(() => {
            assert.strictEqual(options_.resumable, true);
            retryCount++;
            done();
          });
          return new DelayedStream500Error(retryCount);
        };
        bucket.upload(filepath, options, (err: Error | null) => {
          assert.strictEqual(err!.message, 'first error');
          assert.ok(retryCount === 1);
          done();
        });
      });
    });

    describe('multipart uploads', () => {
      let statStub: sinon.SinonStub;
      class DelayedStream500Error extends Transform {
        retryCount: number;
        constructor(retryCount: number) {
          super();
          this.retryCount = retryCount;
        }
        _transform(chunk: string | Buffer, _encoding: string, done: Function) {
          this.push(chunk);
          setTimeout(() => {
            if (this.retryCount === 1) {
              done(new HTTPError('first error', 500));
            } else {
              done();
            }
          }, 5);
        }
      }

      beforeEach(() => {
        statStub = sinon
          .stub(fs, 'stat')
          .callsFake((path, options, callback) => {
            callback(
              null,
              sinon.createStubInstance(fs.Stats, {
                size: 1, // Small size to guarantee simple upload
              })
            );
          });
      });

      afterEach(() => {
        statStub.restore();
      });

      it('should save with no errors', done => {
        const fakeFile = new File(bucket, 'file-name');
        const options = {destination: fakeFile, resumable: false};
        fakeFile.createWriteStream = (options_: CreateWriteStreamOptions) => {
          class DelayedStreamNoError extends Transform {
            _transform(
              chunk: string | Buffer,
              _encoding: string,
              done: Function
            ) {
              this.push(chunk);
              setTimeout(() => {
                done();
              }, 5);
            }
          }
          assert.strictEqual(options_.resumable, false);
          return new DelayedStreamNoError();
        };
        bucket.upload(filepath, options, (err: Error | null) => {
          assert.ifError(err);
          done();
        });
      });

      it('should retry on first failure', done => {
        const fakeFile = new File(bucket, 'file-name');
        const options = {destination: fakeFile, resumable: false};
        let retryCount = 0;
        fakeFile.createWriteStream = (options_: CreateWriteStreamOptions) => {
          setImmediate(() => {
            assert.strictEqual(options_.resumable, false);
            retryCount++;
            done();
          });
          return new DelayedStream500Error(retryCount);
        };
        bucket.upload(
          filepath,
          options,
          (err: Error | null, file?: File | null) => {
            assert.ifError(err);
            assert.deepStrictEqual(file!.metadata, metadata);
            assert.ok(retryCount === 2);
            done();
          }
        );
      });

      it('should not retry if nonretryable error code', done => {
        const fakeFile = new File(bucket, 'file-name');
        const options = {destination: fakeFile, resumable: false};
        let retryCount = 0;
        fakeFile.createWriteStream = (options_: CreateWriteStreamOptions) => {
          class DelayedStream403Error extends Transform {
            _transform(
              chunk: string | Buffer,
              _encoding: string,
              done: Function
            ) {
              this.push(chunk);
              setTimeout(() => {
                retryCount++;
                if (retryCount === 1) {
                  done(new HTTPError('first error', 403));
                } else {
                  done();
                }
              }, 5);
            }
          }
          setImmediate(() => {
            assert.strictEqual(options_.resumable, false);
            retryCount++;
            done();
          });
          return new DelayedStream403Error();
        };

        bucket.upload(filepath, options, (err: Error | null) => {
          assert.strictEqual(err!.message, 'first error');
          assert.ok(retryCount === 2);
          done();
        });
      });

      it('non-multipart upload should not retry', done => {
        const fakeFile = new File(bucket, 'file-name');
        const options = {destination: fakeFile, resumable: true};
        let retryCount = 0;
        fakeFile.createWriteStream = (options_: CreateWriteStreamOptions) => {
          setImmediate(() => {
            assert.strictEqual(options_.resumable, true);
            retryCount++;
            done();
          });
          return new DelayedStream500Error(retryCount);
        };
        bucket.upload(filepath, options, (err: Error | null) => {
          assert.strictEqual(err!.message, 'first error');
          assert.ok(retryCount === 1);
          done();
        });
      });
    });

    it('should allow overriding content type', done => {
      const fakeFile = new File(bucket, 'file-name');
      const metadata = {contentType: 'made-up-content-type'};
      const options = {destination: fakeFile, metadata};
      fakeFile.createWriteStream = (options: CreateWriteStreamOptions) => {
        const ws = new stream.Writable();
        ws.write = () => true;
        setImmediate(() => {
          assert.strictEqual(
            options!.metadata!.contentType,
            metadata.contentType
          );
          done();
        });
        return ws;
      };
      bucket.upload(filepath, options, assert.ifError);
    });

    it('should execute callback on error', done => {
      const error = new Error('Error.');
      const fakeFile = new File(bucket, 'file-name');
      const options = {destination: fakeFile};
      fakeFile.createWriteStream = () => {
        const ws = new stream.PassThrough();
        setImmediate(() => {
          ws.destroy(error);
        });
        return ws;
      };
      bucket.upload(filepath, options, (err: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should return file and metadata', done => {
      const fakeFile = new File(bucket, 'file-name');
      const options = {destination: fakeFile};
      const metadata = {};

      fakeFile.createWriteStream = () => {
        const ws = new stream.PassThrough();
        setImmediate(() => {
          fakeFile.metadata = metadata;
          ws.end();
        });
        return ws;
      };

      bucket.upload(
        filepath,
        options,
        (err: Error | null, file?: File | null, apiResponse?: unknown) => {
          assert.ifError(err);
          assert.strictEqual(file, fakeFile);
          assert.strictEqual(apiResponse, metadata);
          done();
        }
      );
    });

    it('should capture and throw on non-existent files', done => {
      bucket.upload(nonExistentFilePath, (err: Error | null) => {
        assert(err);
        assert(err.message.includes('ENOENT'));
        done();
      });
    });
  });

  describe('makeAllFilesPublicPrivate_', () => {
    let bucketGetFilesStub: sinon.SinonStub;

    afterEach(() => {
      bucketGetFilesStub.restore();
    });

    it('should get all files from the bucket', done => {
      const options = {};
      bucketGetFilesStub = sinon
        .stub(bucket, 'getFiles')
        .callsFake(options_ => {
          assert.strictEqual(options_, options);
          return Promise.resolve([[]]);
        });

      bucket.makeAllFilesPublicPrivate_(options, done);
    });

    it('should make files public', done => {
      let timesCalled = 0;
      const files = [bucket.file('1'), bucket.file('2')].map(file => {
        sinon.stub(file, 'makePublic').callsFake(() => {
          timesCalled++;
          return Promise.resolve();
        });
        return file;
      });
      bucketGetFilesStub = sinon.stub(bucket, 'getFiles').resolves([files]);
      bucket.makeAllFilesPublicPrivate_(
        {public: true},
        (err?: Error | Error[] | null) => {
          assert.ifError(err);
          assert.strictEqual(timesCalled, files.length);
          done();
        }
      );
    });

    it('should make files private', done => {
      const options = {
        private: true,
      };
      let timesCalled = 0;

      const files = [bucket.file('1'), bucket.file('2')].map(file => {
        sinon.stub(file, 'makePrivate').callsFake(() => {
          timesCalled++;
          return Promise.resolve();
        });

        return file;
      });

      bucketGetFilesStub = sinon.stub(bucket, 'getFiles').resolves([files]);
      bucket.makeAllFilesPublicPrivate_(
        options,
        (err?: Error | Error[] | null) => {
          assert.ifError(err);
          assert.strictEqual(timesCalled, files.length);
          done();
        }
      );
    });

    it('should execute callback with error from getting files', done => {
      const error = new Error('Error.');
      bucket.getFiles = () => Promise.reject(error);
      bucket.makeAllFilesPublicPrivate_({}, (err?: Error | Error[] | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should execute callback with error from changing file', done => {
      const error = new Error('Error.');
      const files = [bucket.file('1'), bucket.file('2')].map(file => {
        file.makePublic = () => Promise.reject(error);
        return file;
      });
      bucketGetFilesStub = sinon.stub(bucket, 'getFiles').resolves([files]);
      bucket.makeAllFilesPublicPrivate_(
        {public: true},
        (err?: Error | Error[] | null) => {
          assert.strictEqual(err, error);
          done();
        }
      );
    });

    it('should execute callback with queued errors', done => {
      const error = new Error('Error.');
      const files = [bucket.file('1'), bucket.file('2')].map(file => {
        file.makePublic = () => Promise.reject(error);
        return file;
      });
      bucketGetFilesStub = sinon.stub(bucket, 'getFiles').resolves([files]);
      bucket.makeAllFilesPublicPrivate_(
        {
          public: true,
          force: true,
        },
        (errs?: Error | Error[] | null) => {
          assert.deepStrictEqual(errs, [error, error]);
          done();
        }
      );
    });

    it('should execute callback with files changed', done => {
      const error = new Error('Error.');
      const successFiles = [bucket.file('1'), bucket.file('2')].map(file => {
        sinon.stub(file, 'makePublic').resolves();
        return file;
      });
      const errorFiles = [bucket.file('3'), bucket.file('4')].map(file => {
        file.makePublic = () => Promise.reject(error);
        return file;
      });

      bucketGetFilesStub = sinon.stub(bucket, 'getFiles').callsFake(() => {
        const files = successFiles.concat(errorFiles);
        return Promise.resolve([files]);
      });

      bucket.makeAllFilesPublicPrivate_(
        {
          public: true,
          force: true,
        },
        (errs?: Error | Error[] | null, files?: File[]) => {
          assert.deepStrictEqual(errs, [error, error]);
          assert.deepStrictEqual(files, successFiles);
          done();
        }
      );
    });
  });
  describe('disableAutoRetryConditionallyIdempotent_', () => {
    beforeEach(() => {
      bucket.storage.retryOptions.autoRetry = true;
      STORAGE.retryOptions.idempotencyStrategy =
        IdempotencyStrategy.RetryConditional;
    });

    it('should set autoRetry to false when ifMetagenerationMatch is undefined (setMetadata)', done => {
      bucket.disableAutoRetryConditionallyIdempotent_(
        bucket['methods'].setMetadata,
        AvailableServiceObjectMethods.setMetadata
      );
      assert.strictEqual(bucket.storage.retryOptions.autoRetry, false);
      done();
    });

    it('should set autoRetry to false when ifMetagenerationMatch is undefined (delete)', done => {
      bucket.disableAutoRetryConditionallyIdempotent_(
        bucket['methods'].delete,
        AvailableServiceObjectMethods.delete
      );
      assert.strictEqual(bucket.storage.retryOptions.autoRetry, false);
      done();
    });

    it('should set autoRetry to false when IdempotencyStrategy is set to RetryNever', done => {
      STORAGE.retryOptions.idempotencyStrategy = IdempotencyStrategy.RetryNever;
      bucket = new Bucket(STORAGE, BUCKET_NAME, {
        preconditionOpts: {
          ifMetagenerationMatch: 100,
        },
      });
      bucket.disableAutoRetryConditionallyIdempotent_(
        bucket['methods'].delete,
        AvailableServiceObjectMethods.delete
      );
      assert.strictEqual(bucket.storage.retryOptions.autoRetry, false);
      done();
    });

    it('autoRetry should remain true when ifMetagenerationMatch is not undefined', done => {
      bucket = new Bucket(STORAGE, BUCKET_NAME, {
        preconditionOpts: {
          ifMetagenerationMatch: 100,
        },
      });
      bucket.disableAutoRetryConditionallyIdempotent_(
        bucket['methods'].delete,
        AvailableServiceObjectMethods.delete
      );
      assert.strictEqual(bucket.storage.retryOptions.autoRetry, true);
      done();
    });
  });
});

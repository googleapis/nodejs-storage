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
  Service,
  util,
} from '../src/nodejs-common';
import * as assert from 'assert';
import {describe, it, before, beforeEach, after, afterEach} from 'mocha';
import {
  Bucket,
  CRC32C,
  CRC32C_DEFAULT_VALIDATOR_GENERATOR,
  Channel,
} from '../src';
import * as sinon from 'sinon';
import {HmacKey} from '../src/hmacKey';
import * as hmacKeyModule from '../src/hmacKey';
import {
  CreateBucketRequest,
  CreateHmacKeyOptions,
  HmacKeyResourceResponse,
  PROTOCOL_REGEX,
  ServiceAccount,
  Storage,
  StorageExceptionMessages,
} from '../src/storage';

describe('Storage', () => {
  const PROJECT_ID = 'project-id';
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage({projectId: PROJECT_ID});
  });

  describe('instantiation', () => {
    it('should inherit from Service', () => {
      // Using assert.strictEqual instead of assert to prevent
      // coercing of types.
      assert.strictEqual(storage instanceof Service, true);
      const baseUrl = 'https://storage.googleapis.com/storage/v1';
      assert.strictEqual(storage.baseUrl, baseUrl);
      assert.strictEqual(storage['projectIdRequired'], false);
    });

    it('should set correct defaults for retry configs', () => {
      const autoRetryDefault = true;
      const maxRetryDefault = 3;
      const retryDelayMultiplierDefault = 2;
      const totalTimeoutDefault = 600;
      const maxRetryDelayDefault = 64;
      const storage = new Storage({
        projectId: PROJECT_ID,
      });
      assert.strictEqual(storage.retryOptions.autoRetry, autoRetryDefault);
      assert.strictEqual(storage.retryOptions.maxRetries, maxRetryDefault);
      assert.strictEqual(
        storage.retryOptions.retryDelayMultiplier,
        retryDelayMultiplierDefault
      );
      assert.strictEqual(
        storage.retryOptions.totalTimeout,
        totalTimeoutDefault
      );
      assert.strictEqual(
        storage.retryOptions.maxRetryDelay,
        maxRetryDelayDefault
      );
    });

    it('should propagate maxRetries in retryOptions', () => {
      const maxRetries = 1;
      const storage = new Storage({
        projectId: PROJECT_ID,
        retryOptions: {maxRetries},
      });
      assert.strictEqual(storage.retryOptions.maxRetries, maxRetries);
    });

    it('should set retryFunction', () => {
      const storage = new Storage({
        projectId: PROJECT_ID,
      });
      assert(storage.retryOptions.retryableErrorFn);
    });

    it('should retry a 502 error', () => {
      const storage = new Storage({
        projectId: PROJECT_ID,
      });
      const error = new ApiError('502 Error');
      error.code = 502;
      assert.strictEqual(storage.retryOptions.retryableErrorFn!(error), true);
    });

    it('should not retry blank error', () => {
      const storage = new Storage({
        projectId: PROJECT_ID,
      });
      const error = new ApiError('');
      assert.strictEqual(storage.retryOptions.retryableErrorFn!(error), false);
    });

    it('should retry a reset connection error', () => {
      const storage = new Storage({
        projectId: PROJECT_ID,
      });
      const error = new ApiError('Connection Reset By Peer error');
      error.errors = [
        {
          reason: 'ECONNRESET',
        },
      ];
      assert.strictEqual(storage.retryOptions.retryableErrorFn!(error), true);
    });

    it('should retry a broken pipe error', () => {
      const storage = new Storage({
        projectId: PROJECT_ID,
      });
      const error = new ApiError('Broken pipe');
      error.errors = [
        {
          reason: 'EPIPE',
        },
      ];
      assert.strictEqual(storage.retryOptions.retryableErrorFn!(error), true);
    });

    it('should retry a socket connection timeout', () => {
      const storage = new Storage({
        projectId: PROJECT_ID,
      });
      const error = new ApiError('Broken pipe');
      const innerError = {
        /**
         * @link https://nodejs.org/api/errors.html#err_socket_connection_timeout
         * @link https://github.com/nodejs/node/blob/798db3c92a9b9c9f991eed59ce91e9974c052bc9/lib/internal/errors.js#L1570-L1571
         */
        reason: 'Socket connection timeout',
      };

      error.errors = [innerError];
      assert.strictEqual(storage.retryOptions.retryableErrorFn!(error), true);
    });

    it('should not retry a 999 error', () => {
      const storage = new Storage({
        projectId: PROJECT_ID,
      });
      const error = new ApiError('999 Error');
      error.code = 0;
      assert.strictEqual(storage.retryOptions.retryableErrorFn!(error), false);
    });

    it('should return false if reason and code are both undefined', () => {
      const storage = new Storage({
        projectId: PROJECT_ID,
      });
      const error = new ApiError('error without a code');
      error.errors = [
        {
          message: 'some error message',
        },
      ];
      assert.strictEqual(storage.retryOptions.retryableErrorFn!(error), false);
    });

    it('should retry a 999 error if dictated by custom function', () => {
      const customRetryFunc = function (err?: ApiError) {
        if (err) {
          if ([999].indexOf(err.code!) !== -1) {
            return true;
          }
        }
        return false;
      };
      const storage = new Storage({
        projectId: PROJECT_ID,
        retryOptions: {retryableErrorFn: customRetryFunc},
      });
      const error = new ApiError('999 Error');
      error.code = 999;
      assert.strictEqual(storage.retryOptions.retryableErrorFn!(error), true);
    });

    it('should prepend apiEndpoint with default protocol', () => {
      const protocollessApiEndpoint = 'some.fake.endpoint';
      const storage = new Storage({
        projectId: PROJECT_ID,
        apiEndpoint: protocollessApiEndpoint,
      });
      assert.strictEqual(
        storage.baseUrl,
        `https://${protocollessApiEndpoint}/storage/v1`
      );
      assert.strictEqual(
        storage.apiEndpoint,
        `https://${protocollessApiEndpoint}`
      );
    });

    it('should strip trailing slash from apiEndpoint', () => {
      const apiEndpoint = 'https://some.fake.endpoint/';
      const storage = new Storage({
        projectId: PROJECT_ID,
        apiEndpoint,
      });
      assert.strictEqual(storage.baseUrl, `${apiEndpoint}storage/v1`);
      assert.strictEqual(storage.apiEndpoint, 'https://some.fake.endpoint');
    });

    it('should accept a `crc32cGenerator`', () => {
      const crc32cValidatorStub = sinon.createStubInstance(CRC32C);
      const crc32cGenerator = () => crc32cValidatorStub;

      const storage = new Storage({crc32cGenerator});
      assert.strictEqual(storage.crc32cGenerator, crc32cGenerator);
    });

    it('should use `CRC32C_DEFAULT_VALIDATOR_GENERATOR` by default', () => {
      assert.strictEqual(
        storage.crc32cGenerator,
        CRC32C_DEFAULT_VALIDATOR_GENERATOR
      );
    });

    describe('STORAGE_EMULATOR_HOST', () => {
      // Note: EMULATOR_HOST is an experimental configuration variable. Use apiEndpoint instead.
      const EMULATOR_HOST = 'https://internal.benchmark.com/path';
      before(() => {
        process.env.STORAGE_EMULATOR_HOST = EMULATOR_HOST;
      });

      after(() => {
        delete process.env.STORAGE_EMULATOR_HOST;
      });

      it('should set baseUrl to env var STORAGE_EMULATOR_HOST', () => {
        const storage = new Storage({
          projectId: PROJECT_ID,
        });

        assert.strictEqual(storage.baseUrl, EMULATOR_HOST);
        assert.strictEqual(
          storage.apiEndpoint,
          'https://internal.benchmark.com/path'
        );
      });

      it('should be overriden by apiEndpoint', () => {
        const storage = new Storage({
          projectId: PROJECT_ID,
          apiEndpoint: 'https://some.api.com',
        });

        assert.strictEqual(storage.baseUrl, EMULATOR_HOST);
        assert.strictEqual(storage.apiEndpoint, 'https://some.api.com');
      });

      it('should prepend default protocol and strip trailing slash', () => {
        const EMULATOR_HOST = 'internal.benchmark.com/path/';
        process.env.STORAGE_EMULATOR_HOST = EMULATOR_HOST;

        const storage = new Storage({
          projectId: PROJECT_ID,
        });

        assert.strictEqual(storage.baseUrl, EMULATOR_HOST);
        assert.strictEqual(
          storage.apiEndpoint,
          'https://internal.benchmark.com/path'
        );
      });
    });
  });

  describe('bucket', () => {
    it('should throw if no name was provided', () => {
      assert.throws(() => {
        storage.bucket(''), StorageExceptionMessages.BUCKET_NAME_REQUIRED;
      });
    });

    it('should accept a string for a name', () => {
      const newBucketName = 'new-bucket-name';
      const bucket = storage.bucket(newBucketName);
      assert.strictEqual(bucket instanceof Bucket, true);
      assert.strictEqual(bucket.name, newBucketName);
    });

    it('should optionally accept options', () => {
      const options = {
        userProject: 'grape-spaceship-123',
      };

      const bucket = storage.bucket('bucket-name', options);
      assert.strictEqual(bucket.userProject, options.userProject);
    });
  });

  describe('channel', () => {
    const ID = 'channel-id';
    const RESOURCE_ID = 'resource-id';

    it('should create a Channel object', () => {
      const channel = storage.channel(ID, RESOURCE_ID);

      assert.strictEqual(channel instanceof Channel, true);
      assert.strictEqual(channel.parent, storage);
      assert.strictEqual(channel.metadata.id, ID);
      assert.strictEqual(channel.metadata.resourceId, RESOURCE_ID);
    });
  });

  describe('hmacKey', () => {
    let hmacKeyCtor: sinon.SinonSpy;
    beforeEach(() => {
      hmacKeyCtor = sinon.spy(hmacKeyModule, 'HmacKey');
    });

    afterEach(() => {
      hmacKeyCtor.restore();
    });

    it('should throw if accessId is not provided', () => {
      assert.throws(() => {
        storage.hmacKey(''), StorageExceptionMessages.HMAC_ACCESS_ID;
      });
    });

    it('should pass options object to HmacKey constructor', () => {
      const options: hmacKeyModule.HmacKeyOptions = {projectId: 'hello world'};
      storage.hmacKey('access-id', options);
      assert.deepStrictEqual(hmacKeyCtor.getCall(0).args, [
        storage,
        'access-id',
        options,
      ]);
    });
  });

  describe('createHmacKey', () => {
    const SERVICE_ACCOUNT_EMAIL = 'service-account@gserviceaccount.com';
    const ACCESS_ID = 'some-access-id';
    const metadataResponse = {
      accessId: ACCESS_ID,
      etag: 'etag',
      id: ACCESS_ID,
      projectId: 'project-id',
      serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
      state: 'ACTIVE',
      timeCreated: '20190101T00:00:00Z',
      updated: '20190101T00:00:00Z',
    };
    const response = {
      secret: 'my-secret',
      metadata: metadataResponse,
    };
    const OPTIONS: CreateHmacKeyOptions = {
      userProject: 'user-project',
    };

    let hmacKeyCtor: sinon.SinonSpy;
    beforeEach(() => {
      hmacKeyCtor = sinon.spy(hmacKeyModule, 'HmacKey');
    });

    afterEach(() => {
      hmacKeyCtor.restore();
    });

    it('should make correct API request', done => {
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(
          reqOpts.uri,
          `/projects/${storage.projectId}/hmacKeys`
        );
        assert.strictEqual(
          reqOpts.qs.serviceAccountEmail,
          SERVICE_ACCOUNT_EMAIL
        );

        callback(null, response);
      };

      storage.createHmacKey(SERVICE_ACCOUNT_EMAIL, done);
    });

    it('should reject without a serviceAccountEmail', () => {
      assert.rejects(async () => {
        storage.createHmacKey({} as unknown as string),
          StorageExceptionMessages.HMAC_SERVICE_ACCOUNT;
      });
    });

    it('should reject when first argument is not a string', () => {
      assert.rejects(async () => {
        storage.createHmacKey({
          userProject: 'my-project',
        } as unknown as string),
          StorageExceptionMessages.HMAC_SERVICE_ACCOUNT;
      });
    });

    it('should make request with method options as query parameter', async () => {
      storage.request = sinon
        .stub()
        .callsFake((_reqOpts: {}, callback: Function) =>
          callback(null, response)
        );

      await storage.createHmacKey(SERVICE_ACCOUNT_EMAIL, OPTIONS);
      const reqArg = (storage.request as sinon.SinonStub).firstCall.args[0];
      assert.deepStrictEqual(reqArg.qs, {
        serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
        ...OPTIONS,
      });
    });

    it('should not modify the options object', done => {
      storage.request = (_reqOpts: {}, callback: Function) => {
        callback(null, response);
      };
      const originalOptions = Object.assign({}, OPTIONS);

      storage.createHmacKey(
        SERVICE_ACCOUNT_EMAIL,
        OPTIONS,
        (err: Error | null) => {
          assert.ifError(err);
          assert.deepStrictEqual(OPTIONS, originalOptions);
          done();
        }
      );
    });

    it('should invoke callback with a secret and an HmacKey instance', done => {
      storage.request = (_reqOpts: {}, callback: Function) => {
        callback(null, response);
      };

      storage.createHmacKey(
        SERVICE_ACCOUNT_EMAIL,
        (
          err: Error | null,
          hmacKey?: HmacKey | null,
          secret?: string | null
        ) => {
          assert.ifError(err);
          assert.strictEqual(secret, response.secret);
          assert.deepStrictEqual(hmacKeyCtor.getCall(0).args, [
            storage,
            response.metadata.accessId,
            {projectId: response.metadata.projectId},
          ]);
          assert.strictEqual(hmacKey!.metadata, metadataResponse);
          done();
        }
      );
    });

    it('should invoke callback with raw apiResponse', done => {
      storage.request = (_reqOpts: {}, callback: Function) => {
        callback(null, response);
      };

      storage.createHmacKey(
        SERVICE_ACCOUNT_EMAIL,
        (
          err: Error | null,
          _hmacKey?: HmacKey | null,
          _secret?: string | null,
          apiResponse?: HmacKeyResourceResponse
        ) => {
          assert.ifError(err);
          assert.strictEqual(apiResponse, response);
          done();
        }
      );
    });

    it('should execute callback with request error', done => {
      const error = new Error('Request error');
      const response = {success: false};
      storage.request = (_reqOpts: {}, callback: Function) => {
        callback(error, response);
      };

      storage.createHmacKey(
        SERVICE_ACCOUNT_EMAIL,
        (
          err: Error | null,
          _hmacKey?: HmacKey | null,
          _secret?: string | null,
          apiResponse?: HmacKeyResourceResponse
        ) => {
          assert.strictEqual(err, error);
          assert.strictEqual(apiResponse, response);
          done();
        }
      );
    });
  });

  describe('createBucket', () => {
    const BUCKET_NAME = 'new-bucket-name';
    const METADATA: CreateBucketRequest = {archive: true};
    const BUCKET = sinon.createStubInstance(Bucket);
    BUCKET.name = BUCKET_NAME;

    it('should make correct API request', done => {
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(reqOpts.uri, '/b');
        assert.strictEqual(reqOpts.qs.project, storage.projectId);
        assert.strictEqual(reqOpts.json.name, BUCKET_NAME);

        callback();
      };

      storage.createBucket(BUCKET_NAME, done);
    });

    it('should accept a name, metadata, and callback', done => {
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        assert.deepStrictEqual(reqOpts.json, {
          name: 'new-bucket-name',
          storageClass: 'ARCHIVE',
        });
        callback(null, METADATA);
      };
      storage.bucket = (name: string) => {
        assert.strictEqual(name, BUCKET_NAME);
        return BUCKET;
      };
      storage.createBucket(BUCKET_NAME, METADATA, (err: Error | null) => {
        assert.ifError(err);
        done();
      });
    });

    it('should accept a name and callback only', done => {
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback();
      };
      storage.createBucket(BUCKET_NAME, done);
    });

    it('should reject if no name is provided', () => {
      assert.rejects(async () => {
        storage.createBucket(''),
          StorageExceptionMessages.BUCKET_NAME_REQUIRED_CREATE;
      });
    });

    it('should honor the userProject option', done => {
      const options = {
        userProject: 'grape-spaceship-123',
      };

      storage.request = (reqOpts: DecorateRequestOptions) => {
        assert.strictEqual(reqOpts.qs.userProject, options.userProject);
        done();
      };

      storage.createBucket(BUCKET_NAME, options, assert.ifError);
    });

    it('should execute callback with bucket', done => {
      storage.bucket = () => {
        return BUCKET;
      };
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(null, METADATA);
      };
      storage.createBucket(
        BUCKET_NAME,
        (err: Error | null, bucket?: Bucket | null) => {
          assert.ifError(err);
          assert.deepStrictEqual(bucket, BUCKET);
          assert.deepStrictEqual(bucket.metadata, METADATA);
          done();
        }
      );
    });

    it('should execute callback on error', done => {
      const error = new Error('Error.');
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(error);
      };
      storage.createBucket(BUCKET_NAME, (err: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should execute callback with apiResponse', done => {
      const resp = {success: true};
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(null, resp);
      };
      storage.createBucket(
        BUCKET_NAME,
        (err: Error | null, bucket?: Bucket | null, apiResponse?: unknown) => {
          assert.strictEqual(resp, apiResponse);
          done();
        }
      );
    });

    it('should allow a user-specified storageClass', done => {
      const storageClass = 'nearline';
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        assert.strictEqual(reqOpts.json.storageClass, storageClass);
        callback(); // done
      };
      storage.createBucket(BUCKET_NAME, {storageClass}, done);
    });

    it('should allow settings `storageClass` to same value as provided storage class name', done => {
      const storageClass = 'coldline';
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        assert.strictEqual(
          reqOpts.json.storageClass,
          storageClass.toUpperCase()
        );
        callback(); // done
      };

      assert.doesNotThrow(() => {
        storage.createBucket(
          BUCKET_NAME,
          {storageClass, [storageClass]: true},
          done
        );
      });
    });

    it('should allow setting rpo', done => {
      const location = 'NAM4';
      const rpo = 'ASYNC_TURBO';
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        assert.strictEqual(reqOpts.json.location, location);
        assert.strictEqual(reqOpts.json.rpo, rpo);
        callback();
      };
      storage.createBucket(BUCKET_NAME, {location, rpo}, done);
    });

    it('should throw when `storageClass` is set to different value than provided storageClass name', () => {
      assert.throws(() => {
        storage.createBucket(
          BUCKET_NAME,
          {
            storageClass: 'nearline',
            coldline: true,
          },
          assert.ifError
        );
      }, /Both `coldline` and `storageClass` were provided./);
    });

    describe('storage classes', () => {
      it('should expand metadata.archive', done => {
        storage.request = (reqOpts: DecorateRequestOptions) => {
          assert.strictEqual(reqOpts.json.storageClass, 'ARCHIVE');
          done();
        };

        storage.createBucket(BUCKET_NAME, {archive: true}, assert.ifError);
      });

      it('should expand metadata.coldline', done => {
        storage.request = (reqOpts: DecorateRequestOptions) => {
          assert.strictEqual(reqOpts.json.storageClass, 'COLDLINE');
          done();
        };

        storage.createBucket(BUCKET_NAME, {coldline: true}, assert.ifError);
      });

      it('should expand metadata.dra', done => {
        storage.request = (reqOpts: DecorateRequestOptions) => {
          const body = reqOpts.json;
          assert.strictEqual(body.storageClass, 'DURABLE_REDUCED_AVAILABILITY');
          done();
        };

        storage.createBucket(BUCKET_NAME, {dra: true}, assert.ifError);
      });

      it('should expand metadata.multiRegional', done => {
        storage.request = (reqOpts: DecorateRequestOptions) => {
          assert.strictEqual(reqOpts.json.storageClass, 'MULTI_REGIONAL');
          done();
        };

        storage.createBucket(
          BUCKET_NAME,
          {
            multiRegional: true,
          },
          assert.ifError
        );
      });

      it('should expand metadata.nearline', done => {
        storage.request = (reqOpts: DecorateRequestOptions) => {
          assert.strictEqual(reqOpts.json.storageClass, 'NEARLINE');
          done();
        };

        storage.createBucket(BUCKET_NAME, {nearline: true}, assert.ifError);
      });

      it('should expand metadata.regional', done => {
        storage.request = (reqOpts: DecorateRequestOptions) => {
          assert.strictEqual(reqOpts.json.storageClass, 'REGIONAL');
          done();
        };

        storage.createBucket(BUCKET_NAME, {regional: true}, assert.ifError);
      });

      it('should expand metadata.standard', done => {
        storage.request = (reqOpts: DecorateRequestOptions) => {
          assert.strictEqual(reqOpts.json.storageClass, 'STANDARD');
          done();
        };

        storage.createBucket(BUCKET_NAME, {standard: true}, assert.ifError);
      });
    });

    describe('requesterPays', () => {
      it('should accept requesterPays setting', done => {
        const options = {
          requesterPays: true,
        };
        storage.request = (reqOpts: DecorateRequestOptions) => {
          assert.deepStrictEqual(reqOpts.json.billing, options);
          assert.strictEqual(reqOpts.json.requesterPays, undefined);
          done();
        };
        storage.createBucket(BUCKET_NAME, options, assert.ifError);
      });
    });
  });

  describe('getBuckets', () => {
    it('should get buckets without a query', done => {
      storage.request = (reqOpts: DecorateRequestOptions) => {
        assert.strictEqual(reqOpts.uri, '/b');
        assert.deepStrictEqual(reqOpts.qs, {project: storage.projectId});
        done();
      };
      storage.getBuckets(util.noop);
    });

    it('should get buckets with a query', done => {
      const token = 'next-page-token';
      storage.request = (reqOpts: DecorateRequestOptions) => {
        assert.deepStrictEqual(reqOpts.qs, {
          project: storage.projectId,
          maxResults: 5,
          pageToken: token,
        });
        done();
      };
      storage.getBuckets({maxResults: 5, pageToken: token}, util.noop);
    });

    it('should execute callback with error', done => {
      const error = new Error('Error.');

      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(error);
      };

      storage.getBuckets({}, (err: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should return nextQuery if more results exist', () => {
      const token = 'next-page-token';
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(null, {nextPageToken: token, items: []});
      };
      storage.getBuckets(
        {maxResults: 5},
        (err: Error | null, buckets: Bucket[], nextQuery?: {}) => {
          assert.ifError(err);
          assert.notEqual(nextQuery, undefined);
        }
      );
    });

    it('should return null nextQuery if there are no more results', () => {
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(null, {items: []});
      };
      storage.getBuckets(
        {maxResults: 5},
        (err: Error | null, results: Bucket[], nextQuery?: {}) => {
          assert.strictEqual(nextQuery, null);
        }
      );
    });

    it('should return Bucket objects', done => {
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(null, {items: [{id: 'fake-bucket-name'}]});
      };
      storage.getBuckets((err: Error | null, buckets: Bucket[]) => {
        assert.ifError(err);
        assert(buckets[0] instanceof Bucket);
        done();
      });
    });

    it('should return apiResponse', done => {
      const resp = {
        items: [{id: 'fake-bucket-name'}, {id: 'fake-bucket-name-two'}],
      };
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(null, resp);
      };
      storage.getBuckets(
        {maxResults: 1},
        (
          err: Error | null,
          buckets: Bucket[],
          nextQuery?: {},
          apiResponse?: unknown
        ) => {
          assert.deepStrictEqual(resp, apiResponse);
          done();
        }
      );
    });

    it('should populate returned Bucket object with metadata', done => {
      const bucketMetadata = {
        id: 'bucketname',
        contentType: 'x-zebra',
        metadata: {
          my: 'custom metadata',
        },
      };
      storage.request = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(null, {items: [bucketMetadata]});
      };
      storage.getBuckets((err: Error | null, buckets: Bucket[]) => {
        assert.ifError(err);
        assert.deepStrictEqual(buckets[0].metadata, bucketMetadata);
        done();
      });
    });
  });

  describe('getHmacKeys', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let storageRequestStub: sinon.SinonStub<any, any>;
    const SERVICE_ACCOUNT_EMAIL = 'service-account@gserviceaccount.com';
    const ACCESS_ID = 'some-access-id';
    const metadataResponse = {
      accessId: ACCESS_ID,
      etag: 'etag',
      id: ACCESS_ID,
      projectId: 'project-id',
      serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
      state: 'ACTIVE',
      timeCreated: '20190101T00:00:00Z',
      updated: '20190101T00:00:00Z',
    };

    beforeEach(() => {
      storageRequestStub = sinon
        .stub(storage, 'request')
        .callsFake((_opts: {}, callback: Function) => {
          callback(null, {});
        });
    });

    let hmacKeyCtor: sinon.SinonSpy;
    beforeEach(() => {
      hmacKeyCtor = sinon.spy(hmacKeyModule, 'HmacKey');
    });

    afterEach(() => {
      hmacKeyCtor.restore();
    });

    it('should get HmacKeys without a query', done => {
      storage.getHmacKeys(() => {
        const firstArg = storageRequestStub.firstCall.args[0];
        assert.strictEqual(
          firstArg.uri,
          `/projects/${storage.projectId}/hmacKeys`
        );
        assert.deepStrictEqual(firstArg.qs, {});
        done();
      });
    });

    it('should get HmacKeys with a query', done => {
      const query = {
        maxResults: 5,
        pageToken: 'next-page-token',
        serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
        showDeletedKeys: false,
      };

      storage.getHmacKeys(query, () => {
        const firstArg = storageRequestStub.firstCall.args[0];
        assert.strictEqual(
          firstArg.uri,
          `/projects/${storage.projectId}/hmacKeys`
        );
        assert.deepStrictEqual(firstArg.qs, query);
        done();
      });
    });

    it('should execute callback with error', done => {
      const error = new Error('Error.');
      const apiResponse = {};

      storageRequestStub.callsFake((_opts: {}, callback: Function) => {
        callback(error, apiResponse);
      });

      storage.getHmacKeys({}, (err: Error | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should return nextQuery if more results exist', done => {
      const token = 'next-page-token';
      storageRequestStub.callsFake((_opts: {}, callback: Function) => {
        callback(null, {nextPageToken: token, items: []});
      });

      storage.getHmacKeys(
        {maxResults: 5},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: Error | null, _hmacKeys: HmacKey[] | null, nextQuery: any) => {
          assert.ifError(err);
          assert.notEqual(nextQuery, undefined);
          done();
        }
      );
    });

    it('should return undefined nextQuery if there are no more results', done => {
      storageRequestStub.callsFake((_opts: {}, callback: Function) => {
        callback(null, {items: []});
      });

      storage.getHmacKeys(
        {},
        (err: Error | null, _hmacKeys: HmacKey[] | null, nextQuery?: {}) => {
          assert.ifError(err);
          assert.strictEqual(nextQuery, undefined);
          done();
        }
      );
    });

    it('should return apiResponse', done => {
      const resp = {items: [metadataResponse, metadataResponse]};
      storageRequestStub.callsFake((_opts: {}, callback: Function) => {
        callback(null, resp);
      });

      storage.getHmacKeys(
        {maxResults: 1},
        (
          err: Error | null,
          _hmacKeys: HmacKey[] | null,
          _nextQuery?: {},
          apiResponse?: unknown
        ) => {
          assert.ifError(err);
          assert.deepStrictEqual(resp, apiResponse);
          done();
        }
      );
    });

    it('should populate returned HmacKey object with accessId and metadata', done => {
      storageRequestStub.callsFake((_opts: {}, callback: Function) => {
        callback(null, {items: [metadataResponse]});
      });

      storage.getHmacKeys((err: Error | null, hmacKeys: HmacKey[] | null) => {
        assert.ifError(err);
        assert.deepStrictEqual(hmacKeyCtor.getCall(0).args, [
          storage,
          metadataResponse.accessId,
          {projectId: metadataResponse.projectId},
        ]);
        assert.deepStrictEqual(hmacKeys![0].metadata, metadataResponse);
        done();
      });
    });
  });

  describe('getServiceAccount', () => {
    it('should make the correct request', done => {
      storage.request = (reqOpts: DecorateRequestOptions) => {
        assert.strictEqual(
          reqOpts.uri,
          `/projects/${storage.projectId}/serviceAccount`
        );
        assert.deepStrictEqual(reqOpts.qs, {});
        done();
      };

      storage.getServiceAccount(assert.ifError);
    });

    it('should allow user options', done => {
      const options = {};

      storage.request = (reqOpts: DecorateRequestOptions) => {
        assert.strictEqual(reqOpts.qs, options);
        done();
      };

      storage.getServiceAccount(options, assert.ifError);
    });

    describe('error', () => {
      const ERROR = new Error('Error.');
      const API_RESPONSE = {};

      beforeEach(() => {
        storage.request = (
          reqOpts: DecorateRequestOptions,
          callback: Function
        ) => {
          callback(ERROR, API_RESPONSE);
        };
      });

      it('should return the error and apiResponse', done => {
        storage.getServiceAccount(
          (
            err: Error | null,
            serviceAccount?: ServiceAccount,
            apiResponse?: unknown
          ) => {
            assert.strictEqual(err, ERROR);
            assert.strictEqual(serviceAccount, null);
            assert.strictEqual(apiResponse, API_RESPONSE);
            done();
          }
        );
      });
    });

    describe('success', () => {
      const API_RESPONSE = {};

      beforeEach(() => {
        storage.request = (
          reqOpts: DecorateRequestOptions,
          callback: Function
        ) => {
          callback(null, API_RESPONSE);
        };
      });

      it('should return the serviceAccount and apiResponse', done => {
        storage.getServiceAccount(
          (
            err: Error | null,
            serviceAccount?: ServiceAccount,
            apiResponse?: unknown
          ) => {
            assert.ifError(err);
            assert.deepStrictEqual(serviceAccount, {});
            assert.strictEqual(apiResponse, API_RESPONSE);
            done();
          }
        );
      });
    });
  });

  describe('#sanitizeEndpoint', () => {
    const USER_DEFINED_SHORT_API_ENDPOINT = 'myapi.com:8080';
    const USER_DEFINED_PROTOCOL = 'myproto';
    const USER_DEFINED_FULL_API_ENDPOINT = `${USER_DEFINED_PROTOCOL}://myapi.com:8080`;

    it('should default protocol to https', () => {
      const endpoint = Storage['sanitizeEndpoint'](
        USER_DEFINED_SHORT_API_ENDPOINT
      );
      assert.strictEqual(endpoint.match(PROTOCOL_REGEX)![1], 'https');
    });

    it('should not override protocol', () => {
      const endpoint = Storage['sanitizeEndpoint'](
        USER_DEFINED_FULL_API_ENDPOINT
      );
      assert.strictEqual(
        endpoint.match(PROTOCOL_REGEX)![1],
        USER_DEFINED_PROTOCOL
      );
    });

    it('should remove trailing slashes from URL', () => {
      const endpointsWithTrailingSlashes = [
        `${USER_DEFINED_FULL_API_ENDPOINT}/`,
        `${USER_DEFINED_FULL_API_ENDPOINT}//`,
      ];
      for (const endpointWithTrailingSlashes of endpointsWithTrailingSlashes) {
        const endpoint = Storage['sanitizeEndpoint'](
          endpointWithTrailingSlashes
        );
        assert.strictEqual(endpoint.endsWith('/'), false);
      }
    });
  });
});

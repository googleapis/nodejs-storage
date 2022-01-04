// Copyright 2022 Google LLC
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

import * as assert from 'assert';
import {describe, it, beforeEach, before, afterEach, after} from 'mocha';
import * as crypto from 'crypto';
import * as isStream from 'is-stream';
import * as mockery from 'mockery';
import * as nock from 'nock';
import * as path from 'path';
import * as sinon from 'sinon';
import {PassThrough, Stream} from 'stream';

import {
  ApiError,
  CreateUriCallback,
  PROTOCOL_REGEX,
} from '../src/gcs-resumable-upload/index';
import {GaxiosOptions, GaxiosError, GaxiosResponse} from 'gaxios';

nock.disableNetConnect();

class AbortController {
  aborted = false;
  signal = this;
  abort() {
    this.aborted = true;
  }
}

let configData = {} as {[index: string]: {}};
class ConfigStore {
  constructor(packageName: string, defaults: object, config: object) {
    this.set('packageName', packageName);
    this.set('config', config);
  }
  delete(key: string) {
    delete configData[key];
  }
  get(key: string) {
    return configData[key];
  }
  set(key: string, value: {}) {
    configData[key] = value;
  }
}

const queryPath = '/?userProject=user-project-id';

function mockAuthorizeRequest(
  code = 200,
  data: {} | string = {
    access_token: 'abc123',
  }
) {
  return nock('https://www.googleapis.com')
    .post('/oauth2/v4/token')
    .reply(code, data);
}

describe('gcs-resumable-upload', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let upload: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let up: any;

  const BUCKET = 'bucket-name';
  const CUSTOM_REQUEST_OPTIONS = {headers: {'X-My-Header': 'My custom value'}};
  const FILE = 'file-name';
  const GENERATION = Date.now();
  const METADATA = {contentLength: 1024, contentType: 'application/json'};
  const ORIGIN = '*';
  const PARAMS = {ifMetagenerationNotMatch: 3};
  const PREDEFINED_ACL = 'authenticatedRead';
  const USER_PROJECT = 'user-project-id';
  const API_ENDPOINT = 'https://fake.googleapis.com';
  const BASE_URI = `${API_ENDPOINT}/upload/storage/v1/b`;
  let REQ_OPTS: GaxiosOptions;
  const keyFile = path.join(__dirname, '../../test/fixtures/keys.json');

  before(() => {
    mockery.registerMock('abort-controller', {default: AbortController});
    mockery.registerMock('configstore', ConfigStore);
    mockery.enable({useCleanCache: true, warnOnUnregistered: false});
    upload = require('../src/gcs-resumable-upload').upload;
  });

  beforeEach(() => {
    configData = {};
    REQ_OPTS = {url: 'http://fake.local'};
    up = upload({
      bucket: BUCKET,
      file: FILE,
      customRequestOptions: CUSTOM_REQUEST_OPTIONS,
      generation: GENERATION,
      metadata: METADATA,
      origin: ORIGIN,
      params: PARAMS,
      predefinedAcl: PREDEFINED_ACL,
      userProject: USER_PROJECT,
      authConfig: {keyFile},
      apiEndpoint: API_ENDPOINT,
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  after(() => {
    mockery.deregisterAll();
    mockery.disable();
  });

  describe('ctor', () => {
    it('should throw if a bucket or file is not given', () => {
      assert.throws(() => {
        upload();
      }, /A bucket and file name are required/);
    });

    it('should localize the bucket', () => {
      assert.strictEqual(up.bucket, BUCKET);
    });

    it('should localize the cacheKey', () => {
      assert.strictEqual(up.cacheKey, [BUCKET, FILE, GENERATION].join('/'));
    });

    it('should localize customRequestOptions', () => {
      assert.strictEqual(up.customRequestOptions, CUSTOM_REQUEST_OPTIONS);
    });

    it('should default customRequestOptions to empty object', () => {
      const up = upload({bucket: BUCKET, file: FILE});
      assert.deepStrictEqual(up.customRequestOptions, {});
    });

    it('should include ZERO generation value in the cacheKey', () => {
      const upWithZeroGeneration = upload({
        bucket: BUCKET,
        file: FILE,
        generation: 0,
        metadata: METADATA,
        origin: ORIGIN,
        predefinedAcl: PREDEFINED_ACL,
        userProject: USER_PROJECT,
        authConfig: {keyFile},
        apiEndpoint: API_ENDPOINT,
      });
      assert.strictEqual(
        upWithZeroGeneration.cacheKey,
        [BUCKET, FILE, 0].join('/')
      );
    });

    it('should not include a generation in the cacheKey if it was not set', () => {
      const up = upload({
        bucket: BUCKET,
        file: FILE,
      });

      assert.strictEqual(up.cacheKey, [BUCKET, FILE].join('/'));
    });

    it('should localize the file', () => {
      assert.strictEqual(up.file, FILE);
    });

    it('should localize the generation', () => {
      assert.strictEqual(up.generation, GENERATION);
    });

    it('should localize the apiEndpoint', () => {
      assert.strictEqual(up.apiEndpoint, API_ENDPOINT);
      assert.strictEqual(up.baseURI, BASE_URI);
    });

    it('should prepend https:// to apiEndpoint if not present', () => {
      const up = upload({
        bucket: BUCKET,
        file: FILE,
        apiEndpoint: 'fake.googleapis.com',
      });
      assert.strictEqual(up.apiEndpoint, API_ENDPOINT);
      assert.strictEqual(up.baseURI, BASE_URI);
    });

    it('should localize the KMS key name', () => {
      const kmsKeyName = 'kms-key-name';
      const up = upload({bucket: 'BUCKET', file: FILE, kmsKeyName});
      assert.strictEqual(up.kmsKeyName, kmsKeyName);
    });

    it('should localize metadata or default to empty object', () => {
      assert.strictEqual(up.metadata, METADATA);

      const upWithoutMetadata = upload({bucket: BUCKET, file: FILE});
      assert.deepStrictEqual(upWithoutMetadata.metadata, {});
    });

    it('should set the offset if it is provided', () => {
      const offset = 10;
      const up = upload({bucket: BUCKET, file: FILE, offset});

      assert.strictEqual(up.offset, offset);
    });

    it('should localize the origin', () => {
      assert.strictEqual(up.origin, ORIGIN);
    });

    it('should localize the params', () => {
      assert.strictEqual(up.params, PARAMS);
    });

    it('should localize userProject', () => {
      assert.strictEqual(up.userProject, USER_PROJECT);
    });

    it('should localize an encryption object from a key', () => {
      const key = crypto.randomBytes(32);
      const up = upload({bucket: BUCKET, file: FILE, key});
      const expectedKey = key.toString('base64');
      const expectedHash = crypto
        .createHash('sha256')
        .update(key)
        .digest('base64');
      assert.deepStrictEqual(up.encryption, {
        key: expectedKey,
        hash: expectedHash,
      });
    });

    it('should localize the predefinedAcl', () => {
      assert.strictEqual(up.predefinedAcl, PREDEFINED_ACL);
    });

    it('should set the predefinedAcl with public: true', () => {
      const up = upload({bucket: BUCKET, file: FILE, public: true});
      assert.strictEqual(up.predefinedAcl, 'publicRead');
    });

    it('should set the predefinedAcl with private: true', () => {
      const up = upload({bucket: BUCKET, file: FILE, private: true});
      assert.strictEqual(up.predefinedAcl, 'private');
    });

    it('should create a ConfigStore instance', () => {
      assert.strictEqual(configData.packageName, 'gcs-resumable-upload');
    });

    it('should set the configPath', () => {
      const configPath = '/custom/config/path';
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const up = upload({bucket: BUCKET, file: FILE, configPath});
      assert.deepStrictEqual(configData.config, {configPath});
    });

    it('should set numBytesWritten to 0', () => {
      assert.strictEqual(up.numBytesWritten, 0);
    });

    it('should set numRetries to 0', () => {
      assert.strictEqual(up.numRetries, 0);
    });

    it('should set the contentLength if provided', () => {
      const up = upload({
        bucket: BUCKET,
        file: FILE,
        metadata: {contentLength: METADATA.contentLength},
      });
      assert.strictEqual(up.contentLength, METADATA.contentLength);
    });

    it('should default the contentLength to *', () => {
      const up = upload({bucket: BUCKET, file: FILE});
      assert.strictEqual(up.contentLength, '*');
    });

    it('should localize the uri or get one from config', () => {
      const uri = 'http://www.blah.com/';
      const upWithUri = upload({bucket: BUCKET, file: FILE, uri});
      assert.strictEqual(upWithUri.uriProvidedManually, true);
      assert.strictEqual(upWithUri.uri, uri);

      configData[`${BUCKET}/${FILE}`] = {uri: 'fake-uri'};
      const up = upload({bucket: BUCKET, file: FILE});
      assert.strictEqual(up.uriProvidedManually, false);
      assert.strictEqual(up.uri, 'fake-uri');
    });

    describe('on write', () => {
      const URI = 'uri';

      it('should continue uploading', done => {
        up.uri = URI;
        up.continueUploading = done;
        up.emit('writing');
      });

      it('should create an upload', done => {
        up.startUploading = done;
        up.createURI = (callback: CreateUriCallback) => {
          callback(null);
        };
        up.emit('writing');
      });

      it('should destroy the stream from an error', done => {
        const error: ApiError = {
          message: ':(',
          name: ':(',
          code: 123,
        };
        up.destroy = (err: ApiError) => {
          assert(err.message.indexOf(error.message) > -1);
          assert(err.name.indexOf(error.name) > -1);
          assert.strictEqual(err.code, 123);
          done();
        };
        up.createURI = (callback: CreateUriCallback) => {
          callback(error);
        };
        up.emit('writing');
      });

      it('should save the uri to config on first write event', done => {
        const uri = 'http://newly-created-uri';
        up.createURI = (callback: CreateUriCallback) => {
          callback(null, uri);
        };
        up.set = (props: {}) => {
          assert.deepStrictEqual(props, {uri});
          done();
        };
        up.emit('writing');
      });
    });
  });

  describe('#createURI', () => {
    it('should make the correct request', done => {
      up.makeRequest = async (reqOpts: GaxiosOptions) => {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(reqOpts.url, `${BASE_URI}/${BUCKET}/o`);
        assert.deepStrictEqual(reqOpts.params, {
          predefinedAcl: up.predefinedAcl,
          name: FILE,
          uploadType: 'resumable',
          ifGenerationMatch: GENERATION,
          ifMetagenerationNotMatch: PARAMS.ifMetagenerationNotMatch,
        });
        assert.strictEqual(reqOpts.data, up.metadata);
        done();
        return {headers: {location: '/foo'}};
      };
      up.createURI();
    });

    it('should pass through the KMS key name', done => {
      const kmsKeyName = 'kms-key-name';
      const up = upload({bucket: BUCKET, file: FILE, kmsKeyName});

      up.makeRequest = async (reqOpts: GaxiosOptions) => {
        assert.strictEqual(reqOpts.params.kmsKeyName, kmsKeyName);
        done();
        return {headers: {location: '/foo'}};
      };

      up.createURI();
    });

    it('should respect 0 as a generation', done => {
      up.makeRequest = async (reqOpts: GaxiosOptions) => {
        assert.strictEqual(reqOpts.params.ifGenerationMatch, 0);
        done();
        return {headers: {location: '/foo'}};
      };
      up.generation = 0;
      up.createURI();
    });

    describe('error', () => {
      const error = new Error(':(');

      beforeEach(() => {
        up.makeRequest = async () => {
          throw error;
        };
      });

      it('should exec callback with error', done => {
        up.createURI((err: Error) => {
          assert.strictEqual(err, error);
          done();
        });
      });
    });

    describe('success', () => {
      const URI = 'uri';
      const RESP = {headers: {location: URI}};

      beforeEach(() => {
        up.makeRequest = async () => {
          return RESP;
        };
      });

      it('should localize the uri', done => {
        up.createURI((err: Error) => {
          assert.ifError(err);
          assert.strictEqual(up.uri, URI);
          assert.strictEqual(up.offset, 0);
          done();
        });
      });

      it('should default the offset to 0', done => {
        up.createURI((err: Error) => {
          assert.ifError(err);
          assert.strictEqual(up.offset, 0);
          done();
        });
      });

      it('should exec callback with URI', done => {
        up.createURI((err: Error, uri: string) => {
          assert.ifError(err);
          assert.strictEqual(uri, URI);
          done();
        });
      });
    });
  });

  describe('#continueUploading', () => {
    it('should start uploading if an offset was set', done => {
      up.offset = 0;
      up.startUploading = async () => {
        done();
      };
      up.continueUploading();
    });

    it('should get and set offset if no offset was set', done => {
      up.getAndSetOffset = async () => {
        done();
      };
      up.startUploading = () => Promise.resolve();
      up.continueUploading();
    });

    it('should start uploading when done', done => {
      up.startUploading = async function () {
        assert.strictEqual(this, up);
        done();
      };
      up.getAndSetOffset = () => Promise.resolve();
      up.continueUploading();
    });
  });

  describe('#startUploading', () => {
    beforeEach(() => {
      up.makeRequestStream = async () => new PassThrough();
    });

    it('should make the correct request', done => {
      const URI = 'uri';
      const OFFSET = 8;

      up.uri = URI;
      up.offset = OFFSET;

      up.makeRequestStream = async (reqOpts: GaxiosOptions) => {
        assert.strictEqual(reqOpts.method, 'PUT');
        assert.strictEqual(reqOpts.url, up.uri);
        assert.deepStrictEqual(reqOpts.headers, {
          'Content-Range': 'bytes ' + OFFSET + '-*/' + up.contentLength,
        });
        done();
        return new PassThrough();
      };

      up.startUploading();
    });

    it('should create a buffer stream', () => {
      assert.strictEqual(up.bufferStream, undefined);
      up.startUploading();
      assert.strictEqual(isStream(up.bufferStream), true);
    });

    it('should reuse the buffer stream', () => {
      const bufferStream = new PassThrough();
      up.bufferStream = bufferStream;
      up.startUploading();
      assert.strictEqual(up.bufferStream, bufferStream);
    });

    it('should create an offset stream', () => {
      assert.strictEqual(up.offsetStream, undefined);
      up.startUploading();
      assert.strictEqual(isStream(up.offsetStream), true);
    });

    it('should cork the stream on prefinish', done => {
      up.cork = done;
      up.setPipeline = (buffer: Stream, offset: Stream, delay: Stream) => {
        setImmediate(() => {
          delay.emit('prefinish');
        });
      };

      up.makeRequestStream = async () => new PassThrough();
      up.startUploading();
    });

    it('should set the pipeline', done => {
      up.setPipeline = (buffer: Stream, offset: Stream, delay: Stream) => {
        assert.strictEqual(buffer, up.bufferStream);
        assert.strictEqual(offset, up.offsetStream);
        assert.strictEqual(isStream(delay), true);

        done();
      };

      up.makeRequestStream = async () => new PassThrough();
      up.startUploading();
    });

    it('should pipe to the request stream', done => {
      let requestStreamEmbeddedStream: PassThrough;
      up.pipe = (requestStream: PassThrough) => {
        requestStreamEmbeddedStream = requestStream;
      };
      up.makeRequestStream = async (reqOpts: GaxiosOptions) => {
        assert.strictEqual(reqOpts.body, requestStreamEmbeddedStream);
        setImmediate(done);
        return new PassThrough();
      };
      up.startUploading();
    });

    it('should unpipe the request stream on restart', done => {
      let requestStreamEmbeddedStream: PassThrough;
      up.pipe = (requestStream: PassThrough) => {
        requestStreamEmbeddedStream = requestStream;
      };
      up.unpipe = (requestStream: PassThrough) => {
        assert.strictEqual(requestStream, requestStreamEmbeddedStream);
        done();
      };
      up.makeRequestStream = async () => new PassThrough();
      up.startUploading();
      up.emit('restart');
    });

    it('should emit the metadata', done => {
      const BODY = {hi: 1};
      const RESP = {data: BODY};
      up.on('metadata', (body: {}) => {
        assert.strictEqual(body, BODY);
        done();
      });
      const requestStream = new PassThrough();
      up.makeRequestStream = async () => requestStream;
      up.startUploading();
      up.emit('response', RESP);
    });

    it('should return response data size as number', done => {
      const metadata = {
        size: '0',
      };
      const RESP = {data: metadata};
      up.on('metadata', (data: {size: number}) => {
        assert.strictEqual(Number(metadata.size), data.size);
        assert.strictEqual(typeof data.size, 'number');
        done();
      });
      const requestStream = new PassThrough();
      up.makeRequestStream = async () => requestStream;
      up.startUploading();
      up.emit('response', RESP);
    });

    it('should destroy the stream if an error occurred', done => {
      const RESP = {data: {error: new Error('Error.')}};
      const requestStream = new PassThrough();
      up.on('metadata', done);
      // metadata shouldn't be emitted... will blow up test if called
      up.destroy = (err: Error) => {
        assert.strictEqual(err, RESP.data.error);
        done();
      };
      up.makeRequestStream = async () => requestStream;
      up.startUploading();
      up.emit('response', RESP);
    });

    it('should destroy the stream if the status code is out of range', done => {
      const RESP = {data: {}, status: 300};
      const requestStream = new PassThrough();
      up.on('metadata', done);
      // metadata shouldn't be emitted... will blow up test if called
      up.destroy = (err: Error) => {
        assert.strictEqual(err.message, 'Upload failed');
        done();
      };
      up.makeRequestStream = async () => requestStream;
      up.startUploading();
      up.emit('response', RESP);
    });

    it('should estroy the stream if hte request failed', done => {
      const error = new Error('Error.');
      up.destroy = (err: Error) => {
        assert.strictEqual(err, error);
        done();
      };
      up.makeRequestStream = async () => {
        throw error;
      };
      up.startUploading();
    });

    it('should delete the config', done => {
      const RESP = {data: ''};
      const requestStream = new PassThrough();
      up.makeRequestStream = async () => {
        up.deleteConfig = done;
        return requestStream;
      };
      up.startUploading();
      up.emit('response', RESP);
    });

    it('should uncork the stream', done => {
      const RESP = {data: ''};
      const requestStream = new PassThrough();
      up.makeRequestStream = () => {
        up.uncork = done;
        up.emit('response', RESP);
        return requestStream;
      };
      up.startUploading();
    });
  });

  describe('#onChunk', () => {
    const CHUNK = Buffer.from('abcdefghijklmnopqrstuvwxyz');
    const ENC = 'utf-8';
    const NEXT = () => {};

    describe('first write', () => {
      beforeEach(() => {
        up.numBytesWritten = 0;
      });

      it('should get the first chunk', done => {
        up.get = (prop: string) => {
          assert.strictEqual(prop, 'firstChunk');
          done();
        };

        up.onChunk(CHUNK, ENC, NEXT);
      });

      describe('new upload', () => {
        beforeEach(() => {
          up.get = () => {};
        });

        it('should save the uri and first chunk if its not cached', () => {
          const URI = 'uri';
          up.uri = URI;
          up.set = (props: {uri?: string; firstChunk: Buffer}) => {
            const firstChunk = CHUNK.slice(0, 16);
            assert.deepStrictEqual(props.uri, URI);
            assert.strictEqual(Buffer.compare(props.firstChunk, firstChunk), 0);
          };
          up.onChunk(CHUNK, ENC, NEXT);
        });
      });

      describe('continued upload', () => {
        beforeEach(() => {
          up.bufferStream = new PassThrough();
          up.offsetStream = new PassThrough();
          up.get = () => CHUNK;
          up.restart = () => {};
        });

        it('should push data back to the buffer stream if different', done => {
          up.bufferStream.unshift = (chunk: string) => {
            assert.strictEqual(chunk, CHUNK);
            done();
          };

          up.onChunk(CHUNK, ENC, NEXT);
        });

        it('should unpipe the offset stream', done => {
          up.bufferStream.unpipe = (stream: Stream) => {
            assert.strictEqual(stream, up.offsetStream);
            done();
          };

          up.onChunk(CHUNK, ENC, NEXT);
        });

        it('should restart the stream', done => {
          up.restart = done;

          up.onChunk(CHUNK, ENC, NEXT);
        });
      });
    });

    describe('successive writes', () => {
      it('should increase the length of the bytes written by the bytelength of the chunk', () => {
        assert.strictEqual(up.numBytesWritten, 0);
        up.onChunk(CHUNK, ENC, NEXT);
        assert.strictEqual(up.numBytesWritten, Buffer.byteLength(CHUNK, ENC));
      });

      it('should slice the chunk by the offset - numBytesWritten', done => {
        const OFFSET = 8;
        up.offset = OFFSET;
        up.onChunk(CHUNK, ENC, (err: Error, chunk: Buffer) => {
          assert.ifError(err);

          const expectedChunk = CHUNK.slice(OFFSET);
          assert.strictEqual(Buffer.compare(chunk, expectedChunk), 0);
          done();
        });
      });

      it('should emit a progress event with the bytes written', done => {
        let happened = false;
        up.on('progress', () => {
          happened = true;
        });
        up.onChunk(CHUNK, ENC, NEXT);
        assert.strictEqual(happened, true);
        done();
      });
    });

    describe('next()', () => {
      it('should push data to the stream if the bytes written is > offset', done => {
        up.numBytesWritten = 10;
        up.offset = 0;

        up.onChunk(CHUNK, ENC, (err: Error, chunk: string) => {
          assert.ifError(err);
          assert.strictEqual(Buffer.isBuffer(chunk), true);
          done();
        });
      });

      it('should not push data to the stream if the bytes written is < offset', done => {
        up.numBytesWritten = 0;
        up.offset = 1000;

        up.onChunk(CHUNK, ENC, (err: Error, chunk: string) => {
          assert.ifError(err);
          assert.strictEqual(chunk, undefined);
          done();
        });
      });
    });
  });

  describe('#getAndSetOffset', () => {
    const RANGE = 123456;
    const RESP = {status: 308, headers: {range: `range-${RANGE}`}};

    it('should make the correct request', done => {
      const URI = 'uri';
      up.uri = URI;
      up.makeRequest = async (reqOpts: GaxiosOptions) => {
        assert.strictEqual(reqOpts.method, 'PUT');
        assert.strictEqual(reqOpts.url, URI);
        assert.deepStrictEqual(reqOpts.headers, {
          'Content-Length': 0,
          'Content-Range': 'bytes */*',
        });
        done();
        return {};
      };
      up.getAndSetOffset();
    });

    describe('restart on 404', () => {
      const RESP = {status: 404} as GaxiosResponse;
      const ERROR = new Error(':(') as GaxiosError;
      ERROR.response = RESP;

      beforeEach(() => {
        up.makeRequest = async () => {
          throw ERROR;
        };
      });

      it('should restart the upload', done => {
        up.restart = done;
        up.getAndSetOffset();
      });

      it('should not restart if URI provided manually', done => {
        up.uriProvidedManually = true;
        up.restart = done; // will cause test to fail
        up.on('error', (err: Error) => {
          assert.strictEqual(err, ERROR);
          done();
        });
        up.getAndSetOffset();
      });
    });

    describe('restart on 410', () => {
      const ERROR = new Error(':(') as GaxiosError;
      const RESP = {status: 410} as GaxiosResponse;
      ERROR.response = RESP;

      beforeEach(() => {
        up.makeRequest = async () => {
          throw ERROR;
        };
      });

      it('should restart the upload', done => {
        up.restart = done;
        up.getAndSetOffset();
      });
    });

    it('should set the offset from the range', async () => {
      up.makeRequest = async () => RESP;
      await up.getAndSetOffset();
      assert.strictEqual(up.offset, RANGE + 1);
    });

    it('should set the offset to 0 if no range is back from the API', async () => {
      up.makeRequest = async () => {
        return {};
      };
      await up.getAndSetOffset();
      assert.strictEqual(up.offset, 0);
    });
  });

  describe('#makeRequest', () => {
    it('should set encryption headers', async () => {
      const key = crypto.randomBytes(32);
      const up = upload({
        bucket: 'BUCKET',
        file: FILE,
        key,
        authConfig: {keyFile},
      });
      const scopes = [
        mockAuthorizeRequest(),
        nock(REQ_OPTS.url!).get('/').reply(200, {}),
      ];
      const res = await up.makeRequest(REQ_OPTS);
      scopes.forEach(x => x.done());
      const headers = res.config.headers;
      assert.strictEqual(headers['x-goog-encryption-algorithm'], 'AES256');
      assert.strictEqual(headers['x-goog-encryption-key'], up.encryption.key);
      assert.strictEqual(
        headers['x-goog-encryption-key-sha256'],
        up.encryption.hash
      );
    });

    it('should set userProject', async () => {
      const scopes = [
        mockAuthorizeRequest(),
        nock(REQ_OPTS.url!).get(queryPath).reply(200, {}),
      ];
      const res: GaxiosResponse = await up.makeRequest(REQ_OPTS);
      assert.strictEqual(res.config.url, REQ_OPTS.url + queryPath.slice(1));
      scopes.forEach(x => x.done());
    });

    it('should set validate status', done => {
      up.authClient = {
        request: (reqOpts: GaxiosOptions) => {
          assert.strictEqual(reqOpts.validateStatus!(100), false);
          assert.strictEqual(reqOpts.validateStatus!(199), false);
          assert.strictEqual(reqOpts.validateStatus!(300), false);
          assert.strictEqual(reqOpts.validateStatus!(400), false);
          assert.strictEqual(reqOpts.validateStatus!(500), false);

          assert.strictEqual(reqOpts.validateStatus!(200), true);
          assert.strictEqual(reqOpts.validateStatus!(299), true);
          assert.strictEqual(reqOpts.validateStatus!(308), true);

          done();

          return {};
        },
      };
      up.makeRequest(REQ_OPTS);
    });

    it('should make the correct request', async () => {
      const scopes = [
        mockAuthorizeRequest(),
        nock(REQ_OPTS.url!).get(queryPath).reply(200, undefined, {}),
      ];
      const res = await up.makeRequest(REQ_OPTS);
      scopes.forEach(x => x.done());
      assert.strictEqual(res.config.url, REQ_OPTS.url + queryPath.slice(1));
      assert.deepStrictEqual(res.headers, {});
    });

    it('should bypass authentication if emulator context detected', async () => {
      up = upload({
        bucket: BUCKET,
        file: FILE,
        customRequestOptions: CUSTOM_REQUEST_OPTIONS,
        generation: GENERATION,
        metadata: METADATA,
        origin: ORIGIN,
        params: PARAMS,
        predefinedAcl: PREDEFINED_ACL,
        userProject: USER_PROJECT,
        authConfig: {keyFile},
        apiEndpoint: 'https://fake.endpoint.com',
      });
      const scopes = [
        nock(REQ_OPTS.url!).get(queryPath).reply(200, undefined, {}),
      ];
      const res = await up.makeRequest(REQ_OPTS);
      scopes.forEach(x => x.done());
      assert.strictEqual(res.config.url, REQ_OPTS.url + queryPath.slice(1));
      assert.deepStrictEqual(res.headers, {});
    });

    it('should combine customRequestOptions', done => {
      const up = upload({
        bucket: BUCKET,
        file: FILE,
        customRequestOptions: {
          headers: {
            'X-My-Header': 'My custom value',
          },
        },
      });
      mockAuthorizeRequest();
      up.authClient = {
        request: (reqOpts: GaxiosOptions) => {
          const customHeader =
            reqOpts.headers && reqOpts.headers['X-My-Header'];
          assert.strictEqual(customHeader, 'My custom value');
          setImmediate(done);
          return {};
        },
      };
      up.makeRequest(REQ_OPTS);
    });

    it('should execute the callback with a body error & response', async () => {
      const error = new GaxiosError('Error message', {}, {
        config: {},
        data: {},
        status: 500,
        statusText: 'sad trombone',
        headers: {},
      } as GaxiosResponse);
      mockAuthorizeRequest();
      const scope = nock(REQ_OPTS.url!).get(queryPath).reply(500, {error});
      await assert.rejects(up.makeRequest(REQ_OPTS), (err: GaxiosError) => {
        scope.done();
        assert.strictEqual(err.code, '500');
        return true;
      });
    });

    it('should execute the callback with a body error & response for non-2xx status codes', async () => {
      const error = new GaxiosError('Error message', {}, {
        config: {},
        data: {},
        status: 500,
        statusText: 'sad trombone',
        headers: {},
      } as GaxiosResponse);
      mockAuthorizeRequest();
      const scope = nock(REQ_OPTS.url!).get(queryPath).reply(500, {error});
      await assert.rejects(up.makeRequest(REQ_OPTS), (err: GaxiosError) => {
        scope.done();
        assert.deepStrictEqual(err.code, '500');
        return true;
      });
    });

    it('should execute the callback', async () => {
      const data = {red: 'tape'};
      mockAuthorizeRequest();
      up.onResponse = () => true;
      const scope = nock(REQ_OPTS.url!).get(queryPath).reply(200, data);
      const res = await up.makeRequest(REQ_OPTS);
      scope.done();
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.data, data);
    });
  });

  describe('#makeRequestStream', () => {
    beforeEach(() => {
      up.authClient = {request: () => {}};
      up.onResponse = () => {};
    });

    it('should pass a signal from the abort controller', done => {
      up.authClient = {
        request: (reqOpts: GaxiosOptions) => {
          assert(reqOpts.signal instanceof AbortController);
          done();
        },
      };
      up.makeRequestStream(REQ_OPTS);
    });

    it('should abort on an error', done => {
      up.on('error', () => {});

      let abortController: AbortController;
      up.authClient = {
        request: (reqOpts: GaxiosOptions) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          abortController = reqOpts.signal as any;
        },
      };

      up.makeRequestStream(REQ_OPTS);
      up.emit('error', new Error('Error.'));

      setImmediate(() => {
        assert.strictEqual(abortController.aborted, true);
        done();
      });
    });

    it('should set userProject', done => {
      up.userProject = 'user-project';
      up.authClient = {
        request: (reqOpts: GaxiosOptions) => {
          assert.deepStrictEqual(reqOpts.params, {userProject: 'user-project'});
          done();
        },
      };
      up.makeRequestStream(REQ_OPTS);
    });

    it('should not remove existing params when userProject is set', done => {
      REQ_OPTS.params = {a: 'b', c: 'd'};
      up.userProject = 'user-project';
      up.authClient = {
        request: (reqOpts: GaxiosOptions) => {
          assert.deepStrictEqual(reqOpts.params, {
            userProject: 'user-project',
            a: 'b',
            c: 'd',
          });
          done();
        },
      };
      up.makeRequestStream(REQ_OPTS);
    });

    it('should always validate the status', done => {
      up.authClient = {
        request: (reqOpts: GaxiosOptions) => {
          assert.strictEqual(reqOpts.validateStatus!(0), true);
          done();
        },
      };
      up.makeRequestStream(REQ_OPTS);
    });

    it('should combine customRequestOptions', done => {
      const up = upload({
        bucket: BUCKET,
        file: FILE,
        customRequestOptions: {
          headers: {
            'X-My-Header': 'My custom value',
          },
        },
      });
      mockAuthorizeRequest();
      up.authClient = {
        request: (reqOpts: GaxiosOptions) => {
          const customHeader =
            reqOpts.headers && reqOpts.headers['X-My-Header'];
          assert.strictEqual(customHeader, 'My custom value');
          setImmediate(done);
          return {};
        },
      };
      up.makeRequestStream(REQ_OPTS);
    });

    it('should pass the response to the handler', done => {
      const response = {};
      up.authClient = {
        request: async () => response,
      };
      up.onResponse = (res: GaxiosResponse) => {
        assert.strictEqual(res, response);
        done();
      };
      up.makeRequestStream(REQ_OPTS);
    });

    it('should return the response', async () => {
      const response = {};
      up.authClient = {
        request: async () => response,
      };
      const stream = await up.makeRequestStream(REQ_OPTS);
      assert.strictEqual(stream, response);
    });
  });

  describe('#restart', () => {
    beforeEach(() => {
      up.createURI = () => {};
    });

    it('should emit the restart event', done => {
      up.on('restart', done);
      up.restart();
    });

    it('should set numBytesWritten to 0', () => {
      up.numBytesWritten = 8;
      up.restart();
      assert.strictEqual(up.numBytesWritten, 0);
    });

    it('should delete the config', done => {
      up.deleteConfig = done;
      up.restart();
    });

    describe('starting a new upload', () => {
      it('should create a new URI', done => {
        up.createURI = () => {
          done();
        };

        up.restart();
      });

      it('should destroy stream if it cannot create a URI', done => {
        const error = new Error(':(');

        up.createURI = (callback: Function) => {
          callback(error);
        };

        up.destroy = (err: Error) => {
          assert.strictEqual(err, error);
          done();
        };

        up.restart();
      });

      it('should save the uri to config when restarting', done => {
        const uri = 'http://newly-created-uri';

        up.createURI = (callback: Function) => {
          callback(null, uri);
        };

        up.set = (props: {}) => {
          assert.deepStrictEqual(props, {uri});
          done();
        };

        up.restart();
      });

      it('should start uploading', done => {
        up.createURI = (callback: Function) => {
          up.startUploading = done;
          callback();
        };
        up.restart();
      });
    });
  });

  describe('#get', () => {
    it('should return the value from the config store', () => {
      const prop = 'property';
      const value = 'abc';
      up.configStore = {
        get(name: string) {
          assert.strictEqual(name, up.cacheKey);
          const obj: {[i: string]: string} = {};
          obj[prop] = value;
          return obj;
        },
      };
      assert.strictEqual(up.get(prop), value);
    });
  });

  describe('#set', () => {
    it('should set the value to the config store', done => {
      const props = {setting: true};
      up.configStore = {
        set(name: string, prps: {}) {
          assert.strictEqual(name, up.cacheKey);
          assert.strictEqual(prps, props);
          done();
        },
      };
      up.set(props);
    });
  });

  describe('#deleteConfig', () => {
    it('should delete the entry from the config store', done => {
      const props = {setting: true};

      up.configStore = {
        delete(name: string) {
          assert.strictEqual(name, up.cacheKey);
          done();
        },
      };

      up.deleteConfig(props);
    });
  });

  describe('#onResponse', () => {
    beforeEach(() => {
      up.numRetries = 0;
      up.startUploading = () => {};
      up.continueUploading = () => {};
    });

    describe('404', () => {
      const RESP = {status: 404, data: 'error message from server'};

      it('should increase the retry count if less than limit', () => {
        assert.strictEqual(up.numRetries, 0);
        assert.strictEqual(up.onResponse(RESP), false);
        assert.strictEqual(up.numRetries, 1);
      });

      it('should destroy the stream if gte limit', done => {
        up.destroy = (err: Error) => {
          assert.strictEqual(
            err.message,
            `Retry limit exceeded - ${RESP.data}`
          );
          done();
        };

        up.onResponse(RESP);
        up.onResponse(RESP);
        up.onResponse(RESP);
        up.onResponse(RESP);
        up.onResponse(RESP);
        up.onResponse(RESP);
      });

      it('should start an upload', done => {
        up.startUploading = done;
        up.onResponse(RESP);
      });
    });

    describe('500s', () => {
      const RESP = {status: 500, data: 'error message from server'};

      it('should increase the retry count if less than limit', () => {
        assert.strictEqual(up.numRetries, 0);
        assert.strictEqual(up.onResponse(RESP), false);
        assert.strictEqual(up.numRetries, 1);
      });

      it('should destroy the stream if greater than limit', done => {
        up.destroy = (err: Error) => {
          assert.strictEqual(
            err.message,
            `Retry limit exceeded - ${RESP.data}`
          );
          done();
        };

        up.onResponse(RESP);
        up.onResponse(RESP);
        up.onResponse(RESP);
        up.onResponse(RESP);
        up.onResponse(RESP);
        up.onResponse(RESP);
      });

      describe('exponential back off', () => {
        let clock: sinon.SinonFakeTimers;
        let setTimeoutSpy: sinon.SinonSpy;
        beforeEach(() => {
          clock = sinon.useFakeTimers({toFake: ['setTimeout']});
          setTimeoutSpy = sinon.spy(global, 'setTimeout');
        });
        afterEach(() => {
          clock.restore();
        });

        it('should continue uploading after retry count^2 * random', done => {
          up.continueUploading = function () {
            assert.strictEqual(this, up);

            const minTime = Math.pow(2, up.numRetries - 1) * 1000;
            const maxTime = minTime + 1000;

            const delay = setTimeoutSpy.lastCall.args[1];
            assert(delay >= minTime);
            assert(delay <= maxTime);

            // make it keep retrying until the limit is reached
            up.onResponse(RESP);
          };

          up.on('error', (err: Error) => {
            assert.strictEqual(up.numRetries, 5);
            assert.strictEqual(
              err.message,
              `Retry limit exceeded - ${RESP.data}`
            );
            done();
          });

          up.onResponse(RESP);
          clock.runAll();
        });
      });
    });

    describe('all others', () => {
      const RESP = {status: 200};

      it('should emit the response on the stream', done => {
        up.on('response', (resp: {}) => {
          assert.strictEqual(resp, RESP);
          done();
        });
        up.onResponse(RESP);
      });

      it('should return true', () => {
        assert.strictEqual(up.onResponse(RESP), true);
      });

      it('should handle a custom status code when passed a retry function', () => {
        const RESP = {status: 1000};
        const customHandlerFunction = (err: ApiError) => {
          return err.code === 1000;
        };
        up.retryableErrorFn = customHandlerFunction;

        assert.strictEqual(up.onResponse(RESP), false);
      });
    });
  });

  describe('PROTOCOL_REGEX', () => {
    it('should match a protocol', () => {
      const urls = [
        {input: 'http://www.hi.com', match: 'http'},
        {input: 'mysite://www.hi.com', match: 'mysite'},
        {input: 'www.hi.com', match: null},
      ];

      for (const url of urls) {
        assert.strictEqual(
          url.input.match(PROTOCOL_REGEX) &&
            url.input.match(PROTOCOL_REGEX)![1],
          url.match
        );
      }
    });
  });

  describe('#sanitizeEndpoint', () => {
    const USER_DEFINED_SHORT_API_ENDPOINT = 'myapi.com:8080';
    const USER_DEFINED_PROTOCOL = 'myproto';
    const USER_DEFINED_FULL_API_ENDPOINT = `${USER_DEFINED_PROTOCOL}://myapi.com:8080`;

    it('should default protocol to https', () => {
      const endpoint = up.sanitizeEndpoint(USER_DEFINED_SHORT_API_ENDPOINT);
      assert.strictEqual(endpoint.match(PROTOCOL_REGEX)![1], 'https');
    });

    it('should not override protocol', () => {
      const endpoint = up.sanitizeEndpoint(USER_DEFINED_FULL_API_ENDPOINT);
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
        const endpoint = up.sanitizeEndpoint(endpointWithTrailingSlashes);
        assert.strictEqual(endpoint.endsWith('/'), false);
      }
    });
  });

  describe('#getRetryDelay', () => {
    beforeEach(() => {
      up.timeOfFirstRequest = Date.now();
    });

    it('should return exponential retry delay', () => {
      const min = Math.pow(up.retryDelayMultiplier, up.numRetries) * 1000;
      const max =
        Math.pow(up.retryDelayMultiplier, up.numRetries) * 1000 + 1000;
      const delayValue = up.getRetryDelay();

      assert(delayValue >= min && delayValue <= max);
    });

    it('allows overriding the delay multiplier', () => {
      [1, 2, 3].forEach(delayMultiplier => {
        up.retryDelayMultiplier = delayMultiplier;
        const min = Math.pow(up.retryDelayMultiplier, up.numRetries) * 1000;
        const max =
          Math.pow(up.retryDelayMultiplier, up.numRetries) * 1000 + 1000;
        const delayValue = up.getRetryDelay();

        assert(delayValue >= min && delayValue <= max);
      });
    });

    it('allows overriding the number of retries', () => {
      [1, 2, 3].forEach(numRetry => {
        up.numRetries = numRetry;
        const min = Math.pow(up.retryDelayMultiplier, up.numRetries) * 1000;
        const max =
          Math.pow(up.retryDelayMultiplier, up.numRetries) * 1000 + 1000;
        const delayValue = up.getRetryDelay();

        assert(delayValue >= min && delayValue <= max);
      });
    });

    it('returns the value of maxRetryDelay when calculated values are larger', () => {
      up.maxRetryDelay = 1;
      const delayValue = up.getRetryDelay();

      assert.strictEqual(delayValue, 1000);
    });
  });
});

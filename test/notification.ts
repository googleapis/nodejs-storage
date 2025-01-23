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

import assert from 'assert';
import {describe, it, before, beforeEach} from 'mocha';
import {Bucket, GaxiosError} from '../src/index.js';
import {Notification, Storage} from '../src/index.js';
import * as sinon from 'sinon';
import {StorageTransport} from '../src/storage-transport.js';

describe('Notification', () => {
  let notification: Notification;
  let BUCKET: Bucket;
  let storageTransport: StorageTransport;
  let storage: Storage;
  let sandbox: sinon.SinonSandbox;
  const ID = '123';

  before(() => {
    sandbox = sinon.createSandbox();
    storage = sandbox.createStubInstance(Storage);
    BUCKET = sandbox.createStubInstance(Bucket);
    storageTransport = sandbox.createStubInstance(StorageTransport);
    BUCKET.baseUrl = '';
    BUCKET.storage = storage;
    BUCKET.id = 'test-bucket';
    BUCKET.storage.storageTransport = storageTransport;
    BUCKET.storageTransport = storageTransport;
  });

  beforeEach(() => {
    notification = new Notification(BUCKET, ID);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('delete', () => {
    it('should make the correct request', done => {
      const options = {};

      BUCKET.storageTransport.makeRequest = sandbox
        .stub()
        .callsFake((reqOpts, callback) => {
          assert.strictEqual(reqOpts.method, 'DELETE');
          assert.strictEqual(
            reqOpts.url,
            '/test-bucket/notificationConfigs/123',
          );
          assert.deepStrictEqual(reqOpts.queryParameters, options);
          callback!(null); // the done fn
          return Promise.resolve();
        });

      notification.delete(options, done);
    });

    it('should optionally accept options', done => {
      BUCKET.storageTransport.makeRequest = sandbox
        .stub()
        .callsFake((reqOpts, callback) => {
          assert.deepStrictEqual(reqOpts.queryParameters, {});
          callback!(null); // the done fn
          return Promise.resolve();
        });

      notification.delete(done);
    });

    it('should optionally accept a callback', done => {
      BUCKET.storageTransport.makeRequest = sandbox
        .stub()
        .callsFake((_reqOpts, callback) => {
          callback!(null); // the done fn
          return Promise.resolve();
        });

      notification.delete(done);
    });
  });

  describe('get', () => {
    it('should get the metadata', done => {
      sandbox.stub(notification, 'getMetadata').callsFake(() => {
        done();
      });

      notification.get(assert.ifError);
    });

    it('should accept an options object', done => {
      const options = {};

      sandbox.stub(notification, 'getMetadata').callsFake(options_ => {
        assert.deepStrictEqual(options_, options);
        done();
      });

      notification.get(options, assert.ifError);
    });

    it('should execute callback with error', done => {
      const error = new GaxiosError('Error.', {});
      const metadata = {};

      notification.getMetadata = sandbox
        .stub()
        .callsFake((reqOpts, callback) => {
          callback!(error, metadata);
        });

      notification.get(err => {
        assert.strictEqual(err, error);

        done();
      });
    });

    it('should execute callback with instance', done => {
      const metadata = {};

      notification.getMetadata = sandbox
        .stub()
        .callsFake((reqOpts, callback) => {
          callback!(null, metadata);
        });

      notification.get((err, instance) => {
        assert.ifError(err);
        assert.strictEqual(instance, notification);

        done();
      });
    });

    describe('autoCreate', () => {
      let AUTO_CREATE_CONFIG: {};

      const ERROR = new GaxiosError('404', {});
      ERROR.status = 404;
      const METADATA = {};

      beforeEach(() => {
        AUTO_CREATE_CONFIG = {
          autoCreate: true,
        };

        sandbox.stub(notification, 'getMetadata').callsFake(callback => {
          callback(ERROR, METADATA);
        });
      });

      it('should pass config to create if it was provided', async done => {
        const config = Object.assign(
          {},
          {
            maxResults: 5,
          },
        );

        sandbox.stub(notification, 'get').callsFake(config_ => {
          assert.deepStrictEqual(config_, config);
          done();
        });

        await notification.get(config);
      });

      describe('error', () => {
        it('should execute callback with error', done => {
          const error = new GaxiosError('Error.', {});
          sandbox.stub(notification, 'get').callsFake((config, callback) => {
            callback!(error); // done()
          });
          sandbox.stub(notification, 'create').callsFake(callback => {
            callback(error);
          });

          notification.get(AUTO_CREATE_CONFIG, err => {
            assert.strictEqual(err, error);
            done();
          });
        });
      });
    });
  });

  describe('getMetadata', () => {
    it('should make the correct request', done => {
      const options = {};

      BUCKET.storageTransport.makeRequest = sandbox
        .stub()
        .callsFake(reqOpts => {
          assert.strictEqual(
            reqOpts.url,
            '/test-bucket/notificationConfigs/123',
          );
          assert.deepStrictEqual(reqOpts.queryParameters, options);
          done();
          return Promise.resolve();
        });

      notification.getMetadata(options, assert.ifError);
    });

    it('should optionally accept options', async done => {
      BUCKET.storageTransport.makeRequest = sandbox
        .stub()
        .callsFake(reqOpts => {
          assert.deepStrictEqual(reqOpts.queryParameters, {});
          done();
          return Promise.resolve();
        });

      await notification.getMetadata(assert.ifError);
    });

    it('should return any errors to the callback', async done => {
      const error = new GaxiosError('err', {});

      BUCKET.storageTransport.makeRequest = sandbox
        .stub()
        .callsFake((_reqOpts, callback) => {
          callback!(error);
          return Promise.resolve();
        });

      await notification.getMetadata((err: GaxiosError | null) => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should set and return the metadata', async done => {
      const response = {};

      BUCKET.storageTransport.makeRequest = sandbox
        .stub()
        .callsFake((_reqOpts, callback) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback!(null, response as any, response as any);
          return Promise.resolve();
        });

      await notification.getMetadata((err: Error, metadata: {}, resp: {}) => {
        assert.ifError(err);
        assert.strictEqual(metadata, response);
        assert.strictEqual(notification.metadata, response);
        assert.strictEqual(resp, response);
        done();
      });
    });
  });
});

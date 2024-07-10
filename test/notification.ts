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
import {Notification} from '../src/index.js';
import * as sinon from 'sinon';

describe('Notification', () => {
  let notification: Notification;
  let BUCKET: Bucket;
  const ID = '123';

  before(() => {
    BUCKET = sinon.createStubInstance(Bucket);
  });

  beforeEach(() => {
    notification = new Notification(BUCKET, ID);
  });

  describe('delete', () => {
    it('should make the correct request', done => {
      const options = {};

      BUCKET.storageTransport.makeRequest = (reqOpts, callback) => {
        assert.strictEqual(reqOpts.method, 'DELETE');
        assert.strictEqual(reqOpts.url, 'notificationConfigs/123');
        assert.deepStrictEqual(reqOpts.queryParameters, options);
        callback!(null); // the done fn
        return Promise.resolve();
      };

      notification.delete(options, done);
    });

    it('should optionally accept options', done => {
      BUCKET.storageTransport.makeRequest = (reqOpts, callback) => {
        assert.deepStrictEqual(reqOpts.queryParameters, {});
        callback!(null); // the done fn
        return Promise.resolve();
      };

      notification.delete(done);
    });

    it('should optionally accept a callback', done => {
      BUCKET.storageTransport.makeRequest = (_reqOpts, callback) => {
        callback!(null); // the done fn
        return Promise.resolve();
      };

      notification.delete(done);
    });
  });

  describe('get', () => {
    it('should get the metadata', done => {
      sinon.stub(notification, 'getMetadata').callsFake(() => {
        done();
      });

      notification.get(assert.ifError);
    });

    it('should accept an options object', done => {
      const options = {};

      sinon.stub(notification, 'getMetadata').callsFake(options_ => {
        assert.deepStrictEqual(options_, options);
        done();
      });

      notification.get(options, assert.ifError);
    });

    it('should execute callback with error & metadata', done => {
      const error = new GaxiosError('Error.', {});
      const metadata = {};

      sinon.stub(notification, 'getMetadata').callsFake(callback => {
        callback!(error, metadata);
      });

      notification.get((err: Error, instance: {}, metadata_: {}) => {
        assert.strictEqual(err, error);
        assert.strictEqual(instance, null);
        assert.strictEqual(metadata_, metadata);

        done();
      });
    });

    it('should execute callback with instance & metadata', done => {
      const metadata = {};

      sinon.stub(notification, 'getMetadata').callsFake(callback => {
        callback!(null, metadata);
      });

      notification.get((err: Error, instance: {}, metadata_: {}) => {
        assert.ifError(err);

        assert.strictEqual(instance, notification);
        assert.strictEqual(metadata_, metadata);

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

        sinon.stub(notification, 'getMetadata').callsFake(callback => {
          callback(ERROR, METADATA);
        });
      });

      it('should pass config to create if it was provided', done => {
        const config = Object.assign(
          {},
          {
            maxResults: 5,
          },
        );

        sinon.stub(notification, 'get').callsFake(config_ => {
          assert.deepStrictEqual(config_, config);
          done();
        });

        notification.get(config);
      });

      it('should pass only a callback to create if no config', done => {
        sinon.stub(notification, 'create').callsFake(callback => {
          callback(null);
        });

        notification.get(AUTO_CREATE_CONFIG, done);
      });

      describe('error', () => {
        it('should execute callback with error & API response', done => {
          const error = new GaxiosError('Error.', {});
          const apiResponse = {};
          sinon.stub(notification, 'get').callsFake((config, callback) => {
            assert.deepStrictEqual(config, {});
            callback!(null); // done()
          });
          sinon.stub(notification, 'create').callsFake(callback => {
            callback(error, null, apiResponse);
          });

          notification.get(AUTO_CREATE_CONFIG, (err, instance, resp) => {
            assert.strictEqual(err, error);
            assert.strictEqual(instance, null);
            assert.strictEqual(resp, apiResponse);
            done();
          });
        });

        it('should refresh the metadata after a 409', done => {
          const error = new GaxiosError('409', {});
          error.status = 409;

          sinon.stub(notification, 'get').callsFake((config, callback) => {
            assert.deepStrictEqual(config, {});
            callback(null); // done()
          });
          sinon.stub(notification, 'create').callsFake(callback => {
            callback(error);
          });

          notification.get(AUTO_CREATE_CONFIG, done);
        });
      });
    });
  });

  describe('getMetadata', () => {
    it('should make the correct request', done => {
      const options = {};

      BUCKET.storageTransport.makeRequest = reqOpts => {
        assert.strictEqual(reqOpts.url, 'notificationConfigs/123');
        assert.deepStrictEqual(reqOpts.queryParameters, options);
        done();
        return Promise.resolve();
      };

      notification.getMetadata(options, assert.ifError);
    });

    it('should optionally accept options', done => {
      BUCKET.storageTransport.makeRequest = reqOpts => {
        assert.deepStrictEqual(reqOpts.queryParameters, {});
        done();
        return Promise.resolve();
      };

      notification.getMetadata(assert.ifError);
    });

    it('should return any errors to the callback', done => {
      const error = new GaxiosError('err', {});
      const response = {};

      BUCKET.storageTransport.makeRequest = (_reqOpts, callback) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback!(error, response as any, response as any);
        return Promise.resolve();
      };

      notification.getMetadata((err: Error, metadata: {}, resp: {}) => {
        assert.strictEqual(err, error);
        assert.strictEqual(metadata, response);
        assert.strictEqual(resp, response);
        done();
      });
    });

    it('should set and return the metadata', done => {
      const response = {};

      BUCKET.storageTransport.makeRequest = (_reqOpts, callback) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback!(null, response as any, response as any);
        return Promise.resolve();
      };

      notification.getMetadata((err: Error, metadata: {}, resp: {}) => {
        assert.ifError(err);
        assert.strictEqual(metadata, response);
        assert.strictEqual(notification.metadata, response);
        assert.strictEqual(resp, response);
        done();
      });
    });
  });
});

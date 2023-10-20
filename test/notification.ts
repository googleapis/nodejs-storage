/* eslint-disable @typescript-eslint/no-explicit-any */
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

import {ApiError, MetadataCallback, util} from '../src/nodejs-common';
import * as assert from 'assert';
import {describe, it, beforeEach} from 'mocha';
import {
  Bucket,
  CreateNotificationCallback,
  Notification,
  NotificationMetadata,
} from '../src';
import * as sinon from 'sinon';

describe('Notification', () => {
  let notification: Notification;
  let createNotificationStub: sinon.SinonStub<
    [string, CreateNotificationCallback],
    void
  >;
  let BUCKET: sinon.SinonStubbedInstance<Bucket>;
  const ID = '123';

  beforeEach(() => {
    createNotificationStub = sinon
      .stub<[string, CreateNotificationCallback], void>()
      .returns(util.noop());

    BUCKET = sinon.createStubInstance(Bucket, {
      createNotification: createNotificationStub,
    });

    notification = new Notification(BUCKET, ID);
  });

  describe('instantiation', () => {
    it('should inherit from ServiceObject', () => {
      assert.strictEqual(notification.parent, BUCKET);
      assert.strictEqual(notification.baseUrl, '/notificationConfigs');
      assert.strictEqual(notification.id, ID);

      assert.deepStrictEqual(notification['methods'], {
        create: true,
        delete: {
          reqOpts: {
            qs: {},
          },
        },
        get: {
          reqOpts: {
            qs: {},
          },
        },
        getMetadata: {
          reqOpts: {
            qs: {},
          },
        },
        exists: true,
      });
    });
  });

  describe('delete', () => {
    it('should make the correct request', done => {
      const options = {};

      BUCKET.request.restore();
      sinon.stub(BUCKET, 'request').callsFake((reqOpts, callback) => {
        assert.strictEqual(reqOpts.method, 'DELETE');
        assert.strictEqual(reqOpts.uri, 'notificationConfigs/123');
        assert.deepStrictEqual(reqOpts.qs, options);
        callback(null); // the done fn
      });

      notification.delete(options, done);
    });

    it('should optionally accept options', done => {
      BUCKET.request.restore();
      sinon.stub(BUCKET, 'request').callsFake((reqOpts, callback) => {
        assert.deepStrictEqual(reqOpts.qs, {});
        callback(null); // the done fn
      });

      notification.delete(done);
    });

    it('should optionally accept a callback', done => {
      BUCKET.request.restore();
      sinon.stub(BUCKET, 'request').callsFake((reqOpts, callback) => {
        callback(null);
      });

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
      const error = new Error('Error.');
      const metadata = {};

      sinon
        .stub<any, any>(notification, 'getMetadata')
        .callsFake((opts, callback) => {
          (callback as MetadataCallback<NotificationMetadata>)(error, metadata);
        });

      notification.get(
        {},
        (
          err: ApiError | null,
          instance?: Notification | null,
          metadata_?: {}
        ) => {
          assert.strictEqual(err, error);
          assert.strictEqual(instance, null);
          assert.strictEqual(metadata_, metadata);

          done();
        }
      );
    });

    it('should execute callback with instance & metadata', done => {
      const metadata = {};

      sinon
        .stub<any, any>(notification, 'getMetadata')
        .callsFake((opts, callback) => {
          (callback as MetadataCallback<NotificationMetadata>)(null, metadata);
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

      const ERROR = {
        code: 404,
        name: 'error',
        message: 'error',
      };
      const METADATA = {};

      beforeEach(() => {
        AUTO_CREATE_CONFIG = {
          autoCreate: true,
        };

        sinon
          .stub<any, any>(notification, 'getMetadata')
          .callsFake((opts, callback) => {
            (callback as MetadataCallback<NotificationMetadata>)(
              ERROR,
              METADATA
            );
          });
      });

      it('should pass config to create if it was provided', done => {
        const config = Object.assign(
          {},
          {
            maxResults: 5,
          }
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
          const error = new Error('Error.');
          const apiResponse = {
            autoCreate: true,
          };

          sinon.stub(notification, 'create').callsFake(callback => {
            callback(error, null, apiResponse);
          });
          sinon.stub(notification, 'get').callsFake((options, callback) => {
            assert.deepStrictEqual(options, {autoCreate: true});
            callback(error); // done()
          });

          notification.get(
            AUTO_CREATE_CONFIG,
            (
              err: Error | null,
              instance?: Notification | null,
              resp?: unknown
            ) => {
              assert.strictEqual(err, error);
              assert.strictEqual(instance, undefined);
              assert.strictEqual(resp, undefined);
              done();
            }
          );
        });

        it('should refresh the metadata after a 409', done => {
          const error = {
            name: 'error',
            message: 'error',
            code: 409,
          };

          sinon.stub(notification, 'create').callsFake(callback => {
            callback(error);
          });
          sinon.stub(notification, 'get').callsFake((opts, callback) => {
            assert.deepStrictEqual(opts, {autoCreate: true});
            callback(null); // done()
          });

          notification.get(AUTO_CREATE_CONFIG, done);
        });
      });
    });
  });

  describe('getMetadata', () => {
    it('should make the correct request', done => {
      const options = {};

      BUCKET.request.restore();
      sinon.stub(BUCKET, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.uri, 'notificationConfigs/123');
        assert.deepStrictEqual(reqOpts.qs, options);
        done();
      });

      notification.getMetadata(options, assert.ifError);
    });

    it('should optionally accept options', done => {
      BUCKET.request.restore();
      sinon.stub(BUCKET, 'request').callsFake(reqOpts => {
        assert.deepStrictEqual(reqOpts.qs, {});
        done();
      });

      notification.getMetadata(assert.ifError);
    });

    it('should return any errors to the callback', done => {
      const error = new Error('err');
      const response = {};

      BUCKET.request.restore();
      sinon.stub(BUCKET, 'request').callsFake((reqOpts, callback) => {
        callback(error, response);
      });

      notification.getMetadata((err: Error, metadata: {}) => {
        assert.strictEqual(err, error);
        assert.strictEqual(metadata, response);
        done();
      });
    });

    it('should set and return the metadata', done => {
      const response = {};

      BUCKET.request.restore();
      sinon.stub(BUCKET, 'request').callsFake((reqOpts, callback) => {
        callback(null, response);
      });

      notification.getMetadata((err: Error, metadata: {}) => {
        assert.ifError(err);
        assert.strictEqual(metadata, response);
        assert.strictEqual(notification.metadata, response);
        done();
      });
    });
  });
});

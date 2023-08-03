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

import {DecorateRequestOptions, util} from '../src/nodejs-common';
import * as assert from 'assert';
import {describe, it, beforeEach} from 'mocha';
import {IAMExceptionMessages, Policy} from '../src/iam';
import {Iam} from '../src/iam';
import {Bucket} from '../src/bucket';
import * as sinon from 'sinon';

describe('storage/iam', () => {
  let iam: Iam;
  let BUCKET_INSTANCE: sinon.SinonStubbedInstance<Bucket>;

  beforeEach(() => {
    const id = 'bucket-id';
    BUCKET_INSTANCE = sinon.createStubInstance(Bucket, {
      getId: sinon.stub<[], string>().callsFake(() => {
        return id;
      }),
    });
    BUCKET_INSTANCE.id = id;
    iam = new Iam(BUCKET_INSTANCE);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('initialization', () => {
    it('should localize the request function', done => {
      BUCKET_INSTANCE.request.restore();
      sinon.stub(BUCKET_INSTANCE, 'request').callsFake((opts, cb) => {
        assert.strictEqual(opts.uri, 'hello world');
        cb(null);
      });
      const iam = new Iam(BUCKET_INSTANCE);
      iam['request_']({uri: 'hello world'}, done);
    });

    it('should localize the resource ID', () => {
      assert.strictEqual(iam['resourceId_'], 'buckets/' + BUCKET_INSTANCE.id);
    });
  });

  describe('getPolicy', () => {
    it('should make the correct api request', done => {
      iam['request_'] = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        assert.deepStrictEqual(reqOpts, {
          uri: '/iam',
          qs: {},
        });

        callback(); // done()
      };

      iam.getPolicy(done);
    });

    it('should accept an options object', done => {
      const options = {
        userProject: 'grape-spaceship-123',
      };

      iam['request_'] = (reqOpts: DecorateRequestOptions) => {
        assert.deepStrictEqual(reqOpts.qs, options);
        done();
      };

      iam.getPolicy(options, assert.ifError);
    });

    it('should map requestedPolicyVersion option to optionsRequestedPolicyVersion', done => {
      const VERSION = 3;
      const options = {
        requestedPolicyVersion: VERSION,
      };

      iam['request_'] = (reqOpts: DecorateRequestOptions) => {
        assert.deepStrictEqual(reqOpts.qs, {
          optionsRequestedPolicyVersion: VERSION,
        });
        done();
      };

      iam.getPolicy(options, assert.ifError);
    });
  });

  describe('setPolicy', () => {
    it('should throw an error if a policy is not supplied', () => {
      assert.throws(() => {
        iam.setPolicy(util.noop as unknown as Policy),
          IAMExceptionMessages.POLICY_OBJECT_REQUIRED;
      });
    });

    it('should make the correct API request', done => {
      const policy: Policy = {
        bindings: [],
      };

      iam['request_'] = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        assert.deepStrictEqual(reqOpts, {
          method: 'PUT',
          uri: '/iam',
          maxRetries: 0,
          json: Object.assign(
            {
              resourceId: iam['resourceId_'],
            },
            policy
          ),
          qs: {},
        });

        callback(); // done()
      };

      iam.setPolicy(policy, done);
    });

    it('should accept an options object', done => {
      const policy: Policy = {
        bindings: [],
      };

      const options = {
        userProject: 'grape-spaceship-123',
      };

      iam['request_'] = (reqOpts: DecorateRequestOptions) => {
        assert.strictEqual(reqOpts.qs, options);
        done();
      };

      iam.setPolicy(policy, options, assert.ifError);
    });
  });

  describe('testPermissions', () => {
    it('should throw an error if permissions are missing', () => {
      assert.throws(() => {
        iam.testPermissions(util.noop as unknown as string),
          IAMExceptionMessages.PERMISSIONS_REQUIRED;
      });
    });

    it('should make the correct API request', done => {
      const permissions = 'storage.bucket.list';

      iam['request_'] = (reqOpts: DecorateRequestOptions) => {
        assert.deepStrictEqual(reqOpts, {
          uri: '/iam/testPermissions',
          qs: {
            permissions: [permissions],
          },
          useQuerystring: true,
        });

        done();
      };

      iam.testPermissions(permissions, assert.ifError);
    });

    it('should send an error back if the request fails', done => {
      const permissions = ['storage.bucket.list'];
      const error = new Error('Error.');
      const apiResponse = {};

      iam['request_'] = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(error, apiResponse);
      };

      iam.testPermissions(
        permissions,
        (
          err?: Error | null,
          permissions?: {[key: string]: boolean} | null,
          apiResp?: unknown
        ) => {
          assert.strictEqual(err, error);
          assert.strictEqual(permissions, null);
          assert.strictEqual(apiResp, apiResponse);
          done();
        }
      );
    });

    it('should pass back a hash of permissions the user has', done => {
      const permissions = ['storage.bucket.list', 'storage.bucket.consume'];
      const apiResponse = {
        permissions: ['storage.bucket.consume'],
      };

      iam['request_'] = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(null, apiResponse);
      };

      iam.testPermissions(
        permissions,
        (
          err?: Error | null,
          permissions?: {[key: string]: boolean} | null,
          apiResp?: unknown
        ) => {
          assert.ifError(err);
          assert.deepStrictEqual(permissions, {
            'storage.bucket.list': false,
            'storage.bucket.consume': true,
          });
          assert.strictEqual(apiResp, apiResponse);

          done();
        }
      );
    });

    it('should return false for supplied permissions if user has no permissions', done => {
      const permissions = ['storage.bucket.list', 'storage.bucket.consume'];
      const apiResponse = {permissions: undefined};

      iam['request_'] = (
        reqOpts: DecorateRequestOptions,
        callback: Function
      ) => {
        callback(null, apiResponse);
      };
      iam.testPermissions(
        permissions,
        (
          err?: Error | null,
          permissions?: {[key: string]: boolean} | null,
          apiResp?: unknown
        ) => {
          assert.ifError(err);
          assert.deepStrictEqual(permissions, {
            'storage.bucket.list': false,
            'storage.bucket.consume': false,
          });
          assert.strictEqual(apiResp, apiResponse);

          done();
        }
      );
    });

    it('should accept an options object', done => {
      const permissions = ['storage.bucket.list'];
      const options = {
        userProject: 'grape-spaceship-123',
      };

      const expectedQuery = Object.assign(
        {
          permissions,
        },
        options
      );

      iam['request_'] = (reqOpts: DecorateRequestOptions) => {
        assert.deepStrictEqual(reqOpts.qs, expectedQuery);
        done();
      };

      iam.testPermissions(permissions, options, assert.ifError);
    });
  });
});

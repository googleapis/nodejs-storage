/**
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import * as sinon from 'sinon';
import * as proxyquire from 'proxyquire';
import * as assert from 'assert';
import {util, ServiceObject} from '@google-cloud/common';
import {HmacKey} from '../src/hmacKey';
import {Storage} from '../src';
import {HmacKeyResource} from '../src/storage';

// tslint:disable-next-line: no-any
let sandbox: sinon.SinonSandbox;
// tslint:disable-next-line: no-any
let STORAGE: any;
// tslint:disable-next-line: no-any
let hmacKey: any;

const ACCESS_ID = 'fake-access-id';

const SERVICE_ACCOUNT_EMAIL = 'service-account@gserviceaccount.com';
const PROJECT_ID = 'project-id';
const metadataResponse = {
  accessId: ACCESS_ID,
  etag: 'etag',
  id: ACCESS_ID,
  projectId: PROJECT_ID,
  serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
  state: 'ACTIVE',
  timeCreated: '20190101T00:00:00Z',
  updated: '20190101T00:00:00Z',
};

describe('HmacKey', () => {
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('initialization', () => {
    let promisifyAllStub: sinon.SinonStub;
    // tslint:disable-next-line: no-any
    let serviceObjectSpy: sinon.SinonSpy;
    // tslint:disable-next-line: no-any
    let commonModule: any;
    // tslint:disable-next-line: no-any variable-name
    let HmacKey: any;

    beforeEach(() => {
      promisifyAllStub = sandbox.stub();
      commonModule = {ServiceObject};
      serviceObjectSpy = sandbox.spy(commonModule, 'ServiceObject');

      HmacKey = proxyquire('../src/hmacKey', {
        '@google-cloud/common': commonModule,
        '@google-cloud/promisify': {
          promisifyAll: promisifyAllStub,
        },
      }).HmacKey;

      STORAGE = {
        request: util.noop,
      };

      hmacKey = new HmacKey(STORAGE, ACCESS_ID);
    });

    it('should promisify all the things', () => {
      assert(promisifyAllStub.calledOnce);
    });

    it('should assign accessId', () => {
      assert.strictEqual(hmacKey.accessId, ACCESS_ID);
    });

    it('should assign Storage instance', () => {
      assert.strictEqual(hmacKey.parent, STORAGE);
    });

    it('should inherit from ServiceObject', () => {
      assert(hmacKey instanceof ServiceObject);
      const ctorArg = serviceObjectSpy.firstCall.args[0];
      assert(ctorArg.parent, STORAGE);
      assert(ctorArg.id, ACCESS_ID);
      assert.deepStrictEqual(ctorArg.methods, {
        delete: true,
        getMetadata: true,
      });
    });

    it('should throw if accessId is not provided', () => {
      assert.throws(() => {
        const _hmacKey = new HmacKey(STORAGE);
      }, /access ID is needed/);
    });
  });

  describe('methods', () => {
    // tslint:disable-next-line: no-any
    let storageRequestStub: sinon.SinonStub<any, any>;

    beforeEach(() => {
      const STORAGE = new Storage();
      storageRequestStub = sandbox
        .stub(STORAGE, 'request')
        .callsFake((_opts: {}, callback: Function) => {
          callback(null, metadataResponse);
        });

      hmacKey = new HmacKey(STORAGE, ACCESS_ID);
    });

    describe('getMetadata', () => {
      it('should accept just a callback', done => {
        hmacKey.getMetadata(done);
      });

      it('should accept an options object and callback', done => {
        hmacKey.getMetadata({userProject: 'my-project'}, done);
      });

      it('should execute callback with request error', done => {
        const error = new Error('Request error');
        storageRequestStub.callsFake((_opts: {}, callback: Function) => {
          callback(error);
        });

        hmacKey.getMetadata({}, (err: Error) => {
          assert.strictEqual(err, error);
          done();
        });
      });

      it('should return a Promise when callback is omitted', () => {
        const promise = hmacKey.getMetadata();
        assert(promise instanceof Promise);
        return promise;
      });

      it('should resolve with the HMAC keys metadata and assign to instance', async () => {
        const [metadata] = await hmacKey.getMetadata();

        assert.deepStrictEqual(metadata, metadataResponse);
        assert.deepStrictEqual(hmacKey.metadata, metadataResponse);
      });
    });

    describe('update', () => {
      it('should throw without metadata object', () => {
        assert.throws(() => {
          hmacKey.update(undefined, assert.ifError);
        }, /Cannot update HmacKey/);
      });

      it('should throw with an empty metadata object', () => {
        assert.throws(() => {
          hmacKey.update({}, assert.ifError);
        }, /Cannot update HmacKey/);
      });

      it('should accept an options object', () => {
        hmacKey.update({state: 'INACTIVE'}, {}, assert.ifError);
      });

      it('should execute callback with request error', done => {
        const error = new Error('Request error');
        storageRequestStub.callsFake((_opts: {}, callback: Function) => {
          callback(error);
        });

        hmacKey.update({state: 'INACTIVE'}, (err: Error) => {
          assert.strictEqual(err, error);
          done();
        });
      });

      it('should return a Promise when callback is omitted', () => {
        const promise = hmacKey.update({state: 'INACTIVE'});
        assert(promise instanceof Promise);
        return promise;
      });

      it('should make a request passing metadata arg as body', async () => {
        const newMetadata = {
          state: 'INACTIVE',
          etag: 'some-etag',
        };
        const options = {
          userProject: 'my-project',
        };

        await hmacKey.update(newMetadata, options);

        const requestArg = storageRequestStub.firstCall.args[0];
        assert.deepStrictEqual(requestArg.method, 'put');
        assert.deepStrictEqual(requestArg.qs, options);
        assert.deepStrictEqual(requestArg.json, newMetadata);
      });

      it('should resolve with the HMAC keys metadata and assign to instance', async () => {
        const newMetadata = {
          state: 'INACTIVE',
          etag: 'some-etag',
        };
        const [metadata] = await hmacKey.update(newMetadata);

        const expectedMetadata = Object.assign(
          {},
          newMetadata,
          metadataResponse
        );
        assert.deepStrictEqual(metadata, expectedMetadata);
        assert.deepStrictEqual(hmacKey.metadata, expectedMetadata);
      });

      it('should assign the response metadata to the HmacKey instance', async () => {
        await hmacKey.update({state: 'ACTIVE'});
        assert.deepStrictEqual(hmacKey.metadata, metadataResponse);
      });
    });

    describe('delete', () => {
      it('should accept just a callback', done => {
        hmacKey.delete((err: Error) => {
          assert.ifError(err);

          const requestArg = storageRequestStub.firstCall.args[0];
          assert.deepStrictEqual(requestArg.method, 'DELETE');
          done();
        });
      });

      it('should accept an options object and callback', done => {
        hmacKey.delete({userProject: 'my-project'}, done);
      });

      it('should return a Promise when callback is omitted', () => {
        const promise = hmacKey.delete();
        assert(promise instanceof Promise);
        return promise;
      });

      it('should execute callback with request error', done => {
        const error = new Error('Request error');
        storageRequestStub.callsFake((_opts: {}, callback: Function) => {
          callback(error);
        });

        hmacKey.delete((err: Error) => {
          assert.strictEqual(err, error);
          done();
        });
      });
    });
  });
});

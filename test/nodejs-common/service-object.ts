/* eslint-disable @typescript-eslint/no-explicit-any */
/*!
 * Copyright 2022 Google LLC. All Rights Reserved.
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
import assert from 'assert';
import {describe, it, beforeEach, afterEach} from 'mocha';
import * as sinon from 'sinon';
import * as SO from '../../src/nodejs-common/service-object.js';
import {util} from '../../src/nodejs-common/util.js';
import {ServiceObject} from '../../src/nodejs-common/service-object.js';
import {StorageTransport} from '../../src/storage-transport.js';
import {GaxiosError} from 'gaxios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FakeServiceObject = any;
describe('ServiceObject', () => {
  let serviceObject: SO.ServiceObject<FakeServiceObject, SO.BaseMetadata>;
  const sandbox = sinon.createSandbox();
  const storageTransport = sandbox.createStubInstance(StorageTransport);

  const CONFIG = {
    baseUrl: 'base-url',
    parent: {},
    id: 'id',
    createMethod: util.noop,
    storageTransport,
  };

  beforeEach(() => {
    serviceObject = new ServiceObject(CONFIG);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('instantiation', () => {
    it('should create an empty metadata object', () => {
      assert.deepStrictEqual(serviceObject.metadata, {});
    });

    it('should localize the baseUrl', () => {
      assert.strictEqual(serviceObject.baseUrl, CONFIG.baseUrl);
    });

    it('should localize the parent instance', () => {
      assert.strictEqual(serviceObject.parent, CONFIG.parent);
    });

    it('should localize the ID', () => {
      assert.strictEqual(serviceObject.id, CONFIG.id);
    });

    it('should clear out methods that are not asked for', () => {
      const config = {
        ...CONFIG,
        methods: {
          create: true,
        },
      };
      const serviceObject = new ServiceObject(config);
      assert.strictEqual(typeof serviceObject.create, 'function');
      assert.strictEqual(serviceObject.delete, undefined);
    });

    it('should always expose the request method', () => {
      const methods = {};
      const config = {...CONFIG, methods};
      const serviceObject = new ServiceObject(config);
      assert.strictEqual(
        typeof serviceObject.storageTransport.makeRequest,
        'function'
      );
    });
  });

  describe('create', () => {
    it('should call createMethod', done => {
      const config = {...CONFIG, createMethod};
      const options = {};

      function createMethod(
        id: string,
        options_: {},
        callback: (err: Error | null, a: {}, b: {}) => void,
      ) {
        assert.strictEqual(id, config.id);
        assert.strictEqual(options_, options);
        callback(null, {}, {}); // calls done()
      }

      const serviceObject = new ServiceObject(config);
      serviceObject.create(options, done);
    });

    it('should not require options', done => {
      const config = {...CONFIG, createMethod};

      function createMethod(id: string, options: Function, callback: Function) {
        assert.strictEqual(id, config.id);
        assert.strictEqual(typeof options, 'function');
        assert.strictEqual(callback, undefined);
        options(null, {}, {}); // calls done()
      }

      const serviceObject = new ServiceObject(config);
      serviceObject.create(done);
    });

    it('should update id with metadata id', done => {
      const config = {...CONFIG, createMethod};
      const options = {};

      function createMethod(
        id: string,
        options_: {},
        callback: (err: Error | null, a: {}, b: {}) => void,
      ) {
        assert.strictEqual(id, config.id);
        assert.strictEqual(options_, options);
        callback(null, {metadata: {id: 14}}, {});
      }

      const serviceObject = new ServiceObject(config);
      serviceObject.create(options);
      assert.strictEqual(serviceObject.id, 14);
      done();
    });

    it('should pass error to callback', done => {
      const config = {...CONFIG, createMethod};
      const options = {};
      const error = new Error('Error.');
      const apiResponse = {};
      function createMethod(id: string, options_: {}, callback: Function) {
        callback(error, null, apiResponse);
      }

      const serviceObject = new ServiceObject(config);
      serviceObject.create(options, (err, instance, apiResponse_) => {
        assert.strictEqual(err, error);
        assert.strictEqual(instance, null);
        assert.strictEqual(apiResponse_, apiResponse);
        done();
      });
    });

    it('should return instance and apiResponse to callback', async () => {
      const config = {...CONFIG, createMethod};
      const options = {};
      const apiResponse = {};
      function createMethod(id: string, options_: {}, callback: Function) {
        callback(null, {}, apiResponse);
      }

      const serviceObject = new ServiceObject(config);
      const [instance_, apiResponse_] = await serviceObject.create(options);
      assert.strictEqual(instance_, serviceObject);
      assert.strictEqual(apiResponse_, apiResponse);
    });

    it('should assign metadata', async () => {
      const config = {...CONFIG, createMethod};
      const options = {};
      const instance = {
        metadata: {},
      };
      function createMethod(id: string, options_: {}, callback: Function) {
        callback(null, instance, {});
      }
      const serviceObject = new ServiceObject(config);
      const [instance_] = await serviceObject.create(options);
      assert.strictEqual(instance_.metadata, instance.metadata);
    });

    it('should execute callback with any amount of arguments', done => {
      const config = {...CONFIG, createMethod};
      const options = {};

      const args = ['a', 'b', 'c', 'd', 'e', 'f'];

      function createMethod(id: string, options_: {}, callback: Function) {
        callback(...args);
      }

      const serviceObject = new ServiceObject(config);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      serviceObject.create(options, (...args: any[]) => {
        assert.deepStrictEqual([].slice.call(args), args);
        done();
      });
    });
  });

  describe('delete', () => {
    before(() => {
      sandbox.restore();
    });

    it('should make the correct request', done => {
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsFake((reqOpts, callback) => {
          assert.strictEqual(reqOpts.method, 'DELETE');
          assert.strictEqual(reqOpts.url, 'base-url/undefined');
          done();
          callback!(null);
          return Promise.resolve();
        });
      serviceObject.delete(assert.ifError);
    });

    it('should accept options', done => {
      const options = {queryOptionProperty: true};
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsFake((reqOpts, callback) => {
          assert.deepStrictEqual(reqOpts.queryParameters, options);
          done();
          callback!(null);
          return Promise.resolve();
        });
      serviceObject.delete(options, assert.ifError);
    });

    it('should respect ignoreNotFound opion', done => {
      const options = {ignoreNotFound: true};
      const error = new GaxiosError('404', {});
      error.status = 404;
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsArgWith(1, error);
      serviceObject.delete(options, (err, apiResponse_) => {
        assert.ifError(err);
        assert.strictEqual(apiResponse_, undefined);
        done();
      });
    });

    it('should propagate other then 404 error', done => {
      const options = {ignoreNotFound: true};
      const error = new GaxiosError('406', {});
      error.status = 406;
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsArgWith(1, error);
      serviceObject.delete(options, (err, apiResponse_) => {
        assert.strictEqual(err, error);
        assert.strictEqual(apiResponse_, undefined);
        done();
      });
    });

    it('should not pass ignoreNotFound to request', done => {
      const options = {ignoreNotFound: true};
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsFake((reqOpts, callback) => {
          assert.strictEqual(
            reqOpts.queryParameters!.ignoreNotFound,
            undefined
          );
          done();
          callback!(null);
          return Promise.resolve();
        });
      serviceObject.delete(options, assert.ifError);
    });

    it('should not require a callback', () => {
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsArgWith(1, null, null, {});
      assert.doesNotThrow(async () => {
        await serviceObject.delete();
      });
    });

    it('should execute callback with correct arguments', done => {
      const error = new Error('🦃');
      const serviceObject = new ServiceObject(CONFIG);
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsArgWith(1, error);
      serviceObject.delete((err, apiResponse_) => {
        assert.strictEqual(err, error);
        assert.strictEqual(apiResponse_, undefined);
        done();
      });
    });
  });

  describe('exists', () => {
    it('should call get', async done => {
      sandbox.stub(serviceObject, 'get').callsFake(() => done());
      await serviceObject.exists(() => {});
    });

    it('should accept options', done => {
      const options = {queryOptionProperty: true};
      sandbox.stub(serviceObject, 'get').callsFake((reqOpts, callback) => {
        assert.deepStrictEqual(reqOpts, options);
        done();
        callback(null);
      });
      serviceObject.exists(options, assert.ifError);
    });

    it('should execute callback with false if 404', done => {
      const error = new GaxiosError('404', {});
      error.status = 404;
      sandbox.stub(serviceObject, 'get').callsArgWith(1, error);
      await serviceObject.exists((err: Error, exists: boolean) => {
        assert.ifError(err);
        assert.strictEqual(exists, false);
        done();
      });
    });

    it('should execute callback with error if not 404', done => {
      const error = new GaxiosError('500', {});
      error.status = 500;
      sandbox.stub(serviceObject, 'get').callsArgWith(1, error);
      await serviceObject.exists((err: Error, exists: boolean) => {
        assert.strictEqual(err, error);
        assert.strictEqual(exists, undefined);
        done();
      });
    });

    it('should execute callback with true if no error', async done => {
      sandbox.stub(serviceObject, 'get').callsArgWith(1, null);
      await serviceObject.exists((err: Error, exists: boolean) => {
        assert.ifError(err);
        assert.strictEqual(exists, true);
        done();
      });
    });
  });

  describe('get', () => {
    it('should get the metadata', done => {
      sandbox.stub(serviceObject, 'getMetadata').callsFake(() => {
        done();
      });

      serviceObject.get(assert.ifError);
    });

    it('should accept options', done => {
      const options = {};
      sandbox.stub(serviceObject, 'getMetadata').callsFake(options_ => {
        assert.deepStrictEqual(options, options_);
        done();
      });
      serviceObject.exists(options, assert.ifError);
    });

    it('handles not getting a config', done => {
      sandbox.stub(serviceObject, 'getMetadata').callsFake(() => {
        done();
      });
      serviceObject.get(assert.ifError);
    });

    it('should execute callback with error', done => {
      const error = new GaxiosError('Error.', {});
      sandbox
        .stub<any, any>(serviceObject, 'getMetadata')
        .callsFake((opts, callback) => {
          (callback as SO.MetadataCallback<SO.BaseMetadata>)!(error);
        });

      serviceObject.get(err => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should execute callback with metadata', done => {
      const metadata = {} as SO.BaseMetadata;
      sandbox
        .stub<any, any>(serviceObject, 'getMetadata')
        .callsFake((opts, callback) => {
          (callback as SO.MetadataCallback<SO.BaseMetadata>)!(null, metadata);
        });

      serviceObject.get((err, metadata) => {
        assert.ifError(err);
        assert.strictEqual(metadata, metadata);
        done();
      });
    });

    describe('autoCreate', () => {
      let AUTO_CREATE_CONFIG: {};

      const ERROR = new GaxiosError('bad', {});
      ERROR.status = 404;
      const METADATA = {} as SO.BaseMetadata;

      beforeEach(() => {
        AUTO_CREATE_CONFIG = {
          autoCreate: true,
        };

        sandbox
          .stub<any, any>(serviceObject, 'getMetadata')
          .callsFake((opts, callback) => {
            (callback as SO.MetadataCallback<SO.BaseMetadata>)!(
              ERROR,
              METADATA
            );
          });
      });

      it('should keep the original options intact', () => {
        const expectedConfig = Object.assign({}, AUTO_CREATE_CONFIG);
        serviceObject.get(AUTO_CREATE_CONFIG, () => {});
        assert.deepStrictEqual(AUTO_CREATE_CONFIG, expectedConfig);
      });

      it('should not auto create if there is no create method', done => {
        (serviceObject as FakeServiceObject).create = undefined;

        serviceObject.get(AUTO_CREATE_CONFIG, err => {
          assert.strictEqual(err, ERROR);
          done();
        });
      });

      it('should pass config to create if it was provided', done => {
        const expectedConfig = {maxResults: 5} as SO.GetConfig;
        const config = {...AUTO_CREATE_CONFIG, ...expectedConfig};

        sandbox.stub(serviceObject, 'create').callsFake(config_ => {
          assert.deepStrictEqual(config_, expectedConfig);
          done();
        });
        serviceObject.get(config, assert.ifError);
      });

      it('should pass only a callback to create if no config', done => {
        sandbox.stub(serviceObject, 'create').callsArgWith(0, null);
        serviceObject.get(AUTO_CREATE_CONFIG, done);
      });

      describe('error', () => {
        it('should execute callback with error', done => {
          const error = new Error('Error.');

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (sandbox.stub(serviceObject, 'create') as any).callsFake(
            (optsOrCb: {}, cb: Function) => {
              const callback = typeof optsOrCb === 'function' ? optsOrCb : cb;
              sandbox.stub(serviceObject, 'get').callsFake((cfg, callback) => {
                assert.deepStrictEqual(cfg, {});
                callback!(null); // done()
              });
              callback!(error, null, {});
            }
          );

          serviceObject.get(AUTO_CREATE_CONFIG, err => {
            assert.strictEqual(err, error);
            done();
          });
        });

        it('should refresh the metadata after a 409', done => {
          const error = new GaxiosError('errrr', {});
          error.status = 409;
          sandbox.stub(serviceObject, 'create').callsFake(callback => {
            sandbox.stub(serviceObject, 'get').callsFake((cfgOrCb, cb) => {
              const config = typeof cfgOrCb === 'object' ? cfgOrCb : {};
              const callback = typeof cfgOrCb === 'function' ? cfgOrCb : cb;
              assert.deepStrictEqual(config, {});
              callback!(null); // done()
            });
            callback(error, null, undefined);
          });
          serviceObject.get(AUTO_CREATE_CONFIG, done);
        });
      });
    });
  });

  describe('getMetadata', () => {
    it('should make the correct request', done => {
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsFake(function (
          this: SO.ServiceObject<FakeServiceObject, SO.BaseMetadata>,
          reqOpts,
          callback
        ) {
          assert.strictEqual(this, serviceObject.storageTransport);
          assert.strictEqual(reqOpts.url, 'base-url/undefined');
          done();
          callback!(null);
          return Promise.resolve();
        });
      serviceObject.getMetadata(() => {});
    });

    it('should accept options', done => {
      const options = {queryOptionProperty: true};
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsFake((reqOpts, callback) => {
          assert.deepStrictEqual(reqOpts.queryParameters, options);
          done();
          callback!(null);
          return Promise.resolve();
        });
      serviceObject.getMetadata(options, assert.ifError);
    });

    it('should execute callback with error & apiResponse', done => {
      const error = new GaxiosError('ಠ_ಠ', {});
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsArgWith(1, error);
      serviceObject.getMetadata((err: Error, metadata: {}) => {
        assert.strictEqual(err, error);
        assert.strictEqual(metadata, undefined);
        done();
      });
    });

    it('should update metadata', async done => {
      const apiResponse = {};
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsArgWith(1, null, {}, apiResponse);
      await serviceObject.getMetadata((err: Error) => {
        assert.ifError(err);
        assert.deepStrictEqual(serviceObject.metadata, apiResponse);
        done();
      });
    });

    it('should execute callback with metadata & API response', async done => {
      const apiResponse = {};
      const requestResponse = {body: apiResponse};
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsArgWith(1, null, apiResponse, requestResponse);
      await serviceObject.getMetadata((err: Error, metadata: {}) => {
        assert.ifError(err);
        assert.strictEqual(metadata, apiResponse);
        done();
      });
    });
  });

  describe('setMetadata', () => {
    it('should make the correct request', async done => {
      const metadata = {metadataProperty: true};
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsFake(function (
          this: SO.ServiceObject<FakeServiceObject, SO.BaseMetadata>,
          reqOpts,
          callback
        ) {
          assert.strictEqual(this, serviceObject.storageTransport);
          assert.strictEqual(reqOpts.method, 'PATCH');
          assert.strictEqual(reqOpts.url, 'base-url/undefined');
          assert.deepStrictEqual(reqOpts.body, metadata);
          done();
          callback!(null);
          return Promise.resolve();
        });
      serviceObject.setMetadata(metadata, () => {});
    });

    it('should accept options', done => {
      const metadata = {};
      const options = {queryOptionProperty: true};
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsFake((reqOpts, callback) => {
          assert.deepStrictEqual(reqOpts.queryParameters, options);
          done();
          callback!(null);
          return Promise.resolve();
        });
      serviceObject.setMetadata(metadata, options, () => {});
    });

    it('should execute callback with error & apiResponse', async done => {
      const error = new Error('Error.');
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsArgWith(1, error);
      serviceObject.setMetadata({}, (err: Error, apiResponse_: {}) => {
        assert.strictEqual(err, error);
        assert.strictEqual(apiResponse_, undefined);
        done();
      });
    });

    it('should update metadata', async done => {
      const apiResponse = {};
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsArgWith(1, undefined, apiResponse);
      await serviceObject.setMetadata({}, (err: Error) => {
        assert.ifError(err);
        assert.strictEqual(serviceObject.metadata, apiResponse);
        done();
      });
    });

    it('should execute callback with metadata & API response', async done => {
      const body = {};
      const apiResponse = {body};
      sandbox
        .stub(serviceObject.storageTransport, 'makeRequest')
        .callsArgWith(1, null, body, apiResponse);
      await serviceObject.setMetadata({}, (err: Error, metadata: {}) => {
        assert.ifError(err);
        assert.strictEqual(metadata, body);
        done();
      });
    });
  });
});

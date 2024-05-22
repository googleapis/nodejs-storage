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

import assert from 'assert';
import {describe, it, before, beforeEach} from 'mocha';
import {Storage} from '../src/storage.js';
import {
  StorageRequestOptions,
  StorageTransport,
} from '../src/storage-transport.js';
import {Acl, AclMetadata, AclRoleAccessorMethods} from '../src/acl.js';
import * as sinon from 'sinon';
import {Bucket} from '../src/bucket.js';
import {GaxiosError} from 'gaxios';

describe('storage/acl', () => {
  let acl: Acl;

  const ERROR = new GaxiosError('Error.', {});
  const PATH_PREFIX = '/acl';
  const ROLE = Storage.acl.OWNER_ROLE;
  const ENTITY = 'user-user@example.com';
  const STORAGE_TRANSPORT = sinon.createStubInstance(StorageTransport);
  const BUCKET_PARENT = sinon.createStubInstance(Bucket);
  BUCKET_PARENT.name = 'fake-bucket';
  BUCKET_PARENT.baseUrl = '/b';

  before(() => {});

  beforeEach(() => {
    acl = new Acl({
      pathPrefix: PATH_PREFIX,
      storageTransport: STORAGE_TRANSPORT,
      parent: BUCKET_PARENT,
    });
  });

  describe('initialization', () => {
    it('should assign makeReq and pathPrefix', () => {
      assert.strictEqual(acl.pathPrefix, PATH_PREFIX);
    });
  });

  describe('add', () => {
    it('should make the correct api request', () => {
      STORAGE_TRANSPORT.makeRequest.callsFake(
        (reqOpts: StorageRequestOptions) => {
          assert.strictEqual(reqOpts.method, 'POST');
          assert.strictEqual(reqOpts.url, '/b/fake-bucket/acl');
          assert.deepStrictEqual(reqOpts.body, {entity: ENTITY, role: ROLE});
          return Promise.resolve();
        }
      );

      acl.add({entity: ENTITY, role: ROLE}, assert.ifError);
    });

    it('should set the generation', () => {
      const options = {
        entity: ENTITY,
        role: ROLE,
        generation: 8,
      };

      STORAGE_TRANSPORT.makeRequest.callsFake(
        (reqOpts: StorageRequestOptions) => {
          assert.strictEqual(
            reqOpts.queryParameters?.generation,
            options.generation
          );
          return Promise.resolve();
        }
      );

      acl.add(options, assert.ifError);
    });

    it('should set the userProject', () => {
      const options = {
        entity: ENTITY,
        role: ROLE,
        userProject: 'grape-spaceship-123',
      };

      STORAGE_TRANSPORT.makeRequest.callsFake(
        (reqOpts: StorageRequestOptions) => {
          assert.strictEqual(
            reqOpts.queryParameters?.userProject,
            options.userProject
          );
          return Promise.resolve();
        }
      );

      acl.add(options, assert.ifError);
    });

    it('should execute the callback with an ACL object', done => {
      const apiResponse: AclMetadata = {entity: ENTITY, role: 'OWNER'};
      const expectedAclObject = {entity: ENTITY, role: ROLE};

      STORAGE_TRANSPORT.makeRequest.callsFake(() => {
        return Promise.resolve(apiResponse);
      });

      acl.add({entity: ENTITY, role: ROLE}, (err, resp) => {
        assert.ifError(err);
        assert.deepStrictEqual(resp, expectedAclObject);
        done();
      });
    });

    it('should execute the callback with an error', done => {
      STORAGE_TRANSPORT.makeRequest.callsFake(() => {
        return Promise.reject(ERROR);
      });

      acl.add({entity: ENTITY, role: ROLE}, err => {
        assert.deepStrictEqual(err, ERROR);
        done();
      });
    });

    it('should execute the callback with apiResponse', done => {
      const resp: AclMetadata = {success: true};

      STORAGE_TRANSPORT.makeRequest.callsFake(() => {
        return Promise.resolve(resp);
      });

      acl.add({entity: ENTITY, role: ROLE}, (err, apiResponse) => {
        assert.deepStrictEqual(resp, apiResponse);
        done();
      });
    });
  });

  describe('delete', () => {
    it('should make the correct api request', () => {
      STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
        assert.strictEqual(reqOpts.method, 'DELETE');
        assert.strictEqual(
          reqOpts.url,
          '/b/fake-bucket/acl/user-user@example.com'
        );

        return Promise.resolve();
      });

      acl.delete({entity: ENTITY}, assert.ifError);
    });

    it('should set the generation', () => {
      const options = {
        entity: ENTITY,
        generation: 8,
      };

      STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
        assert.strictEqual(
          reqOpts.queryParameters?.generation,
          options.generation
        );
        return Promise.resolve();
      });

      acl.delete(options, assert.ifError);
    });

    it('should set the userProject', () => {
      const options = {
        entity: ENTITY,
        role: ROLE,
        userProject: 'grape-spaceship-123',
      };

      STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
        assert.strictEqual(
          reqOpts.queryParameters?.userProject,
          options.userProject
        );
        return Promise.resolve();
      });

      acl.delete(options, assert.ifError);
    });

    it('should execute the callback with an error', done => {
      STORAGE_TRANSPORT.makeRequest.callsFake(() => {
        return Promise.reject(ERROR);
      });

      acl.delete({entity: ENTITY}, err => {
        assert.deepStrictEqual(err, ERROR);
        done();
      });
    });

    it('should execute the callback with empty response', done => {
      STORAGE_TRANSPORT.makeRequest.callsFake(() => {
        return Promise.resolve();
      });

      acl.delete({entity: ENTITY}, (err, apiResponse) => {
        assert.deepStrictEqual(apiResponse, {});
        done();
      });
    });
  });

  describe('get', () => {
    describe('all ACL objects', () => {
      it('should make the correct API request', () => {
        STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
          assert.strictEqual(reqOpts.url, '/b/fake-bucket/acl');

          return Promise.resolve();
        });

        acl.get(assert.ifError);
      });

      it('should accept a configuration object', () => {
        const generation = 1;

        STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
          assert.strictEqual(reqOpts.queryParameters?.generation, generation);
          assert(reqOpts.url?.toString().includes('fake-entity'));

          return Promise.resolve();
        });

        acl.get({generation, entity: 'fake-entity'}, assert.ifError);
      });

      it('should pass an array of acl objects to the callback', done => {
        const apiResponse = {
          items: [
            {entity: ENTITY, role: ROLE},
            {entity: ENTITY, role: ROLE},
            {entity: ENTITY, role: ROLE},
          ],
        };

        const expectedAclObjects = [
          {entity: ENTITY, role: ROLE},
          {entity: ENTITY, role: ROLE},
          {entity: ENTITY, role: ROLE},
        ];

        STORAGE_TRANSPORT.makeRequest.callsFake(() => {
          return Promise.resolve(apiResponse);
        });

        acl.get((err, aclObjects) => {
          assert.ifError(err);
          assert.deepStrictEqual(aclObjects, expectedAclObjects);
          done();
        });
      });
    });

    describe('ACL object for an entity', () => {
      it('should get a specific ACL object', () => {
        STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
          assert.strictEqual(
            reqOpts.url,
            '/b/fake-bucket/acl/user-user@example.com'
          );

          return Promise.resolve();
        });

        acl.get({entity: ENTITY}, assert.ifError);
      });

      it('should accept a configuration object', () => {
        const generation = 1;

        STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
          assert.strictEqual(reqOpts.queryParameters?.generation, generation);

          return Promise.resolve();
        });

        acl.get({entity: ENTITY, generation}, assert.ifError);
      });

      it('should set the userProject', () => {
        const options = {
          entity: ENTITY,
          userProject: 'grape-spaceship-123',
        };

        STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
          assert.strictEqual(
            reqOpts.queryParameters?.userProject,
            options.userProject
          );
          return Promise.resolve();
        });

        acl.get(options, assert.ifError);
      });

      it('should pass an acl object to the callback', done => {
        const apiResponse = {entity: ENTITY, role: ROLE};
        const expectedAclObject = {entity: ENTITY, role: ROLE};

        STORAGE_TRANSPORT.makeRequest.callsFake(() => {
          return Promise.resolve(apiResponse);
        });

        acl.get({entity: ENTITY}, (err, aclObject) => {
          assert.ifError(err);
          assert.deepStrictEqual(aclObject, expectedAclObject);
          done();
        });
      });
    });

    it('should execute the callback with an error', done => {
      STORAGE_TRANSPORT.makeRequest.callsFake(() => {
        return Promise.reject(ERROR);
      });

      acl.get(err => {
        assert.deepStrictEqual(err, ERROR);
        done();
      });
    });

    it('should execute the callback with apiResponse', done => {
      const resp = {success: true};

      STORAGE_TRANSPORT.makeRequest.callsFake(() => {
        return Promise.resolve(resp);
      });

      acl.get((err, apiResponse) => {
        assert.deepStrictEqual(resp, apiResponse);
        done();
      });
    });
  });

  describe('update', () => {
    it('should make the correct API request', () => {
      STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
        assert.strictEqual(reqOpts.method, 'PUT');
        assert.strictEqual(
          reqOpts.url,
          '/b/fake-bucket/acl/user-user@example.com'
        );
        assert.deepStrictEqual(reqOpts.body, {role: ROLE});

        return Promise.resolve();
      });

      acl.update({entity: ENTITY, role: ROLE}, assert.ifError);
    });

    it('should set the generation', () => {
      const options = {
        entity: ENTITY,
        role: ROLE,
        generation: 8,
      };

      STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
        assert.strictEqual(
          reqOpts.queryParameters?.generation,
          options.generation
        );
        return Promise.resolve();
      });

      acl.update(options, assert.ifError);
    });

    it('should set the userProject', () => {
      const options = {
        entity: ENTITY,
        role: ROLE,
        userProject: 'grape-spaceship-123',
      };

      STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
        assert.strictEqual(
          reqOpts.queryParameters?.userProject,
          options.userProject
        );
        return Promise.resolve();
      });

      acl.update(options, assert.ifError);
    });

    it('should pass an acl object to the callback', done => {
      const apiResponse = {entity: ENTITY, role: ROLE};
      const expectedAclObject = {entity: ENTITY, role: ROLE};

      STORAGE_TRANSPORT.makeRequest.callsFake(() => {
        return Promise.resolve(apiResponse);
      });

      acl.update({entity: ENTITY, role: ROLE}, (err, aclObject) => {
        assert.ifError(err);
        assert.deepStrictEqual(aclObject, expectedAclObject);
        done();
      });
    });

    it('should execute the callback with an error', done => {
      STORAGE_TRANSPORT.makeRequest.callsFake(() => {
        return Promise.reject(ERROR);
      });

      acl.update({entity: ENTITY, role: ROLE}, err => {
        assert.deepStrictEqual(err, ERROR);
        done();
      });
    });

    it('should execute the callback with apiResponse', done => {
      const resp = {success: true};

      STORAGE_TRANSPORT.makeRequest.callsFake(() => {
        return Promise.resolve(resp);
      });

      const config = {entity: ENTITY, role: ROLE};
      acl.update(config, (err, apiResponse) => {
        assert.deepStrictEqual(resp, apiResponse);
        done();
      });
    });
  });
});

describe('storage/AclRoleAccessorMethods', () => {
  let aclEntity: AclRoleAccessorMethods;

  beforeEach(() => {
    aclEntity = new AclRoleAccessorMethods();
  });

  describe('initialization', () => {
    it('should assign access methods for every role object', () => {
      const expectedApi = [
        'addAllAuthenticatedUsers',
        'deleteAllAuthenticatedUsers',

        'addAllUsers',
        'deleteAllUsers',

        'addDomain',
        'deleteDomain',

        'addGroup',
        'deleteGroup',

        'addProject',
        'deleteProject',

        'addUser',
        'deleteUser',
      ];

      const actualOwnersApi = Object.keys(aclEntity.owners);
      assert.deepStrictEqual(actualOwnersApi, expectedApi);

      const actualReadersApi = Object.keys(aclEntity.readers);
      assert.deepStrictEqual(actualReadersApi, expectedApi);

      const actualWritersApi = Object.keys(aclEntity.writers);
      assert.deepStrictEqual(actualWritersApi, expectedApi);
    });
  });

  describe('_assignAccessMethods', () => {
    it('should call parent method', async () => {
      const userName = 'email@example.com';
      const role = 'fakerole';

      (aclEntity as any).add = async (options: {}) => {
        assert.deepStrictEqual(options, {
          entity: 'user-' + userName,
          role,
        });
      };

      (aclEntity as any).delete = async (options: {}) => {
        assert.deepStrictEqual(options, {
          entity: 'allUsers',
          role,
        });
      };

      aclEntity._assignAccessMethods(role);

      await Promise.all([
        (aclEntity as any).fakeroles.addUser(userName),
        (aclEntity as any).fakeroles.deleteAllUsers(),
      ]);
    });

    it('should return the parent methods return value', () => {
      const fakeReturn = {};

      (aclEntity as any).add = () => {
        return fakeReturn;
      };

      aclEntity._assignAccessMethods('fakerole');

      const value = (aclEntity as any).fakeroles.addUser('email@example.com');
      assert.strictEqual(value, fakeReturn);
    });

    it('should not pass in the callback if undefined', done => {
      (aclEntity as any).add = (...args: Array<{}>) => {
        assert.strictEqual(args.length, 1);
        done();
      };

      aclEntity._assignAccessMethods('fakerole');
      (aclEntity as any).fakeroles.addUser('email@example.com', undefined);
    });

    it('should optionally accept options', done => {
      const fakeRole = 'fakerole';
      const fakeUser = 'email@example.com';
      const fakeOptions = {
        userProject: 'grape-spaceship-123',
      };

      const expectedOptions = Object.assign(
        {
          entity: 'user-' + fakeUser,
          role: fakeRole,
        },
        fakeOptions
      );

      (aclEntity as any).add = (options: {}) => {
        assert.deepStrictEqual(options, expectedOptions);
        done();
      };

      aclEntity._assignAccessMethods(fakeRole);
      (aclEntity as any).fakeroles.addUser(
        fakeUser,
        fakeOptions,
        assert.ifError
      );
    });
  });
});

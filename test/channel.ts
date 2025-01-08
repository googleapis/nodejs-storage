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

/*!
 * @module storage/channel
 */

import assert from 'assert';
import {describe, it, before, beforeEach} from 'mocha';
import {Channel} from '../src/channel.js';
import {Storage} from '../src/storage.js';
import * as sinon from 'sinon';
import {GaxiosError} from 'gaxios';
import {StorageTransport} from '../src/storage-transport.js';

describe('Channel', () => {
  let STORAGE: Storage;
  const ID = 'channel-id';
  const RESOURCE_ID = 'resource-id';
  let channel: Channel;
  let sandbox: sinon.SinonSandbox;
  let storageTransport: StorageTransport;

  before(() => {
    sandbox = sinon.createSandbox();
    storageTransport = sandbox.createStubInstance(StorageTransport);
    STORAGE = sandbox.createStubInstance(Storage);
    STORAGE.storageTransport = storageTransport;
  });

  beforeEach(() => {
    channel = new Channel(STORAGE, ID, RESOURCE_ID);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('initialization', () => {
    it('should set the default metadata', () => {
      assert.deepStrictEqual(channel.metadata, {
        id: ID,
        resourceId: RESOURCE_ID,
      });
    });
  });

  describe('stop', () => {
    it('should make the correct request', () => {
      sandbox
        .stub(channel.storageTransport, 'makeRequest')
        .callsFake(reqOpts => {
          assert.strictEqual(reqOpts.method, 'POST');
          assert.strictEqual(reqOpts.url, '/channels/stop');
          assert.strictEqual(reqOpts.body, channel.metadata);

          return Promise.resolve();
        });

      channel.stop(assert.ifError);
    });

    it('should execute callback with error', done => {
      const error = {};

      sandbox
        .stub(channel.storageTransport, 'makeRequest')
        .callsFake((reqOpts, callback) => {
          callback!(error as GaxiosError);
          return Promise.resolve();
        });

      channel.stop(err => {
        assert.strictEqual(err, error);
        done();
      });
    });

    it('should not require a callback', async () => {
      sandbox
        .stub(channel.storageTransport, 'makeRequest')
        .callsFake((reqOpts, callback) => {
          assert.doesNotThrow(() => callback!(null));
          return Promise.resolve();
        });

      await channel.stop();
    });
  });
});

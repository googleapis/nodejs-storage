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

import {ServiceObject} from '../src/nodejs-common/index.js';
import assert from 'assert';
import {describe, it, beforeEach} from 'mocha';
import {StorageTransport} from '../src/storage-transport.js';
import {Storage} from '../src/storage.js';
import * as sinon from 'sinon';
import {Channel} from '../src/channel.js';

describe('Channel', () => {
  const STORAGE = sinon.createStubInstance(Storage);
  const STORAGE_TRANSPORT = sinon.createStubInstance(StorageTransport);
  const ID = 'channel-id';
  const RESOURCE_ID = 'resource-id';
  let channel: Channel;

  beforeEach(() => {
    channel = new Channel(STORAGE, ID, RESOURCE_ID);
    channel.storageTransport = STORAGE_TRANSPORT;
  });

  describe('initialization', () => {
    it('should inherit from ServiceObject', () => {
      assert.strictEqual(channel instanceof ServiceObject, true);
      assert.strictEqual(channel.parent, STORAGE);
      assert.strictEqual(channel.baseUrl, '/channels');
      assert.strictEqual(channel.id, '');
    });

    it('should set the default metadata', () => {
      assert.deepStrictEqual(channel.metadata, {
        id: ID,
        resourceId: RESOURCE_ID,
      });
    });
  });

  describe('stop', () => {
    it('should return a promise that resolves to undefined when stop is successful', async () => {
      STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(reqOpts.url, '/channels/stop');
        assert.strictEqual(reqOpts.body, channel.metadata);
        return Promise.resolve();
      });

      const res = await channel.stop();
      assert.strictEqual(res, undefined);
    });

    it('should reject when a call to stop is unsuccessful', async () => {
      STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(reqOpts.url, '/channels/stop');
        assert.strictEqual(reqOpts.body, channel.metadata);
        return Promise.reject();
      });

      assert.rejects(channel.stop());
    });

    it('should execute callback when stop is successful', done => {
      STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(reqOpts.url, '/channels/stop');
        assert.strictEqual(reqOpts.body, channel.metadata);
        return Promise.resolve();
      });

      channel.stop((err, resp) => {
        assert.strictEqual(err, null);
        assert.deepStrictEqual(resp, {});
        done();
      });
    });

    it('should execute callback with error when stop is unsuccessful', done => {
      STORAGE_TRANSPORT.makeRequest.callsFake(reqOpts => {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(reqOpts.url, '/channels/stop');
        assert.strictEqual(reqOpts.body, channel.metadata);
        return Promise.reject('Testing Error');
      });

      channel.stop(err => {
        assert.strictEqual(err, 'Testing Error');
        done();
      });
    });
  });
});

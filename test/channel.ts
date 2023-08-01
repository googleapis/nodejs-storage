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

import {ServiceObject} from '../src/nodejs-common';
import {Channel} from '../src/channel';
import * as assert from 'assert';
import {describe, it, beforeEach} from 'mocha';
import * as sinon from 'sinon';
import {Storage} from '../src/storage';

describe('Channel', () => {
  const STORAGE = sinon.createStubInstance(Storage);
  const ID = 'channel-id';
  const RESOURCE_ID = 'resource-id';
  let channel: Channel;

  beforeEach(() => {
    channel = new Channel(STORAGE, ID, RESOURCE_ID);
  });

  describe('initialization', () => {
    it('should inherit from ServiceObject', () => {
      // Using assert.strictEqual instead of assert to prevent
      // coercing of types.
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
    it('should make the correct request', done => {
      sinon.stub(channel, 'request').callsFake(reqOpts => {
        assert.strictEqual(reqOpts.method, 'POST');
        assert.strictEqual(reqOpts.uri, '/stop');
        assert.strictEqual(reqOpts.json, channel.metadata);

        done();
      });

      channel.stop(assert.ifError);
    });

    it('should execute callback with error & API response', done => {
      const error = {};
      const apiResponse = {};

      sinon.stub(channel, 'request').callsFake((reqOpts, callback) => {
        callback(error as Error, apiResponse);
      });

      channel.stop((err: Error | null, apiResponse_: unknown) => {
        assert.strictEqual(err, error);
        assert.strictEqual(apiResponse_, apiResponse);
        done();
      });
    });

    it('should not require a callback', done => {
      sinon.stub(channel, 'request').callsFake((reqOpts, callback) => {
        assert.doesNotThrow(() => callback(null));
        done();
      });

      channel.stop();
    });
  });
});

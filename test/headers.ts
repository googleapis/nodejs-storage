/**
 * Copyright 2019 Google Inc.
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

import * as assert from 'assert';
import {Storage} from '../src';
import * as nock from 'nock';

describe('headers', () => {
  before(() => {
    nock.disableNetConnect();
  });
  it('populates x-goog-api-client header', async () => {
    const storage = new Storage({
      projectId: 'foo',
    });
    const bucket = storage.bucket('foo-bucket');
    const metadata = nock('http://metadata.google.internal.')
      .get('/computeMetadata/v1/instance')
      .replyWithError({code: 'ENOTFOUND'});
    const req = nock('https://www.googleapis.com')
      .post('/storage/v1/b?project=foo')
      .reply(200, function() {
        assert.ok(
          /^gl-node\/[0-9]+\.[0-9]+\.[-.\w]+ gccl\/[0-9]+\.[0-9]+\.[-.\w]+$/.test(
            this.req.headers['x-goog-api-client'][0]
          )
        );
        return {};
      });
    await bucket.create();
    metadata.done();
    req.done();
  });
  after(() => {
    nock.enableNetConnect();
  });
});

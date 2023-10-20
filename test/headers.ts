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

import * as assert from 'assert';
import {describe, it} from 'mocha';
import {Storage} from '../src/storage';
import * as auth from 'google-auth-library';
import * as sinon from 'sinon';
import {Headers} from 'gaxios';

interface Request {
  headers: {
    [key: string]: string;
  };
}
const requests: Request[] = [];
const error = new Error('not implemented');

describe('headers', () => {
  let authStub: sinon.SinonStubbedInstance<auth.GoogleAuth<never>>;
  before(() => {
    authStub = sinon.createStubInstance(auth.GoogleAuth, {
      authorizeRequest: sinon
        .stub<
          [{url?: string; uri?: string; headers?: Headers}],
          Promise<{url?: string; uri?: string; headers?: Headers}>
        >()
        .callsFake(opts => {
          requests.push(opts as Request);
          throw error;
        }),
    });
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.Deno = undefined;
  });

  it('populates x-goog-api-client header (node)', async () => {
    const storage = new Storage({authClient: authStub});
    const bucket = storage.bucket('foo-bucket');
    try {
      await bucket.create();
    } catch (err) {
      if (err !== error) throw err;
    }
    assert.ok(
      /^gl-node\/(?<nodeVersion>[^W]+) gccl\/(?<gccl>[^W]+) gccl-invocation-id\/(?<gcclInvocationId>[^W]+)$/.test(
        requests[0].headers['x-goog-api-client']
      )
    );
  });

  it('populates x-goog-api-client header (deno)', async () => {
    const storage = new Storage({authClient: authStub});
    const bucket = storage.bucket('foo-bucket');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.Deno = {
      version: {
        deno: '0.00.0',
      },
    };
    try {
      await bucket.create();
    } catch (err) {
      if (err !== error) throw err;
    }
    assert.ok(
      /^gl-deno\/0.00.0 gccl\/(?<gccl>[^W]+) gccl-invocation-id\/(?<gcclInvocationId>[^W]+)$/.test(
        requests[1].headers['x-goog-api-client']
      )
    );
  });
});

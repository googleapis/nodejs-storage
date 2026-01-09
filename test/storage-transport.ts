// Copyright 2025 Google LLC
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

import {describe} from 'mocha';
import {
  StorageRequestOptions,
  StorageTransport,
} from '../src/storage-transport';
import {GoogleAuth} from 'google-auth-library';
import sinon from 'sinon';
import assert from 'assert';
import {GCCL_GCS_CMD_KEY} from '../src/nodejs-common/util';

describe('Storage Transport', () => {
  let sandbox: sinon.SinonSandbox;
  let transport: StorageTransport;
  let authClientStub: GoogleAuth;
  const baseUrl = 'https://storage.googleapis.com';

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    authClientStub = new GoogleAuth();
    sandbox.stub(authClientStub, 'request');
    sandbox.stub(authClientStub, 'getProjectId').resolves('project-id');

    transport = new StorageTransport({
      apiEndpoint: baseUrl,
      baseUrl,
      authClient: authClientStub,
      projectId: 'project-id',
      retryOptions: {
        maxRetries: 3,
        retryDelayMultiplier: 2,
        maxRetryDelay: 100,
        totalTimeout: 1000,
        retryableErrorFn: () => true,
      },
      scopes: ['https://www.googleapis.com/auth/could-platform'],
      packageJson: {name: 'test-package', version: '1.0.0'},
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should make a request with the correct parameters', async () => {
    const response = {
      data: {success: true},
      headers: new Map(),
      status: 200,
      statusText: 'OK',
    };
    const requestStub = authClientStub.request as sinon.SinonStub;
    requestStub.resolves(response);

    const reqOpts: StorageRequestOptions = {
      url: '/bucket/object',
      queryParameters: {alt: 'json', userProject: 'user-project'},
      headers: {'content-encoding': 'gzip'},
    };
    const _response = await transport.makeRequest(reqOpts);

    assert.strictEqual(requestStub.calledOnce, true);
    const calledWith = requestStub.getCall(0).args[0];
    assert.strictEqual(
      calledWith.url.href,
      `${baseUrl}/bucket/object?alt=json&userProject=user-project`,
    );
    assert.strictEqual(calledWith.headers.get('content-encoding'), 'gzip');
    assert.ok(
      calledWith.headers.get('User-Agent').includes('gcloud-node-storage/'),
    );
    assert.deepStrictEqual(_response, response.data);
  });

  it('should handle retry options correctly', async () => {
    const requestStub = authClientStub.request as sinon.SinonStub;
    requestStub.resolves({
      data: {},
      headers: new Map(),
    });
    const reqOpts: StorageRequestOptions = {
      url: '/bucket/object',
    };
    await transport.makeRequest(reqOpts);

    const calledWith = requestStub.getCall(0).args[0];

    assert.strictEqual(calledWith.retryConfig.retry, 3);
    assert.strictEqual(calledWith.retryConfig.retryDelayMultiplier, 2);
    assert.strictEqual(calledWith.retryConfig.maxRetryDelay, 100);
    assert.strictEqual(calledWith.retryConfig.totalTimeout, 1000);
  });

  it('should append GCCL_GCS_CMD_KEY to x-goog-api-client header if present', async () => {
    const reqOpts: StorageRequestOptions = {
      url: '/bucket/object',
      headers: {'x-goog-api-client': 'base-client'},
      [GCCL_GCS_CMD_KEY]: 'test-key',
    };

    (authClientStub.request as sinon.SinonStub).resolves({
      data: {},
      headers: new Map(),
    });

    await transport.makeRequest(reqOpts);

    const calledWith = (authClientStub.request as sinon.SinonStub).getCall(0)
      .args[0];

    assert.ok(
      calledWith.headers
        .get('x-goog-api-client')
        .includes('gccl-gcs-cmd/test-key'),
    );
  });

  it('should override query parameter project with transport project ID', async () => {
    const requestStub = authClientStub.request as sinon.SinonStub;
    requestStub.resolves({data: {}, headers: new Map()});

    await transport.makeRequest({
      url: '/test',
      queryParameters: {project: 'wrong-project'},
    });

    const calledUrl = requestStub.getCall(0).args[0].url;
    assert.ok(calledUrl.searchParams.get('project') === 'project-id');
  });

  it('should initialize a new GoogleAuth instance when authClient is not an instance of GoogleAuth', async () => {
    const mockAuthClient = undefined;

    const options = {
      apiEndpoint: baseUrl,
      baseUrl,
      authClient: mockAuthClient,
      retryOptions: {
        maxRetries: 3,
        retryDelayMultiplier: 2,
        maxRetryDelay: 100,
        totalTimeout: 1000,
        retryableErrorFn: () => true,
      },
      scopes: ['https://www.googleapis.com/auth/could-platform'],
      packageJson: {name: 'test-package', version: '1.0.0'},
      clientOptions: {keyFile: 'path/to/key.json'},
      userAgent: 'custom-agent',
      url: 'http://example..com',
    };
    sandbox.stub(GoogleAuth.prototype, 'request');

    const transport = new StorageTransport(options);
    assert.ok(transport.authClient instanceof GoogleAuth);
  });

  it('should handle absolute URLs and project validation', async () => {
    const requestStub = authClientStub.request as sinon.SinonStub;
    requestStub.resolves({data: {}, headers: new Map()});

    await transport.makeRequest({url: 'https://my-custom-endpoint.com/v1/b'});
    assert.strictEqual(
      requestStub.getCall(0).args[0].url,
      'https://my-custom-endpoint.com/v1/b',
    );
  });

  describe('Storage Transport shouldRetry logic', () => {
    it('should retry POST if preconditions are present', async () => {
      const requestStub = authClientStub.request as sinon.SinonStub;
      requestStub.resolves({data: {}, headers: new Map()});

      await transport.makeRequest({
        method: 'POST',
        url: '/b/bucket/o',
        queryParameters: {ifGenerationMatch: 123},
      });

      const retryConfig = requestStub.getCall(0).args[0].retryConfig;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error503 = {response: {status: 503}} as any;

      assert.strictEqual(retryConfig.shouldRetry(error503), true);
    });

    it('should retry on malformed JSON responses (SyntaxError)', async () => {
      const requestStub = authClientStub.request as sinon.SinonStub;
      requestStub.resolves({data: {}, headers: new Map()});

      await transport.makeRequest({url: '/test'});

      const retryConfig = requestStub.getCall(0).args[0].retryConfig;

      const malformedError = new Error(
        'Unexpected token < in JSON at position 0',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;
      malformedError.stack = 'SyntaxError: Unexpected token <';

      assert.strictEqual(retryConfig.shouldRetry(malformedError), true);
    });

    it('should retry on 503 for idempotent PUT requests', async () => {
      const requestStub = authClientStub.request as sinon.SinonStub;
      requestStub.resolves({data: {}, headers: new Map()});

      await transport.makeRequest({
        method: 'PUT',
        url: '/bucket/object',
      });

      const retryConfig = requestStub.getCall(0).args[0].retryConfig;

      const error503 = {
        response: {status: 503},
        config: {url: '/bucket/object'},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      assert.strictEqual(retryConfig.shouldRetry(error503), true);
    });

    it('should NOT retry on 401 Unauthorized', async () => {
      const requestStub = authClientStub.request as sinon.SinonStub;
      requestStub.resolves({data: {}, headers: new Map()});

      await transport.makeRequest({url: '/test'});

      const retryConfig = requestStub.getCall(0).args[0].retryConfig;

      const error401 = {
        response: {status: 401},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      assert.strictEqual(retryConfig.shouldRetry(error401), false);
    });

    it('should treat 308 as a valid status for resumable uploads', async () => {
      const requestStub = authClientStub.request as sinon.SinonStub;
      requestStub.resolves({data: '308-metadata', headers: new Map()});

      await transport.makeRequest({
        url: '/upload/storage/v1/b/bucket/o?uploadType=resumable',
      });

      const callArgs = requestStub.getCall(0).args[0];

      assert.strictEqual(callArgs.validateStatus(308), true);
      assert.strictEqual(callArgs.responseType, 'text');
    });

    it('should retry when GCS reason is rateLimitExceeded', async () => {
      const requestStub = authClientStub.request as sinon.SinonStub;
      requestStub.resolves({data: {}, headers: new Map()});

      await transport.makeRequest({url: '/test'});
      const retryConfig = requestStub.getCall(0).args[0].retryConfig;

      const rateLimitError = {
        response: {
          data: {
            error: {
              errors: [{reason: 'rateLimitExceeded'}],
            },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      assert.strictEqual(retryConfig.shouldRetry(rateLimitError), true);
    });

    it('should retry on transient network errors (no response)', async () => {
      const requestStub = authClientStub.request as sinon.SinonStub;
      requestStub.resolves({data: {}, headers: new Map()});

      await transport.makeRequest({url: '/test'});
      const retryConfig = requestStub.getCall(0).args[0].retryConfig;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connReset = {code: 'ECONNRESET'} as any;
      assert.strictEqual(retryConfig.shouldRetry(connReset), true);
    });

    it('should execute callback and format malformed JSON errors', async () => {
      const requestStub = authClientStub.request as sinon.SinonStub;
      const callback = sinon.stub();

      // Create an error that looks like a JSON parsing failure
      const malformedError = new Error(
        'Unexpected token < in JSON at position 0',
      );
      malformedError.name = 'SyntaxError';
      malformedError.stack = 'SyntaxError: Unexpected token <...';

      // Attach a mock response to ensure status is available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (malformedError as any).response = {status: 502};

      requestStub.rejects(malformedError);

      try {
        await transport.makeRequest({url: '/test'}, callback);
      } catch (e) {
        // We expect it to throw, so we catch it here to continue assertions
      }

      // Verify the callback was called with the modified error message
      assert.strictEqual(callback.calledOnce, true);

      const errorSentToCallback = callback.firstCall.args[0];

      assert.ok(
        errorSentToCallback.message.includes(
          'Server returned non-JSON response',
        ),
      );
    });

    it('should allow retries for bucket creation and safe deletes', async () => {
      const requestStub = authClientStub.request as sinon.SinonStub;
      requestStub.resolves({data: {}, headers: new Map()});

      await transport.makeRequest({method: 'POST', url: '/v1/b'});
      const retryConfig = requestStub.getCall(0).args[0].retryConfig;

      // No status code (network error) on bucket create should retry
      assert.strictEqual(retryConfig.shouldRetry({code: 'ECONNRESET'}), true);
    });

    it('should handle HMAC and IAM retry logic', async () => {
      const requestStub = authClientStub.request as sinon.SinonStub;
      requestStub.resolves({data: {}, headers: new Map()});

      // Test HMAC PUT without ETag (should NOT retry)
      await transport.makeRequest({
        method: 'PUT',
        url: '/hmacKeys/test',
        body: JSON.stringify({noEtag: true}),
      });
      let retryConfig = requestStub.getCall(0).args[0].retryConfig;
      assert.strictEqual(
        retryConfig.shouldRetry({
          response: {status: 503},
          config: {url: '/hmacKeys/test'},
        }),
        false,
      );

      // Test IAM PUT with ETag (should retry)
      await transport.makeRequest({
        method: 'PUT',
        url: '/iam/test',
        body: JSON.stringify({etag: '123'}),
      });
      retryConfig = requestStub.getCall(1).args[0].retryConfig;
      assert.strictEqual(
        retryConfig.shouldRetry({
          response: {status: 503},
          config: {url: '/iam/test'},
        }),
        true,
      );
    });
  });
});

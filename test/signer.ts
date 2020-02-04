// Copyright 2020 Google LLC
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
import * as crypto from 'crypto';
import * as sinon from 'sinon';
import * as url from 'url';

import {
  UrlSigner,
  SigningError,
  AuthClient,
  BucketI,
  FileI,
  SignerGetSignedUrlConfig,
  PATH_STYLED_HOST,
} from '../src/signer';

describe('signer', () => {
  const BUCKET_NAME = 'bucket-name';
  const FILE_NAME = 'file-name.png';
  const CLIENT_EMAIL = 'client-email';

  let sandbox: sinon.SinonSandbox;
  beforeEach(() => (sandbox = sinon.createSandbox()));
  afterEach(() => sandbox.restore());

  describe('UrlSigner', () => {
    let authClient: AuthClient;
    let bucket: BucketI;
    let file: FileI;

    const NOW = new Date('2019-03-18T00:00:00Z');
    let fakeTimers: sinon.SinonFakeTimers;

    beforeEach(() => (fakeTimers = sinon.useFakeTimers(NOW)));
    afterEach(() => fakeTimers.restore());

    beforeEach(() => {
      authClient = {
        sign: async (_blobToSign: string) => 'signature',
        getCredentials: async () => ({client_email: CLIENT_EMAIL}),
      };
      bucket = {name: BUCKET_NAME};
      file = {name: FILE_NAME};
    });

    it('should construct a UrlSigner', () => {
      const signer = new UrlSigner(authClient, bucket, file);
      assert.strictEqual(signer['authClient'], authClient);
      assert.strictEqual(signer['bucket'], bucket);
      assert.strictEqual(signer['file'], file);
    });

    describe('getSignedUrl', () => {
      let signer: UrlSigner;
      let CONFIG: SignerGetSignedUrlConfig;
      beforeEach(() => {
        signer = new UrlSigner(authClient, bucket, file);

        CONFIG = {
          method: 'GET',
          expires: new Date().valueOf() + 2000,
        };
      });

      it('should default to v2 if version is not given', async () => {
        const v2 = sandbox
          // tslint:disable-next-line no-any
          .stub<any, any>(signer, 'getSignedUrlV2')
          .resolves({});

        await signer.getSignedUrl(CONFIG);
        assert(v2.calledOnce);
      });

      it('should error for an invalid version', () => {
        const config = Object.assign({}, CONFIG, {version: 'v42'});

        assert.throws(
          () => signer.getSignedUrl(config),
          /Invalid signed URL version: v42\. Supported versions are 'v2' and 'v4'\./
        );
      });

      describe('v4 signed URL', () => {
        beforeEach(() => (CONFIG.version = 'v4'));

        it('should create a v4 signed url when specified', async () => {
          const SCOPE = '20190318/auto/storage/goog4_request';
          const CREDENTIAL = `${CLIENT_EMAIL}/${SCOPE}`;
          const EXPECTED_QUERY_PARAM = [
            'X-Goog-Algorithm=GOOG4-RSA-SHA256',
            `X-Goog-Credential=${encodeURIComponent(CREDENTIAL)}`,
            'X-Goog-Date=20190318T000000Z',
            'X-Goog-Expires=2',
            'X-Goog-SignedHeaders=host',
          ].join('&');

          const EXPECTED_CANONICAL_HEADERS = 'host:storage.googleapis.com\n';
          const EXPECTED_SIGNED_HEADERS = 'host';

          const CANONICAL_REQUEST = [
            'GET',
            `/${bucket.name}/${encodeURIComponent(file.name)}`,
            EXPECTED_QUERY_PARAM,
            EXPECTED_CANONICAL_HEADERS,
            EXPECTED_SIGNED_HEADERS,
            'UNSIGNED-PAYLOAD',
          ].join('\n');

          const EXPECTED_PAYLOAD = [
            'GOOG4-RSA-SHA256',
            '20190318T000000Z',
            SCOPE,
            crypto
              .createHash('sha256')
              .update(CANONICAL_REQUEST)
              .digest('hex'),
          ].join('\n');

          const signSpy = sandbox.spy(authClient, 'sign');

          const config = Object.assign({}, CONFIG, {
            expires: NOW.valueOf() + 2000,
          });

          const signedUrl = await signer.getSignedUrl(config);
          assert.strictEqual(typeof signedUrl, 'string');
          assert.strictEqual(signSpy.getCall(0).args[0], EXPECTED_PAYLOAD);
        });

        it('should fail for expirations beyond 7 days', () => {
          const config = Object.assign({}, CONFIG, {
            expires: NOW.valueOf() + 7.1 * 24 * 60 * 60 * 1000,
          });
          assert.throws(() => {
            signer.getSignedUrl(config);
          }, /Max allowed expiration is seven days/);
        });

        it('should URI encode file names', async () => {
          file.name = 'directory/file.jpg';
          const signedUrl = await signer.getSignedUrl(CONFIG);
          assert(signedUrl.includes(file.name));
        });

        it('should add Content-MD5 and Content-Type headers if given', async () => {
          const config = {
            method: 'PUT' as 'PUT',
            version: 'v4' as 'v4',
            expires: NOW.valueOf() + 2000,
            contentMd5: 'bf2342851dfc2edd281a6b079d806cbe',
            contentType: 'image/png',
          };

          const signedUrl = await signer.getSignedUrl(config);
          assert(signedUrl.includes('content-md5'));
          assert(signedUrl.includes('content-type'));
        });

        it('should return a SigningError if signBlob errors', async () => {
          const error = new Error('Error.');
          sandbox.stub(authClient, 'sign').rejects(error);

          await assert.rejects(() => signer.getSignedUrl(CONFIG), {
            name: 'SigningError',
            message: error.message,
          });
        });
      });

      describe('v2 signed URL', () => {
        beforeEach(() => (CONFIG.version = 'v2'));

        it('should create a v2 signed url when specified', async () => {
          const signStub = sandbox
            .stub(authClient, 'sign')
            .resolves('signature');

          const EXPECTED_BLOB_TO_SIGN = [
            'GET',
            '',
            '',
            Math.round(Number(CONFIG.expires) / 1000),
            `/${bucket.name}/${encodeURIComponent(file.name)}`,
          ].join('\n');

          const signedUrl = await signer.getSignedUrl(CONFIG);

          assert.strictEqual(typeof signedUrl, 'string');
          const expires = Math.round(Number(CONFIG.expires) / 1000);
          const expected =
            'https://storage.googleapis.com/bucket-name/file-name.png?' +
            'GoogleAccessId=client-email&Expires=' +
            expires +
            '&Signature=signature';
          assert.strictEqual(signedUrl, expected);
          assert.deepStrictEqual(
            signStub.getCall(0).args[0],
            EXPECTED_BLOB_TO_SIGN
          );
        });

        it('should not modify the configuration object', async () => {
          const originalConfig = Object.assign({}, CONFIG);

          await signer.getSignedUrl(CONFIG);
          assert.deepStrictEqual(CONFIG, originalConfig);
        });

        it('should return an error if signBlob errors', async () => {
          const error = new Error('Error.');

          sandbox.stub(authClient, 'sign').rejects(error);

          await assert.rejects(() => signer.getSignedUrl(CONFIG), {
            name: 'SigningError',
            message: error.message,
          });
        });

        it('should URI encode file names', async () => {
          file.name = 'directory/name.png';
          const signedUrl = await signer.getSignedUrl(CONFIG);
          assert(signedUrl.includes(file.name));
        });

        it('should URI encode file name with special characters', async () => {
          file.name = "special/azAZ!*'()*%/file.jpg";
          const signedUrl = await signer.getSignedUrl(CONFIG);
          assert(
            signedUrl.includes('special/azAZ%21%2A%27%28%29%2A%25/file.jpg')
          );
        });
      });

      describe('cname', () => {
        it('should use a provided cname', async () => {
          const host = 'http://www.example.com';
          const configWithCname = Object.assign({cname: host}, CONFIG);

          const signedUrl = await signer.getSignedUrl(configWithCname);
          const expires = Math.round(Number(CONFIG.expires) / 1000);
          const expected =
            'http://www.example.com/file-name.png?' +
            'GoogleAccessId=client-email&Expires=' +
            expires +
            '&Signature=signature';

          assert.strictEqual(signedUrl, expected);
        });

        it('should remove trailing slashes from cname', async () => {
          const host = 'http://www.example.com//';
          CONFIG.cname = host;

          const signedUrl = await signer.getSignedUrl(CONFIG);
          assert.strictEqual(signedUrl.indexOf(host), -1);
          assert.strictEqual(signedUrl.indexOf(host.substr(0, -1)), 0);
        });

        it('should generate v4 signed url with provided cname', async () => {
          const host = 'http://www.example.com';
          CONFIG.cname = host;
          CONFIG.version = 'v4';

          const signedUrl = await signer.getSignedUrl(CONFIG);
          const expected =
            'http://www.example.com/file-name.png?' +
            'X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=client-email' +
            '%2F20190318%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20190318T000000Z&' +
            'X-Goog-Expires=2&X-Goog-SignedHeaders=host&X-Goog-Signature=b228276adbab';
          assert.strictEqual(signedUrl, expected);
        });

        it('should generate bucket signed url without filename', async () => {
          const host = 'http://www.example.com';
          CONFIG.cname = host;
          CONFIG.version = 'v4';

          const signedUrl = await signer.getSignedUrl(CONFIG);
          const expected = new RegExp(`${host}/?`);
          assert(signedUrl.match(expected));
        });
      });

      describe('expires', () => {
        it('should accept Date objects', async () => {
          const expires = new Date(Date.now() + 1000 * 60);
          const expectedExpires = Math.round(expires.valueOf() / 1000);

          CONFIG.expires = expires;

          const signedUrl = await signer.getSignedUrl(CONFIG);
          const expires_ = url.parse(signedUrl, true).query.Expires;
          assert.strictEqual(expires_, expectedExpires.toString());
        });

        it('should accept numbers', async () => {
          const expires = Date.now() + 1000 * 60;
          const expectedExpires = Math.round(
            new Date(expires).valueOf() / 1000
          );

          CONFIG.expires = expires;

          const signedUrl = await signer.getSignedUrl(CONFIG);
          const expires_ = url.parse(signedUrl, true).query.Expires;
          assert.strictEqual(expires_, expectedExpires.toString());
        });

        it('should accept strings', async () => {
          const expires = '12-12-2099';
          const expectedExpires = Math.round(
            new Date(expires).valueOf() / 1000
          );

          CONFIG.expires = expires;

          const signedUrl = await signer.getSignedUrl(CONFIG);
          const expires_ = url.parse(signedUrl, true).query.Expires;
          assert.strictEqual(expires_, expectedExpires.toString());
        });

        it('should throw if a date is invalid', () => {
          const expires = new Date('31-12-2019');

          CONFIG.expires = expires;

          assert.throws(() => {
            signer.getSignedUrl(CONFIG);
          }, /The expiration date provided was invalid\./);
        });

        it('should throw if a date from the past is given', () => {
          const expires = Date.now() - 5;
          CONFIG.expires = expires;

          assert.throws(() => {
            signer.getSignedUrl(CONFIG);
          }, /An expiration date cannot be in the past\./);
        });
      });

      describe('extensionHeaders', () => {
        it('should add headers to signature', async () => {
          const extensionHeaders = {
            'x-goog-acl': 'public-read',
            'x-foo': 'bar',
          };

          CONFIG.extensionHeaders = extensionHeaders;

          const signStub = sinon.stub(authClient, 'sign').resolves('signature');

          await signer.getSignedUrl(CONFIG);
          // headers should be sorted.
          const headers = 'x-foo:bar\nx-goog-acl:public-read\n';
          const blobToSign = signStub.getCall(0).args[0];
          assert(blobToSign.indexOf(headers) > -1);
        });
      });

      describe('queryParams', () => {
        it('should make its way to the signed url', async () => {
          const queryParams = {
            'response-content-type': 'application/json',
          };

          CONFIG.queryParams = queryParams;
          const signedUrl = await signer.getSignedUrl(CONFIG);
          // headers should be sorted.
          const qs = 'response-content-type=application%2Fjson';

          assert(signedUrl.match(new RegExp(qs)));
        });
      });

      describe('bucket operations', () => {
        beforeEach(() => {
          signer = new UrlSigner(authClient, bucket);
        });

        it('should construct a UrlSigner without a file', () => {
          assert.strictEqual(signer['file'], undefined);
        });

        it('should generate signed URL with correct path', async () => {
          const signedUrl = await signer.getSignedUrl(CONFIG);
          assert(
            signedUrl.match(new RegExp(`${PATH_STYLED_HOST}/${BUCKET_NAME}\?`))
          );
        });
      });
    });
  });

  describe('SigningError', () => {
    it('should extend from Error', () => {
      const err = new SigningError();
      assert(err instanceof Error);
      assert.strictEqual(err.name, 'SigningError');
    });
  });
});

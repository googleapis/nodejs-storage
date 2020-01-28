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

import * as crypto from 'crypto';
import * as dateFormat from 'date-and-time';
import * as http from 'http';
import * as url from 'url';
import {encodeURI, qsStringify, objectEntries} from './util';
import {promisifyAll} from '@google-cloud/promisify';

interface GetCredentialsResponse {
  client_email?: string;
}

export interface AuthClient {
  sign(blobToSign: string): Promise<string>;
  getCredentials(): Promise<GetCredentialsResponse>;
}

export interface BucketI {
  name: string;
}

export interface FileI {
  name: string;
  generation?: number;
}

interface GetSignedUrlConfigInternal {
  expiration: number;
  method: string;
  name: string;
  resource?: string;
  extensionHeaders?: http.OutgoingHttpHeaders;
  contentMd5?: string;
  contentType?: string;
  promptSaveAs?: string;
  responseType?: string;
  responseDisposition?: string;
  cname?: string;
}

interface SignedUrlQuery {
  generation?: number;
  'response-content-type'?: string;
  'response-content-disposition'?: string;
}

interface V2SignedUrlQuery extends SignedUrlQuery {
  GoogleAccessId: string;
  Expires: number;
  Signature: string;
}

interface V4SignedUrlQuery extends V4UrlQuery {
  'X-Goog-Signature': string;
}

interface V4UrlQuery extends SignedUrlQuery {
  'X-Goog-Algorithm': string;
  'X-Goog-Credential': string;
  'X-Goog-Date': string;
  'X-Goog-Expires': number;
  'X-Goog-SignedHeaders': string;
}

export enum ActionToHTTPMethod {
  read = 'GET',
  write = 'PUT',
  delete = 'DELETE',
  resumable = 'POST',
}

export interface GetSignedUrlConfig {
  action: 'read' | 'write' | 'delete' | 'resumable';
  version?: 'v2' | 'v4';
  cname?: string;
  contentMd5?: string;
  contentType?: string;
  expires: string | number | Date;
  extensionHeaders?: http.OutgoingHttpHeaders;
  promptSaveAs?: string;
  responseDisposition?: string;
  responseType?: string;
}

export type GetSignedUrlResponse = [string];

export interface GetSignedUrlCallback {
  (err: Error | null, url?: string): void;
}
type ValueOf<T> = T[keyof T];
type HeaderValue = ValueOf<http.OutgoingHttpHeaders>;

/*
 * Default signing version for getSignedUrl is 'v2'.
 */
const DEFAULT_SIGNING_VERSION = 'v2';

const SEVEN_DAYS = 604800;

/**
 * @const {string}
 * @private
 */
const PATH_STYLED_HOST = 'https://storage.googleapis.com';

export class UrlSigner {
  private authClient: AuthClient;
  private bucket: BucketI;
  private file: FileI;

  constructor(authClient: AuthClient, bucket: BucketI, file: FileI) {
    this.bucket = bucket;
    this.file = file;
    this.authClient = authClient;
  }

  getSignedUrl(cfg: GetSignedUrlConfig): Promise<GetSignedUrlResponse>;
  getSignedUrl(cfg: GetSignedUrlConfig, callback: GetSignedUrlCallback): void;
  getSignedUrl(
    cfg: GetSignedUrlConfig,
    callback?: GetSignedUrlCallback
  ): void | Promise<GetSignedUrlResponse> {
    const expiresInMSeconds = new Date(cfg.expires).valueOf();

    if (isNaN(expiresInMSeconds)) {
      throw new Error('The expiration date provided was invalid.');
    }

    if (expiresInMSeconds < Date.now()) {
      throw new Error('An expiration date cannot be in the past.');
    }

    const expiresInSeconds = Math.round(expiresInMSeconds / 1000); // The API expects seconds.

    const method = ActionToHTTPMethod[cfg.action];

    if (!method) {
      throw new Error('The action is not provided or invalid.');
    }

    const name = encodeURI(this.file.name, false);
    const resource = `/${this.bucket.name}/${name}`;

    const version = cfg.version || DEFAULT_SIGNING_VERSION;

    const config: GetSignedUrlConfigInternal = Object.assign({}, cfg, {
      method,
      expiration: expiresInSeconds,
      resource,
      name,
    });

    let promise: Promise<SignedUrlQuery>;
    if (version === 'v2') {
      promise = this.getSignedUrlV2(config);
    } else if (version === 'v4') {
      promise = this.getSignedUrlV4(config);
    } else {
      throw new Error(
        `Invalid signed URL version: ${version}. Supported versions are 'v2' and 'v4'.`
      );
    }

    promise.then(query => {
      if (typeof config.responseType === 'string') {
        query['response-content-type'] = config.responseType!;
      }

      if (typeof config.promptSaveAs === 'string') {
        query['response-content-disposition'] =
          'attachment; filename="' + config.promptSaveAs + '"';
      }
      if (typeof config.responseDisposition === 'string') {
        query['response-content-disposition'] = config.responseDisposition!;
      }

      if (this.file.generation) {
        query.generation = this.file.generation;
      }

      const signedUrl = new url.URL(config.cname || PATH_STYLED_HOST);
      signedUrl.pathname = config.cname ? name : `${this.bucket.name}/${name}`;
      // tslint:disable-next-line:no-any
      signedUrl.search = qsStringify(query as any);

      callback!(null, signedUrl.href);
    }, callback!);
  }

  private getSignedUrlV2(
    config: GetSignedUrlConfigInternal
  ): Promise<SignedUrlQuery> {
    let extensionHeadersString = '';

    if (config.method === 'POST') {
      config.extensionHeaders = Object.assign({}, config.extensionHeaders, {
        'x-goog-resumable': 'start',
      });
    }

    if (config.extensionHeaders) {
      for (const headerName of Object.keys(config.extensionHeaders)) {
        extensionHeadersString += `${headerName}:${config.extensionHeaders[headerName]}\n`;
      }
    }

    const blobToSign = [
      config.method,
      config.contentMd5 || '',
      config.contentType || '',
      config.expiration,
      extensionHeadersString + config.resource,
    ].join('\n');

    const authClient = this.authClient;
    return authClient
      .sign(blobToSign)
      .then(signature =>
        authClient.getCredentials().then(
          credentials =>
            ({
              GoogleAccessId: credentials.client_email!,
              Expires: config.expiration,
              Signature: signature,
            } as V2SignedUrlQuery)
        )
      )
      .catch(err => {
        const signingErr = new SigningError(err.message);
        signingErr.stack = err.stack;
        throw signingErr;
      });
  }

  private getSignedUrlV4(
    config: GetSignedUrlConfigInternal
  ): Promise<SignedUrlQuery> {
    const now = new Date();
    const nowInSeconds = Math.floor(now.valueOf() / 1000);
    const expiresPeriodInSeconds = config.expiration - nowInSeconds;

    // v4 limit expiration to be 7 days maximum
    if (expiresPeriodInSeconds > SEVEN_DAYS) {
      throw new Error(
        `Max allowed expiration is seven days (${SEVEN_DAYS} seconds).`
      );
    }

    const extensionHeaders = Object.assign({}, config.extensionHeaders);
    const fqdn = new url.URL(config.cname || PATH_STYLED_HOST);
    extensionHeaders.host = fqdn.host;
    if (config.method === 'POST') {
      extensionHeaders['x-goog-resumable'] = 'start';
    }
    if (config.contentMd5) {
      extensionHeaders['content-md5'] = config.contentMd5;
    }
    if (config.contentType) {
      extensionHeaders['content-type'] = config.contentType;
    }

    const signedHeaders = Object.keys(extensionHeaders)
      .map(header => header.toLowerCase())
      .sort()
      .join(';');

    const extensionHeadersString = this.getCanonicalHeaders(extensionHeaders);

    const datestamp = dateFormat.format(now, 'YYYYMMDD', true);
    const credentialScope = `${datestamp}/auto/storage/goog4_request`;

    return this.authClient.getCredentials().then(credentials => {
      const credential = `${credentials.client_email}/${credentialScope}`;
      const dateISO = dateFormat.format(now, 'YYYYMMDD[T]HHmmss[Z]', true);

      const queryParams: V4UrlQuery = {
        'X-Goog-Algorithm': 'GOOG4-RSA-SHA256',
        'X-Goog-Credential': credential,
        'X-Goog-Date': dateISO,
        'X-Goog-Expires': expiresPeriodInSeconds,
        'X-Goog-SignedHeaders': signedHeaders,
      };

      // tslint:disable-next-line:no-any
      const canonicalQueryParams = qsStringify(queryParams as any);

      const canonicalRequest = [
        config.method,
        config.cname ? `/${config.name}` : config.resource,
        canonicalQueryParams,
        extensionHeadersString,
        signedHeaders,
        'UNSIGNED-PAYLOAD',
      ].join('\n');

      const canonicalRequestHash = crypto
        .createHash('sha256')
        .update(canonicalRequest)
        .digest('hex');

      const blobToSign = [
        'GOOG4-RSA-SHA256',
        dateISO,
        credentialScope,
        canonicalRequestHash,
      ].join('\n');

      return this.authClient
        .sign(blobToSign)
        .then(signature => {
          const signatureHex = Buffer.from(signature, 'base64').toString('hex');

          const signedQuery: V4SignedUrlQuery = Object.assign({}, queryParams, {
            'X-Goog-Signature': signatureHex,
          });

          return signedQuery;
        })
        .catch(err => {
          const signingErr = new SigningError(err.message);
          signingErr.stack = err.stack;
          throw signingErr;
        });
    });
  }

  /**
   * Create canonical headers for signing v4 url.
   *
   * The canonical headers for v4-signing a request demands header names are
   * first lowercased, followed by sorting the header names.
   * Then, construct the canonical headers part of the request:
   *  <lowercasedHeaderName> + ":" + Trim(<value>) + "\n"
   *  ..
   *  <lowercasedHeaderName> + ":" + Trim(<value>) + "\n"
   *
   * @param headers
   * @private
   */
  getCanonicalHeaders(headers: http.OutgoingHttpHeaders) {
    // Sort headers by their lowercased names
    const sortedHeaders = objectEntries(headers)
      // Convert header names to lowercase
      .map<[string, HeaderValue]>(([headerName, value]) => [
        headerName.toLowerCase(),
        value,
      ])
      .sort((a, b) => a[0].localeCompare(b[0]));

    return sortedHeaders
      .filter(([_, value]) => value !== undefined)
      .map(([headerName, value]) => {
        // - Convert Array (multi-valued header) into string, delimited by
        //      ',' (no space).
        // - Trim leading and trailing spaces.
        // - Convert sequential (2+) spaces into a single space
        const canonicalValue = `${value}`.trim().replace(/\s{2,}/g, ' ');

        return `${headerName}:${canonicalValue}\n`;
      })
      .join('');
  }
}

promisifyAll(UrlSigner, {
  exclude: ['getSignedUrlV2', 'getSignedUrlV4', 'getCanonicalHeaders'],
});

/**
 * Custom error type for errors related to getting signed errors and policies.
 *
 * @private
 */
export class SigningError extends Error {
  name = 'SigningError';
}

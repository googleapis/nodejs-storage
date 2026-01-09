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

import {
  Gaxios,
  GaxiosError,
  GaxiosInterceptor,
  GaxiosOptions,
  GaxiosOptionsPrepared,
  GaxiosResponse,
} from 'gaxios';
import {AuthClient, GoogleAuth, GoogleAuthOptions} from 'google-auth-library';
import {
  getModuleFormat,
  getRuntimeTrackingString,
  getUserAgentString,
} from './util';
import {randomUUID} from 'crypto';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {getPackageJSON} from './package-json-helper.cjs';
import {GCCL_GCS_CMD_KEY} from './nodejs-common/util';
import {RetryOptions} from './storage';

export interface StandardStorageQueryParams {
  alt?: 'json' | 'media';
  callback?: string;
  fields?: string;
  key?: string;
  prettyPrint?: boolean;
  quotaUser?: string;
  userProject?: string;
}

export interface StorageQueryParameters extends StandardStorageQueryParams {
  [key: string]: string | number | boolean | undefined;
}

export interface StorageRequestOptions extends GaxiosOptions {
  [GCCL_GCS_CMD_KEY]?: string;
  interceptors?: GaxiosInterceptor<GaxiosOptionsPrepared>[];
  autoPaginate?: boolean;
  autoPaginateVal?: boolean;
  maxRetries?: number;
  objectMode?: boolean;
  projectId?: string;
  queryParameters?: StorageQueryParameters;
  shouldReturnStream?: boolean;
}

interface TransportParameters extends Omit<GoogleAuthOptions, 'authClient'> {
  apiEndpoint: string;
  authClient?: GoogleAuth | AuthClient;
  baseUrl: string;
  customEndpoint?: boolean;
  email?: string;
  packageJson: PackageJson;
  retryOptions: RetryOptions;
  scopes: string | string[];
  timeout?: number;
  token?: string;
  useAuthWithCustomEndpoint?: boolean;
  userAgent?: string;
  gaxiosInstance?: Gaxios;
}

interface PackageJson {
  name: string;
  version: string;
}

export interface StorageTransportCallback<T> {
  (
    err: GaxiosError | null,
    data?: T | null,
    fullResponse?: GaxiosResponse,
  ): void;
}
let projectId: string;

export class StorageTransport {
  authClient: GoogleAuth<AuthClient>;
  private providedUserAgent?: string;
  private packageJson: PackageJson;
  private retryOptions: RetryOptions;
  private baseUrl: string;
  private timeout?: number;
  private projectId?: string;
  private useAuthWithCustomEndpoint?: boolean;
  private gaxiosInstance: Gaxios;

  constructor(options: TransportParameters) {
    this.gaxiosInstance = options.gaxiosInstance || new Gaxios();
    if (options.authClient instanceof GoogleAuth) {
      this.authClient = options.authClient;
    } else {
      this.authClient = new GoogleAuth({
        ...options,
        authClient: options.authClient,
        clientOptions: options.clientOptions,
      });
    }
    this.providedUserAgent = options.userAgent;
    this.packageJson = getPackageJSON();
    this.retryOptions = options.retryOptions;
    this.baseUrl = options.baseUrl;
    this.timeout = options.timeout;
    this.projectId = options.projectId;
    this.useAuthWithCustomEndpoint = options.useAuthWithCustomEndpoint;
  }

  async makeRequest<T>(
    reqOpts: StorageRequestOptions,
    callback?: StorageTransportCallback<T>,
  ): Promise<void | T> {
    const headers = this.#buildRequestHeaders(reqOpts.headers);
    if (reqOpts[GCCL_GCS_CMD_KEY]) {
      headers.set(
        'x-goog-api-client',
        `${headers.get('x-goog-api-client')} gccl-gcs-cmd/${reqOpts[GCCL_GCS_CMD_KEY]}`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retryId = (reqOpts.headers as any)?.['x-retry-test-id'];
    if (retryId) {
      headers.set('x-retry-test-id', retryId);
    }

    const isDelete = reqOpts.method?.toUpperCase() === 'DELETE';
    const urlString = reqOpts.url?.toString() || '';
    const isAbsolute = urlString.startsWith('http');
    const isResumable =
      urlString.includes('uploadType=resumable') ||
      urlString.includes('/upload/') ||
      reqOpts.queryParameters?.uploadType === 'resumable';

    try {
      const getProjectId = async () => {
        if (reqOpts.projectId) return reqOpts.projectId;
        projectId = await this.authClient.getProjectId();
        return projectId;
      };
      const _projectId = await getProjectId();
      if (_projectId) {
        projectId = _projectId;
        this.projectId = projectId;
      }

      const requestPromise = this.authClient.request<T>({
        retryConfig: {
          retry: this.retryOptions.maxRetries,
          noResponseRetries: this.retryOptions.maxRetries,
          maxRetryDelay: this.retryOptions.maxRetryDelay,
          retryDelayMultiplier: this.retryOptions.retryDelayMultiplier,
          totalTimeout: this.retryOptions.totalTimeout,
          shouldRetry: (err: GaxiosError) => {
            const status = err.response?.status;
            const errorCode = err.code?.toString();
            const retryableStatuses = [408, 429, 500, 502, 503, 504];
            const nonRetryableStatuses = [401, 405, 412];

            const isMalformedResponse =
              err.message?.includes('JSON') ||
              err.message?.includes('Unexpected token <') ||
              (err.stack && err.stack.includes('SyntaxError'));
            if (isMalformedResponse) return true;

            if (status && nonRetryableStatuses.includes(status)) return false;

            const params = reqOpts.queryParameters || {};
            const hasPrecondition =
              params.ifGenerationMatch !== undefined ||
              params.ifMetagenerationMatch !== undefined ||
              params.ifSourceGenerationMatch !== undefined;

            const isPost = reqOpts.method?.toUpperCase() === 'POST';
            const isPatch = reqOpts.method?.toUpperCase() === 'PATCH';
            const isPut = reqOpts.method?.toUpperCase() === 'PUT';
            const isGet = reqOpts.method?.toUpperCase() === 'GET';
            const isHead = reqOpts.method?.toUpperCase() === 'HEAD';

            const isIam = urlString.includes('/iam');
            const isAcl = urlString.includes('/acl');
            const isHmacRequest = urlString.includes('/hmacKeys');
            const isNotificationRequest = urlString.includes(
              '/notificationConfigs',
            );

            // Logic for Mutations (POST, PATCH, DELETE)
            if (isPost || isPatch || isDelete) {
              const isRetryTest = urlString.includes('retry-test-id');
              if (isPost && isAcl) {
                if (isRetryTest) {
                  return status ? retryableStatuses.includes(status) : false;
                }
                return false;
              }
              if (isPost && (isHmacRequest || isNotificationRequest))
                return false;

              const isBucketCreate =
                isPost &&
                urlString.includes('/v1/b') &&
                !urlString.includes('/o');
              const isSafeDelete = isDelete && !urlString.includes('/o/');

              if (!hasPrecondition) {
                if (!isBucketCreate && !isSafeDelete) {
                  if (urlString.includes('uploadType=resumable') && isPost) {
                    return !!status && retryableStatuses.includes(status);
                  }
                  return false;
                }
              }

              if (status === undefined) {
                const isResumable = urlString.includes('uploadType=resumable');

                if (isResumable) return false;
                return hasPrecondition || isBucketCreate || isSafeDelete;
              }

              return retryableStatuses.includes(status);
            }

            if (isPut) {
              const url = err.config?.url.toString() || '';
              if (isHmacRequest) {
                try {
                  const body =
                    typeof reqOpts.body === 'string'
                      ? JSON.parse(reqOpts.body)
                      : reqOpts.body;

                  if (!body || !body.etag) {
                    return false;
                  }
                } catch (e) {
                  return false;
                }
              } else if (isIam) {
                try {
                  let hasIamPrecondition = false;
                  const bodyStr =
                    typeof reqOpts.body === 'string'
                      ? reqOpts.body
                      : reqOpts.body instanceof Buffer
                        ? reqOpts.body.toString()
                        : '';
                  hasIamPrecondition = !!JSON.parse(bodyStr || '{}').etag;
                  if (!hasIamPrecondition) {
                    return false;
                  }
                  return status === undefined || status === 503;
                } catch (e) {
                  return false;
                }
              } else if (url.includes('upload_id=')) {
                if (!status || retryableStatuses.includes(status)) {
                  return true;
                }
                return false;
              }
            }

            // Logic for Idempotent Methods (GET, PUT, HEAD)
            const isIdempotentMethod = isGet || isHead || isPut;
            if (isIdempotentMethod) {
              if (status === undefined) {
                return true;
              }
              return retryableStatuses.includes(status);
            }

            if (
              isDelete &&
              !hasPrecondition &&
              !isNotificationRequest &&
              !isHmacRequest
            )
              return false;

            const transientNetworkErrors = [
              'ECONNRESET',
              'ETIMEDOUT',
              'EADDRINUSE',
              'ECONNREFUSED',
              'EPIPE',
              'ENOTFOUND',
              'ENETUNREACH',
            ];
            if (errorCode && transientNetworkErrors.includes(errorCode))
              return true;

            const data = err.response?.data;
            if (data && data.error && Array.isArray(data.error.errors)) {
              for (const e of data.error.errors) {
                const reason = e.reason;
                if (
                  reason === 'rateLimitExceeded' ||
                  reason === 'userRateLimitExceeded' ||
                  (reason && reason.includes('EAI_AGAIN'))
                ) {
                  return true;
                }
              }
            }
            if (!status) return true;
            return status ? retryableStatuses.includes(status) : false;
          },
        },
        params: isAbsolute ? undefined : reqOpts.queryParameters,
        ...reqOpts,
        headers,
        url: isAbsolute
          ? urlString
          : this.#buildUrl(urlString, reqOpts.queryParameters),
        timeout: this.timeout,
        validateStatus: status =>
          (status >= 200 && status < 300) || (isResumable && status === 308),
        responseType:
          isResumable || isDelete || reqOpts.responseType === 'text'
            ? 'text'
            : reqOpts.responseType === 'stream'
              ? 'stream'
              : 'json',
      });
      const finalPromise = requestPromise
        .then(resp => {
          let data = resp.data;

          if (
            data === undefined ||
            data === null ||
            (typeof data === 'string' && data.trim() === '')
          ) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data = {} as any;
          }

          if (data && typeof data === 'object') {
            const plainHeaders: Record<string, string> = {};

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (
              resp.headers &&
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              typeof (resp.headers as any).forEach === 'function'
            ) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (resp.headers as any).forEach((value: string, key: string) => {
                plainHeaders[key.toLowerCase()] = value;
              });
            } else if (resp.headers) {
              // If headers is a plain object, normalize keys to lowercase
              for (const key of Object.keys(resp.headers)) {
                plainHeaders[key.toLowerCase()] = (
                  resp.headers as unknown as Record<string, string>
                )[key];
              }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (data as any).headers = plainHeaders;
          }

          if (isDelete && (data === '' || data === undefined)) {
            data = {} as T;
          }
          if (callback) {
            callback(null, data, resp);
          }
          return data;
        })
        .catch(error => {
          const isMalformedResponse =
            error.message?.includes('JSON') ||
            (error.cause &&
              (error.cause as Error).message?.includes('Unexpected token <')) ||
            (error.stack && error.stack.includes('SyntaxError'));
          if (isMalformedResponse) {
            error.message = `Server returned non-JSON response: ${error.response?.status || 'unknown'} - ${error.message}`;
          } else if (error.message?.includes('JSON')) {
            error.message = `Server returned non-JSON response: ${error.response?.status}`;
          }
          if (callback) {
            callback(error, null, error.response);
          }
          throw error;
        });
      return finalPromise;
    } catch (e) {
      if (callback) return callback(e as GaxiosError);
      throw e;
    }
  }

  #buildUrl(pathUri = '', queryParameters: StorageQueryParameters = {}): URL {
    if (
      'project' in queryParameters &&
      (queryParameters.project !== this.projectId ||
        queryParameters.project !== projectId)
    ) {
      queryParameters.project = this.projectId;
    }
    const qp = this.#buildRequestQueryParams(queryParameters);
    let url: URL;
    if (this.#isValidUrl(pathUri)) {
      url = new URL(pathUri);
    } else {
      url = new URL(`${this.baseUrl}${pathUri}`);
    }
    url.search = qp;

    return url;
  }

  #isValidUrl(url: string): boolean {
    try {
      return Boolean(new URL(url));
    } catch {
      return false;
    }
  }

  #buildRequestHeaders(requestHeaders = {}) {
    const headers = new Headers(requestHeaders);

    headers.set('User-Agent', this.#getUserAgentString());
    headers.set(
      'x-goog-api-client',
      `${getRuntimeTrackingString()} gccl/${this.packageJson.version}-${getModuleFormat()} gccl-invocation-id/${randomUUID()}`,
    );

    return headers;
  }

  #buildRequestQueryParams(queryParameters: StorageQueryParameters): string {
    const qp = new URLSearchParams(
      queryParameters as unknown as Record<string, string>,
    );

    return qp.toString();
  }

  #getUserAgentString(): string {
    let userAgent = getUserAgentString();
    if (this.providedUserAgent) {
      userAgent = `${this.providedUserAgent} ${userAgent}`;
    }

    return userAgent;
  }
}

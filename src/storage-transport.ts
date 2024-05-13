import {GaxiosError, GaxiosOptions, Headers} from 'gaxios';
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
  //interceptors_?: Interceptor[];
  autoPaginate?: boolean;
  autoPaginateVal?: boolean;
  maxRetries?: number;
  objectMode?: boolean;
  projectId?: string;
  queryParameters?: StorageQueryParameters;
  shouldReturnStream?: boolean;
}

export interface StorageCallback<T> {
  (err: GaxiosError<T> | null, data?: T): void;
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
}

interface PackageJson {
  name: string;
  version: string;
}

export class StorageTransport {
  authClient: GoogleAuth<AuthClient>;
  private providedUserAgent?: string;
  private packageJson: PackageJson;
  private retryOptions: RetryOptions;
  private baseUrl: string;
  private timeout?: number;

  constructor(options: TransportParameters) {
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
  }

  makeRequest<T>(
    reqOpts: StorageRequestOptions,
    callback?: StorageCallback<T>
  ): Promise<T> | Promise<void> {
    const headers = this.#buildRequestHeaders(reqOpts.headers);
    if (reqOpts[GCCL_GCS_CMD_KEY]) {
      headers['x-goog-api-client'] +=
        ` gccl-gcs-cmd/${reqOpts[GCCL_GCS_CMD_KEY]}`;
    }
    const requestPromise = this.authClient.request<T>({
      //TODO: Retry Options
      ...reqOpts,
      headers,
      url: this.#buildUrl(reqOpts.url?.toString(), reqOpts.queryParameters),
      timeout: this.timeout,
    });

    return callback
      ? requestPromise.then(resp => callback(null, resp.data)).catch(callback)
      : (requestPromise.then(resp => resp.data) as Promise<T>);
  }

  #buildUrl(pathUri = '', queryParameters: StorageQueryParameters = {}): URL {
    const qp = this.#buildRequestQueryParams(queryParameters);
    const url = new URL(`${this.baseUrl}${pathUri}`);
    url.search = qp;

    return url;
  }

  #buildRequestHeaders(requestHeaders: Headers = {}) {
    const headers = {
      ...requestHeaders,
      'User-Agent': this.#getUserAgentString(),
      'x-goog-api-client': `${getRuntimeTrackingString()} gccl/${
        this.packageJson.version
      }-${getModuleFormat()} gccl-invocation-id/${randomUUID()}`,
    };

    return headers;
  }

  #buildRequestQueryParams(queryParameters: StorageQueryParameters): string {
    const qp = new URLSearchParams(
      queryParameters as unknown as Record<string, string>
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

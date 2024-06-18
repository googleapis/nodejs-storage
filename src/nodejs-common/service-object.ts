/*!
 * Copyright 2022 Google LLC. All Rights Reserved.
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
import {EventEmitter} from 'events';
import {util} from './util.js';
import {
  StorageCallback,
  StorageRequestOptions,
  StorageTransport,
} from '../storage-transport.js';
import {GaxiosError} from 'gaxios';

export type GetMetadataOptions = object;
export type ExistsOptions = object;

export interface ServiceObjectParent {
  baseUrl?: string;
  name?: string;
}
export interface ServiceObjectConfig {
  /**
   * The base URL to make API requests to.
   */
  baseUrl?: string;

  /**
   * The method which creates this object.
   */
  createMethod?: Function;

  /**
   * The identifier of the object. For example, the name of a Storage bucket or
   * Pub/Sub topic.
   */
  id?: string;

  /**
   * A map of each method name that should be inherited.
   */
  methods?: Methods;

  /**
   * The parent service instance. For example, an instance of Storage if the
   * object is Bucket.
   */
  parent: ServiceObjectParent;

  /**
   * Override of projectId, used to allow access to resources in another project.
   * For example, a BigQuery dataset in another project to which the user has been
   * granted permission.
   */
  projectId?: string;

  /**
   * The storage transport instance with which to make requests.
   */
  storageTransport: StorageTransport;
}

export interface Methods {
  [methodName: string]: {reqOpts?: StorageRequestOptions} | boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CreateOptions {}
export type DeleteOptions = {
  ignoreNotFound?: boolean;
  ifGenerationMatch?: number | string;
  ifGenerationNotMatch?: number | string;
  ifMetagenerationMatch?: number | string;
  ifMetagenerationNotMatch?: number | string;
} & object;

export interface GetConfig {
  /**
   * Create the object if it doesn't already exist.
   */
  autoCreate?: boolean;
}
export type GetOrCreateOptions = GetConfig & CreateOptions;
export type SetMetadataOptions = object;

export interface BaseMetadata {
  id?: string;
  kind?: string;
  etag?: string;
  selfLink?: string;
  [key: string]: unknown;
}

/**
 * ServiceObject is a base class, meant to be inherited from by a "service
 * object," like a BigQuery dataset or Storage bucket.
 *
 * Most of the time, these objects share common functionality; they can be
 * created or deleted, and you can get or set their metadata.
 *
 * By inheriting from this class, a service object will be extended with these
 * shared behaviors. Note that any method can be overridden when the service
 * object requires specific behavior.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class ServiceObject<T, K extends BaseMetadata> extends EventEmitter {
  metadata: K;
  baseUrl?: string;
  storageTransport: StorageTransport;
  parent: ServiceObjectParent;
  id?: string;
  name?: string;
  private createMethod?: Function;
  protected methods: Methods;
  //TODO: Fill in with GaxiosInterceptors
  //interceptors: Interceptor[];
  projectId?: string;

  /*
   * @constructor
   * @alias module:common/service-object
   *
   * @private
   *
   * @param {object} config - Configuration object.
   * @param {string} config.baseUrl - The base URL to make API requests to.
   * @param {string} config.createMethod - The method which creates this object.
   * @param {string=} config.id - The identifier of the object. For example, the
   *     name of a Storage bucket or Pub/Sub topic.
   * @param {object=} config.methods - A map of each method name that should be inherited.
   * @param {object} config.methods[].reqOpts - Default request options for this
   *     particular method. A common use case is when `setMetadata` requires a
   *     `PUT` method to override the default `PATCH`.
   * @param {object} config.parent - The parent service instance. For example, an
   *     instance of Storage if the object is Bucket.
   */
  constructor(config: ServiceObjectConfig) {
    super();
    this.metadata = {} as K;
    this.baseUrl = config.baseUrl;
    this.parent = config.parent; // Parent class.
    this.id = config.id; // Name or ID (e.g. dataset ID, bucket name, etc).
    this.createMethod = config.createMethod;
    this.methods = config.methods || {};
    //this.interceptors = [];
    this.projectId = config.projectId;
    this.storageTransport = config.storageTransport;

    if (config.methods) {
      // This filters the ServiceObject instance (e.g. a "File") to only have
      // the configured methods. We make a couple of exceptions for core-
      // functionality ("request()" and "getRequestInterceptors()")
      Object.getOwnPropertyNames(ServiceObject.prototype)
        .filter(methodName => {
          return (
            // All ServiceObjects need `request` and `getRequestInterceptors`.
            // clang-format off
            !/^request/.test(methodName) &&
            !/^getRequestInterceptors/.test(methodName) &&
            // clang-format on
            // The ServiceObject didn't redefine the method.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this as any)[methodName] ===
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (ServiceObject.prototype as any)[methodName] &&
            // This method isn't wanted.
            !config.methods![methodName]
          );
        })
        .forEach(methodName => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (this as any)[methodName] = undefined;
        });
    }
  }

  /**
   * Create the object.
   *
   * @param {object=} options - Configuration object.
   * @param {function} callback - The callback function.
   * @param {?error} callback.err - An error returned while making this request.
   * @param {object} callback.instance - The instance.
   * @param {object} callback.apiResponse - The full API response.
   */
  create(options?: CreateOptions): Promise<T>;
  create(options: CreateOptions, callback: StorageCallback<T>): void;
  create(callback: StorageCallback<T>): void;
  create(
    optionsOrCallback?: CreateOptions | StorageCallback<T>,
    callback?: StorageCallback<T>
  ): void | Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const args = [this.id] as Array<{}>;

    if (typeof optionsOrCallback === 'function') {
      callback = optionsOrCallback as StorageCallback<T>;
    }

    if (typeof optionsOrCallback === 'object') {
      args.push(optionsOrCallback);
    }

    // Wrap the callback to return *this* instance of the object, not the
    // newly-created one.
    // tslint: disable-next-line no-any
    function onCreate(...args: [GaxiosError, ServiceObject<T, K>]) {
      const [err, instance] = args;
      if (!err) {
        self.metadata = instance.metadata;
        if (self.id && instance.metadata) {
          self.id = instance.metadata.id;
        }
        args[1] = self; // replace the created `instance` with this one.
      }
      callback!(...(args as {} as [GaxiosError, T]));
    }
    args.push(onCreate);
    // eslint-disable-next-line prefer-spread
    this.createMethod!.apply(null, args);
  }

  /**
   * Delete the object.
   *
   * @param {function=} callback - The callback function.
   * @param {?error} callback.err - An error returned while making this request.
   * @param {object} callback.apiResponse - The full API response.
   */
  delete(options?: DeleteOptions): Promise<{}>;
  delete(options: DeleteOptions, callback: StorageCallback<{}>): Promise<void>;
  delete(callback: StorageCallback<{}>): Promise<void>;
  delete(
    optionsOrCallback?: DeleteOptions | StorageCallback<{}>,
    cb?: StorageCallback<{}>
  ): Promise<{}> | Promise<void> {
    const [options, callback] = util.maybeOptionsOrCallback<
      DeleteOptions,
      StorageCallback<{}>
    >(optionsOrCallback, cb);

    const ignoreNotFound = options.ignoreNotFound!;
    delete options.ignoreNotFound;

    const methodConfig =
      (typeof this.methods.delete === 'object' && this.methods.delete) || {};

    let url = `${this.baseUrl}/${this.name}`;
    url = `${this.parent.baseUrl}/${this.parent.name}/${url}`;

    const reqPromise = this.storageTransport.makeRequest<{}>({
      method: 'DELETE',
      responseType: 'json',
      url,
      ...methodConfig.reqOpts,
      queryParameters: {
        ...methodConfig.reqOpts?.queryParameters,
        ...options,
      },
    });

    return callback
      ? reqPromise
          .then(() => callback(null, {}))
          .catch(err => {
            if ((err as GaxiosError).status === 404 && ignoreNotFound) {
              callback(null, {});
              return;
            }
            callback(err);
          })
      : (reqPromise
          .then(() => {})
          .catch(err => {
            if ((err as GaxiosError).status === 404 && ignoreNotFound) {
              return {};
            }
            throw err;
          }) as Promise<{}>);
  }

  /**
   * Check if the object exists.
   *
   * @param {function} callback - The callback function.
   * @param {?error} callback.err - An error returned while making this request.
   * @param {boolean} callback.exists - Whether the object exists or not.
   */
  exists(options?: ExistsOptions): Promise<boolean>;
  exists(
    options: ExistsOptions,
    callback: StorageCallback<boolean>
  ): Promise<void>;
  exists(callback: StorageCallback<boolean>): Promise<void>;
  exists(
    optionsOrCallback?: ExistsOptions | StorageCallback<boolean>,
    cb?: StorageCallback<boolean>
  ): Promise<void> | Promise<boolean> {
    const [options, callback] = util.maybeOptionsOrCallback<
      ExistsOptions,
      StorageCallback<boolean>
    >(optionsOrCallback, cb);

    const reqPromise = this.get(options);

    return callback
      ? reqPromise
          .then(() => callback(null, true))
          .catch(err => {
            if ((err as GaxiosError).status === 404) {
              callback(null, false);
              return;
            }
            callback(err);
          })
      : reqPromise
          .then(() => true)
          .catch(err => {
            if ((err as GaxiosError).status === 404) {
              return false;
            }
            throw err;
          });
  }

  /**
   * Get the object if it exists. Optionally have the object created if an
   * options object is provided with `autoCreate: true`.
   *
   * @param {object=} options - The configuration object that will be used to
   *     create the object if necessary.
   * @param {boolean} options.autoCreate - Create the object if it doesn't already exist.
   * @param {function} callback - The callback function.
   * @param {?error} callback.err - An error returned while making this request.
   * @param {object} callback.instance - The instance.
   * @param {object} callback.apiResponse - The full API response.
   */
  get(options?: GetOrCreateOptions): Promise<T>;
  get(callback: StorageCallback<T>): Promise<void>;
  get(options: GetOrCreateOptions, callback: StorageCallback<T>): Promise<void>;
  get(
    optionsOrCallback?: GetOrCreateOptions | StorageCallback<T>,
    cb?: StorageCallback<T>
  ): Promise<T> | Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    const [opts, callback] = util.maybeOptionsOrCallback<
      GetOrCreateOptions,
      StorageCallback<T>
    >(optionsOrCallback, cb);
    const options = Object.assign({}, opts);

    const autoCreate = options.autoCreate && typeof this.create === 'function';
    delete options.autoCreate;

    function onCreate(err: GaxiosError | null, instance: T) {
      if (err) {
        if (err.status === 409) {
          self.get(options, callback!);
          return;
        }
        callback!(err);
        return;
      }
      callback!(null, instance);
    }

    const reqPromise = this.getMetadata(options);
    return callback
      ? reqPromise
          .then(() => callback(null, self as unknown as T))
          .catch(err => {
            if ((err as GaxiosError).status === 404 && autoCreate) {
              const args = [];
              if (Object.keys(options).length > 0) {
                args.push(options);
              }
              args.push(onCreate);
              self.create(...args);
              return;
            }
            callback(err);
          })
      : reqPromise
          .then(r => {
            self.metadata = r;
            return self as unknown as T;
          })
          .catch(err => {
            if ((err as GaxiosError).status === 404 && autoCreate) {
              const args = [];
              if (Object.keys(options).length > 0) {
                args.push(options);
              }
              args.push(onCreate);
              return self.create(...args);
            }
            throw err;
          });
  }

  /**
   * Get the metadata of this object.
   *
   * @param {function} callback - The callback function.
   * @param {?error} callback.err - An error returned while making this request.
   * @param {object} callback.metadata - The metadata for this object.
   * @param {object} callback.apiResponse - The full API response.
   */
  getMetadata(options?: GetMetadataOptions): Promise<K>;
  getMetadata(
    options: GetMetadataOptions,
    callback: StorageCallback<K>
  ): Promise<void>;
  getMetadata(callback: StorageCallback<K>): Promise<void>;
  getMetadata(
    optionsOrCallback: GetMetadataOptions | StorageCallback<K>,
    cb?: StorageCallback<K>
  ): Promise<K> | Promise<void> {
    const [options, callback] = util.maybeOptionsOrCallback<
      GetMetadataOptions,
      StorageCallback<K>
    >(optionsOrCallback, cb);

    const methodConfig =
      (typeof this.methods.getMetadata === 'object' &&
        this.methods.getMetadata) ||
      {};

    let url = `${this.baseUrl}/${this.name}`;
    url = `${this.parent.baseUrl}/${this.parent.name}/${url}`;

    const reqPromise = this.storageTransport.makeRequest<K>({
      method: 'GET',
      responseType: 'json',
      url,
      ...methodConfig.reqOpts,
      queryParameters: {
        ...methodConfig.reqOpts?.queryParameters,
        ...options,
      },
    });

    return callback
      ? reqPromise
          .then(resp => {
            this.metadata = resp!;
            callback(null, this.metadata);
          })
          .catch(callback)
      : (reqPromise.then(resp => {
          this.metadata = resp!;
          return this.metadata;
        }) as Promise<K>);
  }

  /**
   * Set the metadata for this object.
   *
   * @param {object} metadata - The metadata to set on this object.
   * @param {object=} options - Configuration options.
   * @param {function=} callback - The callback function.
   * @param {?error} callback.err - An error returned while making this request.
   * @param {object} callback.apiResponse - The full API response.
   */
  setMetadata(metadata: K, options?: SetMetadataOptions): Promise<K>;
  setMetadata(metadata: K, callback: StorageCallback<K>): Promise<void>;
  setMetadata(
    metadata: K,
    options: SetMetadataOptions,
    callback: StorageCallback<K>
  ): Promise<void>;
  setMetadata(
    metadata: K,
    optionsOrCallback: SetMetadataOptions | StorageCallback<K>,
    cb?: StorageCallback<K>
  ): Promise<K> | Promise<void> {
    const [options, callback] = util.maybeOptionsOrCallback<
      SetMetadataOptions,
      StorageCallback<K>
    >(optionsOrCallback, cb);
    const methodConfig =
      (typeof this.methods.setMetadata === 'object' &&
        this.methods.setMetadata) ||
      {};

    let url = `${this.baseUrl}/${this.name}`;
    url = `${this.parent.baseUrl}/${this.parent.name}/${url}`;

    const reqPromise = this.storageTransport.makeRequest<K>({
      method: 'PATCH',
      responseType: 'json',
      url,
      ...methodConfig.reqOpts,
      body: {
        ...methodConfig.reqOpts?.body,
        ...metadata,
      },
      queryParameters: {
        ...methodConfig.reqOpts?.queryParameters,
        ...options,
      },
    });

    return callback
      ? reqPromise
          .then(resp => {
            this.metadata = resp!;
            callback(null, this.metadata);
          })
          .catch(callback)
      : (reqPromise.then(resp => {
          this.metadata = resp!;
          return this.metadata;
        }) as Promise<K>);
  }
}

export {ServiceObject};

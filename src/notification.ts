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

import {
  ApiError,
  Metadata,
  MetadataCallback,
  ServiceObject,
  util,
} from './nodejs-common';
import {ResponseBody} from './nodejs-common/util';
import {promisifyAll} from '@google-cloud/promisify';

import {Bucket} from './bucket';

export interface DeleteNotificationOptions {
  userProject?: string;
}

export interface GetNotificationMetadataOptions {
  userProject?: string;
}

/**
 * @typedef {array} GetNotificationMetadataResponse
 * @property {object} 0 The notification metadata.
 * @property {object} 1 The full API response.
 */
export type GetNotificationMetadataResponse = [ResponseBody, Metadata];

/**
 * @callback GetNotificationMetadataCallback
 * @param {?Error} err Request error, if any.
 * @param {object} files The notification metadata.
 * @param {object} apiResponse The full API response.
 */
export interface GetNotificationMetadataCallback {
  (err: Error | null, metadata?: ResponseBody, apiResponse?: Metadata): void;
}

/**
 * @typedef {array} GetNotificationResponse
 * @property {Notification} 0 The {@link Notification}
 * @property {object} 1 The full API response.
 */
export type GetNotificationResponse = [Notification, Metadata];

export interface GetNotificationOptions {
  /**
   * Automatically create the object if it does not exist. Default: `false`.
   */
  autoCreate?: boolean;

  /**
   * The ID of the project which will be billed for the request.
   */
  userProject?: string;
}

/**
 * @callback GetNotificationCallback
 * @param {?Error} err Request error, if any.
 * @param {Notification} notification The {@link Notification}.
 * @param {object} apiResponse The full API response.
 */
export interface GetNotificationCallback {
  (
    err: Error | null,
    notification?: Notification | null,
    apiResponse?: Metadata
  ): void;
}

/**
 * @callback DeleteNotificationCallback
 * @param {?Error} err Request error, if any.
 * @param {object} apiResponse The full API response.
 */
export interface DeleteNotificationCallback {
  (err: Error | null, apiResponse?: Metadata): void;
}

/**
 * The API-formatted resource description of the notification.
 *
 * Note: This is not guaranteed to be up-to-date when accessed. To get the
 * latest record, call the `getMetadata()` method.
 *
 * @name Notification#metadata
 * @type {object}
 */
/**
 * A Notification object is created from your {@link Bucket} object using
 * {@link Bucket#notification}. Use it to interact with Cloud Pub/Sub
 * notifications.
 *
 * See {@link https://cloud.google.com/storage/docs/pubsub-notifications| Cloud Pub/Sub Notifications for Google Cloud Storage}
 *
 * @class
 * @hideconstructor
 *
 * @param {Bucket} bucket The bucket instance this notification is attached to.
 * @param {string} id The ID of the notification.
 *
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const myBucket = storage.bucket('my-bucket');
 *
 * const notification = myBucket.notification('1');
 * ```
 */
class Notification extends ServiceObject {
  constructor(bucket: Bucket, id: string) {
    const methods = {
      /**
       * Creates a notification subscription for the bucket.
       *
       * See {@link https://cloud.google.com/storage/docs/json_api/v1/notifications/insert| Notifications: insert}
       * @method Notification#create
       *
       * @param {Topic|string} topic The Cloud PubSub topic to which this
       * subscription publishes. If the project ID is omitted, the current
       * project ID will be used.
       *
       * Acceptable formats are:
       * - `projects/grape-spaceship-123/topics/my-topic`
       *
       * - `my-topic`
       * @param {CreateNotificationRequest} [options] Metadata to set for
       *     the notification.
       * @param {CreateNotificationCallback} [callback] Callback function.
       * @returns {Promise<CreateNotificationResponse>}
       * @throws {Error} If a valid topic is not provided.
       *
       * @example
       * ```
       * const {Storage} = require('@google-cloud/storage');
       * const storage = new Storage();
       * const myBucket = storage.bucket('my-bucket');
       * const notification = myBucket.notification('1');
       *
       * notification.create(function(err, notification, apiResponse) {
       *   if (!err) {
       *     // The notification was created successfully.
       *   }
       * });
       *
       * //-
       * // If the callback is omitted, we'll return a Promise.
       * //-
       * notification.create().then(function(data) {
       *   const notification = data[0];
       *   const apiResponse = data[1];
       * });
       * ```
       */
      create: true,

      /**
       * @typedef {array} NotificationExistsResponse
       * @property {boolean} 0 Whether the notification exists or not.
       */
      /**
       * @callback NotificationExistsCallback
       * @param {?Error} err Request error, if any.
       * @param {boolean} exists Whether the notification exists or not.
       */
      /**
       * Check if the notification exists.
       *
       * @method Notification#exists
       * @param {NotificationExistsCallback} [callback] Callback function.
       * @returns {Promise<NotificationExistsResponse>}
       *
       * @example
       * ```
       * const {Storage} = require('@google-cloud/storage');
       * const storage = new Storage();
       * const myBucket = storage.bucket('my-bucket');
       * const notification = myBucket.notification('1');
       *
       * notification.exists(function(err, exists) {});
       *
       * //-
       * // If the callback is omitted, we'll return a Promise.
       * //-
       * notification.exists().then(function(data) {
       *   const exists = data[0];
       * });
       * ```
       */
      exists: true,
    };

    super({
      parent: bucket,
      baseUrl: '/notificationConfigs',
      id: id.toString(),
      createMethod: bucket.createNotification.bind(bucket),
      methods,
    });
  }

  delete(options?: DeleteNotificationOptions): Promise<[Metadata]>;
  delete(
    options: DeleteNotificationOptions,
    callback: DeleteNotificationCallback
  ): void;
  delete(callback: DeleteNotificationCallback): void;
  /**
   * @typedef {array} DeleteNotificationResponse
   * @property {object} 0 The full API response.
   */
  /**
   * Permanently deletes a notification subscription.
   *
   * See {@link https://cloud.google.com/storage/docs/json_api/v1/notifications/delete| Notifications: delete API Documentation}
   *
   * @param {object} [options] Configuration options.
   * @param {string} [options.userProject] The ID of the project which will be
   *     billed for the request.
   * @param {DeleteNotificationCallback} [callback] Callback function.
   * @returns {Promise<DeleteNotificationResponse>}
   *
   * @example
   * ```
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   * const myBucket = storage.bucket('my-bucket');
   * const notification = myBucket.notification('1');
   *
   * notification.delete(function(err, apiResponse) {});
   *
   * //-
   * // If the callback is omitted, we'll return a Promise.
   * //-
   * notification.delete().then(function(data) {
   *   const apiResponse = data[0];
   * });
   *
   * ```
   * @example <caption>include:samples/deleteNotification.js</caption>
   * region_tag:storage_delete_bucket_notification
   * Another example:
   */
  delete(
    optionsOrCallback?: DeleteNotificationOptions | DeleteNotificationCallback,
    callback?: DeleteNotificationCallback
  ): void | Promise<[Metadata]> {
    const options =
      typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
    callback =
      typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
    this.request(
      {
        method: 'DELETE',
        uri: '',
        qs: options,
      },
      callback || util.noop
    );
  }

  get(options?: GetNotificationOptions): Promise<GetNotificationResponse>;
  get(options: GetNotificationOptions, callback: GetNotificationCallback): void;
  get(callback: GetNotificationCallback): void;
  /**
   * Get a notification and its metadata if it exists.
   *
   * See {@link https://cloud.google.com/storage/docs/json_api/v1/notifications/get| Notifications: get API Documentation}
   *
   * @param {object} [options] Configuration options.
   *     See {@link Bucket#createNotification} for create options.
   * @param {boolean} [options.autoCreate] Automatically create the object if
   *     it does not exist. Default: `false`.
   * @param {string} [options.userProject] The ID of the project which will be
   *     billed for the request.
   * @param {GetNotificationCallback} [callback] Callback function.
   * @return {Promise<GetNotificationCallback>}
   *
   * @example
   * ```
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   * const myBucket = storage.bucket('my-bucket');
   * const notification = myBucket.notification('1');
   *
   * notification.get(function(err, notification, apiResponse) {
   *   // `notification.metadata` has been populated.
   * });
   *
   * //-
   * // If the callback is omitted, we'll return a Promise.
   * //-
   * notification.get().then(function(data) {
   *   const notification = data[0];
   *   const apiResponse = data[1];
   * });
   * ```
   */
  get(
    optionsOrCallback?: GetNotificationOptions | GetNotificationCallback,
    callback?: GetNotificationCallback
  ): void | Promise<GetNotificationResponse> {
    const options =
      typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
    callback =
      typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;

    const autoCreate = options.autoCreate;
    delete options.autoCreate;

    const onCreate = (
      err: ApiError | null,
      notification: Notification,
      apiResponse: Metadata
    ) => {
      if (err) {
        if (err.code === 409) {
          this.get(options, callback!);
          return;
        }

        callback!(err, null, apiResponse);
        return;
      }

      callback!(null, notification, apiResponse);
    };

    this.getMetadata(options, (err, metadata) => {
      if (err) {
        if ((err as ApiError).code === 404 && autoCreate) {
          const args = [] as object[];

          if (Object.keys(options).length > 0) {
            args.push(options);
          }

          args.push(onCreate);

          // eslint-disable-next-line
          this.create.apply(this, args as any);
          return;
        }

        callback!(err, null, metadata);
        return;
      }

      callback!(null, this, metadata);
    });
  }

  getMetadata(
    options?: GetNotificationMetadataOptions
  ): Promise<GetNotificationMetadataResponse>;
  getMetadata(
    options: GetNotificationMetadataOptions,
    callback: MetadataCallback
  ): void;
  getMetadata(callback: MetadataCallback): void;
  /**
   * Get the notification's metadata.
   *
   * See {@link https://cloud.google.com/storage/docs/json_api/v1/notifications/get| Notifications: get API Documentation}
   *
   * @param {object} [options] Configuration options.
   * @param {string} [options.userProject] The ID of the project which will be
   *     billed for the request.
   * @param {GetNotificationMetadataCallback} [callback] Callback function.
   * @returns {Promise<GetNotificationMetadataResponse>}
   *
   * @example
   * ```
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   * const myBucket = storage.bucket('my-bucket');
   * const notification = myBucket.notification('1');
   *
   * notification.getMetadata(function(err, metadata, apiResponse) {});
   *
   * //-
   * // If the callback is omitted, we'll return a Promise.
   * //-
   * notification.getMetadata().then(function(data) {
   *   const metadata = data[0];
   *   const apiResponse = data[1];
   * });
   *
   * ```
   * @example <caption>include:samples/getMetadataNotifications.js</caption>
   * region_tag:storage_print_pubsub_bucket_notification
   * Another example:
   */
  getMetadata(
    optionsOrCallback?: GetNotificationMetadataOptions | MetadataCallback,
    callback?: MetadataCallback
  ): void | Promise<GetNotificationMetadataResponse> {
    const options =
      typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
    callback =
      typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
    this.request(
      {
        uri: '',
        qs: options,
      },
      (err, resp) => {
        if (err) {
          callback!(err, null, resp);
          return;
        }
        this.metadata = resp;
        callback!(null, this.metadata, resp);
      }
    );
  }
}

/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisifyAll(Notification);

/**
 * Reference to the {@link Notification} class.
 * @name module:@google-cloud/storage.Notification
 * @see Notification
 */
export {Notification};

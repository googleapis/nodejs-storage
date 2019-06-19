/**
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import {
  Metadata,
  ServiceObject,
  GetConfig,
  DecorateRequestOptions,
  ResponseBody,
  BodyResponseCallback,
} from '@google-cloud/common';
import {promisifyAll} from '@google-cloud/promisify';

import {Storage} from './storage';
import {normalize} from './util';

export interface HmacKeyMetadata {
  accessId: string;
  etag?: string;
  id?: string;
  projectId?: string;
  serviceAccountEmail?: string;
  state?: string;
  timeCreated?: string;
  updated?: string;
}

export interface GetHmacKeyOptions extends GetConfig {
  userProject?: string;
}

export interface UpdateHmacKeyOptions {
  userProject?: string;
}

export interface UpdateHmacKeyMetadata {
  state?: 'ACTIVE' | 'INACTIVE';
  etag?: string;
}

export interface ToggleHmacKeyOptions {
  etag?: string;
}

export interface HmacKeyMetadataCallback {
  (err: Error | null, metadata?: HmacKeyMetadata, apiResponse?: Metadata): void;
}

export type HmacKeyMetadataResponse = [HmacKeyMetadata, Metadata];

/**
 *
 */
export class HmacKey extends ServiceObject<HmacKeyMetadata> {
  accessId: string;
  metadata: HmacKeyMetadata;
  parent: Storage;

  constructor(storage: Storage, accessId: string) {
    if (!accessId) {
      throw new Error('An access ID is needed to create an HmacKey object.');
    }

    const methods = {
      /**
       * @typedef {object} DeleteHmacKeyOptions
       * @property {string} [userProject] This parameter is currently ignored.
       */
      /**
       * @typedef {array} DeleteHmacKeyResponse
       * @property {object} 0 The full API response.
       */
      /**
       * @callback DeleteHmacKeyCallback
       * @param {?Error} err Request error, if any.
       * @param {object} apiResponse The full API response.
       */
      /**
       * Deletes an HMAC key.
       * Key state must be set to `INACTIVE` prior to deletion.
       * Caution: HMAC keys cannot be recovered once you delete them.
       *
       * The authenticated user must have `storage.hmacKeys.delete` permission for the project in which the key exists.
       *
       * @method HmacKey#delete
       * @param {DeleteHmacKeyOptions} [options] Configuration options.
       * @param {DeleteHmacKeyCallback} [callback] Callback function.
       * @returns {Promise<DeleteHmacKeyResponse}
       *
       * @example
       * const {Storage} = require('@google-cloud/storage');
       * const storage = new Storage();
       *
       * //-
       * // Delete HMAC key after making the key inactive.
       * //-
       * const hmacKey = storage.hmacKey('ACCESS_ID');
       * hmacKey.update({state: 'INACTIVE'}, (err, hmacKeyMetadata) => {
       *     if (err) {
       *       // The request was an error.
       *       console.error(err);
       *       return;
       *     }
       *     hmacKey.delete((err) => {
       *       if (err) {
       *         console.error(err);
       *         return;
       *       }
       *       // The HMAC key is deleted.
       *     })
       *   });
       *
       * //-
       * // If the callback is omitted, a promise is returned.
       * //-
       * const hmacKey = storage.hmacKey('ACCESS_ID');
       * hmacKey
       *   .update({state: 'INACTIVE'})
       *   .then(() => {
       *     return hmacKey.delete();
       *   });
       */
      delete: true,
    };

    super({
      parent: storage,
      baseUrl: `/projects/${storage.projectId}/hmacKeys`,
      id: accessId,
      methods,
    });

    this.accessId = accessId;
    this.metadata = {accessId};
    this.parent = storage;
  }

  /**
   * @typedef {object} GetHmacKeyOptions
   * @property {string} userProject This parameter is currently ignored.
   */
  /**
   * Retrieves and populate an HMAC key's metadata.
   *
   * HmacKey.get() does not give the HMAC key secret, as
   * it is only returned on creation.
   * The authenticated user must have `storage.hmacKeys.get` permission for the project in which the key exists.
   *
   * @param {GetHmacKeyOptions} [options] Configuration options.
   * @param {HmacKeyMetadataCallback} [callback] Callback function.
   * @returns {Promise<HmacKeyMetadataResponse>}
   *
   * @example
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   *
   * //-
   * // Get the HmacKey's Metadata.
   * //-
   * storage.hmacKey('ACCESS_ID')
   *   .get((err, hmacKeyMetadata) => {
   *     if (err) {
   *       // The request was an error.
   *       console.error(err);
   *       return;
   *     }
   *     console.log(hmacKeyMetadata);
   *   });
   *
   * //-
   * // If the callback is omitted, a promise is returned.
   * //-
   * storage.hmacKey('ACCESS_ID')
   *   .get((data) => {
   *     const hmacKeyMetadata = data[0];
   *     console.log(hmacKeyMetadata);
   *   });
   */
  get(options?: GetHmacKeyOptions): Promise<HmacKeyMetadataResponse>;
  get(callback: HmacKeyMetadataCallback): void;
  get(options: GetHmacKeyOptions, callback: HmacKeyMetadataCallback): void;
  get(
    optionsOrCb?: GetHmacKeyOptions | HmacKeyMetadataCallback,
    cb?: HmacKeyMetadataCallback
  ): Promise<HmacKeyMetadataResponse> | void {
    const {options, callback} = normalize<
      GetHmacKeyOptions,
      HmacKeyMetadataCallback
    >(optionsOrCb, cb);
    const opts = Object.assign({}, options);
    // autoCreate is ignored - key must be created using Storage.createHmacKey.
    delete opts.autoCreate;

    const reqOpts = {
      uri: '/',
      qs: opts,
    };

    this.request(reqOpts, (err, metadata, res) => {
      if (err) {
        callback!(err);
        return;
      }
      this.metadata = metadata!;
      callback!(null, this.metadata, res);
    });
  }

  request(reqOpts: DecorateRequestOptions): Promise<[ResponseBody, Metadata]>;
  request(
    reqOpts: DecorateRequestOptions,
    callback: BodyResponseCallback
  ): void;
  /**
   * Makes request and applies userProject query parameter if necessary.
   *
   * @private
   *
   * @param {object} reqOpts - The request options.
   * @param {function} callback - The callback function.
   */
  request(
    reqOpts: DecorateRequestOptions,
    callback?: BodyResponseCallback
  ): void | Promise<[ResponseBody, Metadata]> {
    return this.parent.request.call(this, reqOpts, callback!);
  }

  update(
    metadata: UpdateHmacKeyMetadata,
    options?: UpdateHmacKeyOptions
  ): Promise<HmacKeyMetadataResponse>;
  update(
    metadata: UpdateHmacKeyMetadata,
    callback: HmacKeyMetadataCallback
  ): void;
  update(
    metadata: UpdateHmacKeyMetadata,
    options: UpdateHmacKeyOptions,
    callback: HmacKeyMetadataCallback
  ): void;
  /**
   * @typedef {object} UpdateHmacKeyMetadata Subset of {@link HmacKeyMetadata} to update.
   * @property {string} state New state of the HmacKey. Either 'ACTIVE' or 'INACTIVE'.
   * @property {string} [etag] Include an etag from a previous get HMAC key request
   *    to perform safe read-modify-write.
   */
  /**
   * @typedef {object} UpdateHmacKeyOptions
   * @property {string} userProject This parameter is currently ignored.
   */
  /**
   * @callback HmacKeyMetadataCallback
   * @param {?Error} err Request error, if any.
   * @param {HmacKeyMetadata} metadata The updated HmacKeyMetadata resource.
   * @param {object} apiResponse The full API response.
   */
  /**
   * @typedef {array} HmacKeyMetadataResponse
   * @property {HmacKeyMetadata} 0 The updated HmacKeyMetadata resource.
   * @property {object} 1 The full API response.
   */
  update(
    metadata: UpdateHmacKeyMetadata,
    optionsOrCb?: UpdateHmacKeyOptions | HmacKeyMetadataCallback,
    cb?: HmacKeyMetadataCallback
  ): Promise<HmacKeyMetadataResponse> | void {
    if (
      typeof metadata !== 'object' ||
      Object.getOwnPropertyNames(metadata).length === 0
    ) {
      throw new Error(
        'Cannot update HmacKey with an undefined/empty options object.'
      );
    }

    const {options, callback} = normalize<
      UpdateHmacKeyOptions,
      HmacKeyMetadataCallback
    >(optionsOrCb, cb);

    this.request(
      {
        uri: '/',
        method: 'put',
        qs: options,
        body: metadata,
      },
      (err: Error | null, metadata?: HmacKeyMetadata, res?: Metadata) => {
        if (err) {
          callback!(err);
          return;
        }
        this.metadata = metadata!;
        callback!(err, metadata, res);
      }
    );
  }
}

/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
promisifyAll(HmacKey);

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

import {BaseMetadata, ServiceObject, util} from './nodejs-common/index.js';
import {StorageCallback} from './storage-transport.js';
import {Storage} from './storage.js';

export interface ChannelMetadata extends BaseMetadata {
  resourceId?: string;
  resourceUri?: string;
  token?: string;
  expiration?: number;
  type?: string;
  address?: string;
  payload?: boolean;
  params?: {
    [key: string]: string;
  };
}

/**
 * Create a channel object to interact with a Cloud Storage channel.
 *
 * See {@link https://cloud.google.com/storage/docs/object-change-notification| Object Change Notification}
 *
 * @class
 *
 * @param {string} id The ID of the channel.
 * @param {string} resourceId The resource ID of the channel.
 *
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const channel = storage.channel('id', 'resource-id');
 * ```
 */
class Channel extends ServiceObject<Channel, ChannelMetadata> {
  constructor(storage: Storage, id: string, resourceId: string) {
    const config = {
      parent: storage,
      storageTransport: storage.storageTransport,
      baseUrl: '/channels',
      id: '',
      methods: {},
    };

    super(config);

    this.metadata.id = id;
    this.metadata.resourceId = resourceId;
  }

  stop(): Promise<void | {}>;
  stop(callback: StorageCallback<{}>): void;
  /**
   * Stop this channel.
   *
   * @param {StorageCallback} [callback] Callback function.
   * @returns {Promise<{}>} A promise that resolves to an empty object when successful
   *
   * @example
   * ```
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   * const channel = storage.channel('id', 'resource-id');
   * channel.stop(function(err, apiResponse) {
   *   if (!err) {
   *     // Channel stopped successfully.
   *   }
   * });
   *
   * //-
   * // If the callback is omitted, we'll return a Promise.
   * //-
   * channel.stop().then(function(data) {
   *   const apiResponse = data[0];
   * });
   * ```
   */
  stop(callback?: StorageCallback<{}>): Promise<void | {}> | void {
    callback = callback || util.noop;
    const reqPromise = this.storageTransport.makeRequest<{}>({
      method: 'POST',
      url: `${this.baseUrl}/stop`,
      body: this.metadata,
      responseType: 'json',
    });

    return callback
      ? reqPromise.then(() => callback(null, {})).catch(callback)
      : reqPromise;
  }
}

/**
 * Reference to the {@link Channel} class.
 * @name module:@google-cloud/storage.Channel
 * @see Channel
 */
export {Channel};

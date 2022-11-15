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

import {Bucket, UploadOptions, UploadResponse} from './bucket';
import {
  DownloadCallback,
  DownloadOptions,
  DownloadResponse,
  File,
} from './file';
import * as pLimit from 'p-limit';
import {Metadata} from './nodejs-common';
import * as path from 'path';
import * as extend from 'extend';
import {promises as fsp} from 'fs';

const DEFAULT_PARALLEL_UPLOAD_LIMIT = 2;
const DEFAULT_PARALLEL_DOWNLOAD_LIMIT = 2;
const DEFAULT_PARALLEL_LARGE_FILE_DOWNLOAD_LIMIT = 2;
const LARGE_FILE_SIZE_THRESHOLD = 256 * 1024 * 1024;
const LARGE_FILE_DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024;
const EMPTY_REGEX = '(?:)';
export interface UploadMultiOptions {
  concurrencyLimit?: number;
  skipIfExists?: boolean;
  prefix?: string;
  passthroughOptions?: Omit<UploadOptions, 'destination'>;
}

export interface DownloadMultiOptions {
  concurrencyLimit?: number;
  prefix?: string;
  stripPrefix?: string;
  passthroughOptions?: DownloadOptions;
}

export interface LargeFileDownloadOptions {
  concurrencyLimit?: number;
  chunkSizeBytes?: number;
  path?: string;
}

export interface UploadMultiCallback {
  (err: Error | null, files?: File[], metadata?: Metadata[]): void;
}

export interface DownloadMultiCallback {
  (err: Error | null, contents?: Buffer[]): void;
}

/**
 * Create a TransferManager object to perform parallel transfer operations on a Cloud Storage bucket.
 *
 * @class
 * @hideconstructor
 *
 * @param {Bucket} bucket A {@link Bucket} instance
 * @experimental
 */
export class TransferManager {
  bucket: Bucket;
  constructor(bucket: Bucket) {
    this.bucket = bucket;
  }

  async uploadMulti(
    filePaths: string[],
    options?: UploadMultiOptions
  ): Promise<UploadResponse[]>;
  async uploadMulti(
    filePaths: string[],
    callback: UploadMultiCallback
  ): Promise<void>;
  async uploadMulti(
    filePaths: string[],
    options: UploadMultiOptions,
    callback: UploadMultiCallback
  ): Promise<void>;
  /**
   * @typedef {object} UploadMultiOptions
   * @property {number} [concurrencyLimit] The number of concurrently executing promises
   * to use when uploading the files.
   * @property {boolean} [skipIfExists] Do not upload the file if it already exists in
   * the bucket. This will set the precondition ifGenerationMatch = 0.
   * @property {string} [prefix] A prefix to append to all of the uploaded files.
   * @property {object} [passthroughOptions] {@link UploadOptions} Options to be passed through
   * to each individual upload operation.
   * @experimental
   */
  /**
   * @callback UploadMultiCallback
   * @param {?Error} [err] Request error, if any.
   * @param {array} [files] Array of uploaded {@link File}.
   * @param {array} [metadata] Array of uploaded {@link Metadata}
   * @experimental
   */
  /**
   * Upload multiple files in parallel to the bucket. This is a convenience method
   * that utilizes {@link Bucket#upload} to perform the upload.
   *
   * @param {array} [filePaths] An array of fully qualified paths to the files.
   * to be uploaded to the bucket
   * @param {UploadMultiOptions} [options] Configuration options.
   * @param {UploadMultiCallback} [callback] Callback function.
   * @returns {Promise<UploadResponse[] | void>}
   *
   * @example
   * ```
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   * const bucket = storage.bucket('my-bucket');
   * const transferManager = new TransferManager(bucket);
   *
   * //-
   * // Upload multiple files in parallel.
   * //-
   * transferManager.uploadMulti(['/local/path/file1.txt, 'local/path/file2.txt'], function(err, files, metadata) {
   * // Your bucket now contains:
   * // - "file1.txt" (with the contents of '/local/path/file1.txt')
   * // - "file2.txt" (with the contents of '/local/path/file2.txt')
   * // `files` is an array of instances of File objects that refers to the new files.
   * });
   *
   * //-
   * // If the callback is omitted, we will return a promise.
   * //-
   * const response = await transferManager.uploadMulti(['/local/path/file1.txt, 'local/path/file2.txt']);
   * ```
   * @experimental
   */
  async uploadMulti(
    filePaths: string[],
    optionsOrCallback?: UploadMultiOptions | UploadMultiCallback,
    callback?: UploadMultiCallback
  ): Promise<void | UploadResponse[]> {
    let options: UploadMultiOptions = {};
    if (typeof optionsOrCallback === 'function') {
      callback = optionsOrCallback;
    } else if (optionsOrCallback) {
      options = optionsOrCallback;
    }

    if (options.skipIfExists && options.passthroughOptions?.preconditionOpts) {
      options.passthroughOptions.preconditionOpts.ifGenerationMatch = 0;
    } else if (
      options.skipIfExists &&
      options.passthroughOptions === undefined
    ) {
      options.passthroughOptions = {
        preconditionOpts: {
          ifGenerationMatch: 0,
        },
      };
    }

    const limit = pLimit(
      options.concurrencyLimit || DEFAULT_PARALLEL_UPLOAD_LIMIT
    );
    const promises = [];

    for (const filePath of filePaths) {
      const stat = await fsp.lstat(filePath);
      if (stat.isDirectory()) {
        continue;
      }
      const passThroughOptionsCopy: UploadOptions = extend(
        true,
        {},
        options.passthroughOptions
      );
      passThroughOptionsCopy.destination = filePath;
      if (options.prefix) {
        passThroughOptionsCopy.destination = path.join(
          options.prefix,
          passThroughOptionsCopy.destination
        );
      }
      promises.push(
        limit(() => this.bucket.upload(filePath, passThroughOptionsCopy))
      );
    }

    if (callback) {
      try {
        const results = await Promise.all(promises);
        const files = results.map(fileAndMetadata => fileAndMetadata[0]);
        const metadata = results.map(fileAndMetadata => fileAndMetadata[1]);
        callback(null, files, metadata);
      } catch (e) {
        callback(e as Error);
      }
      return;
    }

    return Promise.all(promises);
  }

  async downloadMulti(
    files: File[],
    options?: DownloadMultiOptions
  ): Promise<DownloadResponse[]>;
  async downloadMulti(
    files: File[],
    callback: DownloadMultiCallback
  ): Promise<void>;
  async downloadMulti(
    files: File[],
    options: DownloadMultiOptions,
    callback: DownloadMultiCallback
  ): Promise<void>;
  /**
   * @typedef {object} DownloadMultiOptions
   * @property {number} [concurrencyLimit] The number of concurrently executing promises
   * to use when downloading the files.
   * @property {string} [prefix] A prefix to append to all of the downloaded files.
   * @property {string} [stripPrefix] A prefix to remove from all of the downloaded files.
   * @property {object} [passthroughOptions] {@link DownloadOptions} Options to be passed through
   * to each individual download operation.
   * @experimental
   */
  /**
   * @callback DownloadMultiCallback
   * @param {?Error} [err] Request error, if any.
   * @param {array} [contents] Contents of the downloaded files.
   * @experimental
   */
  /**
   * Download multiple files in parallel to the local filesystem. This is a convenience method
   * that utilizes {@link File#download} to perform the download.
   *
   * @param {array} [files] An array of file objects to be downloaded.
   * @param {DownloadMultiOptions} [options] Configuration options.
   * @param {DownloadMultiCallback} {callback} Callback function.
   * @returns {Promise<DownloadResponse[] | void>}
   *
   * @example
   * ```
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   * const bucket = storage.bucket('my-bucket');
   * const transferManager = new TransferManager(bucket);
   *
   * //-
   * // Download multiple files in parallel.
   * //-
   * transferManager.downloadMulti([bucket.file('file1.txt'), bucket.file('file2.txt')], function(err, contents){
   * // Your local directory now contains:
   * // - "file1.txt" (with the contents from my-bucket.file1.txt)
   * // - "file2.txt" (with the contents from my-bucket.file2.txt)
   * // `contents` is an array containing the file data for each downloaded file.
   * });
   *
   * //-
   * // If the callback is omitted, we will return a promise.
   * //-
   * const response = await transferManager.downloadMulti(bucket.File('file1.txt'), bucket.File('file2.txt')]);
   * @experimental
   */
  async downloadMulti(
    files: File[],
    optionsOrCallback?: DownloadMultiOptions | DownloadMultiCallback,
    callback?: DownloadMultiCallback
  ): Promise<void | DownloadResponse[]> {
    let options: DownloadMultiOptions = {};
    if (typeof optionsOrCallback === 'function') {
      callback = optionsOrCallback;
    } else if (optionsOrCallback) {
      options = optionsOrCallback;
    }

    const limit = pLimit(
      options.concurrencyLimit || DEFAULT_PARALLEL_DOWNLOAD_LIMIT
    );
    const promises = [];

    const stripRegexString = options.stripPrefix
      ? `^${options.stripPrefix}`
      : EMPTY_REGEX;
    const regex = new RegExp(stripRegexString, 'g');

    for (const file of files) {
      const passThroughOptionsCopy = extend(
        true,
        {},
        options.passthroughOptions
      );
      if (options.prefix) {
        passThroughOptionsCopy.destination = path.join(
          options.prefix || '',
          passThroughOptionsCopy.destination || '',
          file.name
        );
      }
      if (options.stripPrefix) {
        passThroughOptionsCopy.destination = file.name.replace(regex, '');
      }
      promises.push(limit(() => file.download(passThroughOptionsCopy)));
    }

    if (callback) {
      try {
        const results = await Promise.all(promises);
        callback(null, ...results);
      } catch (e) {
        callback(e as Error);
      }
      return;
    }

    return Promise.all(promises);
  }

  async downloadLargeFile(
    file: File,
    options?: LargeFileDownloadOptions
  ): Promise<DownloadResponse>;
  async downloadLargeFile(
    file: File,
    callback: DownloadCallback
  ): Promise<void>;
  async downloadLargeFile(
    file: File,
    options: LargeFileDownloadOptions,
    callback: DownloadCallback
  ): Promise<void>;
  /**
   * @typedef {object} LargeFileDownloadOptions
   * @property {number} [concurrencyLimit] The number of concurrently executing promises
   * to use when downloading the file.
   * @property {number} [chunkSizeBytes] The size in bytes of each chunk to be downloaded.
   * @experimental
   */
  /**
   * Download a large file in chunks utilizing parallel download operations. This is a convenience method
   * that utilizes {@link File#download} to perform the download.
   *
   * @param {object} [file] {@link File} to download.
   * @param {LargeFileDownloadOptions} [options] Configuration options.
   * @param {DownloadCallback} [callbac] Callback function.
   * @returns {Promise<DownloadResponse | void>}
   *
   * @example
   * ```
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   * const bucket = storage.bucket('my-bucket');
   * const transferManager = new TransferManager(bucket);
   *
   * //-
   * // Download a large file in chunks utilizing parallel operations.
   * //-
   * transferManager.downloadLargeFile(bucket.file('large-file.txt'), function(err, contents) {
   * // Your local directory now contains:
   * // - "large-file.txt" (with the contents from my-bucket.large-file.txt)
   * });
   *
   * //-
   * // If the callback is omitted, we will return a promise.
   * //-
   * const response = await transferManager.downloadLargeFile(bucket.file('large-file.txt');
   * @experimental
   */
  async downloadLargeFile(
    file: File,
    optionsOrCallback?: LargeFileDownloadOptions | DownloadCallback,
    callback?: DownloadCallback
  ): Promise<void | DownloadResponse> {
    let options: LargeFileDownloadOptions = {};
    if (typeof optionsOrCallback === 'function') {
      callback = optionsOrCallback;
    } else if (optionsOrCallback) {
      options = optionsOrCallback;
    }

    let chunkSize = options.chunkSizeBytes || LARGE_FILE_DEFAULT_CHUNK_SIZE;
    let limit = pLimit(
      options.concurrencyLimit || DEFAULT_PARALLEL_LARGE_FILE_DOWNLOAD_LIMIT
    );
    const promises = [];

    const fileInfo = await file.get();
    const size = parseInt(fileInfo[0].metadata.size);
    // If the file size does not meet the threshold download it as a single chunk.
    if (size < LARGE_FILE_SIZE_THRESHOLD) {
      limit = pLimit(1);
      chunkSize = size;
    }

    let start = 0;
    const filePath = path.join(
      options.path || __dirname,
      path.basename(file.name)
    );
    const fileToWrite = await fsp.open(filePath, 'w+');
    while (start < size) {
      const chunkStart = start;
      let chunkEnd = start + chunkSize - 1;
      chunkEnd = chunkEnd > size ? size : chunkEnd;
      promises.push(
        limit(() =>
          file.download({start: chunkStart, end: chunkEnd}).then(resp => {
            return fileToWrite.write(resp[0], 0, resp[0].length, chunkStart);
          })
        )
      );

      start += chunkSize;
    }

    if (callback) {
      try {
        const results = await Promise.all(promises);
        callback(null, Buffer.concat(results.map(result => result.buffer)));
      } catch (e) {
        callback(e as Error, Buffer.alloc(0));
      }
      await fileToWrite.close();
      return;
    }

    return Promise.all(promises)
      .then(results => {
        return results.map(result => result.buffer) as DownloadResponse;
      })
      .finally(async () => {
        await fileToWrite.close();
      });
  }
}

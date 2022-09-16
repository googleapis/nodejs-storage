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
  passthroughOptions?: UploadOptions;
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
}

export interface UploadMultiCallback {
  (err: Error | null, files?: File[], metadata?: Metadata[]): void;
}

export interface DownloadMultiCallback {
  (err: Error | null, contents?: Buffer[]): void;
}

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
      const baseFileName = path.basename(filePath);
      const passThroughOptionsCopy = extend(
        true,
        {},
        options.passthroughOptions
      );
      if (options.prefix) {
        passThroughOptionsCopy.destination = path.join(
          options.prefix,
          baseFileName
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
    const fileToWrite = await fsp.open(path.basename(file.name), 'w+');
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

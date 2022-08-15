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

import {UploadCallback, UploadResponse} from './bucket';
import {File} from './file';

export interface UploadMultiOptions {
  concurrencyLimit?: number;
}

export class TransferManager {
  constructor() {}

  uploadMulti(
    files: File[],
    options?: UploadMultiOptions
  ): Promise<UploadResponse>;
  uploadMulti(files: File[], callback: UploadCallback): void;
  uploadMulti(
    files: File[],
    options: UploadMultiOptions,
    callback: UploadCallback
  ): void;
  uploadMulti(
    files: File[],
    optionsOrCallback?: UploadMultiOptions | UploadCallback,
    callback?: UploadCallback
  ): Promise<UploadResponse> | void {}
}

/*!
 * Copyright 2017 Google Inc. All Rights Reserved.
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

export enum WarningTypes {
  WARNING = 'Warning',
}

interface Warning {
  code: string;
  message: string;
  type?: WarningTypes;
  warned?: boolean;
}

export function normalize<T = {}, U = Function>(
    optionsOrCallback?: T|U, cb?: U) {
  const options =
      (typeof optionsOrCallback === 'object' ? optionsOrCallback : {}) as T;
  const callback =
      (typeof optionsOrCallback === 'function' ? optionsOrCallback : cb)! as U;
  return {options, callback};
}

/**
 * Flatten an object into an Array of arrays, [[key, value], ..].
 * Implements Object.entries() for Node.js <8
 * @internal
 */
export function objectEntries<T>(obj: {[key: string]: T}): Array<[string, T]> {
  return Object.keys(obj).map((key) => [key, obj[key]] as [string, T]);
}

export function emitWarning(warning: Warning) {
  if (warning.warned) {
    return;
  }
  warning.warned = true;
  // tslint:disable-next-line no-any
  process.emitWarning(warning.message, warning as any);
};

export const DEFAULT_VERSION_WARNING: Warning = {
  code: 'signed-url-default-version-warning',
  type: WarningTypes.WARNING,
  message: [
    'You have generated a signed URL using the default v2 signing',
    'implementation. In the future, this will default to v4. You may',
    'experience breaking changes if you use longer than 7 day expiration',
    'times with v4. To opt-in to the behavior specify config.version=\'v4\'',
  ].join(' '),
}
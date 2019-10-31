/**
 * Copyright 2019 Google LLC
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

import * as querystring from 'querystring';

export function normalize<T = {}, U = Function>(
  optionsOrCallback?: T | U,
  cb?: U
) {
  const options = (typeof optionsOrCallback === 'object'
    ? optionsOrCallback
    : {}) as T;
  const callback = (typeof optionsOrCallback === 'function'
    ? optionsOrCallback
    : cb)! as U;
  return {options, callback};
}

/**
 * Flatten an object into an Array of arrays, [[key, value], ..].
 * Implements Object.entries() for Node.js <8
 * @internal
 */
export function objectEntries<T>(obj: {[key: string]: T}): Array<[string, T]> {
  return Object.keys(obj).map(key => [key, obj[key]] as [string, T]);
}

/**
 * URI encode the given string for generating signed URLs:
 * Encode every byte except `A-Z a-Z 0-9 ~ - . _`.
 *
 * encodeURI patches encodeURIComponent() by:
 *  - additionally encoding `! * ' ( )` characters;
 *  - conditionally encoding `/` if encodeSlash is `true`.
 * @param {string} uri The URI to encode.
 * @param [boolean=false] encodeSlash If `true`, the "/" character is not encoded.
 * @return {string} The encoded string.
 */
export function encodeURI(uri: string, encodeSlash: boolean): string {
  // Encode using JavaScript's encodeURIComponent, excluding "/" if encodeSlash is
  // `true`.
  const encoded = uri
    .split('/')
    .map(encodeURIComponent)
    .join(encodeSlash ? '%2F' : '/');

  // Encode additional characters not encoded by encodeURIComponent.
  return encoded.replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Serialize an object to a URL query string using util.encodeURI(uri, true).
 * @param {string} url The object to serialize.
 * @return {string} Serialized string.
 */
export function qsStringify(qs: querystring.ParsedUrlQueryInput): string {
  return querystring.stringify(qs, '&', '=', {
    encodeURIComponent: (component: string) => encodeURI(component, true),
  });
}

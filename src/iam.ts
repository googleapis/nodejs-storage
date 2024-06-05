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
import {Bucket} from './bucket.js';
import {normalize} from './util.js';
import {
  StorageCallback,
  StorageQueryParameters,
  StorageRequestOptions,
} from './storage-transport.js';

export interface GetPolicyOptions {
  userProject?: string;
  requestedPolicyVersion?: number;
}

export type GetPolicyResponse = [Policy, unknown];

/**
 * @typedef {object} SetPolicyOptions
 * @param {string} [userProject] The ID of the project which will be
 *     billed for the request.
 */
export interface SetPolicyOptions {
  userProject?: string;
}

export interface Policy {
  bindings: PolicyBinding[];
  version?: number;
  etag?: string;
}

export interface PolicyBinding {
  role: string;
  members: string[];
  condition?: Expr;
}

export interface Expr {
  title?: string;
  description?: string;
  expression: string;
}

/**
 * @typedef {object} TestIamPermissionsOptions Configuration options for Iam#testPermissions().
 * @param {string} [userProject] The ID of the project which will be
 *     billed for the request.
 */
export interface TestIamPermissionsOptions {
  userProject?: string;
}

interface GetPolicyRequest {
  userProject?: string;
  optionsRequestedPolicyVersion?: number;
}

export enum IAMExceptionMessages {
  POLICY_OBJECT_REQUIRED = 'A policy object is required.',
  PERMISSIONS_REQUIRED = 'Permissions are required.',
}

/**
 * Get and set IAM policies for your Cloud Storage bucket.
 *
 * See {@link https://cloud.google.com/storage/docs/access-control/iam#short_title_iam_management| Cloud Storage IAM Management}
 * See {@link https://cloud.google.com/iam/docs/granting-changing-revoking-access| Granting, Changing, and Revoking Access}
 * See {@link https://cloud.google.com/iam/docs/understanding-roles| IAM Roles}
 *
 * @constructor Iam
 *
 * @param {Bucket} bucket The parent instance.
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const bucket = storage.bucket('my-bucket');
 * // bucket.iam
 * ```
 */
class Iam {
  #makeRequest: <T>(
    reqOpts: StorageRequestOptions,
    callback?: StorageCallback<T>
  ) => Promise<void> | Promise<T>;
  private resourceId_: string;

  constructor(bucket: Bucket) {
    this.#makeRequest = bucket.storageTransport.makeRequest.bind(bucket);
    this.resourceId_ = 'buckets/' + bucket.getId();
  }

  getPolicy(options?: GetPolicyOptions): Promise<Policy>;
  getPolicy(
    options: GetPolicyOptions,
    callback: StorageCallback<Policy>
  ): Promise<void>;
  getPolicy(callback: StorageCallback<Policy>): Promise<void>;
  /**
   * @typedef {object} GetPolicyOptions Requested options for IAM#getPolicy().
   * @property {number} [requestedPolicyVersion] The version of IAM policies to
   *     request. If a policy with a condition is requested without setting
   *     this, the server will return an error. This must be set to a value
   *     of 3 to retrieve IAM policies containing conditions. This is to
   *     prevent client code that isn't aware of IAM conditions from
   *     interpreting and modifying policies incorrectly. The service might
   *     return a policy with version lower than the one that was requested,
   *     based on the feature syntax in the policy fetched.
   *     See {@link https://cloud.google.com/iam/docs/policies#versions| IAM Policy versions}
   * @property {string} [userProject] The ID of the project which will be
   *     billed for the request.
   */
  /**
   * @typedef {array} GetPolicyResponse
   * @property {Policy} 0 The policy.
   * @property {object} 1 The full API response.
   */
  /**
   * @typedef {object} Policy
   * @property {PolicyBinding[]} policy.bindings Bindings associate members with roles.
   * @property {string} [policy.etag] Etags are used to perform a read-modify-write.
   * @property {number} [policy.version] The syntax schema version of the Policy.
   *      To set an IAM policy with conditional binding, this field must be set to
   *      3 or greater.
   *     See {@link https://cloud.google.com/iam/docs/policies#versions| IAM Policy versions}
   */
  /**
   * @typedef {object} PolicyBinding
   * @property {string} role Role that is assigned to members.
   * @property {string[]} members Specifies the identities requesting access for the bucket.
   * @property {Expr} [condition] The condition that is associated with this binding.
   */
  /**
   * @typedef {object} Expr
   * @property {string} [title] An optional title for the expression, i.e. a
   *     short string describing its purpose. This can be used e.g. in UIs
   *     which allow to enter the expression.
   * @property {string} [description] An optional description of the
   *     expression. This is a longer text which describes the expression,
   *     e.g. when hovered over it in a UI.
   * @property {string} expression Textual representation of an expression in
   *     Common Expression Language syntax. The application context of the
   *     containing message determines which well-known feature set of CEL
   *     is supported.The condition that is associated with this binding.
   *
   * @see [Condition] https://cloud.google.com/storage/docs/access-control/iam#conditions
   */
  /**
   * Get the IAM policy.
   *
   * @param {GetPolicyOptions} [options] Request options.
   * @param {GetPolicyCallback} [callback] Callback function.
   * @returns {Promise<GetPolicyResponse>}
   *
   * See {@link https://cloud.google.com/storage/docs/json_api/v1/buckets/getIamPolicy| Buckets: setIamPolicy API Documentation}
   *
   * @example
   * ```
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   * const bucket = storage.bucket('my-bucket');
   *
   * bucket.iam.getPolicy(
   *     {requestedPolicyVersion: 3},
   *     function(err, policy, apiResponse) {
   *
   *     },
   * );
   *
   * //-
   * // If the callback is omitted, we'll return a Promise.
   * //-
   * bucket.iam.getPolicy({requestedPolicyVersion: 3})
   *   .then(function(data) {
   *     const policy = data[0];
   *     const apiResponse = data[1];
   *   });
   *
   * ```
   * @example <caption>include:samples/iam.js</caption>
   * region_tag:storage_view_bucket_iam_members
   * Example of retrieving a bucket's IAM policy:
   */
  getPolicy(
    optionsOrCallback?: GetPolicyOptions | StorageCallback<Policy>,
    callback?: StorageCallback<Policy>
  ): Promise<Policy | void> {
    const {options, callback: cb} = normalize<
      GetPolicyOptions,
      StorageCallback<Policy>
    >(optionsOrCallback, callback);

    const qs: GetPolicyRequest = {};
    if (options.userProject) {
      qs.userProject = options.userProject;
    }

    if (
      options.requestedPolicyVersion !== null &&
      options.requestedPolicyVersion !== undefined
    ) {
      qs.optionsRequestedPolicyVersion = options.requestedPolicyVersion;
    }

    const reqPromise = this.#makeRequest<Policy>({
      url: '/iam',
      queryParameters: qs as unknown as StorageQueryParameters,
    });

    return cb ? reqPromise.then(resp => cb(null, resp!)).catch(cb) : reqPromise;
  }

  setPolicy(policy: Policy, options?: SetPolicyOptions): Promise<Policy>;
  setPolicy(policy: Policy, callback: StorageCallback<Policy>): Promise<void>;
  setPolicy(
    policy: Policy,
    options: SetPolicyOptions,
    callback: StorageCallback<Policy>
  ): Promise<void>;
  /**
   * Set the IAM policy.
   *
   * @throws {Error} If no policy is provided.
   *
   * @param {Policy} policy The policy.
   * @param {SetPolicyOptions} [options] Configuration options.
   * @param {SetPolicyCallback} callback Callback function.
   * @returns {Promise<SetPolicyResponse>}
   *
   * See {@link https://cloud.google.com/storage/docs/json_api/v1/buckets/setIamPolicy| Buckets: setIamPolicy API Documentation}
   * See {@link https://cloud.google.com/iam/docs/understanding-roles| IAM Roles}
   *
   * @example
   * ```
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   * const bucket = storage.bucket('my-bucket');
   *
   * const myPolicy = {
   *   bindings: [
   *     {
   *       role: 'roles/storage.admin',
   *       members:
   * ['serviceAccount:myotherproject@appspot.gserviceaccount.com']
   *     }
   *   ]
   * };
   *
   * bucket.iam.setPolicy(myPolicy, function(err, policy, apiResponse) {});
   *
   * //-
   * // If the callback is omitted, we'll return a Promise.
   * //-
   * bucket.iam.setPolicy(myPolicy).then(function(data) {
   *   const policy = data[0];
   *   const apiResponse = data[1];
   * });
   *
   * ```
   * @example <caption>include:samples/iam.js</caption>
   * region_tag:storage_add_bucket_iam_member
   * Example of adding to a bucket's IAM policy:
   *
   * @example <caption>include:samples/iam.js</caption>
   * region_tag:storage_remove_bucket_iam_member
   * Example of removing from a bucket's IAM policy:
   */
  setPolicy(
    policy: Policy,
    optionsOrCallback?: SetPolicyOptions | StorageCallback<Policy>,
    callback?: StorageCallback<Policy>
  ): Promise<Policy | void> {
    if (policy === null || typeof policy !== 'object') {
      throw new Error(IAMExceptionMessages.POLICY_OBJECT_REQUIRED);
    }

    const {options, callback: cb} = normalize<
      SetPolicyOptions,
      StorageCallback<Policy>
    >(optionsOrCallback, callback);

    let maxRetries;
    if (policy.etag === undefined) {
      maxRetries = 0;
    }

    const reqPromise = this.#makeRequest<Policy>({
      method: 'PUT',
      url: '/iam',
      maxRetries,
      body: Object.assign(
        {
          resourceId: this.resourceId_,
        },
        policy
      ),
      queryParameters: options as unknown as StorageQueryParameters,
    });

    return cb ? reqPromise.then(resp => cb(null, resp!)).catch(cb) : reqPromise;
  }

  testPermissions(
    permissions: string | string[],
    options?: TestIamPermissionsOptions
  ): Promise<string[]>;
  testPermissions(
    permissions: string | string[],
    callback: StorageCallback<string[]>
  ): Promise<void>;
  testPermissions(
    permissions: string | string[],
    options: TestIamPermissionsOptions,
    callback: StorageCallback<string[]>
  ): Promise<void>;
  /**
   * Test a set of permissions for a resource.
   *
   * @throws {Error} If permissions are not provided.
   *
   * @param {string|string[]} permissions The permission(s) to test for.
   * @param {TestIamPermissionsOptions} [options] Configuration object.
   * @param {TestIamPermissionsCallback} [callback] Callback function.
   * @returns {Promise<TestIamPermissionsResponse>}
   *
   * See {@link https://cloud.google.com/storage/docs/json_api/v1/buckets/testIamPermissions| Buckets: testIamPermissions API Documentation}
   *
   * @example
   * ```
   * const {Storage} = require('@google-cloud/storage');
   * const storage = new Storage();
   * const bucket = storage.bucket('my-bucket');
   *
   * //-
   * // Test a single permission.
   * //-
   * const test = 'storage.buckets.delete';
   *
   * bucket.iam.testPermissions(test, function(err, permissions, apiResponse) {
   *   console.log(permissions);
   *   // {
   *   //   "storage.buckets.delete": true
   *   // }
   * });
   *
   * //-
   * // Test several permissions at once.
   * //-
   * const tests = [
   *   'storage.buckets.delete',
   *   'storage.buckets.get'
   * ];
   *
   * bucket.iam.testPermissions(tests, function(err, permissions) {
   *   console.log(permissions);
   *   // {
   *   //   "storage.buckets.delete": false,
   *   //   "storage.buckets.get": true
   *   // }
   * });
   *
   * //-
   * // If the callback is omitted, we'll return a Promise.
   * //-
   * bucket.iam.testPermissions(test).then(function(data) {
   *   const permissions = data[0];
   *   const apiResponse = data[1];
   * });
   * ```
   */
  testPermissions(
    permissions: string | string[],
    optionsOrCallback?: TestIamPermissionsOptions | StorageCallback<string[]>,
    callback?: StorageCallback<string[]>
  ): Promise<string[] | void> {
    if (!Array.isArray(permissions) && typeof permissions !== 'string') {
      throw new Error(IAMExceptionMessages.PERMISSIONS_REQUIRED);
    }

    const {options, callback: cb} = normalize<
      TestIamPermissionsOptions,
      StorageCallback<string[]>
    >(optionsOrCallback, callback);

    const permissionsArray = Array.isArray(permissions)
      ? permissions
      : [permissions];

    const req = Object.assign(
      {
        permissions: permissionsArray,
      },
      options
    );

    const reqPromise = this.#makeRequest<{
      kind: string;
      permissions?: string[];
    }>({
      method: 'GET',
      url: '/iam/testPermissions',
      queryParameters: req as unknown as StorageQueryParameters,
    });

    return cb
      ? reqPromise
          .then(resp => {
            return resp?.permissions;
          })
          .catch(cb)
      : reqPromise.then(resp => resp?.permissions);
  }
}

export {Iam};

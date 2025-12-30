// Copyright 2021 Google LLC
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
  Bucket,
  File,
  Notification,
  Storage,
  HmacKey,
  Policy,
  GaxiosError,
} from '../src';
import * as path from 'path';
import {
  createTestBuffer,
  createTestFileFromBuffer,
  deleteTestFile,
} from './testBenchUtil';
import * as uuid from 'uuid';
import {getDirName} from '../src/util.js';
import {
  StorageTransport,
  StorageRequestOptions,
} from '../src/storage-transport';

const FILE_SIZE_BYTES = 9 * 1024 * 1024;
const CHUNK_SIZE_BYTES = 2 * 1024 * 1024;

export interface ConformanceTestOptions {
  bucket?: Bucket;
  file?: File;
  notification?: Notification;
  storage?: Storage;
  hmacKey?: HmacKey;
  preconditionRequired?: boolean;
  storageTransport?: StorageTransport;
  projectId?: string;
}

/////////////////////////////////////////////////
//////////////////// BUCKET /////////////////////
/////////////////////////////////////////////////

export async function addLifecycleRuleInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return addLifecycleRule(options);
}

export async function addLifecycleRule(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({
      lifecycle: {
        rule: [
          {
            action: {type: 'Delete'},
            condition: {age: 1095},
          },
        ],
      },
    }),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function combineInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return combine(options);
}

export async function combine(options: ConformanceTestOptions) {
  const file1 = options.bucket!.file('file1.txt');
  const file2 = options.bucket!.file('file2.txt');
  await file1.save('file1 contents');
  await file2.save('file2 contents');

  const destinationFile = encodeURIComponent('all-files.txt');
  const body = {
    sourceObjects: [{name: file1.name}, {name: file2.name}],
  };

  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${destinationFile}/compose`,
    body: JSON.stringify(body),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifGenerationMatch = 0;
  } else {
    delete requestOptions.queryParameters!.ifGenerationMatch;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function create(options: ConformanceTestOptions) {
  if (!options.storageTransport || !options.projectId || !options.bucket) {
    throw new Error(
      'storageTransport, projectId, and bucket are required for the create test.',
    );
  }
  const bucketName = options.bucket.name;
  let bucketExists = false;
  try {
    const existsReq: StorageRequestOptions = {
      method: 'GET',
      url: `storage/v1/b/${bucketName}`,
    };
    await options.storageTransport.makeRequest(existsReq);
    bucketExists = true;
  } catch (error: unknown) {
    const gaxiosError = error as GaxiosError;
    if (gaxiosError.response?.status === 404) {
      console.log(`Bucket ${bucketName} does not exist.`);
    } else {
      console.warn(`Error checking existence of ${bucketName}:`, gaxiosError);
      throw error;
    }
  }

  if (bucketExists) {
    let pageToken: string | undefined = undefined;
    do {
      const listReq: StorageRequestOptions = {
        method: 'GET',
        url: `storage/v1/b/${bucketName}/o`,
        queryParameters: pageToken ? {pageToken} : undefined,
      };
      try {
        const listResult = await options.storageTransport.makeRequest(listReq);
        const objects = (listResult as any)?.items || [];

        for (const obj of objects) {
          const deleteObjReq: StorageRequestOptions = {
            method: 'DELETE',
            url: `storage/v1/b/${bucketName}/o/${obj.name}`,
          };
          try {
            await options.storageTransport.makeRequest(deleteObjReq);
          } catch (deleteErr: unknown) {
            console.warn(`Error deleting object ${obj.name}:`, deleteErr);
          }
        }
        pageToken = (listResult as any)?.nextPageToken;
      } catch (listErr: unknown) {
        // pageToken = undefined;
        console.error(
          `Error listing objects in bucket ${bucketName}:`,
          listErr,
        );
        throw listErr;
      }
    } while (pageToken);

    const deleteBucketReq: StorageRequestOptions = {
      method: 'DELETE',
      url: `storage/v1/b/${bucketName}`,
    };
    try {
      await options.storageTransport.makeRequest(deleteBucketReq);
    } catch (deleteErr: unknown) {
      const gaxiosError = deleteErr as GaxiosError;
      if (gaxiosError.response?.status !== 404) {
        throw deleteErr;
      }
    }
  }

  const createRequest: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b?project=${options.projectId}`,
    body: JSON.stringify({name: bucketName}),
    headers: {'Content-Type': 'application/json'},
  };
  await options.storageTransport.makeRequest(createRequest);
}

export async function createNotification(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/notificationConfigs`,
    body: JSON.stringify({
      topic: 'my-topic',
    }),
    headers: {'Content-Type': 'application/json'},
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function deleteBucket(options: ConformanceTestOptions) {
  try {
    await options.bucket!.deleteFiles();
  } catch (err: any) {
    const message = err.message || '';
    if (!message.includes('does not exist') && err.code !== 404) {
      console.log(err);
      throw err;
    }
  }
  const requestOptions: StorageRequestOptions = {
    method: 'DELETE',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 1;
  }
  return await options.storageTransport!.makeRequest(requestOptions);
}

// Note: bucket.deleteFiles is missing from these tests
// Preconditions cannot be implemented with current setup.

export async function deleteLabelsInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return deleteLabels(options);
}

export async function deleteLabels(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({labels: null}),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function disableRequesterPaysInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return disableRequesterPays(options);
}

export async function disableRequesterPays(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({billing: {requesterPays: false}}),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function enableLoggingInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return enableLogging(options);
}

export async function enableLogging(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({
      logging: {
        logBucket: options.bucket!.name,
        logObjectPrefix: 'log',
      },
    }),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function enableRequesterPaysInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return enableRequesterPays(options);
}

export async function enableRequesterPays(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({billing: {requesterPays: true}}),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function bucketExists(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
  };

  try {
    await options.storageTransport!.makeRequest(requestOptions);
    return true;
  } catch (err: unknown) {
    const gaxiosError = err as GaxiosError;
    if (gaxiosError.response?.status === 404) {
      return false;
    }
    throw err;
  }
}

export async function bucketGet(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function getFilesStream(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function getLabels(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    queryParameters: {
      fields: 'labels',
    },
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function bucketGetMetadata(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    queryParameters: {
      projection: 'full',
    },
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function getNotifications(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/notificationConfigs`,
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function lock(options: ConformanceTestOptions) {
  const metageneration = 1;
  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/lockRetentionPolicy`,
    queryParameters: {
      ifMetagenerationMatch: metageneration,
    },
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function bucketMakePrivateInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return bucketMakePrivate(options);
}

export async function bucketMakePrivate(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({acl: []}),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function bucketMakePublic(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/acl`,
    body: JSON.stringify({
      entity: 'allUsers',
      role: 'READER',
    }),
    headers: {'Content-Type': 'application/json'},
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function removeRetentionPeriodInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return removeRetentionPeriod(options);
}

export async function removeRetentionPeriod(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({retentionPolicy: null}),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function setCorsConfigurationInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return setCorsConfiguration(options);
}

export async function setCorsConfiguration(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({cors: [{maxAgeSeconds: 3600}]}),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function setLabelsInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return setLabels(options);
}

export async function setLabels(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({
      labels: {labelone: 'labelonevalue', labeltwo: 'labeltwovalue'},
    }),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function bucketSetMetadataInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return bucketSetMetadata(options);
}

export async function bucketSetMetadata(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({
      website: {
        mainPageSuffix: 'http://example.com',
        notFoundPage: 'http://example.com/404.html',
      },
    }),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function setRetentionPeriodInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return setRetentionPeriod(options);
}

export async function setRetentionPeriod(options: ConformanceTestOptions) {
  const DURATION_SECONDS = 15780000;
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({
      retentionPolicy: {retentionPeriod: DURATION_SECONDS.toString()},
    }),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function bucketSetStorageClassInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return bucketSetStorageClass(options);
}

export async function bucketSetStorageClass(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    body: JSON.stringify({storageClass: 'NEARLINE'}),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function bucketUploadResumableInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return bucketUploadResumable(options);
}

export async function bucketUploadResumable(options: ConformanceTestOptions) {
  const fileName = `resumable-file-${uuid.v4()}.txt`;

  const initiateOptions: StorageRequestOptions = {
    method: 'POST',
    url: `upload/storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
    queryParameters: {
      uploadType: 'resumable',
      name: fileName,
    },
    headers: {'X-Upload-Content-Type': 'text/plain'},
  };

  if (options.preconditionRequired) {
    initiateOptions.queryParameters = initiateOptions.queryParameters || {};
    initiateOptions.queryParameters.ifGenerationMatch = 0;
  }

  const response: any =
    await options.storageTransport!.makeRequest(initiateOptions);

  const sessionUri = response.headers?.location;

  return await options.storageTransport!.makeRequest({
    method: 'PUT',
    url: sessionUri,
    body: 'test-data-content',
  });
}

export async function bucketUploadMultipartInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return bucketUploadMultipart(options);
}

export async function bucketUploadMultipart(options: ConformanceTestOptions) {
  const fileName = 'retryStrategyTestData.json';
  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `upload/storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
    queryParameters: {
      uploadType: 'multipart',
      name: fileName,
    },
    headers: {'Content-Type': 'multipart/related'},
    body: JSON.stringify({name: fileName, contentType: 'application/json'}),
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifGenerationMatch = 0;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

/////////////////////////////////////////////////
//////////////////// FILE /////////////////////
/////////////////////////////////////////////////

export async function copy(options: ConformanceTestOptions) {
  const sourceBucket = options.bucket!.name;
  const sourceFile = encodeURIComponent(options.file!.name);
  const destinationFile = encodeURIComponent('a-different-file.png');

  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${sourceBucket}/o/${sourceFile}/rewriteTo/b/${sourceBucket}/o/${destinationFile}`,
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifGenerationMatch =
      options.file!.metadata.generation;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function createReadStream(options: ConformanceTestOptions) {
  return download(options);
}

export async function createResumableUploadInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return createResumableUpload(options);
}

export async function createResumableUpload(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `upload/storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
    queryParameters: {
      uploadType: 'resumable',
      name: options.file!.name,
    },
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifGenerationMatch = 0;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function fileDeleteInstancePrecondition(
  options: ConformanceTestOptions,
) {
  const requestOptions: StorageRequestOptions = {
    method: 'DELETE',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    queryParameters: {
      ifGenerationMatch: options.file!.metadata.generation,
    },
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function fileDelete(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'DELETE',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifGenerationMatch =
      options.file!.metadata.generation;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function download(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    queryParameters: {alt: 'media'},
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function exists(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
  };

  try {
    await options.storageTransport!.makeRequest(requestOptions);
    return true;
  } catch (err: any) {
    if (err.code === 404) return false;
    throw err;
  }
}

export async function get(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function getExpirationDate(options: ConformanceTestOptions) {
  return get(options);
}

export async function getMetadata(options: ConformanceTestOptions) {
  return get(options);
}

export async function isPublic(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}/acl/allUsers`,
  };
  // eslint-disable-next-line no-useless-catch
  try {
    await options.storageTransport!.makeRequest(requestOptions);
    return true;
  } catch (err: unknown) {
    const gaxiosError = err as GaxiosError;
    const status = gaxiosError.response?.status || gaxiosError.code;
    const message = gaxiosError.message || '';
    if (status === 404 || message.includes('ACL allUsers does not exist')) {
      throw gaxiosError;
    }
    throw gaxiosError; // This should cause assert.rejects to pass
  }
}

export async function fileMakePrivateInstancePrecondition(
  options: ConformanceTestOptions,
) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    queryParameters: {
      ifMetagenerationMatch: options.file!.metadata.metageneration,
    },
    body: JSON.stringify({acl: []}),
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function fileMakePrivate(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    body: JSON.stringify({acl: []}),
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch =
      options.file!.metadata.metageneration;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function fileMakePublic(options: ConformanceTestOptions) {
  const fileName = encodeURIComponent(options.file!.name);
  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${fileName}/acl`,
    body: JSON.stringify({
      entity: 'allUsers',
      role: 'READER',
    }),
    headers: {'Content-Type': 'application/json'},
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function move(options: ConformanceTestOptions) {
  const sourceBucket = options.bucket!.name;
  const sourceFile = encodeURIComponent(options.file!.name);
  const destinationFile = encodeURIComponent('new-file');

  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${sourceBucket}/o/${sourceFile}/rewriteTo/b/${sourceBucket}/o/${destinationFile}`,
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifGenerationMatch = 0;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function rename(options: ConformanceTestOptions) {
  const sourceBucket = options.bucket!.name;
  const sourceFile = encodeURIComponent(options.file!.name);
  const destinationFile = encodeURIComponent('new-name');

  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${sourceBucket}/o/${sourceFile}/rewriteTo/b/${sourceBucket}/o/${destinationFile}`,
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifGenerationMatch = 0;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function rotateEncryptionKey(options: ConformanceTestOptions) {
  const bucketName = options.bucket!.name;
  const fileName = encodeURIComponent(options.file!.name);

  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${bucketName}/o/${fileName}/rewriteTo/b/${bucketName}/o/${fileName}`,
    headers: {
      'x-goog-copy-source-encryption-algorithm': 'AES256',
    },
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifGenerationMatch =
      options.file!.metadata.generation;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function saveResumableInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return saveResumable(options);
}

export async function saveResumable(options: ConformanceTestOptions) {
  const fileName = encodeURIComponent(options.file!.name);

  const initiateOptions: StorageRequestOptions = {
    method: 'POST',
    url: `upload/storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
    queryParameters: {
      uploadType: 'resumable',
      name: fileName,
    },
    body: JSON.stringify({name: options.file!.name}),
    headers: {'Content-Type': 'application/json'},
  };

  if (options.preconditionRequired) {
    initiateOptions.queryParameters = initiateOptions.queryParameters || {};
    initiateOptions.queryParameters.ifGenerationMatch =
      options.file!.metadata.generation;
  }

  const response: any =
    await options.storageTransport!.makeRequest(initiateOptions);
  const sessionUri = response.headers?.location;

  return await options.storageTransport!.makeRequest({
    method: 'PUT',
    url: sessionUri,
    body: 'file-save-content',
  });
}

export async function saveMultipartInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return saveMultipart(options);
}

export async function saveMultipart(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `upload/storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
    queryParameters: {
      uploadType: 'multipart',
      name: options.file!.name,
    },
    headers: {'Content-Type': 'multipart/related'},
    body: 'testdata',
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifGenerationMatch =
      options.file!.metadata.generation;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function setMetadataInstancePrecondition(
  options: ConformanceTestOptions,
) {
  const metadata = {
    contentType: 'application/x-font-ttf',
    metadata: {my: 'custom', properties: 'go here'},
  };

  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    queryParameters: {
      ifMetagenerationMatch: options.file!.metadata.metageneration,
    },
    body: JSON.stringify(metadata),
    headers: {'Content-Type': 'application/json'},
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function setMetadata(options: ConformanceTestOptions) {
  const metadata = {
    contentType: 'application/x-font-ttf',
    metadata: {my: 'custom', properties: 'go here'},
  };

  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    body: JSON.stringify(metadata),
    headers: {'Content-Type': 'application/json'},
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifMetagenerationMatch =
      options.file!.metadata.metageneration;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function setStorageClass(options: ConformanceTestOptions) {
  const bucketName = encodeURIComponent(options.bucket!.name);
  const fileName = encodeURIComponent(options.file!.name);

  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${bucketName}/o/${fileName}`,
    body: JSON.stringify({storageClass: 'NEARLINE'}),
    headers: {'Content-Type': 'application/json'},
    queryParameters: {},
  };

  if (options.preconditionRequired) {
    requestOptions.queryParameters!.ifGenerationMatch =
      options.file!.metadata.generation;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

// /////////////////////////////////////////////////
// /////////////////// HMAC KEY ////////////////////
// /////////////////////////////////////////////////

export async function deleteHMAC(options: ConformanceTestOptions) {
  // await setMetadataHMAC(options);
  await options.storageTransport!.makeRequest({
    method: 'PUT',
    url: `storage/v1/projects/${options.projectId}/hmacKeys/${options.hmacKey!.metadata.accessId}`,
    body: JSON.stringify({state: 'INACTIVE'}),
    // Ensure this specific call does NOT include the x-retry-test-id if possible,
    // or handle it before the test starts in the 'before' block.
    headers: {'x-retry-test-id': ''},
  });
  return await options.storageTransport!.makeRequest({
    method: 'DELETE',
    url: `storage/v1/projects/${options.projectId}/hmacKeys/${options.hmacKey!.metadata.accessId}`,
  });
}

export async function getHMAC(options: ConformanceTestOptions) {
  return await options.storageTransport!.makeRequest({
    method: 'GET',
    url: `storage/v1/projects/${options.projectId}/hmacKeys/${options.hmacKey!.metadata.accessId}`,
  });
}

export async function getMetadataHMAC(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/projects/${options.projectId}/hmacKeys/${options.hmacKey!.metadata.accessId}`,
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function setMetadataHMAC(options: ConformanceTestOptions) {
  return await options.storageTransport!.makeRequest({
    method: 'PUT',
    url: `storage/v1/projects/${options.projectId}/hmacKeys/${options.hmacKey!.metadata.accessId}`,
    body: JSON.stringify({state: 'INACTIVE'}),
  });
}

/////////////////////////////////////////////////
////////////////////// IAM //////////////////////
/////////////////////////////////////////////////

export async function iamGetPolicy(options: ConformanceTestOptions) {
  return await options.storageTransport!.makeRequest({
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/iam`,
    queryParameters: {optionsRequestedPolicyVersion: 1},
  });
}

export async function iamSetPolicy(options: ConformanceTestOptions) {
  const body: Policy = {
    bindings: [
      {
        role: 'roles/storage.admin',
        members: ['serviceAccount:myotherproject@appspot.gserviceaccount.com'],
      },
    ],
  };

  if (options.preconditionRequired) {
    // In conformance tests, we usually use the etag from the existing bucket object
    body.etag = options.bucket!.metadata.etag;
  }

  return await options.storageTransport!.makeRequest({
    method: 'PUT',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/iam`,
    body: JSON.stringify(body),
  });
}

export async function iamTestPermissions(options: ConformanceTestOptions) {
  return await options.storageTransport!.makeRequest({
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/iam/testPermissions`,
    queryParameters: {permissions: 'storage.buckets.delete'},
  });
}

/////////////////////////////////////////////////
///////////////// NOTIFICATION //////////////////
/////////////////////////////////////////////////

export async function notificationDelete(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'DELETE',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/notificationConfigs/${options.notification!.id}`,
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function notificationCreate(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/notificationConfigs`,
    body: JSON.stringify({
      topic: 'my-topic',
      payload_format: 'JSON_API_V1',
    }),
    headers: {'Content-Type': 'application/json'},
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function notificationExists(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/notificationConfigs/${options.notification!.id}`,
  };

  try {
    await options.storageTransport!.makeRequest(requestOptions);
    return true;
  } catch (err: any) {
    if (err.code === 404) return false;
    throw err;
  }
}

export async function notificationGet(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/notificationConfigs/${options.notification!.id}`,
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function notificationGetMetadata(options: ConformanceTestOptions) {
  return notificationGet(options);
}

/////////////////////////////////////////////////
/////////////////// STORAGE /////////////////////
/////////////////////////////////////////////////

export async function createBucket(options: ConformanceTestOptions) {
  const bucketName = 'test-creating-bucket';
  const bucket = options.storage!.bucket(bucketName);

  const [exists] = await bucket.exists();
  if (exists) {
    await bucket.delete();
  }
  const requestBody = {
    name: bucketName,
    projectId: options.projectId,
  };

  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b?project=${options.projectId}`,
    body: JSON.stringify(requestBody),
    headers: {'Content-Type': 'application/json'},
  };

  // This call will be intercepted by the Proxy in conformanceCommon.ts
  // and will have the 'x-retry-test-id' added automatically.
  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function createHMACKey(options: ConformanceTestOptions) {
  const serviceAccountEmail = 'my-service-account@appspot.gserviceaccount.com';
  return await options.storageTransport!.makeRequest({
    method: 'POST',
    url: `storage/v1/projects/${options.projectId}/hmacKeys`,
    queryParameters: {serviceAccountEmail},
  });
}

export async function getBuckets(options: ConformanceTestOptions) {
  return await options.storageTransport!.makeRequest({
    method: 'GET',
    url: 'storage/v1/b',
    queryParameters: {project: options.projectId},
  });
}

export async function getBucketsStream(options: ConformanceTestOptions) {
  return getBuckets(options);
}

export async function getHMACKeyStream(options: ConformanceTestOptions) {
  const serviceAccountEmail = 'my-service-account@appspot.gserviceaccount.com';
  return await options.storageTransport!.makeRequest({
    method: 'GET',
    url: `storage/v1/projects/${options.projectId}/hmacKeys`,
    queryParameters: {serviceAccountEmail},
  });
}

export async function getServiceAccount(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/projects/${options.projectId}/serviceAccount`,
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function combineInstancePrecondition(
  options: ConformanceTestOptions,
) {
  return combine(options);
}

export async function combine(options: ConformanceTestOptions) {
  const destinationFile = encodeURIComponent('all-files.txt');
  const body = {
    sourceObjects: [{name: 'file1.txt'}, {name: 'file2.txt'}],
  };

  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${destinationFile}/compose`,
    body: JSON.stringify(body),
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifGenerationMatch =
      options.file!.metadata.generation;
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
    if (gaxiosError.code === 404) {
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
        params: pageToken ? {pageToken} : undefined,
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
        pageToken = undefined;
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
      if (gaxiosError.code !== 404) {
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
  await options.bucket!.deleteFiles();
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
  } catch (err: any) {
    if (err.code === 404) {
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
    params: {
      fields: 'labels',
    },
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function bucketGetMetadata(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}`,
    params: {
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
    params: {
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifMetagenerationMatch = 2;
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
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
    params: {
      uploadType: 'resumable',
      name: fileName,
    },
    headers: {'X-Upload-Content-Type': 'text/plain'},
  };

  if (options.preconditionRequired) {
    initiateOptions.params!.ifGenerationMatch = 0;
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
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
    params: {
      uploadType: 'multipart',
      name: fileName,
    },
    body: JSON.stringify({name: fileName, contentType: 'application/json'}),
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifGenerationMatch = 0;
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
    url: `storage/v1/b/${sourceBucket}/o/${sourceFile}/rewriteTostorage/v1/b/${sourceBucket}/o/${destinationFile}`,
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifGenerationMatch =
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
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
    params: {
      uploadType: 'resumable',
      name: options.file!.name,
    },
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifGenerationMatch = 0;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function fileDeleteInstancePrecondition(
  options: ConformanceTestOptions,
) {
  const requestOptions: StorageRequestOptions = {
    method: 'DELETE',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    params: {
      ifGenerationMatch: options.file!.metadata.generation,
    },
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function fileDelete(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'DELETE',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifGenerationMatch =
      options.file!.metadata.generation;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function download(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    params: {alt: 'media'},
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
  await options.storageTransport!.makeRequest(requestOptions);
  return true;
}

export async function fileMakePrivateInstancePrecondition(
  options: ConformanceTestOptions,
) {
  const requestOptions: StorageRequestOptions = {
    method: 'PATCH',
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o/${encodeURIComponent(options.file!.name)}`,
    params: {
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params.ifMetagenerationMatch =
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
    url: `storage/v1/b/${sourceBucket}/o/${sourceFile}/rewriteTostorage/v1/b/${sourceBucket}/o/${destinationFile}`,
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifGenerationMatch = 0;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function rename(options: ConformanceTestOptions) {
  const sourceBucket = options.bucket!.name;
  const sourceFile = encodeURIComponent(options.file!.name);
  const destinationFile = encodeURIComponent('new-name');

  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${sourceBucket}/o/${sourceFile}/rewriteTostorage/v1/b/${sourceBucket}/o/${destinationFile}`,
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifGenerationMatch = 0;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function rotateEncryptionKey(options: ConformanceTestOptions) {
  const bucketName = options.bucket!.name;
  const fileName = encodeURIComponent(options.file!.name);

  const requestOptions: StorageRequestOptions = {
    method: 'POST',
    url: `storage/v1/b/${bucketName}/o/${fileName}/rewriteTostorage/v1/b/${bucketName}/o/${fileName}`,
    headers: {
      'x-goog-copy-source-encryption-algorithm': 'AES256',
    },
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifGenerationMatch =
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
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
    params: {
      uploadType: 'resumable',
      name: fileName,
    },
  };

  if (options.preconditionRequired) {
    initiateOptions.params!.ifGenerationMatch =
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
    url: `storage/v1/b/${encodeURIComponent(options.bucket!.name)}/o`,
    params: {
      uploadType: 'multipart',
      name: options.file!.name,
    },
    body: 'testdata',
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifGenerationMatch =
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
    params: {
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params.ifMetagenerationMatch =
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
    params: {},
  };

  if (options.preconditionRequired) {
    requestOptions.params!.ifGenerationMatch =
      options.file!.metadata.generation;
  }

  return await options.storageTransport!.makeRequest(requestOptions);
}

// /////////////////////////////////////////////////
// /////////////////// HMAC KEY ////////////////////
// /////////////////////////////////////////////////

export async function deleteHMAC(options: ConformanceTestOptions) {
  await setMetadataHMAC(options);
  return await options.storageTransport!.makeRequest({
    method: 'DELETE',
    url: `projects/${options.projectId}/hmacKeys/${options.hmacKey!.metadata.accessId}`,
  });
}

export async function getHMAC(options: ConformanceTestOptions) {
  return await options.storageTransport!.makeRequest({
    method: 'GET',
    url: `projects/${options.projectId}/hmacKeys/${options.hmacKey!.metadata.accessId}`,
  });
}

export async function getMetadataHMAC(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `projects/${options.projectId}/hmacKeys/${options.hmacKey!.metadata.accessId}`,
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

export async function setMetadataHMAC(options: ConformanceTestOptions) {
  return await options.storageTransport!.makeRequest({
    method: 'PUT',
    url: `projects/${options.projectId}/hmacKeys/${options.hmacKey!.metadata.accessId}`,
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
    params: {optionsRequestedPolicyVersion: 1},
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
    params: {permissions: 'storage.buckets.delete'},
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
    url: `b?project=${options.projectId}`,
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
    url: `projects/${options.projectId}/hmacKeys`,
    params: {serviceAccountEmail},
  });
}

export async function getBuckets(options: ConformanceTestOptions) {
  return await options.storageTransport!.makeRequest({
    method: 'GET',
    url: 'b',
    params: {project: options.projectId},
  });
}

export async function getBucketsStream(options: ConformanceTestOptions) {
  return getBuckets(options);
}

export async function getHMACKeyStream(options: ConformanceTestOptions) {
  const serviceAccountEmail = 'my-service-account@appspot.gserviceaccount.com';
  return await options.storageTransport!.makeRequest({
    method: 'GET',
    url: `projects/${options.projectId}/hmacKeys`,
    params: {serviceAccountEmail},
  });
}

export async function getServiceAccount(options: ConformanceTestOptions) {
  const requestOptions: StorageRequestOptions = {
    method: 'GET',
    url: `storage/v1/projects/${options.projectId}/serviceAccount`,
  };

  return await options.storageTransport!.makeRequest(requestOptions);
}

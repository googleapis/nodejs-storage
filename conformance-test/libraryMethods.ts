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

import {O_APPEND} from 'constants';
import {file} from 'tmp';
import {Bucket, File, HmacKey, Iam, Notification, Storage} from '../src';
const fs = require('fs');

/////////////////////////////////////////////////
//////////////////// BUCKET /////////////////////
/////////////////////////////////////////////////

async function addLifecycleRule(bucket: Bucket) {
  await bucket.addLifecycleRule({
    action: 'delete',
    condition: {
      age: 365 * 3, // Specified in days.
    },
  });
}

async function combine(bucket: Bucket) {
  const sources = [bucket.file('file1.txt'), bucket.file('file2.txt')];
  const allFiles = bucket.file('all-files.txt');

  await bucket.combine(sources, allFiles);
}

async function create(bucket: Bucket) {
  await bucket.create();
}

async function createNotification(bucket: Bucket) {
  await bucket.createNotification('my-topic');
}

async function deleteBucket(bucket: Bucket) {
  await bucket.delete();
}

async function deleteFiles(bucket: Bucket) {
  await bucket.deleteFiles();
}

async function deleteLabels(bucket: Bucket) {
  await bucket.deleteLabels();
}

async function disableRequesterPays(bucket: Bucket) {
  await bucket.disableRequesterPays();
}

async function enableLogging(bucket: Bucket) {
  const config = {
    prefix: 'log',
  };
  await bucket.enableLogging(config);
}

async function enableRequesterPays(bucket: Bucket) {
  await bucket.enableRequesterPays();
}

async function bucketExists(bucket: Bucket) {
  await bucket.exists();
}

async function bucketGet(bucket: Bucket) {
  await bucket.get();
}

async function getFilesStream(bucket: Bucket) {
  await bucket.getFilesStream();
}

async function getLabels(bucket: Bucket) {
  // await bucket.getLabels(); //TODO shaffeeulah@: figure out why it has a parameter here
}

async function bucketGetMetadata(bucket: Bucket) {
  await bucket.getMetadata();
}

async function getNotifications(bucket: Bucket) {
  await bucket.getNotifications();
}

async function lock(bucket: Bucket) {
  const metageneration = 0;
  await bucket.lock(metageneration);
}

async function bucketMakePrivate(bucket: Bucket) {
  await bucket.makePrivate();
}

async function bucketMakePublic(bucket: Bucket) {
  await bucket.makePublic();
}

async function removeRetentionPeriod(bucket: Bucket) {
  await bucket.removeRetentionPeriod();
}

async function setCorsConfiguration(bucket: Bucket) {
  const corsConfiguration = [{maxAgeSeconds: 3600}]; // 1 hour
  await bucket.setCorsConfiguration(corsConfiguration);
}

async function setLabels(bucket: Bucket) {
  const labels = {
    labelone: 'labelonevalue',
    labeltwo: 'labeltwovalue',
  };
  await bucket.setLabels(labels);
}

async function bucketSetMetadata(bucket: Bucket) {
  const metadata = {
    website: {
      mainPageSuffix: 'http://example.com',
      notFoundPage: 'http://example.com/404.html',
    },
  };
  await bucket.setMetadata(metadata);
}

async function setRetentionPeriod(bucket: Bucket) {
  const DURATION_SECONDS = 15780000; // 6 months.
  await bucket.setRetentionPeriod(DURATION_SECONDS);
}

async function bucketSetStorageClass(bucket: Bucket) {
  await bucket.setStorageClass('nearline');
}

function bucketSetUserProject(bucket: Bucket) {
  bucket.setUserProject('test-setting-user-project');
}

async function bucketUpload(bucket: Bucket, resumableSetting: boolean) {
  await bucket.upload('testFile.txt', {resumable: resumableSetting});
}

/////////////////////////////////////////////////
//////////////////// FILE /////////////////////
/////////////////////////////////////////////////

async function copy(file: File) {
  await file.copy('a-different-file.png');
}

async function createReadStream(file: File) {
  const localFile = 'testFile.txt';
  await file.createReadStream().pipe(fs.createWriteStream(localFile));
}

async function createResumableUpload(file: File) {
  await file.createResumableUpload();
}

async function createWriteStream(file: File, resumableSetting: boolean) {
  await fs
    .createReadStream('testFile.txt')
    .pipe(file.createWriteStream({resumable: resumableSetting}));
}

async function fileDelete(file: File) {
  await file.delete();
}

// I don't think this makes a request. Waiting for response on go/nodejs-gcs-client-retry-state
// async function deleteResumableCache(file: File) {
//   await file.deleteResumableCache();
// }

async function download(file: File) {
  await file.download();
}

async function exists(file: File) {
  await file.exists();
}

async function generateSignedPostPolicyV2(file: File) {
  const options = {
    equals: ['$Content-Type', 'image/jpeg'],
    expires: '10-25-2022',
    contentLengthRange: {
      min: 0,
      max: 1024,
    },
  };
  await file.generateSignedPostPolicyV2(options);
}

async function generateSignedPostPolicyV4(file: File) {
  const options = {
    expires: '04-30-2021',
    conditions: [
      ['eq', '$Content-Type', 'image/jpeg'],
      ['content-length-range', 0, 1024],
    ],
    fields: {
      acl: 'public-read',
      'x-goog-meta-foo': 'bar',
      'x-ignore-mykey': 'data',
    },
  };

  await file.generateSignedPostPolicyV4(options);
}

async function get(file: File) {
  await file.get();
}

async function getExpirationDate(file: File) {
  await file.getExpirationDate();
}

async function getMetadata(file: File) {
  await file.getMetadata();
}

async function isPublic(file: File) {
  await file.isPublic();
}

async function fileMakePrivate(file: File) {
  await file.makePrivate();
}

async function fileMakePublic(file: File) {
  await file.makePublic();
}

async function move(file: File) {
  await file.move('new-file');
}

async function rename(file: File) {
  await file.rename('new-name');
}

async function rotateEncryptionKey(file: File) {
  const crypto = require('crypto');
  const buffer = crypto.randomBytes(32);
  const newKey = buffer.toString('base64');
  await file.rotateEncryptionKey({
    encryptionKey: Buffer.from(newKey, 'base64'),
  });
}

async function save(file: File, resumableSetting: boolean) {
  await file.save('testdata', {resumable: resumableSetting});
}

//TODO: shaffeeullah@ Documented in go/nodejs-gcs-client-retry-state as not making a request. Maybe we dont need this
async function setEncryptionKey(file: File) {
  const crypto = require('crypto');
  const buffer = crypto.randomBytes(32);
  console.log(await file.setEncryptionKey(buffer));
}

async function setMetadata(file: File) {
  const metadata = {
    contentType: 'application/x-font-ttf',
    metadata: {
      my: 'custom',
      properties: 'go here',
    },
  };
  await file.setMetadata(metadata);
}

async function setStorageClass(file: File) {
  await file.setStorageClass('nearline');
}

//TODO: shaffeeullah@ Documented in go/nodejs-gcs-client-retry-state as not making a request. Maybe we dont need this
function fileSetUserProject(file: File) {
  file.setUserProject('test-setting-user-project');
}

/////////////////////////////////////////////////
/////////////////// HMAC KEY ////////////////////
/////////////////////////////////////////////////

async function deleteHMAC(hmacKey: HmacKey) {
  await hmacKey.delete();
}

async function getHMAC(hmacKey: HmacKey) {
  await hmacKey.get();
}

async function getMetadataHMAC(hmacKey: HmacKey) {
  await hmacKey.getMetadata();
}

async function setMetadataHMAC(hmacKey: HmacKey) {
  const metadata = {
    state: 'INACTIVE',
  };
  await hmacKey.setMetadata(metadata);
}

/////////////////////////////////////////////////
////////////////////// IAM //////////////////////
/////////////////////////////////////////////////

async function iamGetPolicy(iam: Iam) {
  await iam.getPolicy({requestedPolicyVersion: 1});
}

async function iamSetPolicy(iam: Iam) {
  const testPolicy = {
    bindings: [
      {
        role: 'roles/storage.admin',
        members: ['serviceAccount:myotherproject@appspot.gserviceaccount.com'],
      },
    ],
  };
  await iam.setPolicy(testPolicy);
}

async function iamTestPermissions(iam: Iam) {
  const permissionToTest = 'storage.buckets.delete';
  await iam.testPermissions(permissionToTest);
}

/////////////////////////////////////////////////
///////////////// NOTIFICATION //////////////////
/////////////////////////////////////////////////

async function notificationDelete(notification: Notification) {
  await notification.delete();
}

async function notificationCreate(notification: Notification) {
  await notification.create();
}

async function notificationExists(notification: Notification) {
  await notification.exists();
}

async function notificationGet(notification: Notification) {
  await notification.get();
}

async function notificationGetMetadata(notification: Notification) {
  await notification.getMetadata();
}

/////////////////////////////////////////////////
/////////////////// STORAGE /////////////////////
/////////////////////////////////////////////////

async function createBucket(storage: Storage) {
  await storage.createBucket('test-creating-bucket');
}

async function createHMACKey(storage: Storage) {
  const serviceAccountEmail = 'my-service-account@appspot.gserviceaccount.com';
  await storage.createHmacKey(serviceAccountEmail);
}

async function getBuckets(storage: Storage) {
  await storage.getBuckets();
}

function getBucketsStream(storage: Storage) {
  storage.getBucketsStream();
}

function getHMACKeyStream(storage: Storage) {
  storage.getHmacKeysStream();
}

async function getServiceAccount(storage: Storage) {
  await storage.getServiceAccount();
}

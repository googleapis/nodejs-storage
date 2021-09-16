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

import {Bucket, File, HmacKey, Iam, Notification, Storage} from '../src';
import * as fs from 'fs';

/////////////////////////////////////////////////
//////////////////// BUCKET /////////////////////
/////////////////////////////////////////////////

export async function addLifecycleRule(bucket: Bucket) {
  await bucket.addLifecycleRule({
    action: 'delete',
    condition: {
      age: 365 * 3, // Specified in days.
    },
  });
}

export async function combine(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  const sources = [bucket.file('file1.txt'), bucket.file('file2.txt')];
  const allFiles = bucket.file('all-files.txt');

  await bucket.combine(sources, allFiles);
}

export async function create(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.create();
}

export async function createNotification(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.createNotification('my-topic');
}

export async function deleteBucket(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.delete();
}

export async function deleteFiles(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.deleteFiles();
}

export async function deleteLabels(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.deleteLabels();
}

export async function disableRequesterPays(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.disableRequesterPays();
}

export async function enableLogging(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  const config = {
    prefix: 'log',
  };
  await bucket.enableLogging(config);
}

export async function enableRequesterPays(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.enableRequesterPays();
}

export async function bucketExists(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.exists();
}

export async function bucketGet(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.get();
}

export async function getFilesStream(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.getFilesStream();
}

export async function getLabels(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.getLabels();
}

export async function bucketGetMetadata(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.getMetadata();
}

export async function getNotifications(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.getNotifications();
}

export async function lock(bucket: Bucket, _file: File, _notification: Notification) {
  const metageneration = 0;
  await bucket.lock(metageneration);
}

export async function bucketMakePrivate(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.makePrivate();
}

export async function bucketMakePublic(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.makePublic();
}

export async function removeRetentionPeriod(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.removeRetentionPeriod();
}

export async function setCorsConfiguration(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  const corsConfiguration = [{maxAgeSeconds: 3600}]; // 1 hour
  await bucket.setCorsConfiguration(corsConfiguration);
}

export async function setLabels(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  const labels = {
    labelone: 'labelonevalue',
    labeltwo: 'labeltwovalue',
  };
  await bucket.setLabels(labels);
}

export async function bucketSetMetadata(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  const metadata = {
    website: {
      mainPageSuffix: 'http://example.com',
      notFoundPage: 'http://example.com/404.html',
    },
  };
  await bucket.setMetadata(metadata);
}

export async function setRetentionPeriod(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  const DURATION_SECONDS = 15780000; // 6 months.
  await bucket.setRetentionPeriod(DURATION_SECONDS);
}

export async function bucketSetStorageClass(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.setStorageClass('nearline');
}

export async function bucketUploadResumable(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.upload('testFile.txt', {resumable: true});
}

export async function bucketUploadMultipart(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.upload('testFile.txt', {resumable: false});
}

/////////////////////////////////////////////////
//////////////////// FILE /////////////////////
/////////////////////////////////////////////////

export async function copy(_bucket: Bucket, file: File, _notification: Notification) {
  await file.copy('a-different-file.png');
}

export async function createReadStream(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  const localFile = 'testFile.txt';
  await file.createReadStream().pipe(fs.createWriteStream(localFile));
}

export async function createResumableUpload(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.createResumableUpload();
}

export async function createWriteStreamResumable(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await fs
    .createReadStream('testFile.txt')
    .pipe(file.createWriteStream({resumable: true}));
}

export async function createWriteStreamMultipart(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await fs
    .createReadStream('testFile.txt')
    .pipe(file.createWriteStream({resumable: false}));
}

export async function fileDelete(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.delete();
}

// I don't think this makes a request. Waiting for response on go/nodejs-gcs-client-retry-state
// export async function deleteResumableCache(_bucket: Bucket, file: File, _notification: Notification) {
//   await file.deleteResumableCache();
// }

export async function download(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.download();
}

export async function exists(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.exists();
}

export async function get(_bucket: Bucket, file: File, _notification: Notification) {
  await file.get();
}

export async function getExpirationDate(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.getExpirationDate();
}

export async function getMetadata(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.getMetadata();
}

export async function isPublic(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.isPublic();
}

export async function fileMakePrivate(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.makePrivate();
}

export async function fileMakePublic(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.makePublic();
}

export async function move(_bucket: Bucket, file: File, _notification: Notification) {
  await file.move('new-file');
}

export async function rename(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.rename('new-name');
}

export async function rotateEncryptionKey(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  const crypto = require('crypto');
  const buffer = crypto.randomBytes(32);
  const newKey = buffer.toString('base64');
  await file.rotateEncryptionKey({
    encryptionKey: Buffer.from(newKey, 'base64'),
  });
}

export async function saveResumable(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.save('testdata', {resumable: true});
}

export async function saveMultipart(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.save('testdata', {resumable: false});
}

export async function setMetadata(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  const metadata = {
    contentType: 'application/x-font-ttf',
    metadata: {
      my: 'custom',
      properties: 'go here',
    },
  };
  await file.setMetadata(metadata);
}

export async function setStorageClass(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.setStorageClass('nearline');
}

/////////////////////////////////////////////////
/////////////////// HMAC KEY ////////////////////
/////////////////////////////////////////////////

export async function deleteHMAC(hmacKey: HmacKey) {
  await hmacKey.delete();
}

export async function getHMAC(hmacKey: HmacKey) {
  await hmacKey.get();
}

export async function getMetadataHMAC(hmacKey: HmacKey) {
  await hmacKey.getMetadata();
}

export async function setMetadataHMAC(hmacKey: HmacKey) {
  const metadata = {
    state: 'INACTIVE',
  };
  await hmacKey.setMetadata(metadata);
}

/////////////////////////////////////////////////
////////////////////// IAM //////////////////////
/////////////////////////////////////////////////

export async function iamGetPolicy(iam: Iam) {
  await iam.getPolicy({requestedPolicyVersion: 1});
}

export async function iamSetPolicy(iam: Iam) {
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

export async function iamTestPermissions(iam: Iam) {
  const permissionToTest = 'storage.buckets.delete';
  await iam.testPermissions(permissionToTest);
}

/////////////////////////////////////////////////
///////////////// NOTIFICATION //////////////////
/////////////////////////////////////////////////

export async function notificationDelete(notification: Notification) {
  await notification.delete();
}

export async function notificationCreate(notification: Notification) {
  await notification.create();
}

export async function notificationExists(notification: Notification) {
  await notification.exists();
}

export async function notificationGet(notification: Notification) {
  await notification.get();
}

export async function notificationGetMetadata(notification: Notification) {
  await notification.getMetadata();
}

/////////////////////////////////////////////////
/////////////////// STORAGE /////////////////////
/////////////////////////////////////////////////

export async function createBucket(storage: Storage) {
  await storage.createBucket('test-creating-bucket');
}

export async function createHMACKey(storage: Storage) {
  const serviceAccountEmail = 'my-service-account@appspot.gserviceaccount.com';
  await storage.createHmacKey(serviceAccountEmail);
}

export async function getBuckets(storage: Storage) {
  await storage.getBuckets();
}

export function getBucketsStream(storage: Storage) {
  storage.getBucketsStream();
}

export function getHMACKeyStream(storage: Storage) {
  storage.getHmacKeysStream();
}

export async function getServiceAccount(storage: Storage) {
  await storage.getServiceAccount();
}

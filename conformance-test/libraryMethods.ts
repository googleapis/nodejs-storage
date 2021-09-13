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
import * as fs from 'fs';

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

async function combine(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  const sources = [bucket.file('file1.txt'), bucket.file('file2.txt')];
  const allFiles = bucket.file('all-files.txt');

  await bucket.combine(sources, allFiles);
}

async function create(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.create();
}

async function createNotification(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.createNotification('my-topic');
}

async function deleteBucket(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.delete();
}

async function deleteFiles(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.deleteFiles();
}

async function deleteLabels(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.deleteLabels();
}

async function disableRequesterPays(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.disableRequesterPays();
}

async function enableLogging(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  const config = {
    prefix: 'log',
  };
  await bucket.enableLogging(config);
}

async function enableRequesterPays(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.enableRequesterPays();
}

async function bucketExists(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.exists();
}

async function bucketGet(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.get();
}

async function getFilesStream(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.getFilesStream();
}

async function getLabels(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.getLabels();
}

async function bucketGetMetadata(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.getMetadata();
}

async function getNotifications(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.getNotifications();
}

async function lock(bucket: Bucket, _file: File, _notification: Notification) {
  const metageneration = 0;
  await bucket.lock(metageneration);
}

async function bucketMakePrivate(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.makePrivate();
}

async function bucketMakePublic(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.makePublic();
}

async function removeRetentionPeriod(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.removeRetentionPeriod();
}

async function setCorsConfiguration(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  const corsConfiguration = [{maxAgeSeconds: 3600}]; // 1 hour
  await bucket.setCorsConfiguration(corsConfiguration);
}

async function setLabels(
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

async function bucketSetMetadata(
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

async function setRetentionPeriod(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  const DURATION_SECONDS = 15780000; // 6 months.
  await bucket.setRetentionPeriod(DURATION_SECONDS);
}

async function bucketSetStorageClass(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.setStorageClass('nearline');
}

async function bucketUploadResumable(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.upload('testFile.txt', {resumable: true});
}

async function bucketUploadMultipart(
  bucket: Bucket,
  _file: File,
  _notification: Notification
) {
  await bucket.upload('testFile.txt', {resumable: false});
}

/////////////////////////////////////////////////
//////////////////// FILE /////////////////////
/////////////////////////////////////////////////

async function copy(_bucket: Bucket, file: File, _notification: Notification) {
  await file.copy('a-different-file.png');
}

async function createReadStream(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  const localFile = 'testFile.txt';
  await file.createReadStream().pipe(fs.createWriteStream(localFile));
}

async function createResumableUpload(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.createResumableUpload();
}

async function createWriteStreamResumable(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await fs
    .createReadStream('testFile.txt')
    .pipe(file.createWriteStream({resumable: true}));
}

async function createWriteStreamMultipart(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await fs
    .createReadStream('testFile.txt')
    .pipe(file.createWriteStream({resumable: false}));
}

async function fileDelete(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.delete();
}

// I don't think this makes a request. Waiting for response on go/nodejs-gcs-client-retry-state
// async function deleteResumableCache(_bucket: Bucket, file: File, _notification: Notification) {
//   await file.deleteResumableCache();
// }

async function download(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.download();
}

async function exists(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.exists();
}

async function get(_bucket: Bucket, file: File, _notification: Notification) {
  await file.get();
}

async function getExpirationDate(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.getExpirationDate();
}

async function getMetadata(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.getMetadata();
}

async function isPublic(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.isPublic();
}

async function fileMakePrivate(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.makePrivate();
}

async function fileMakePublic(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.makePublic();
}

async function move(_bucket: Bucket, file: File, _notification: Notification) {
  await file.move('new-file');
}

async function rename(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.rename('new-name');
}

async function rotateEncryptionKey(
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

async function saveResumable(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.save('testdata', {resumable: true});
}

async function saveMultipart(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.save('testdata', {resumable: false});
}

async function setMetadata(
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

async function setStorageClass(
  _bucket: Bucket,
  file: File,
  _notification: Notification
) {
  await file.setStorageClass('nearline');
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

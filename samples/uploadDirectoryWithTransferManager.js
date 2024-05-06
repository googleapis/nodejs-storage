/**
 * Copyright 2022 Google LLC
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
 *
 */

// sample-metadata:
//   title: Upload Directory With Transfer Manager
//   description: Uploads a directory in parallel utilizing transfer manager.
//   usage: node uploadFolderWithTransferManager.js <BUCKET_NAME> <DIRECTORY_NAME>

function main(bucketName = 'my-bucket', directoryName = 'my-directory') {
  // [START storage_transfer_manager_upload_directory]
  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // The ID of your GCS bucket
  // const bucketName = 'your-unique-bucket-name';

  // The local directory to upload
  // const directoryName = 'your-directory';

  // Imports the Google Cloud client library
  const {Storage, TransferManager} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  // Creates a transfer manager client
  const transferManager = new TransferManager(storage.bucket(bucketName));

  async function uploadDirectoryWithTransferManager() {
    // Uploads the directory
    await transferManager.uploadManyFiles(directoryName);

    console.log(`${directoryName} uploaded to ${bucketName}.`);
  }

  uploadDirectoryWithTransferManager().catch(console.error);
  // [END storage_transfer_manager_upload_directory]
}

process.on('unhandledRejection', err => {
  console.error(err.message);
  process.exitCode = 1;
});
main(...process.argv.slice(2));

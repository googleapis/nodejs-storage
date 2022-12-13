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
 * @experimental
 */

// sample-metadata:
//   title: Download Folder With Transfer Manager
//   description: Downloads a folder in parallel utilizing transfer manager.
//   usage: node downloadFolderWithTransferManager.js <BUCKET_NAME> <FOLDER_NAME>

function main(bucketName = 'my-bucket', folderName = 'my-folder') {
  // [START storage_download_folder_transfer_manager]
  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // The ID of your GCS bucket
  // const bucketName = 'your-unique-bucket-name';

  // The ID of the GCS folder to download
  // const folderName = 'your-folder-name';

  // Imports the Google Cloud client library
  const {Storage, TransferManager} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  // Creates a transfer manager instance
  const transferManager = new TransferManager(storage.bucket(bucketName));

  async function downloadFolderWithTransferManager() {
    // Downloads the folder
    await transferManager.downloadManyFiles(folderName);

    console.log(
      `gs://${bucketName}/${folderName} downloaded to ${folderName}.`
    );
  }

  downloadFolderWithTransferManager().catch(console.error);
  // [END storage_download_folder_transfer_manager]
}

process.on('unhandledRejection', err => {
  console.error(err.message);
  process.exitCode = 1;
});
main(...process.argv.slice(2));

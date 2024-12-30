// Copyright 2020 Google LLC
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

/**
 * This application demonstrates how to perform basic operations on bucket and
 * file Access Control Lists with the Google Cloud Storage API.
 *
 * For more information, see the README.md under /storage and the documentation
 * at https://cloud.google.com/storage/docs.
 */

function main(
  bucketName = 'my-bucket',
  fileName = 'test.txt',
  userEmail = 'jdobry@google.com'
) {
  // [START storage_add_file_owner]
  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // The ID of your GCS bucket
  // const bucketName = 'your-unique-bucket-name';

  // The name of the file to access
  // const fileName = 'file.txt';

  // The email address of the user to add
  // const userEmail = 'user-email-to-add';

  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  async function addFileOwner() {
    await storage
      .bucket(bucketName)
      .file(fileName)
      .acl.owners.addUser(userEmail);

    console.log(`Added user ${userEmail} as an owner on file ${fileName}.`);
  }

  addFileOwner().catch(console.error);
  // [END storage_add_file_owner]
}
main(...process.argv.slice(2));

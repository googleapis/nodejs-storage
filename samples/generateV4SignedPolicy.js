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
 * This application demonstrates how to perform basic operations on files with
 * the Google Cloud Storage API.
 *
 * For more information, see the README.md under /storage and the documentation
 * at https://cloud.google.com/storage/docs.
 */

function main(bucketName = 'my-bucket', filename = 'test.txt') {
  // [START storage_generate_post_policy_url_v4]
  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // const bucketName = 'Name of a bucket, e.g. my-bucket';
  // const filename = 'File to access, e.g. file.txt';

  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  async function generateV4SignedPolicy() {
    // These options will allow temporary uploading of a file
    // through an HTML form.
    const file = myBucket.file('my-file');
    const expires = Date.now() + 600 * 1000; //  10 minutes
    const options = {
      expires,
      fields: {'x-goog-meta-test': 'data'},
    };

    // Get a v4 signed URL for uploading file
    await file.getSignedPolicyV4(options, function(err, policy) {
      // Create an HTML form with the provided policy
      console.log(`<form action='${policy.url}' method='POST' enctype="multipart/form-data">\n`);
      // Include all fields returned in the HTML form as they're required
      for (var k in policy.fields) {
        console.log(`<input name='${k}' value='${policy.fields[k]}' type='hidden'/>\n`);
      }
      console.log("<input type='file' name='file'/>\n");
      console.log("<input type='submit' value='Upload File' name='submit'/>\n");
      console.log("</form>\n");
    });
  }

  generateV4SignedPolicy().catch(console.error);
  // [END storage_generate_post_policy_url_v4]
}
main(...process.argv.slice(2));

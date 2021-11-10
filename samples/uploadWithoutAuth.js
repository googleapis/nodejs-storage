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

function main(
  bucketName = 'my-bucket',
  contents = 'these are my file contents',
  destFileName = 'file.txt'
) {
  // [START storage_upload_without_authentication]
  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // The ID of your GCS bucket
  // const bucketName = 'your-unique-bucket-name';

  // The contents that you want to upload
  // const contents = 'these are my contents';

  // The new ID for your GCS file
  // const destFileName = 'your-new-file-name';

  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  async function uploadWithoutAuthentication() {

    const file = storage.bucket(bucketName).file(destFileName);
    let location; // endpoint to which we should upload the file

    // Option 1: use file.createResumableUpload
    // file.createResumableUpload returns an authenticated endpoint
    // to which we can make requests without credentials
    [location] = await file.createResumableUpload(); //auth required

    // Option 2: use signed URLs to manually start resumable upload
    // Auth is required to get the signed URL, but is not required
    // to start the resumable upload
    const options = {
      version: 'v4',
      action: 'resumable',
      expires: Date.now() + 30 * 60 * 1000,
    };
    const [signedUrl] = await file.getSignedUrl(options); //auth required
    const resumableSession = await fetch(signedUrl, { // no auth required
      method: 'POST',
      headers: {
          'x-goog-resumable': 'start'
      }
    });
    location = resumableSession.headers.location;

    
    // passing the location to file.save removes the need to
    // authenticate this call
    await file.save( // no auth required
      contents,
      {
        uri: location,
        resumable: true,
        validation: false
      }
    );

    console.log(`${destFileName} uploaded to ${bucketName}`);
  }

  uploadWithoutAuthentication().catch(console.error);
  // [END storage_upload_without_authentication]
}

main(...process.argv.slice(2));

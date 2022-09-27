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
 */

function main(bucketName = 'my-bucket', toggle = false) {
  // [START storage_set_autoclass]
  /**
   * TODO(developer): Uncomment the following lines before running the sample.
   */
  // The ID of your GCS bucket
  // const bucketName = 'your-unique-bucket-name';

  // Imports the Google Cloud client library
  const {Storage} = require('@google-cloud/storage');

  // Creates a client
  const storage = new Storage();

  async function setAutoclass() {
    // Disables Autoclass for a bucket.
    // Note: Only patch requests that disable autoclass are currently supported.
    // To enable autoclass, you must set it at bucket creation time.
    const [metadata] = await storage.bucket(bucketName).setMetadata({
      autoclass: {
        enabled: toggle,
      },
    });

    console.log(`Autoclass enabled is set to ${metadata.autoclass.enabled} for 
          ${metadata.name} at ${metadata.autoclass.toggleTime}.`);
  }

  setAutoclass().catch(console.error);
  // [END storage_set_autoclass]
}

main(...process.argv.slice(2));

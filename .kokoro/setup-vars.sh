#!/bin/bash

# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# nodejs-storage's system tests require additional project and
# system test key
export GOOGLE_APPLICATION_CREDENTIALS=${KOKORO_GFILE_DIR}/storage-key.json
export GCN_STORAGE_2ND_PROJECT_ID=gcloud-node-whitelist-ci-tests
export GCN_STORAGE_2ND_PROJECT_KEY=${KOKORO_GFILE_DIR}/no-whitelist-key.json

export GOOGLE_CLOUD_KMS_KEY_ASIA="projects/long-door-651/locations/asia/keyRings/test-key-asia/cryptoKeys/test-key-asia"
export GOOGLE_CLOUD_KMS_KEY_US="projects/long-door-651/locations/us/keyRings/test-key-us/cryptoKeys/test-key-us"

# For testing SA HMAC
export HMAC_PROJECT=gimme-acc
curl https://storage.googleapis.com/gimme-acc/linux_amd64/gimme-acc > gimme-acc
chmod +x gimme-acc
./gimme-acc version

export HMAC_KEY_TEST_SERVICE_ACCOUNT=$(./gimme-acc -project gimme-acc lease 15m)
trap "./gimme-acc -project gimme-acc done $HMAC_KEY_TEST_SERVICE_ACCOUNT" EXIT

echo Using $HMAC_KEY_TEST_SERVICE_ACCOUNT

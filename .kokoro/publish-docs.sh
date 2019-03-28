#!/bin/bash

# Copyright 2019 Google LLC
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

set -eo pipefail

cd $(dirname $0)/..

npm install

npm run docs

# Publish documentation with docuploader.
python3 -m pip install --user gcp-docuploader

VERSION=$(npm view @google-cloud/storage version)

python3 -m docuploader create-metadata \
			--name storage \
			--version ${VERSION} \
			--language nodejs \
			--distribution-name @google-cloud/storage \
			--github-repository https://github.com/googleapis/nodejs-storage \
			--product-page https://cloud.google.com/storage \
			--issue-tracker https://issuetracker.google.com/savedsearches/559782 \
			docs/docs.metadata

python3 -m docuploader upload docs

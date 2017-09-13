#!/bin/bash
# Copyright 2017 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Note: This script is assumed to start in the base repository directory.
REPO_DIR=`dirname $0`

# Build the docs.
npm run docs

# What version are we on?
MODULE_VERSION=`npm version | head -n 1 | grep -o -P "[\\d.]+"`
if [ -n $CIRCLE_TAG ] || [ $CIRCLE_BRANCH == 'refresh-docs']; then
  PUBLISH_VERSION=$MODULE_VERSION
else if [ $CIRCLE_BRANCH == 'master' ]; then
  PUBLISH_VERSION='latest'
fi

# Where are the docs?
DOCS_LOCATION=`find . -type d -name "$MODULE_VERSION"`

# Clone the gh-pages branch in a separate repo.
git clone ${CIRCLE_REPOSITORY_URL} ../gh-pages/
cd ../gh-pages/
git checkout --track -b gh-pages origin/gh-pages

# Copy the docs to where they belong.
cp -R ${DOCS_LOCATION}/ ${PUBLISH_VERSION}/
git add ${PUBLISH_VERSION}/

# Commit the docs.
git add ${PUBLISH_VERSION}/
git commit -m "Documentation update: v${MODULE_VERSION}"
git push origin gh-pages

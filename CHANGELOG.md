# Changelog

[npm history][1]

[1]: https://www.npmjs.com/package/nodejs-storage?activeTab=versions

### [4.7.2](https://www.github.com/googleapis/nodejs-storage/compare/v4.7.1...v4.7.2) (2021-08-20)


### Bug Fixes

* **build:** publish branch ([#1547](https://www.github.com/googleapis/nodejs-storage/issues/1547)) ([5ff66de](https://www.github.com/googleapis/nodejs-storage/commit/5ff66de494c1fd608d1b57f64aa9a490c02900a2))

### [4.7.1](https://www.github.com/googleapis/nodejs-storage/compare/v4.7.0...v4.7.1) (2021-08-20)


### Bug Fixes

* **deps:** updated date-and-time dep to 0.14.2 ([#1544](https://www.github.com/googleapis/nodejs-storage/issues/1544)) ([a6d796b](https://www.github.com/googleapis/nodejs-storage/commit/a6d796b79b4a5c6555ea2160cc1ef6f481a365d0))

## [4.7.0](https://www.github.com/googleapis/nodejs-storage/compare/v4.6.0...v4.7.0) (2020-03-26)


### Features

* add remove conditional binding ([#1107](https://www.github.com/googleapis/nodejs-storage/issues/1107)) ([2143705](https://www.github.com/googleapis/nodejs-storage/commit/21437053e9497aa95ef37a865ffbdbaf4134138f))
* v4 POST with signed policy ([#1102](https://www.github.com/googleapis/nodejs-storage/issues/1102)) ([a3d5b88](https://www.github.com/googleapis/nodejs-storage/commit/a3d5b88b8d3d25b6e16808eb5c1425aa0a8c5ecc)), closes [#1125](https://www.github.com/googleapis/nodejs-storage/issues/1125)


### Bug Fixes

* **deps:** update dependency date-and-time to ^0.13.0 ([#1106](https://www.github.com/googleapis/nodejs-storage/issues/1106)) ([b759605](https://www.github.com/googleapis/nodejs-storage/commit/b7596058e130ee2d82dc2221f24220b83c04fdae))
* **deps:** update dependency gaxios to v3 ([#1129](https://www.github.com/googleapis/nodejs-storage/issues/1129)) ([5561452](https://www.github.com/googleapis/nodejs-storage/commit/5561452cb0b6e5a1dcabea6973db57799422abb7))
* **types:** wrap GetSignedUrlResponse ([#1119](https://www.github.com/googleapis/nodejs-storage/issues/1119)) ([0c7ac16](https://www.github.com/googleapis/nodejs-storage/commit/0c7ac161f808201562f60710b9ec7bce4fbf819f))

## [4.6.0](https://www.github.com/googleapis/nodejs-storage/compare/v4.5.0...v4.6.0) (2020-03-13)


### Features

* **storage:** Add versioning as optional metadata param of createBucket ([#1090](https://www.github.com/googleapis/nodejs-storage/issues/1090)) ([39869e3](https://www.github.com/googleapis/nodejs-storage/commit/39869e3c6c62eabe1840f0fd884b361265e2cb76))

## [4.5.0](https://www.github.com/googleapis/nodejs-storage/compare/v4.4.0...v4.5.0) (2020-03-06)


### Features

* **v4:** support v4 signed URL for GA ([#1072](https://www.github.com/googleapis/nodejs-storage/issues/1072)) ([79d7b8f](https://www.github.com/googleapis/nodejs-storage/commit/79d7b8f5a187f23e58bf84db3f4b8c4b1a921978)), closes [#1051](https://www.github.com/googleapis/nodejs-storage/issues/1051) [#1056](https://www.github.com/googleapis/nodejs-storage/issues/1056) [#1066](https://www.github.com/googleapis/nodejs-storage/issues/1066) [#1068](https://www.github.com/googleapis/nodejs-storage/issues/1068) [#1069](https://www.github.com/googleapis/nodejs-storage/issues/1069) [#1067](https://www.github.com/googleapis/nodejs-storage/issues/1067) [#1070](https://www.github.com/googleapis/nodejs-storage/issues/1070)

## [4.4.0](https://www.github.com/googleapis/nodejs-storage/compare/v4.3.2...v4.4.0) (2020-03-03)


### Features

* **bucket:** support single source in combine ([#1076](https://www.github.com/googleapis/nodejs-storage/issues/1076)) ([#1085](https://www.github.com/googleapis/nodejs-storage/issues/1085)) ([251a617](https://www.github.com/googleapis/nodejs-storage/commit/251a617791ca4b0e148b741d1931013150becc02))

### [4.3.2](https://www.github.com/googleapis/nodejs-storage/compare/v4.3.1...v4.3.2) (2020-03-02)


### Bug Fixes

* **deps:** update dependency uuid to v7 ([#1081](https://www.github.com/googleapis/nodejs-storage/issues/1081)) ([c72d57f](https://www.github.com/googleapis/nodejs-storage/commit/c72d57f6f2982dad512d425ee3f041b43a87c278))
* **tests:** flaky getSignedPolicy tests ([#1093](https://www.github.com/googleapis/nodejs-storage/issues/1093)) ([531050a](https://www.github.com/googleapis/nodejs-storage/commit/531050a05e5b1eeedb25647417a8ae9df8d76f29))

### [4.3.1](https://www.github.com/googleapis/nodejs-storage/compare/v4.3.0...v4.3.1) (2020-02-06)


### Bug Fixes

* **samples:** fix overwritten IAM conditions sample ([#1042](https://www.github.com/googleapis/nodejs-storage/issues/1042)) ([25d839c](https://www.github.com/googleapis/nodejs-storage/commit/25d839ccf421276d8a4c18b2be95004ca832d84d))
* skip validation for server decompressed objects ([#1063](https://www.github.com/googleapis/nodejs-storage/issues/1063)) ([d6e3738](https://www.github.com/googleapis/nodejs-storage/commit/d6e37382da1ed3b72771770cb9447c62c91f26a5))
* unhandled promise rejection warning in samples ([#1056](https://www.github.com/googleapis/nodejs-storage/issues/1056)) ([e95ec19](https://www.github.com/googleapis/nodejs-storage/commit/e95ec19756388e6fc4fc8e0d49a40c613ed006c6))

## [4.3.0](https://www.github.com/googleapis/nodejs-storage/compare/v4.2.0...v4.3.0) (2020-01-21)


### Features

* add support for CORS as a first class citizen ([#1020](https://www.github.com/googleapis/nodejs-storage/issues/1020)) ([9fee6d9](https://www.github.com/googleapis/nodejs-storage/commit/9fee6d969a1311a3db18bf523d3614adef0526ce))


### Bug Fixes

* **deps:** update dependency date-and-time to ^0.12.0 ([#1032](https://www.github.com/googleapis/nodejs-storage/issues/1032)) ([a324564](https://www.github.com/googleapis/nodejs-storage/commit/a324564e8f29345412047b7f6296098211e0e831))
* a couple of typos from the refactorNodeSampleStorage branch ([#1038](https://www.github.com/googleapis/nodejs-storage/issues/1038)) ([8faa6c6](https://www.github.com/googleapis/nodejs-storage/commit/8faa6c6698b3b7ef4857d978482209bc5077e08e))
* do not modify constructor options ([#974](https://www.github.com/googleapis/nodejs-storage/issues/974)) ([4969148](https://www.github.com/googleapis/nodejs-storage/commit/4969148f5e114d86aa4928109f099ec15d56fda5))
* refactor getMetadata sample into its own file ([#1008](https://www.github.com/googleapis/nodejs-storage/issues/1008)) ([6ed1af8](https://www.github.com/googleapis/nodejs-storage/commit/6ed1af8aadd6f72cf0957d02e403f7c551166a5c))
* refactor getRetentionPolicy sample into its own file ([#993](https://www.github.com/googleapis/nodejs-storage/issues/993)) ([47e4ad8](https://www.github.com/googleapis/nodejs-storage/commit/47e4ad8c8a4fd16f4f1d9d6d9bfdc9e30b1ab999))
* refactor getUniformBucketLevelAccess into its own file ([#981](https://www.github.com/googleapis/nodejs-storage/issues/981)) ([0ba69f1](https://www.github.com/googleapis/nodejs-storage/commit/0ba69f1b3d6093701dac927fa4543d2d911ce8b0))
* refactor rotateEncryptionKey sample into its own file ([#1030](https://www.github.com/googleapis/nodejs-storage/issues/1030)) ([afdf0fe](https://www.github.com/googleapis/nodejs-storage/commit/afdf0febe8760c0819736961065d134e231a0afa))
* refactor uploadEncryptedFile sample into its own file ([#1028](https://www.github.com/googleapis/nodejs-storage/issues/1028)) ([ba4520b](https://www.github.com/googleapis/nodejs-storage/commit/ba4520b5f925968717222ffe5d2b1dbcfbea4334))
* refactoring disableUniformBucketLevelAccess into its own file ([#980](https://www.github.com/googleapis/nodejs-storage/issues/980)) ([1481e20](https://www.github.com/googleapis/nodejs-storage/commit/1481e20d8332ee2806116166fb16028506487d2d))

## [4.2.0](https://www.github.com/googleapis/nodejs-storage/compare/v4.1.3...v4.2.0) (2020-01-02)


### Features

* **iam:** getIamPolicy to support requestedPolicyVersion ([#960](https://www.github.com/googleapis/nodejs-storage/issues/960)) ([0f38f75](https://www.github.com/googleapis/nodejs-storage/commit/0f38f7597f5e671b4c08830f8d457f9ca2c03cd1))
* add support for Archive storage class ([#908](https://www.github.com/googleapis/nodejs-storage/issues/908)) ([63f63f4](https://www.github.com/googleapis/nodejs-storage/commit/63f63f448d2d220b1e77a7dcd379f7ac7fc22af3))


### Bug Fixes

* **deps:** pin TypeScript below 3.7.0 ([#952](https://www.github.com/googleapis/nodejs-storage/issues/952)) ([1fea60c](https://www.github.com/googleapis/nodejs-storage/commit/1fea60c04fd9762c5506c22df0992cdb8fce4ea0))
* add createBucket file and updated relevant test ([#940](https://www.github.com/googleapis/nodejs-storage/issues/940)) ([913b43e](https://www.github.com/googleapis/nodejs-storage/commit/913b43e66bb10bd5dbf6b0bca9e65edd48b54234))
* update PolicyDocument types ([#944](https://www.github.com/googleapis/nodejs-storage/issues/944)) ([b1c05b2](https://www.github.com/googleapis/nodejs-storage/commit/b1c05b27029215c8bc313a8f4f16ff13d5af2391))

### [4.1.3](https://www.github.com/googleapis/nodejs-storage/compare/v4.1.2...v4.1.3) (2019-11-18)


### Bug Fixes

* **deps:** update dependency date-and-time to ^0.11.0 ([#934](https://www.github.com/googleapis/nodejs-storage/issues/934)) ([c4bf1c6](https://www.github.com/googleapis/nodejs-storage/commit/c4bf1c616d0a9402237708bddac1341c620f0542))
* **deps:** update dependency yargs to v15 ([#933](https://www.github.com/googleapis/nodejs-storage/issues/933)) ([f40fe0c](https://www.github.com/googleapis/nodejs-storage/commit/f40fe0c5bd4e9b89ebe007e59986580fae4d7e09))

### [4.1.2](https://www.github.com/googleapis/nodejs-storage/compare/v4.1.1...v4.1.2) (2019-11-12)


### Bug Fixes

* do not check access of configPath ([#915](https://www.github.com/googleapis/nodejs-storage/issues/915)) ([a21a644](https://www.github.com/googleapis/nodejs-storage/commit/a21a6443346f91f275233a9a07fb79550035e157))
* missing snippets with jsdoc-region-tag ([#924](https://www.github.com/googleapis/nodejs-storage/issues/924)) ([310ba90](https://www.github.com/googleapis/nodejs-storage/commit/310ba90a48c6f02a31c1254037dfcdb4da4b7150))
* **docs:** add jsdoc-region-tag plugin ([#929](https://www.github.com/googleapis/nodejs-storage/issues/929)) ([74526e7](https://www.github.com/googleapis/nodejs-storage/commit/74526e7f42cfa92c18ff332d0b9e10ea3b1324cf))

### [4.1.1](https://www.github.com/googleapis/nodejs-storage/compare/v4.1.0...v4.1.1) (2019-11-07)


### Bug Fixes

* update format for upload sample ([#918](https://www.github.com/googleapis/nodejs-storage/issues/918)) ([d77208b](https://www.github.com/googleapis/nodejs-storage/commit/d77208bee82dc2d76c72fbe8d5db1bfeb8e392ff))

## [4.1.0](https://www.github.com/googleapis/nodejs-storage/compare/v4.0.1...v4.1.0) (2019-10-31)


### Features

* [Storage] Support UniformBucketLevelAccess ([#903](https://www.github.com/googleapis/nodejs-storage/issues/903)) ([35b1bd9](https://www.github.com/googleapis/nodejs-storage/commit/35b1bd9f6db351ad1e51b135a3f25cc5e1566600))

### [4.0.1](https://www.github.com/googleapis/nodejs-storage/compare/v4.0.0...v4.0.1) (2019-10-31)


### Bug Fixes

* **docs:** missing quote in signed url jsdoc ([#896](https://www.github.com/googleapis/nodejs-storage/issues/896)) ([f2d567f](https://www.github.com/googleapis/nodejs-storage/commit/f2d567f279fee0f48c2d6a607f4066c9da372549))
* use storage.googleapis.com for api endpoint ([862fb16](https://www.github.com/googleapis/nodejs-storage/commit/862fb16db2990c958c0097252a44c775431a7b3f))
* **signed-url:** replace encodeURIComponent with custom encoding function ([#905](https://www.github.com/googleapis/nodejs-storage/issues/905)) ([ba41517](https://www.github.com/googleapis/nodejs-storage/commit/ba415179f1d5951742c1b239e0500bbd2a815ddd))

## [4.0.0](https://www.github.com/googleapis/nodejs-storage/compare/v3.5.0...v4.0.0) (2019-10-17)


### ⚠ BREAKING CHANGES

* allow leading slashes in file name (#820)

### Bug Fixes

* **deps:** update hash-stream-validation ([#884](https://www.github.com/googleapis/nodejs-storage/issues/884)) ([96a7fc2](https://www.github.com/googleapis/nodejs-storage/commit/96a7fc297a563819b09727990eb9ee15a421310b))
* allow leading slashes in file name ([#820](https://www.github.com/googleapis/nodejs-storage/issues/820)) ([92e115d](https://www.github.com/googleapis/nodejs-storage/commit/92e115dca81604909fc34e983abcf47409d3f417))

## [3.5.0](https://www.github.com/googleapis/nodejs-storage/compare/v3.4.0...v3.5.0) (2019-10-14)


### Features

* **bucket:** add enableLogging method ([#876](https://www.github.com/googleapis/nodejs-storage/issues/876)) ([b09ecac](https://www.github.com/googleapis/nodejs-storage/commit/b09ecac79b70bf99e19f0f23ffcecd17e34516bb))

## [3.4.0](https://www.github.com/googleapis/nodejs-storage/compare/v3.3.1...v3.4.0) (2019-10-10)


### Bug Fixes

* file#move do not delete origin file if same as destination ([#874](https://www.github.com/googleapis/nodejs-storage/issues/874)) ([dcaba8a](https://www.github.com/googleapis/nodejs-storage/commit/dcaba8a))
* pass predefined acl as destinationPredefinedAcl to qs ([#872](https://www.github.com/googleapis/nodejs-storage/issues/872)) ([09b8fa4](https://www.github.com/googleapis/nodejs-storage/commit/09b8fa4))


### Features

* add flag to allow disabling auto decompression by client ([#850](https://www.github.com/googleapis/nodejs-storage/issues/850)) ([9ebface](https://www.github.com/googleapis/nodejs-storage/commit/9ebface))
* allow setting standard Bucket storage class ([#873](https://www.github.com/googleapis/nodejs-storage/issues/873)) ([12a99e9](https://www.github.com/googleapis/nodejs-storage/commit/12a99e9))

### [3.3.1](https://www.github.com/googleapis/nodejs-storage/compare/v3.3.0...v3.3.1) (2019-09-30)


### Bug Fixes

* create correct v4 signed url with cname ([#868](https://www.github.com/googleapis/nodejs-storage/issues/868)) ([ace3b5e](https://www.github.com/googleapis/nodejs-storage/commit/ace3b5e))

## [3.3.0](https://www.github.com/googleapis/nodejs-storage/compare/v3.2.1...v3.3.0) (2019-09-19)


### Bug Fixes

* **deps:** update dependency @google-cloud/pubsub to ^0.32.0 ([#849](https://www.github.com/googleapis/nodejs-storage/issues/849)) ([fdf70bb](https://www.github.com/googleapis/nodejs-storage/commit/fdf70bb))
* add warning for unsupported keepAcl param in file#copy ([#841](https://www.github.com/googleapis/nodejs-storage/issues/841)) ([473bda0](https://www.github.com/googleapis/nodejs-storage/commit/473bda0))
* remove unsupported keepAcl param ([#837](https://www.github.com/googleapis/nodejs-storage/issues/837)) ([5f69a3d](https://www.github.com/googleapis/nodejs-storage/commit/5f69a3d))
* use storage.googleapis.com for api endpoint ([#854](https://www.github.com/googleapis/nodejs-storage/issues/854)) ([27fa02f](https://www.github.com/googleapis/nodejs-storage/commit/27fa02f))
* **deps:** update dependency @google-cloud/pubsub to v1 ([#858](https://www.github.com/googleapis/nodejs-storage/issues/858)) ([31466f4](https://www.github.com/googleapis/nodejs-storage/commit/31466f4))
* **deps:** update dependency date-and-time to ^0.10.0 ([#857](https://www.github.com/googleapis/nodejs-storage/issues/857)) ([e9ec9cf](https://www.github.com/googleapis/nodejs-storage/commit/e9ec9cf))


### Features

* adds support for  asyncIterators (via readable-stream@3 dependency) ([dd5ae7f](https://www.github.com/googleapis/nodejs-storage/commit/dd5ae7f))
* allow removal of resumable upload cache ([#773](https://www.github.com/googleapis/nodejs-storage/issues/773)) ([da943db](https://www.github.com/googleapis/nodejs-storage/commit/da943db)), closes [#217](https://www.github.com/googleapis/nodejs-storage/issues/217)

### [3.2.1](https://www.github.com/googleapis/nodejs-storage/compare/v3.2.0...v3.2.1) (2019-08-28)


### Bug Fixes

* **docs:** stop redirecting reference docs to anchor, add new sample to README ([bbb5537](https://www.github.com/googleapis/nodejs-storage/commit/bbb5537))
* **samples:** fix failing sample view IAM member-role groups ([1c4f21f](https://www.github.com/googleapis/nodejs-storage/commit/1c4f21f))

## [3.2.0](https://www.github.com/googleapis/nodejs-storage/compare/v3.1.0...v3.2.0) (2019-08-22)


### Bug Fixes

* **deps:** update @google-cloud/common with fixes for http ([#809](https://www.github.com/googleapis/nodejs-storage/issues/809)) ([8598631](https://www.github.com/googleapis/nodejs-storage/commit/8598631))
* **deps:** update dependency @google-cloud/pubsub to ^0.31.0 ([#814](https://www.github.com/googleapis/nodejs-storage/issues/814)) ([604e564](https://www.github.com/googleapis/nodejs-storage/commit/604e564))
* **deps:** update dependency date-and-time to ^0.9.0 ([#805](https://www.github.com/googleapis/nodejs-storage/issues/805)) ([8739a7d](https://www.github.com/googleapis/nodejs-storage/commit/8739a7d))
* **ts:** fix nock @~11.0.0 ([#819](https://www.github.com/googleapis/nodejs-storage/issues/819)) ([48f9b44](https://www.github.com/googleapis/nodejs-storage/commit/48f9b44))


### Features

* hmac service account ([#751](https://www.github.com/googleapis/nodejs-storage/issues/751)) ([ed1ec7b](https://www.github.com/googleapis/nodejs-storage/commit/ed1ec7b))

## [3.1.0](https://www.github.com/googleapis/nodejs-storage/compare/v3.0.4...v3.1.0) (2019-08-09)


### Bug Fixes

* **deps:** update dependency @google-cloud/paginator to v2 ([#781](https://www.github.com/googleapis/nodejs-storage/issues/781)) ([23244e9](https://www.github.com/googleapis/nodejs-storage/commit/23244e9))
* **deps:** update dependency @google-cloud/pubsub to ^0.30.0 ([#778](https://www.github.com/googleapis/nodejs-storage/issues/778)) ([7256650](https://www.github.com/googleapis/nodejs-storage/commit/7256650))
* allow calls with no request, add JSON proto ([30fff15](https://www.github.com/googleapis/nodejs-storage/commit/30fff15))
* **deps:** update dependency date-and-time to ^0.8.0 ([#779](https://www.github.com/googleapis/nodejs-storage/issues/779)) ([ab2734d](https://www.github.com/googleapis/nodejs-storage/commit/ab2734d))
* **deps:** upgrade @google-cloud/common version to show original… ([#795](https://www.github.com/googleapis/nodejs-storage/issues/795)) ([ea63cbe](https://www.github.com/googleapis/nodejs-storage/commit/ea63cbe))
* **deps:** use the latest extend ([#800](https://www.github.com/googleapis/nodejs-storage/issues/800)) ([a7f0172](https://www.github.com/googleapis/nodejs-storage/commit/a7f0172))


### Features

* **file:** allow setting configPath of resumable upload ([#642](https://www.github.com/googleapis/nodejs-storage/issues/642)) ([a8ceb78](https://www.github.com/googleapis/nodejs-storage/commit/a8ceb78))

### [3.0.4](https://www.github.com/googleapis/nodejs-storage/compare/v3.0.3...v3.0.4) (2019-07-25)


### Bug Fixes

* **deps:** update dependency pumpify to v2 ([#740](https://www.github.com/googleapis/nodejs-storage/issues/740)) ([71a4f59](https://www.github.com/googleapis/nodejs-storage/commit/71a4f59))

### [3.0.3](https://www.github.com/googleapis/nodejs-storage/compare/v3.0.2...v3.0.3) (2019-07-16)


### Bug Fixes

* **typescript:** make SetLabelOptions optional ([#766](https://www.github.com/googleapis/nodejs-storage/issues/766)) ([4336882](https://www.github.com/googleapis/nodejs-storage/commit/4336882))

### [3.0.2](https://www.github.com/googleapis/nodejs-storage/compare/v3.0.1...v3.0.2) (2019-07-01)


### Bug Fixes

* **docs:** fix sample code in docs ([#759](https://www.github.com/googleapis/nodejs-storage/issues/759)) ([f9e5fd8](https://www.github.com/googleapis/nodejs-storage/commit/f9e5fd8))
* **docs:** link to reference docs section on googleapis.dev ([#753](https://www.github.com/googleapis/nodejs-storage/issues/753)) ([5e3a96b](https://www.github.com/googleapis/nodejs-storage/commit/5e3a96b))

### [3.0.1](https://www.github.com/googleapis/nodejs-storage/compare/v3.0.0...v3.0.1) (2019-06-14)


### Bug Fixes

* async should be dependency ([#743](https://www.github.com/googleapis/nodejs-storage/issues/743)) ([e542b8b](https://www.github.com/googleapis/nodejs-storage/commit/e542b8b))

## [3.0.0](https://www.github.com/googleapis/nodejs-storage/compare/v2.5.0...v3.0.0) (2019-06-14)


### ⚠ BREAKING CHANGES

* upgrade engines field to >=8.10.0 (#688)

### Bug Fixes

* **deps:** update dependency @google-cloud/common to v1 ([#705](https://www.github.com/googleapis/nodejs-storage/issues/705)) ([72a9f51](https://www.github.com/googleapis/nodejs-storage/commit/72a9f51))
* **deps:** update dependency @google-cloud/paginator to v1 ([#695](https://www.github.com/googleapis/nodejs-storage/issues/695)) ([ada995e](https://www.github.com/googleapis/nodejs-storage/commit/ada995e))
* **deps:** update dependency @google-cloud/promisify to v1 ([#693](https://www.github.com/googleapis/nodejs-storage/issues/693)) ([5df2f83](https://www.github.com/googleapis/nodejs-storage/commit/5df2f83))
* **deps:** update dependency @google-cloud/pubsub to ^0.29.0 ([#714](https://www.github.com/googleapis/nodejs-storage/issues/714)) ([3ee1a2c](https://www.github.com/googleapis/nodejs-storage/commit/3ee1a2c))
* **deps:** update dependency arrify to v2 ([#667](https://www.github.com/googleapis/nodejs-storage/issues/667)) ([ce02c27](https://www.github.com/googleapis/nodejs-storage/commit/ce02c27))
* validate action of getSignedUrl() function ([#684](https://www.github.com/googleapis/nodejs-storage/issues/684)) ([1b09d24](https://www.github.com/googleapis/nodejs-storage/commit/1b09d24))
* **deps:** update dependency date-and-time to ^0.7.0 ([#736](https://www.github.com/googleapis/nodejs-storage/issues/736)) ([7071f26](https://www.github.com/googleapis/nodejs-storage/commit/7071f26))
* **deps:** update dependency xdg-basedir to v4 ([#681](https://www.github.com/googleapis/nodejs-storage/issues/681)) ([8b40e6a](https://www.github.com/googleapis/nodejs-storage/commit/8b40e6a))
* **docs:** move to new client docs URL ([#738](https://www.github.com/googleapis/nodejs-storage/issues/738)) ([a637f99](https://www.github.com/googleapis/nodejs-storage/commit/a637f99))
* **ts:** improve return types for response metadata ([#666](https://www.github.com/googleapis/nodejs-storage/issues/666)) ([da42bed](https://www.github.com/googleapis/nodejs-storage/commit/da42bed))
* **types:** fix signatures of listing methods ([#703](https://www.github.com/googleapis/nodejs-storage/issues/703)) ([42937a8](https://www.github.com/googleapis/nodejs-storage/commit/42937a8))


### Build System

* upgrade engines field to >=8.10.0 ([#688](https://www.github.com/googleapis/nodejs-storage/issues/688)) ([6a1fa0f](https://www.github.com/googleapis/nodejs-storage/commit/6a1fa0f))


### Features

* add file.isPublic() function ([#708](https://www.github.com/googleapis/nodejs-storage/issues/708)) ([f86cadb](https://www.github.com/googleapis/nodejs-storage/commit/f86cadb))
* support apiEndpoint override ([#728](https://www.github.com/googleapis/nodejs-storage/issues/728)) ([61eeb64](https://www.github.com/googleapis/nodejs-storage/commit/61eeb64))

## v2.5.0

04-04-2019 12:27 PDT

This release brings an option to file#getSignedURL to create a version 4 Signed URL.

```javascript
file.getSignedUrl({
  version: 'v4', // optional, defaults to v2 (existing version)
  action: 'read',
  expires: FUTURE_DATE,
})
```

### New Features
- feat: introduce v4 signed url ([#637](https://github.com/googleapis/nodejs-storage/pull/637))

### Dependencies
- chore(deps): update dependency @types/node to v11.13.0 ([#662](https://github.com/googleapis/nodejs-storage/pull/662))
- chore(deps): update dependency @types/tmp to v0.1.0
- chore(deps): upgrade to newest version of @google-cloud/common ([#657](https://github.com/googleapis/nodejs-storage/pull/657))
- chore(deps): update dependency typescript to ~3.4.0
- chore(deps): update dependency tmp to ^0.1.0 ([#641](https://github.com/googleapis/nodejs-storage/pull/641))

### Documentation
- docs: regenerate the samples/README.md ([#649](https://github.com/googleapis/nodejs-storage/pull/649))
- docs: slight difference in how nightly synthtool run generated README ([#650](https://github.com/googleapis/nodejs-storage/pull/650))
- docs: new synthtool generated README ([#645](https://github.com/googleapis/nodejs-storage/pull/645))
- docs(samples): refactor the quickstart to match the new rubric ([#647](https://github.com/googleapis/nodejs-storage/pull/647))
- docs: update README format
- docs: add requires_billing, retire .cloud-repo-tools.json ([#644](https://github.com/googleapis/nodejs-storage/pull/644))
- docs: add additional api_id field ([#640](https://github.com/googleapis/nodejs-storage/pull/640))
- docs: document destination option ([#633](https://github.com/googleapis/nodejs-storage/pull/633))
- docs: clarify in docs, the meaning of ASIA and coldline ([#632](https://github.com/googleapis/nodejs-storage/pull/632))
- docs: add a .repo-metadata.json ([#639](https://github.com/googleapis/nodejs-storage/pull/639))

### Internal / Testing Changes
- test(v2-sign): add multi-valued headers system-test ([#646](https://github.com/googleapis/nodejs-storage/pull/646))
- refactor: replace once with onetime ([#660](https://github.com/googleapis/nodejs-storage/pull/660))
- fix: do not download cached files ([#643](https://github.com/googleapis/nodejs-storage/pull/643))
- chore: publish to npm using wombat ([#634](https://github.com/googleapis/nodejs-storage/pull/634))
- build: use per-repo npm publish token ([#630](https://github.com/googleapis/nodejs-storage/pull/630))

## v2.4.3

03-13-2019 17:10 PDT

### Bug Fixes / Implementation Changes
- fix: getSigned(Policy|Url) throws if expiration is invalid Date ([#614](https://github.com/googleapis/nodejs-storage/pull/614))
- fix: handle errors from file#createReadStream ([#615](https://github.com/googleapis/nodejs-storage/pull/615))

### Dependencies
- fix(deps): update dependency @google-cloud/paginator to ^0.2.0
- fix(deps): update dependency gcs-resumable-upload to v1 ([#619](https://github.com/googleapis/nodejs-storage/pull/619))
- fix(deps): update dependency @google-cloud/pubsub to ^0.27.0 ([#620](https://github.com/googleapis/nodejs-storage/pull/620))
- fix(deps): update dependency @google-cloud/pubsub to ^0.26.0 ([#618](https://github.com/googleapis/nodejs-storage/pull/618))
- fix(deps): update dependency @google-cloud/pubsub to ^0.25.0 ([#616](https://github.com/googleapis/nodejs-storage/pull/616))
- chore(deps): update dependency mocha to v6 ([#611](https://github.com/googleapis/nodejs-storage/pull/611))
- fix(deps): update dependency @google-cloud/promisify to ^0.4.0 ([#609](https://github.com/googleapis/nodejs-storage/pull/609))
- chore(deps): update dependency @types/tmp to v0.0.34 ([#608](https://github.com/googleapis/nodejs-storage/pull/608))
- fix(deps): update dependency yargs to v13 ([#606](https://github.com/googleapis/nodejs-storage/pull/606))

### Documentation
- docs: update links in contrib guide ([#610](https://github.com/googleapis/nodejs-storage/pull/610))
- docs: update contributing path in README ([#603](https://github.com/googleapis/nodejs-storage/pull/603))
- chore: move CONTRIBUTING.md to root ([#601](https://github.com/googleapis/nodejs-storage/pull/601))

### Internal / Testing Changes
- build: Add docuploader credentials to node publish jobs ([#624](https://github.com/googleapis/nodejs-storage/pull/624))
- build: use node10 to run samples-test, system-test etc ([#623](https://github.com/googleapis/nodejs-storage/pull/623))
- build: update release configuration
- build: use linkinator for docs test ([#607](https://github.com/googleapis/nodejs-storage/pull/607))
- build: create docs test npm scripts ([#605](https://github.com/googleapis/nodejs-storage/pull/605))
- build: test using @grpc/grpc-js in CI ([#604](https://github.com/googleapis/nodejs-storage/pull/604))
- chore: remove console.log in system test ([#599](https://github.com/googleapis/nodejs-storage/pull/599))

## v2.4.2

02-05-2019 16:55 PST
  
### Dependencies

- deps: update @google-cloud/common ([#596](https://github.com/googleapis/nodejs-storage/pull/596))
- chore(deps): update dependency typescript to ~3.3.0 ([#591](https://github.com/googleapis/nodejs-storage/pull/591))

### Documentation

- docs: add lint/fix example to contributing guide ([#594](https://github.com/googleapis/nodejs-storage/pull/594))

### Internal / Testing Changes

- test: skip public bucket system tests running under VPCSC ([#595](https://github.com/googleapis/nodejs-storage/pull/595))

## v2.4.1

01-29-2019 13:05 PST

### Implementation Changes
- fix(ts): fix Storage.createBucket overloaded signature ([#589](https://github.com/googleapis/nodejs-storage/pull/589))

### Dependencies
- fix(deps): update dependency @google-cloud/pubsub to ^0.24.0 ([#588](https://github.com/googleapis/nodejs-storage/pull/588))

## v2.4.0

01-28-2019 12:13 PST

### New Features
- fix: `expires` can be a Date, string, or number ([#548](https://github.com/googleapis/nodejs-storage/pull/548))

### Dependencies
- deps: upgrade nodejs-common ([#582](https://github.com/googleapis/nodejs-storage/pull/582))
- chore(deps): update dependency eslint-config-prettier to v4 ([#586](https://github.com/googleapis/nodejs-storage/pull/586))
- fix(deps): update dependency @google-cloud/pubsub to ^0.23.0 ([#583](https://github.com/googleapis/nodejs-storage/pull/583))
- fix(deps): update dependency concat-stream to v2 ([#563](https://github.com/googleapis/nodejs-storage/pull/563))

### Documentation
- docs(samples): Bucket Policy Only Samples ([#557](https://github.com/googleapis/nodejs-storage/pull/557))
- fix(docs): move jsdoc away from interface ([#565](https://github.com/googleapis/nodejs-storage/pull/565))

### Internal / Testing Changes
- test: Bucket Policy Only related system test ([#579](https://github.com/googleapis/nodejs-storage/pull/579))
- build: check broken links in generated docs ([#567](https://github.com/googleapis/nodejs-storage/pull/567))
- build: include only build/src in compiled source ([#572](https://github.com/googleapis/nodejs-storage/pull/572))

## v2.3.4

12-19-2018 14:21 PST

### Implementation Changes
- fix(types): file.getMetadata should resolves to Metadata, not File ([#560](https://github.com/googleapis/nodejs-storage/pull/560))

### Internal / Testing Changes
- refactor: modernize the sample tests ([#558](https://github.com/googleapis/nodejs-storage/pull/558))
- chore(build): inject yoshi automation key ([#555](https://github.com/googleapis/nodejs-storage/pull/555))
- chore: update nyc and eslint configs ([#554](https://github.com/googleapis/nodejs-storage/pull/554))
- chore: fix publish.sh permission +x ([#552](https://github.com/googleapis/nodejs-storage/pull/552))
- fix(build): fix Kokoro release script ([#551](https://github.com/googleapis/nodejs-storage/pull/551))
- build: add Kokoro configs for autorelease ([#550](https://github.com/googleapis/nodejs-storage/pull/550))

## v2.3.3

12-06-2018 17:09 PST

### Dependencies
- chore(deps): update dependency @types/configstore to v4 ([#537](https://github.com/googleapis/nodejs-storage/pull/537))
- chore(deps): update dependency @google-cloud/pubsub to ^0.22.0 ([#535](https://github.com/googleapis/nodejs-storage/pull/535))

### Documentation
- fix(docs): place doc comment above the last overload ([#544](https://github.com/googleapis/nodejs-storage/pull/544))
- docs: update readme badges ([#536](https://github.com/googleapis/nodejs-storage/pull/536))

### Internal / Testing Changes
- chore: always nyc report before calling codecov ([#543](https://github.com/googleapis/nodejs-storage/pull/543))
- chore: nyc ignore build/test by default ([#542](https://github.com/googleapis/nodejs-storage/pull/542))
- chore: update license file ([#539](https://github.com/googleapis/nodejs-storage/pull/539))

## v2.3.2

This patch release fixed an issue affecting reading from a file on GCS ([#528](https://github.com/googleapis/nodejs-storage/issues/528)).

### Dependencies
- fix(dep): upgrade teeny-request to v3.11.3 ([#529](https://github.com/googleapis/nodejs-storage/pull/529))
- fix(deps): update dependency @google-cloud/common to ^0.27.0 ([#525](https://github.com/googleapis/nodejs-storage/pull/525))

### Internal / Testing Changes
- refactor: convert sample tests from ava to mocha ([#523](https://github.com/googleapis/nodejs-storage/pull/523))
- docs(samples): updated samples code to use async await ([#521](https://github.com/googleapis/nodejs-storage/pull/521))
- chore: add synth.metadata
- fix(ts): Update bucket options types ([#518](https://github.com/googleapis/nodejs-storage/pull/518))

## v2.3.1

11-14-2018 22:15 PST

### Bug fixes
- fix: fix TypeScript and system tests ([#515](https://github.com/googleapis/nodejs-storage/pull/515))
- fix(deps): update dependency through2 to v3 ([#507](https://github.com/googleapis/nodejs-storage/pull/507))
- docs: File#setMetadata in parallel results in unpredictable state ([#504](https://github.com/googleapis/nodejs-storage/pull/504))

### Internal / Testing Changes
- chore(deps): update dependency gts to ^0.9.0 ([#514](https://github.com/googleapis/nodejs-storage/pull/514))
- chore: update eslintignore config ([#513](https://github.com/googleapis/nodejs-storage/pull/513))
- chore(deps): update dependency @google-cloud/nodejs-repo-tools to v3 ([#512](https://github.com/googleapis/nodejs-storage/pull/512))
- refactor: use object.assign where possible ([#510](https://github.com/googleapis/nodejs-storage/pull/510))
- chore: drop contributors from multiple places ([#511](https://github.com/googleapis/nodejs-storage/pull/511))
- chore: use latest npm on Windows ([#509](https://github.com/googleapis/nodejs-storage/pull/509))

## v2.3.0

### Implementation Changes
- fix(types): Fixes getSignedUrl Return Type ([#496](https://github.com/googleapis/nodejs-storage/pull/496))
-
### New Features
- Introduce Object Lifecycle Management ([#471](https://github.com/googleapis/nodejs-storage/pull/471))

### Dependencies
- chore(deps): update dependency eslint-plugin-node to v8 ([#490](https://github.com/googleapis/nodejs-storage/pull/490))

### Internal / Testing Changes
- chore: update issue templates ([#488](https://github.com/googleapis/nodejs-storage/pull/488))

## v2.2.0

### Bug Fixes
- fix: re-enable typescript types ([#484](https://github.com/googleapis/nodejs-storage/pull/484))

### Dependencies
- fix(deps): update dependency @google-cloud/common to ^0.26.0 (edited) ([#480](https://github.com/googleapis/nodejs-storage/pull/480))
- chore: Remove 'is' dependency ([#462](https://github.com/googleapis/nodejs-storage/pull/462))
- chore: upgrade teeny-request to 3.11.0 with type definitions ([#457](https://github.com/googleapis/nodejs-storage/pull/457))
- feat: use small HTTP dependency ([#416](https://github.com/googleapis/nodejs-storage/pull/416))

### Documentation
- docs: Minor docs correction ([#465](https://github.com/googleapis/nodejs-storage/pull/465))

### Internal / Testing Changes
- chore: remove old issue template ([#485](https://github.com/googleapis/nodejs-storage/pull/485))
- chore(typescript): enable noImplicitAny ([#483](https://github.com/googleapis/nodejs-storage/pull/483))
- chore(typescript): improve typescript types and update tests ([#482](https://github.com/googleapis/nodejs-storage/pull/482))
- build: run tests on node11 ([#481](https://github.com/googleapis/nodejs-storage/pull/481))
- chores(build): do not collect sponge.xml from windows builds ([#478](https://github.com/googleapis/nodejs-storage/pull/478))
- chores(build): run codecov on continuous builds ([#476](https://github.com/googleapis/nodejs-storage/pull/476))
- chore: update new issue template ([#475](https://github.com/googleapis/nodejs-storage/pull/475))
- fix: enable noImplicitAny for src/bucket.ts ([#472](https://github.com/googleapis/nodejs-storage/pull/472))
- fix(tests): use unique prefix for system tests to avoid collision with another run ([#468](https://github.com/googleapis/nodejs-storage/pull/468))
- fix: improve the types ([#467](https://github.com/googleapis/nodejs-storage/pull/467))
- chore: move class Storage to storage.ts, create index.ts that contains all exports ([#464](https://github.com/googleapis/nodejs-storage/pull/464))
- chore: add types to many unit tests ([#463](https://github.com/googleapis/nodejs-storage/pull/463))
- fix: Annotate Iam types ([#461](https://github.com/googleapis/nodejs-storage/pull/461))
- fix: complete bucket.ts noImplicitAny ([#460](https://github.com/googleapis/nodejs-storage/pull/460))
- fix: improve the types on acl.ts ([#459](https://github.com/googleapis/nodejs-storage/pull/459))
- fix: improve types (7) ([#458](https://github.com/googleapis/nodejs-storage/pull/458))
- fix: improve the types ([#453](https://github.com/googleapis/nodejs-storage/pull/453))
- chore: update build config ([#455](https://github.com/googleapis/nodejs-storage/pull/455))
- fix: improve typescript types in src/file.ts ([#450](https://github.com/googleapis/nodejs-storage/pull/450))
- build: fix codecov uploading on Kokoro ([#451](https://github.com/googleapis/nodejs-storage/pull/451))
- test: Attempt to re-enable iam#testPermissions ([#429](https://github.com/googleapis/nodejs-storage/pull/429))
- chore(deps): update dependency sinon to v7 ([#449](https://github.com/googleapis/nodejs-storage/pull/449))
- Re-generate library using /synth.py ([#448](https://github.com/googleapis/nodejs-storage/pull/448))
- Correct parameter name. ([#446](https://github.com/googleapis/nodejs-storage/pull/446))

## v2.1.0

This release brings support for Bucket/Object lock operations, as well as disable TypeScript as we continue to annotate the project with types.

### New Features
- feat: Support Bucket/Object lock operations ([#374](https://github.com/googleapis/nodejs-storage/pull/374))

### Implementation Changes
- disable types for now ([#392](https://github.com/googleapis/nodejs-storage/pull/392))
- Don't publish sourcemaps ([#412](https://github.com/googleapis/nodejs-storage/pull/412))
#### TypeScript support (in progress)
- fix: add better types for file.ts ([#436](https://github.com/googleapis/nodejs-storage/pull/436))
- fix: use ~ for typescript (and fix compile errors) ([#426](https://github.com/googleapis/nodejs-storage/pull/426))
- fix: Add typing for File#download() ([#409](https://github.com/googleapis/nodejs-storage/pull/409))
- chore: convert system tests to typescript ([#424](https://github.com/googleapis/nodejs-storage/pull/424))
- Improve TypeScript types (part 4) ([#402](https://github.com/googleapis/nodejs-storage/pull/402))
- ts: convert jsdoc types to typescript interfaces (1) ([#383](https://github.com/googleapis/nodejs-storage/pull/383))
- fix: TS definition ([#387](https://github.com/googleapis/nodejs-storage/pull/387))
- Annotate types [#3](https://github.com/googleapis/nodejs-storage/pull/3) ([#391](https://github.com/googleapis/nodejs-storage/pull/391))
- Annotate types (2) ([#388](https://github.com/googleapis/nodejs-storage/pull/388))

### Dependencies
- chore(deps): update dependency eslint-plugin-prettier to v3 ([#419](https://github.com/googleapis/nodejs-storage/pull/419))

### Documentation
- docs: Modify source location for templates ([#410](https://github.com/googleapis/nodejs-storage/pull/410))
- docs: Explain `Bucket#upload()` still exists ([#421](https://github.com/googleapis/nodejs-storage/pull/421))

### Internal / Testing Changes
- fix(tests): fix system tests on CircleCI ([#431](https://github.com/googleapis/nodejs-storage/pull/431))
- fix(tests): system-test compiles to ./build, fix relative path ([#428](https://github.com/googleapis/nodejs-storage/pull/428))
- Update kokoro config ([#425](https://github.com/googleapis/nodejs-storage/pull/425))
- chore(samples): convert samples to async/await ([#422](https://github.com/googleapis/nodejs-storage/pull/422))
- build: samples test by adding approprate test variables ([#423](https://github.com/googleapis/nodejs-storage/pull/423))
- build: bring in latest kokoro cfgs to run System tests on PRs ([#413](https://github.com/googleapis/nodejs-storage/pull/413))
- test: remove appveyor config ([#411](https://github.com/googleapis/nodejs-storage/pull/411))
- Enable prefer-const in the eslint config ([#404](https://github.com/googleapis/nodejs-storage/pull/404))
- fix(test): instantiate PubSub using new ([#403](https://github.com/googleapis/nodejs-storage/pull/403))
- fix: optionsOrCallback could be undefined if not given, check before assign ([#401](https://github.com/googleapis/nodejs-storage/pull/401))
- Fix the requesterPays methods ([#400](https://github.com/googleapis/nodejs-storage/pull/400))
- Enable no-var in eslint ([#398](https://github.com/googleapis/nodejs-storage/pull/398))
- samples: don't use USA formatted dates for expiry ([#396](https://github.com/googleapis/nodejs-storage/pull/396))
- fix: copy(): Use correct destination file name in URI ([#389](https://github.com/googleapis/nodejs-storage/pull/389))

## v2.0.3

### Implementation Changes
- Improve TypeScript types ([#381](https://github.com/googleapis/nodejs-storage/pull/381))
- Make some parameters optional ([#380](https://github.com/googleapis/nodejs-storage/pull/380))

## v2.0.2

### Implementation Changes
- Improve the types (#377)

## v2.0.1

**This fixes types declaration issues with projects using TypeScript.**

### Implementation Changes
- Enable noImplicitThis in the tsconfig ([#370](https://github.com/googleapis/nodejs-storage/pull/370))
- Fix the path to the d.ts ([#364](https://github.com/googleapis/nodejs-storage/pull/364))
- fix: make dependency on request explicit ([#361](https://github.com/googleapis/nodejs-storage/pull/361))
- fix: remove trailing slashes from bucket name. ([#266](https://github.com/googleapis/nodejs-storage/pull/266))

### Dependencies
- fix(deps): update dependency @google-cloud/common to ^0.24.0 ([#367](https://github.com/googleapis/nodejs-storage/pull/367))
- fix(deps): update dependency gcs-resumable-upload to ^0.13.0 ([#368](https://github.com/googleapis/nodejs-storage/pull/368))
- Remove unused dependencies ([#363](https://github.com/googleapis/nodejs-storage/pull/363))
- Remove safe-buffer ([#359](https://github.com/googleapis/nodejs-storage/pull/359))
- samples: update dependency @google-cloud/storage to v2 ([#350](https://github.com/googleapis/nodejs-storage/pull/350))

### Internal / Testing Changes
- Update CI config ([#371](https://github.com/googleapis/nodejs-storage/pull/371))
- build(kokoro): run docker as user node ([#358](https://github.com/googleapis/nodejs-storage/pull/358))
- build: fix multiline in circle.yml ([#357](https://github.com/googleapis/nodejs-storage/pull/357))
- fix executable modes on .sh's; add pre-system-test.sh hook ([#356](https://github.com/googleapis/nodejs-storage/pull/356))
- decrypt both service account keys ([#353](https://github.com/googleapis/nodejs-storage/pull/353))
- Retry npm install in CI ([#352](https://github.com/googleapis/nodejs-storage/pull/352))
- Add synth script and run it ([#351](https://github.com/googleapis/nodejs-storage/pull/351))

## v2.0.0

**This release has breaking changes**.  This release has a few notable breaking changes.  Please take care when upgrading!

### require syntax changes
The import style of this library has been changed to support [es module](https://nodejs.org/api/esm.html) syntax.  This provides both forward compatibility with es modules, and better supports the TypeScript and Babel ecosystems.  As a result, the import syntax has changed:

#### Old Code
```js
const storage = require('@google-cloud/storage')();
// or...
const Storage = require('@google-cloud/storage');
const storage = new Storage({
  // config...
});
```

#### New Code
```js
const {Storage} = require('@google-cloud/storage');
const storage = new Storage({
  // config...
});
```

### `bucket.upload` no longer accepts URLs
To better support a variety of HTTP clients, the remote fetching functionality of `bucket.upload` has been removed. It can be replaced with your favorite HTTP client.

#### Old Code
```js
bucket.upload('https://example.com/images/image.png', function(err, file, res) {
  // handle upload...
});
```

#### New Code

```js
const request = require('request');
const file = bucket.file(name);
const writeStream = file.createWriteStream();
request(url).pipe(writeStream);
```

### Breaking changes
- semver: do not support upload() from url (#337)
- fix: drop support for node.js 4.x and 9.x (#282)

### Features
- refactor(ts): merge initial TypeScript conversion (#334)
- feat: Add Storage#getServiceAccount(). (#331)
- Kms sample (#209)

### Bug fixes
- fix: gzip and Cache-Control headers in upload sample (#225)
- fix: move this.[ROLE]s initialization from Acl to AclAccessorRoleMethods (#252)
- fix: signedURL cname (#210) (#234)

### Internal / Testing Changes
- chore(deps): update dependency nyc to v13 (#341)
- fix(deps): update dependency @google-cloud/common to ^0.23.0 (#340)
- test: throw on deprecation (#319)
- chore(deps): update dependency eslint-config-prettier to v3 (#336)
- fix(deps): update dependency gcs-resumable-upload to ^0.12.0 (#317)
- Fix system tests for string comparisons (#328)
- chore: ignore package-lock.json (#326)
- chore: update renovate config (#322)
- chore: regen lock files (#318)
- chore(deps): lock file maintenance (#313)
- chore: move mocha options to mocha.opts (#311)
- chore(deps): lock file maintenance (#309)
- test: use strictEqual in tests (#306)
- chore(deps): update dependency eslint-plugin-node to v7 (#305)
- chore(deps): lock file maintenance (#303)
- chore(deps): lock file maintenance (#285)
- fix: test meant to assert err msg exists (#280)
- fix(deps): update dependency yargs to v12 (#270)
- fix(deps): update dependency uuid to v3.3.2 (#269)
- chore: update gcs-resumable-upload to 0.11.1 (#265)
- fix(deps): update dependency uuid to v3.3.0 (#262)
- chore(deps): update dependency sinon to v6 (#263)
- Configure Renovate (#250)
- refactor: drop repo-tool as an exec wrapper (#258)
- chore: update sample lockfiles (#256)
- fix: update linking for samples (#254)
- chore(package): update eslint to version 5.0.0 (#253)
- refactor(es6): Refactor constructor pattern as ES6 class (#246)
- Update @google-cloud/common to the latest version 🚀 (#226)
- system-tests: fix channel test. (#243)
- refactor: Update to the latest version of nodejs-common and gcs-resumable-upload (#202)
- Fix permission of bash script for Kokoro (#223)
- chore(package): update nyc to version 12.0.2 (#216)
- chore: fix prettier incompatibility (#211)

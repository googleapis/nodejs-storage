/*!
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import * as assert from 'assert';
import {describe, it, beforeEach} from 'mocha';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {Readable} from 'stream';
import {createURI, ErrorWithCode, upload} from '../src/gcs-resumable-upload';

const bucketName = process.env.BUCKET_NAME || 'gcs-resumable-upload-test';
const filePath = path.join(
  __dirname,
  '../../system-test/data/20MB.zip'
)

async function delay(
  title: string,
  retries: number,
  done: Function
) {
  if (retries === 0) return done(); // no retry on the first failure.
  // see: https://cloud.google.com/storage/docs/exponential-backoff:
  const ms = Math.pow(2, retries) * 1000 + Math.random() * 2000;
  console.info(`retrying "${title}" in ${ms}ms`);
  setTimeout(done(), ms);
}

describe('gcs-resumable-upload', () => {
  beforeEach(() => {
    upload({bucket: bucketName, file: filePath}).deleteConfig();
  });

  it('should work', done => {
    let uploadSucceeded = false;
    fs.createReadStream(filePath)
      .on('error', done)
      .pipe(
        upload({
          bucket: bucketName,
          file: filePath,
          metadata: {contentType: 'image/jpg'},
        })
      )
      .on('error', done)
      .on('response', resp => {
        uploadSucceeded = resp.status === 200;
      })
      .on('finish', () => {
        assert.strictEqual(uploadSucceeded, true);
        done();
      });
  });

  let retries = 0;
  it('should resume an interrupted upload', function (done) {
    this.retries(3);
    delay(this.test!.title, retries, () => {
      retries++;
      // If we've retried, delay.
      fs.stat(filePath, (err, fd) => {
        assert.ifError(err);

        const size = fd.size;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type DoUploadCallback = (...args: any[]) => void;
        const doUpload = (
          opts: {interrupt?: boolean},
          callback: DoUploadCallback
        ) => {
          let sizeStreamed = 0;
          let destroyed = false;

          const ws = upload({
            bucket: bucketName,
            file: filePath,
            metadata: {contentType: 'image/jpg'},
          });

          fs.createReadStream(filePath)
            .on('error', callback)
            .on('data', function (this: Readable, chunk) {
              sizeStreamed += chunk.length;

              if (!destroyed && opts.interrupt && sizeStreamed >= size / 2) {
                // stop sending data half way through
                destroyed = true;
                this.destroy();
                process.nextTick(() => ws.destroy(new Error('Interrupted')));
              }
            })
            .pipe(ws)
            .on('error', callback)
            .on('metadata', callback.bind(null, null));
        };

        doUpload({interrupt: true}, (err: Error) => {
          assert.strictEqual(err.message, 'Interrupted');

          doUpload(
            {interrupt: false},
            (err: Error, metadata: {size: number}) => {
              assert.ifError(err);
              assert.strictEqual(metadata.size, size);
              assert.strictEqual(typeof metadata.size, 'number');
              done();
            }
          );
        });
      });
    });
  });

  it('should just make an upload URI', done => {
    createURI(
      {
        bucket: bucketName,
        file: filePath,
        metadata: {contentType: 'image/jpg'},
      },
      done
    );
  });

  it('should return a non-resumable failed upload', done => {
    const metadata = {
      metadata: {largeString: 'a'.repeat(2.1e6)},
    };

    fs.createReadStream(filePath)
      .on('error', done)
      .pipe(
        upload({
          bucket: bucketName,
          file: filePath,
          metadata,
        })
      )
      .on('error', (err: ErrorWithCode) => {
        assert.strictEqual(err.code, '400');
        done();
      });
  });

  it('should set custom config file', done => {
    const uploadOptions = {
      bucket: bucketName,
      file: filePath,
      metadata: {contentType: 'image/jpg'},
      configPath: path.join(
        os.tmpdir(),
        `test-gcs-resumable-${Date.now()}.json`
      ),
    };
    let uploadSucceeded = false;

    fs.createReadStream(filePath)
      .on('error', done)
      .pipe(upload(uploadOptions))
      .on('error', done)
      .on('response', resp => {
        uploadSucceeded = resp.status === 200;
      })
      .on('finish', () => {
        assert.strictEqual(uploadSucceeded, true);

        const configData = JSON.parse(
          fs.readFileSync(uploadOptions.configPath, 'utf8')
        );
        const keyName = `${uploadOptions.bucket}/${uploadOptions.file}`.replace(
          path.extname(filePath),
          ''
        );
        assert.ok(Object.keys(configData).includes(keyName));
        done();
      });
  });
});

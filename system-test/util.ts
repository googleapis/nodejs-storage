/*!
 * Copyright 2020 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */
export default async function delay(
  title: string,
  retries: number,
  done: Function
) {
  if (retries === 0) return done(); // no retry on the first failure.
  // see: https://cloud.google.com/storage/docs/exponential-backoff:
  const ms = Math.pow(2, retries) * 1000 + Math.random() * 2000;
  console.info(`retrying "${title}" in ${ms}ms`);
  setTimeout(done, ms);
}

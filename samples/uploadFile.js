function main(bucketName = "my-bucket", filename = "./local/path/to/file.txt") {
    // [START storage_upload_file]
    /**
         * TODO(developer): Uncomment the following lines before running the sample.
         */
    // const bucketName = 'Name of a bucket, e.g. my-bucket';
    // const filename = 'Local file to upload, e.g. ./local/path/to/file.txt';
   
    // Imports the Google Cloud client library
    const { Storage } = require('@google-cloud/storage');

    // Creates a client
    const storage = new Storage();

    async function uploadFile() {

        // Uploads a local file to the bucket
        await storage.bucket(bucketName).upload(filename, {
            // Support for HTTP requests made with `Accept-Encoding: gzip`
            gzip: true,
            // By setting the option `destination`, you can change the name of the
            // object you are uploading to a bucket.
            metadata: {
                // Enable long-lived HTTP caching headers
                // Use only if the contents of the file will never change
                // (If the contents will change, use cacheControl: 'no-cache')
                cacheControl: 'public, max-age=31536000',
            },
        });

        console.log(`${filename} uploaded to ${bucketName}.`);
    }

    uploadFile();
    // [END storage_upload_file]
}

main(...process.argv.slice(2));
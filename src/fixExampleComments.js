const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('input.txt');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    console.log(`Line from file: ${line}`);
  }
}

const main = async () => {
  const path = 'src';
  const {readdir} = fs.promises;
  try {
    const files = await readdir(path);
    for (const file of files) console.log(file);
  } catch (err) {
    console.error(err);
  }
};

main();

// processLineByLine();

const fs = require('fs');
const readline = require('readline');

async function processLineByLine(path, file) {
  const fileStream = fs.createReadStream(path + '/' + file);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  const data = [];

  for await (let line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    console.log(`Line from file: ${line}`);
    if (line.match(/@example/)) {
      line += 'foobar';
    }
    data.push(line);
  }

  fs.writeFileSync('tmp.ts', data.join('\n'), 'utf-8');
}

const main = async () => {
  const path = 'src';
  const {readdir} = fs.promises;
  try {
    const files = await readdir(path);
    for (const file of files) {
      if (file.match(/\.ts$/)) {
        // console.log(file);
        processLineByLine(path, file);
      }
    }
  } catch (err) {
    console.error(err);
  }
};

main();

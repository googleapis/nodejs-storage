const fs = require('fs');
const readline = require('readline');

async function processLineByLine(file) {
  const fileStream = fs.createReadStream(file);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  // Note: we use the crlfDelay option to recognize all instances of CR LF
  // ('\r\n') in input.txt as a single line break.

  const data = [];
  let insideExampleBlock = false;

  for await (const line of rl) {
    // Each line in input.txt will be successively available here as `line`.
    const codeExampleFencing = '   * ```';
    if (insideExampleBlock) {
      const openingTag = /^\s*\* @/;
      const endComment = /^\s*\*\//;
      if (line.match(openingTag) || line.match(endComment)) {
        data.push(codeExampleFencing);
        insideExampleBlock = false;
      }
    }
    data.push(line);
    const exampleTag = /^\s*\* @example/;
    if (line.match(exampleTag)) {
      insideExampleBlock = true;
      data.push(codeExampleFencing);
    }
  }

  fs.writeFileSync(file, data.join('\n'), 'utf-8');
}

const main = async () => {
  const path = 'src';
  const {readdir} = fs.promises;
  try {
    const files = await readdir(path);
    for (const file of files) {
      if (file.match(/\.ts$/)) {
        // console.log(file);
        processLineByLine(path + '/' + file);
      }
    }
  } catch (err) {
    console.error(err);
  }
};

main();

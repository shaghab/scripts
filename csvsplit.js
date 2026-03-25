#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function printUsage() {
  console.error('Usage: csvsplit <input.csv> <sizeMB>');
}

function getOutputPath(inputPath, index) {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath) || '.csv';
  const base = path.basename(inputPath, ext);
  return path.join(dir, `${base}-${index}${ext}`);
}

async function splitCsv(inputPath, sizeMb) {
  const maxBytes = Math.floor(sizeMb * 1024 * 1024);

  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new Error('sizeMB must be a positive number.');
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const readStream = fs.createReadStream(inputPath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });

  let header = null;
  let fileIndex = 0;
  let currentStream = null;
  let currentBytes = 0;
  let rowCount = 0;

  const closeCurrentStream = async () => {
    if (!currentStream) return;
    await new Promise((resolve, reject) => {
      currentStream.end((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    currentStream = null;
  };

  const openNextFile = () => {
    fileIndex += 1;
    const outputPath = getOutputPath(inputPath, fileIndex);
    currentStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

    currentStream.on('error', (err) => {
      throw err;
    });

    currentStream.write(`${header}\n`);
    currentBytes = Buffer.byteLength(`${header}\n`, 'utf8');
  };

  for await (const line of rl) {
    if (header === null) {
      header = line;
      continue;
    }

    const row = `${line}\n`;
    const rowBytes = Buffer.byteLength(row, 'utf8');

    if (!currentStream) {
      openNextFile();
    }

    if (currentBytes + rowBytes > maxBytes && currentBytes > Buffer.byteLength(`${header}\n`, 'utf8')) {
      await closeCurrentStream();
      openNextFile();
    }

    if (!currentStream.write(row)) {
      await new Promise((resolve) => currentStream.once('drain', resolve));
    }

    currentBytes += rowBytes;
    rowCount += 1;
  }

  await closeCurrentStream();

  if (header === null) {
    throw new Error('Input file is empty.');
  }

  if (rowCount === 0) {
    const outputPath = getOutputPath(inputPath, 1);
    fs.writeFileSync(outputPath, `${header}\n`, 'utf8');
    fileIndex = 1;
  }

  return fileIndex;
}

(async function main() {
  const [, , inputPathArg, sizeMbArg] = process.argv;

  if (!inputPathArg || !sizeMbArg) {
    printUsage();
    process.exit(1);
  }

  const sizeMb = Number(sizeMbArg);

  try {
    const filesCreated = await splitCsv(inputPathArg, sizeMb);
    console.log(`Created ${filesCreated} file(s).`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
})();

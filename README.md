# Node.js Homework 06 · Gzip

Compress and decompress files with Node.js streams and Gzip. The assignment and implementation are in [src/main.js](src/main.js).

## Run the tests

Use Node.js 24 and install the starter dependencies from the supplied lockfile:

```sh
npm exec --yes --package=yarn@1.22.22 -- yarn install --frozen-lockfile
npm test
npm run test:files
```

`npm test` runs the 14 original Vitest tests. `npm run test:files` checks real Gzip files in a temporary directory and removes them after the run.

## Live demo

[Open Gzip Playground](https://andrii-dolzhenko.github.io/njs-homework-06-gzip/). The GitHub Pages version processes files in your browser without uploading them.

## Local demo

Run `npm run dev` and open [http://127.0.0.1:3000/](http://127.0.0.1:3000/). Choose a file up to 256 KiB or click **Use sample file**, then compress it. Click **Use in decompression** to pass the archive to the second panel, restore the file, and download either result.

The demo runs on your computer and uses temporary files.

## Usage

`compressFile(filePath)` returns the path to the Gzip file. `decompressFile(compressedFilePath, destinationFilePath)` returns the path to the restored file. Both reject with the underlying error if an operation fails.

```js
import { compressFile, decompressFile } from './src/main.js'

const compressed = await compressFile('./src/files/source.txt')
const restored = await decompressFile(compressed, './src/files/source_decompressed.txt')
console.log({ compressed, restored })
```

If a destination already exists, the next run adds a suffix such as `source_1.txt.gz` or `source_decompressed_1.txt`. The original file is kept intact.

`performCompressionAndDecompression(source, destination)` runs both steps and returns both output paths. Without arguments, it uses paths relative to the current directory: `./files/source.txt` and `./files/source_decompressed.txt`.

© 2026 Andrii Dolzhenko. All Rights Reserved.

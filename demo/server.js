import { createReadStream } from 'node:fs'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { parseArgs } from 'node:util'
import { compressFile, decompressFile } from '../src/main.js'

const assets = new Map([
  ['/', [new URL('./public/index.html', import.meta.url), 'text/html; charset=utf-8']],
  ['/styles.css', [new URL('./public/styles.css', import.meta.url), 'text/css; charset=utf-8']],
  ['/app.js', [new URL('./public/app.js', import.meta.url), 'text/javascript; charset=utf-8']],
  ['/favicon.svg', [new URL('./public/favicon.svg', import.meta.url), 'image/svg+xml']],
  ['/sample.txt', [new URL('../src/files/source.txt', import.meta.url), 'text/plain; charset=utf-8']]
])
const maxUpload = 256 * 1024
const maxDownload = 4 * 1024 * 1024

function headers(type, length) {
  return {
    'Content-Type': type,
    'Content-Length': length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
}

function send(res, status, message) {
  res.writeHead(status, headers('text/plain; charset=utf-8', Buffer.byteLength(message)))
  res.end(message)
}

async function handleFile(req, res, decompress) {
  if (req.headers['content-type'] !== 'application/octet-stream') {
    req.resume()
    return send(res, 415, 'Select a file and try again.')
  }

  const limit = decompress ? maxUpload + 16 * 1024 : maxUpload
  if (Number(req.headers['content-length']) > limit) {
    req.resume()
    return send(res, 413, 'The selected file exceeds the demo limit.')
  }

  const chunks = []
  let length = 0
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    length += chunk.length
    if (length > limit) {
      req.resume()
      return send(res, 413, 'The selected file exceeds the demo limit.')
    }
    chunks.push(chunk)
  }

  const directory = await mkdtemp(join(tmpdir(), 'njs06-demo-'))
  try {
    const input = join(directory, decompress ? 'input.gz' : 'input')
    await writeFile(input, Buffer.concat(chunks))
    const output = decompress ? await decompressFile(input, join(directory, 'restored')) : await compressFile(input)
    const { size } = await stat(output)
    if (size > maxDownload) return send(res, 413, 'The restored file exceeds the 4 MiB demo limit.')

    res.writeHead(200, headers(decompress ? 'application/octet-stream' : 'application/gzip', size))
    await pipeline(createReadStream(output), res)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

const server = createServer(async (req, res) => {
  try {
    const path = req.url.split('?')[0]
    if (req.method === 'POST' && (path === '/api/compress' || path === '/api/decompress')) {
      return await handleFile(req, res, path === '/api/decompress')
    }

    const asset = assets.get(path)
    if (req.method === 'GET' && asset) {
      const [file, type] = asset
      const body = await readFile(file)
      res.writeHead(200, headers(type, body.length))
      return res.end(body)
    }

    send(res, 404, 'Not found.')
  } catch (error) {
    if (res.destroyed || res.writableEnded) return
    if (res.headersSent) return res.destroy()
    if (error.code === 'Z_DATA_ERROR' || error.code === 'Z_BUF_ERROR') {
      return send(res, 400, 'This is not a valid Gzip file.')
    }
    send(res, 500, 'The file could not be processed.')
  }
})

const { values } = parseArgs({
  options: {
    port: { type: 'string' },
    host: { type: 'string' },
    strictPort: { type: 'boolean' }
  }
})
const port = Number(values.port ?? process.env.PORT ?? 3000)
server.listen(port, '127.0.0.1', () => {
  console.log(`Gzip Playground: http://127.0.0.1:${server.address().port}/`)
})

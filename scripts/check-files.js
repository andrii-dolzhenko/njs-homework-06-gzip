import assert from 'node:assert/strict'
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compressFile, decompressFile, performCompressionAndDecompression } from '../src/main.js'

const directory = await mkdtemp(join(tmpdir(), 'njs06-gzip-'))

try {
  const source = join(directory, 'source.txt')
  const destination = join(directory, 'source_decompressed.txt')
  await copyFile(new URL('../src/files/source.txt', import.meta.url), source)
  const original = await readFile(source)

  const { compressed, decompressed } = await performCompressionAndDecompression(source, destination)
  assert.equal(compressed, source + '.gz')
  assert.equal(decompressed, destination)
  const gzip = await readFile(compressed)
  assert.deepEqual(gzip.subarray(0, 2), Buffer.from([0x1f, 0x8b]))
  assert.deepEqual(await readFile(decompressed), original)
  console.log('PASS: real Gzip round trip preserves every byte')

  const second = await performCompressionAndDecompression(source, destination)
  const third = await performCompressionAndDecompression(source, destination)
  assert.equal(second.compressed, join(directory, 'source_1.txt.gz'))
  assert.equal(second.decompressed, join(directory, 'source_decompressed_1.txt'))
  assert.equal(third.compressed, join(directory, 'source_2.txt.gz'))
  assert.equal(third.decompressed, join(directory, 'source_decompressed_2.txt'))
  assert.deepEqual(await readFile(third.decompressed), original)
  assert.deepEqual(await readFile(compressed), gzip)
  assert.deepEqual(await readFile(decompressed), original)
  console.log('PASS: repeated runs pick new names without overwriting files')

  const invalid = join(directory, 'invalid.gz')
  const failedDestination = join(directory, 'failed.txt')
  await writeFile(invalid, 'This is not Gzip')
  await assert.rejects(decompressFile(invalid, failedDestination), { code: 'Z_DATA_ERROR' })
  await assert.rejects(readFile(failedDestination), { code: 'ENOENT' })
  await assert.rejects(compressFile(join(directory, 'missing.txt')), { code: 'ENOENT' })
  await assert.rejects(decompressFile(join(directory, 'missing.gz'), destination), { code: 'ENOENT' })
  console.log('PASS: missing and invalid files fail without leaving incomplete output')
} finally {
  await rm(directory, { recursive: true, force: true })
}

const maxSource = 256 * 1024
const maxArchive = 272 * 1024
const maxRestored = 4 * 1024 * 1024

export async function processBrowserFile(mode, file) {
  const compress = mode === 'compress'
  const limit = compress ? maxSource : maxArchive
  if (file.size > limit) throw new Error('The selected file exceeds the demo limit.')

  const Transform = compress ? globalThis.CompressionStream : globalThis.DecompressionStream
  if (!Transform) throw new Error('This browser does not support Gzip streams.')

  const reader = file.stream().pipeThrough(new Transform('gzip')).getReader()
  const chunks = []
  let size = 0

  try {
    while (true) {
      let chunk
      try {
        chunk = await reader.read()
      } catch (error) {
        if (compress) throw error
        throw new Error('This is not a valid Gzip file.')
      }
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > maxRestored) {
        await reader.cancel()
        throw new Error('The restored file exceeds the 4 MiB demo limit.')
      }
      chunks.push(chunk.value)
    }
  } finally {
    reader.releaseLock()
  }

  return new Blob(chunks, { type: compress ? 'application/gzip' : 'application/octet-stream' })
}

const byId = id => document.getElementById(id)

function showStatus(mode, text, isError = false) {
  const status = byId(`${mode}-status`)
  status.dataset.error = String(isError)
  status.textContent = text
}

function clearDownload(mode) {
  const link = byId(`${mode}-download`)
  if (link.href) URL.revokeObjectURL(link.href)
  link.removeAttribute('href')
  link.hidden = true
}

function formatSize(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KiB`
}

async function processFile(mode, file) {
  if (document.documentElement.dataset.gzipRuntime === 'browser') {
    const { processBrowserFile } = await import('./browser-gzip.js')
    return processBrowserFile(mode, file)
  }

  const response = await fetch(`./api/${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file
  })
  if (!response.ok) throw new Error(await response.text())
  return response.blob()
}

let sample
let compressedFile
let restoreInput

function wireForm(mode, getFile) {
  const form = byId(`${mode}-form`)
  const input = byId(`${mode}-file`)
  const submit = form.querySelector('[type="submit"]')

  input.addEventListener('change', () => {
    if (mode === 'compress') {
      sample = undefined
      compressedFile = undefined
      byId('use-result').hidden = true
    } else {
      restoreInput = undefined
    }
    clearDownload(mode)
    showStatus(mode, input.files[0] ? `Selected: ${input.files[0].name}` : '')
  })

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const file = getFile(input)
    if (!file) return showStatus(mode, 'Choose a file first.', true)
    clearDownload(mode)
    submit.disabled = true
    input.disabled = true
    if (mode === 'compress') {
      byId('sample').disabled = true
      byId('use-result').hidden = true
      compressedFile = undefined
    }
    showStatus(mode, 'Processing…')

    try {
      const result = await processFile(mode, file)
      const filename = mode === 'compress'
        ? `${file.name}.gz`
        : file.name.replace(/\.gz$/i, '') || 'restored-file'
      const link = byId(`${mode}-download`)
      link.href = URL.createObjectURL(result)
      link.download = filename
      link.hidden = false

      if (mode === 'compress') {
        compressedFile = new File([result], filename)
        byId('use-result').hidden = false
      }

      showStatus(mode, `${filename} · ${formatSize(file.size)} → ${formatSize(result.size)}`)
    } catch (error) {
      showStatus(mode, error.message, true)
    } finally {
      submit.disabled = false
      input.disabled = false
      if (mode === 'compress') byId('sample').disabled = false
    }
  })

  form.inert = false
}

wireForm('compress', input => sample ?? input.files[0])
wireForm('decompress', input => restoreInput ?? input.files[0])

byId('sample').addEventListener('click', async () => {
  const button = byId('sample')
  const form = byId('compress-form')
  const submit = form.querySelector('[type="submit"]')
  button.disabled = true
  submit.disabled = true
  byId('compress-file').disabled = true
  try {
    const response = await fetch('./sample.txt')
    if (!response.ok) throw new Error('Sample unavailable.')
    sample = new File([await response.blob()], 'source.txt')
    compressedFile = undefined
    byId('compress-file').value = ''
    byId('use-result').hidden = true
    clearDownload('compress')
    showStatus('compress', `Selected: ${sample.name} · ${formatSize(sample.size)}`)
  } catch {
    showStatus('compress', 'Could not load the sample.', true)
  } finally {
    button.disabled = false
    submit.disabled = false
    byId('compress-file').disabled = false
  }
})

byId('use-result').addEventListener('click', () => {
  const input = byId('decompress-file')
  if (!compressedFile || input.disabled) return
  restoreInput = compressedFile
  input.value = ''
  clearDownload('decompress')
  showStatus('decompress', `Selected: ${restoreInput.name}`)
  byId('decompress-form').querySelector('[type="submit"]').focus()
})

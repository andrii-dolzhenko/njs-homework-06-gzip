import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'

const source = new URL('../demo/public/', import.meta.url)
const target = new URL('../dist/pages/', import.meta.url)
let html = await readFile(new URL('index.html', source), 'utf8')

const replacements = [
  ['<html lang="en">', '<html lang="en" data-gzip-runtime="browser">'],
  ['using Gzip and Node.js streams', 'using Gzip directly in your browser'],
  ['LOCAL NODE.JS DEMO', 'BROWSER DEMO'],
  ['restore it with Node.js streams', 'restore it in your browser'],
  ['Files are processed on your computer.', 'Your files stay in this browser.']
]

for (const [before, after] of replacements) {
  if (!html.includes(before)) throw new Error(`Missing demo text: ${before}`)
  html = html.replace(before, after)
}

await mkdir(target, { recursive: true })
await Promise.all([
  writeFile(new URL('index.html', target), html),
  copyFile(new URL('../src/files/source.txt', import.meta.url), new URL('sample.txt', target)),
  ...['app.js', 'browser-gzip.js', 'styles.css', 'favicon.svg'].map(file => (
    copyFile(new URL(file, source), new URL(file, target))
  ))
])

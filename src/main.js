import { createReadStream, createWriteStream, promises as fs } from 'fs'
import { join, parse } from 'path'
import { pipeline } from 'stream/promises'
import { createGunzip, createGzip } from 'zlib'

async function getAvailablePath(filePath, suffix = '') {
  const { dir, name, ext } = parse(filePath)
  let candidate = filePath + suffix

  for (let index = 1; ; index += 1) {
    try {
      await fs.access(candidate)
    } catch (error) {
      if (error.code === 'ENOENT') return candidate
      throw error
    }

    const filename = `${name}_${index}${ext}${suffix}`
    candidate = dir ? join(dir, filename) : filename
  }
}

async function transformFile(source, destination, transform) {
  const input = createReadStream(source)
  const output = createWriteStream(destination, { flags: 'wx' })
  let created = false

  output.once('open', () => {
    created = true
  })

  try {
    await pipeline(input, transform, output)
  } catch (error) {
    if (created) await fs.unlink(destination).catch(() => {})
    throw error
  }
}

/*
 *
 * #1
 *
 * Технічне завдання для розробки функції "compressFile"
 *
 * Задача:
 * Розробити асинхронну функцію, що використовує алгоритм Gzip для стиснення вказаного файлу.
 * Функція має генерувати унікальне ім'я для стиснутого файлу, якщо файл із таким самим іменем вже наявний,
 * та забезпечувати високий рівень надійності та безпеки процесу стиснення.
 *
 * Функціональні вимоги:
 * 1. Вхідні параметри:
 *    - `filePath`: Шлях до файлу, який потрібно стиснути.
 *
 * 2. Вихідні дані:
 *    - Функція повертає шлях до стиснутого файлу як рядок.
 *
 * 3. Унікальність:
 *    - Перевірка наявності файлів із таким самим іменем і створення унікального імені файлу
 *      шляхом додавання номера до наявного імені, якщо необхідно.
 *
 * 4. Обробка помилок:
 *    - Функція має ідентифікувати та коректно обробляти помилки читання, запису та доступу до файлів.
 *    - У разі помилок, функція має повертати відповідні повідомлення про помилку або коди помилок,
 *      що дозволяють користувачеві або іншим частинам програми адекватно реагувати на такі ситуації.
 *
 * Технічні вимоги:
 * - Використання сучасних можливостей JavaScript (ES6+), включаючи асинхронні функції, стрімове API Node.js, та ESM
 *   для легкої інтеграції та тестування.
 * - Функція має бути написана таким чином, щоб її можна було експортувати та використовувати в інших частинах програми
 *   або тестових сценаріях.
 * - Забезпечення документації коду з описом параметрів, процесу роботи, виключень, які можуть бути згенеровані,
 *   та прикладами використання.
 * - Підготовка функції для можливості легкого мокування та тестування за допомогою Jest.
 *
 */

async function compressFile(filePath) {
  const destination = await getAvailablePath(filePath, '.gz')
  await transformFile(filePath, destination, createGzip())
  return destination
}

/*
 *
 * #2
 *
 * Технічне завдання для розробки функції "decompressFile"
 *
 * Задача:
 * Розробити асинхронну функцію, яка використовує алгоритм Gzip для розпакування вказаного стиснутого файлу у вказане місце збереження. Функція має генерувати унікальне ім'я для розпакованого файлу, якщо файл із таким самим іменем вже наявний, та забезпечувати високий рівень надійності та безпеки процесу розпакування.
 *
 * Функціональні вимоги:
 * 1. Вхідні параметри:
 *  - `compressedFilePath`: Шлях до стиснутого файлу, який потрібно розпакувати.
 *  - `destinationFilePath`: Шлях, де буде збережено розпакований файл.
 *
 * 2. Вихідні дані:
 *  - Функція повертає шлях до розпакованого файлу як рядок.
 *
 * 3. Унікальність:
 *  - Перевірка наявності файлів із таким самим іменем і створення унікального імені файлу шляхом додавання номера до наявного імені, якщо необхідно.
 *
 * 4. Обробка помилок:
 *  - Функція має ідентифікувати та коректно обробляти помилки читання, запису та доступу до файлів.
 *  - У разі помилок, функція має повертати відповідні повідомлення про помилку або коди помилок,
 *    що дозволяють користувачеві або іншим частинам програми адекватно реагувати на такі ситуації.
 *
 * Технічні вимоги:
 * - Використання сучасних можливостей JavaScript (ES6+), включаючи асинхронні функції, стрімове API Node.js, та ESM для легкої інтеграції та тестування.
 * - Функція має бути написана таким чином, щоб її можна було експортувати та використовувати в інших частинах програми або тестових сценаріях.
 * - Забезпечення документації коду з описом параметрів, процесу роботи, виключень, які можуть бути згенеровані, та прикладами використання.
 * - Підготовка функції для можливості легкого мокування та тестування за допомогою Jest.
 *
 */

async function decompressFile(compressedFilePath, destinationFilePath) {
  await fs.access(compressedFilePath)
  const destination = await getAvailablePath(destinationFilePath)
  await transformFile(compressedFilePath, destination, createGunzip())
  return destination
}

async function performCompressionAndDecompression(
  source = './files/source.txt',
  destination = './files/source_decompressed.txt'
) {
  const compressed = await compressFile(source)
  const decompressed = await decompressFile(compressed, destination)
  return { compressed, decompressed }
}

export { compressFile, decompressFile, performCompressionAndDecompression }

// Salva un file generato dall'app.
// Su telefono prova prima il menu Condividi (comodo per salvare in File/Drive
// o aprire il .ics nel Calendario), altrimenti fa un download classico.
export async function saveFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime })
  const file = typeof File === 'function' ? new File([blob], filename, { type: mime }) : null
  const mobile = matchMedia('(pointer: coarse)').matches
  if (mobile && file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}

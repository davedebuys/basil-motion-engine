import { spawn } from 'node:child_process'

const PORT = 5173
const url = `http://localhost:${PORT}`

const vite = spawn('npx', ['vite', '--port', String(PORT)], {
  shell: true,
  stdio: 'inherit'
})

let electron = null

function startElectron() {
  if (electron) return

  electron = spawn('npx', ['electron', '.'], {
    env: { ...process.env, ELECTRON_RENDERER_URL: url },
    shell: true,
    stdio: 'inherit'
  })

  electron.on('exit', code => {
    vite.kill()
    process.exit(code ?? 0)
  })
}

let attempts = 0

const poll = setInterval(async () => {
  try {
    const res = await fetch(url)
    if (res.ok) {
      clearInterval(poll)
      startElectron()
    }
  } catch {
    // Vite is not up yet.
  }
  if (++attempts > 120) {
    clearInterval(poll)
    vite.kill()
    process.exit(1)
  }
}, 250)

process.on('exit', () => {
  vite.kill()
  if (electron) electron.kill()
})

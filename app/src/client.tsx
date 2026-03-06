import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { Buffer } from 'buffer'

function ensureBrowserPolyfills() {
  const globalScope = globalThis as typeof globalThis & {
    Buffer?: typeof Buffer
    global?: typeof globalThis
    process?: { browser?: boolean; env?: Record<string, string> }
  }
  if (!globalScope.Buffer) {
    globalScope.Buffer = Buffer
  }
  if (!globalScope.global) {
    globalScope.global = globalThis
  }
  // crypto-browserify transitively references `process.env` in some paths
  if (!globalScope.process) {
    globalScope.process = { browser: true, env: {} } as any
  }
}

void (async () => {
  try {
    ensureBrowserPolyfills()
    const { StartClient } = await import('@tanstack/react-start/client')

    startTransition(() => {
      hydrateRoot(
        document,
        <StrictMode>
          <StartClient />
        </StrictMode>,
        {
          onRecoverableError() {},
        },
      )
    })
  } catch {}
})()

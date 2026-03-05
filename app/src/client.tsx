import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { Buffer } from 'buffer'

function ensureBrowserPolyfills() {
  const globalScope = globalThis as typeof globalThis & {
    Buffer?: typeof Buffer
    global?: typeof globalThis
  }
  if (!globalScope.Buffer) {
    globalScope.Buffer = Buffer
  }
  if (!globalScope.global) {
    globalScope.global = globalThis
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

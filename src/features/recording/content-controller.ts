import {
  STORAGE_KEYS,
  clearLiveStatus,
  getSettings,
  getStoppedCodes,
  onSettingsChange,
  onStorageKeysChange,
  setLiveStatus,
} from '@/shared/storage'
import {
  DEFAULT_SETTINGS,
  type CaptionsState,
  type Settings,
} from '@/shared/types'
import { CaptionsAutostart } from './captions-autostart'
import { parseMeetingCode } from './meeting-identity'
import {
  findCaptionsRegion,
  findTurnOnCaptionsButton,
  getMeetingTitle,
  isInCall,
  readCaptionBlocks,
} from './meet-dom'
import { HEARTBEAT_MS, Recorder } from './recorder'

export const POLL_MS = 1_000
export const OBSERVE_DEBOUNCE_MS = 100

export type ControllerDeps = {
  doc: Document
  win: Window
  now: () => number
  createId: () => string
  tabToken: string
}

/** Liga a gravação à página do Meet. */
export function startContentController(deps: ControllerDeps): {
  ready: Promise<void>
  dispose: () => Promise<void>
} {
  let settings: Settings = DEFAULT_SETTINGS
  let disposed = false
  const autostart = new CaptionsAutostart(deps.now)
  const recorder = new Recorder({
    now: deps.now,
    createId: deps.createId,
    tabToken: deps.tabToken,
    diagnosticsEnabled: () => settings.diagnostics,
    userAgent: deps.win.navigator.userAgent,
    language: deps.win.navigator.language,
  })

  let stoppedCodes: string[] = []
  let lastStoppedPublishAt = 0

  async function clearStopped(): Promise<void> {
    if (lastStoppedPublishAt === 0) return
    lastStoppedPublishAt = 0
    await clearLiveStatus(deps.tabToken)
  }

  let queue: Promise<void> = Promise.resolve()
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function run(): Promise<void> {
    queue = queue.then(evaluate).catch((error: unknown) => {
      console.error('[meet-captions]', error)
    })
    return queue
  }

  async function evaluate(): Promise<void> {
    if (disposed) return
    if (!settings.enabled) {
      if (recorder.active) await recorder.leave()
      await clearStopped()
      return
    }

    const code = parseMeetingCode(deps.win.location.href)
    const inCall = code !== null && isInCall(deps.doc)

    // Gravação parada só nesta reunião (R3.9): sai e publica o estado 'stopped'.
    const stopped = inCall && code !== null && stoppedCodes.includes(code)
    if (stopped) {
      if (recorder.active) await recorder.leave()
      const now = deps.now()
      if (
        lastStoppedPublishAt === 0 ||
        now - lastStoppedPublishAt >= HEARTBEAT_MS
      ) {
        lastStoppedPublishAt = now
        await setLiveStatus({
          meetingId: null,
          code,
          title: getMeetingTitle(deps.doc),
          since: now,
          heartbeatAt: now,
          state: 'stopped',
          utteranceCount: 0,
          tabToken: deps.tabToken,
        })
      }
      return
    }
    await clearStopped()

    if (recorder.active && (!inCall || recorder.code !== code)) {
      await recorder.leave()
    }
    if (!recorder.active && inCall && code) {
      autostart.reset()
      await recorder.join(code, getMeetingTitle(deps.doc))
      // Eu já desliguei as legendas nesta reunião: não religa ao recarregar (R3.3).
      if (recorder.captionsOffByUser) autostart.skip()
    }
    if (!recorder.active || recorder.blocked) return

    autostart.tick(deps.doc)
    const region = findCaptionsRegion(deps.doc)
    let blocks = region ? readCaptionBlocks(region) : null
    // Região com texto mas nenhum bloco reconhecido: a leitura falhou (o Meet mudou a página).
    if (
      region &&
      blocks &&
      blocks.length === 0 &&
      (region.textContent ?? '').trim()
    ) {
      blocks = null
    }
    const captionsState: CaptionsState = findTurnOnCaptionsButton(deps.doc)
      ? 'off'
      : region
        ? 'on'
        : 'unknown'
    recorder.observe(blocks, captionsState, region)

    const title = getMeetingTitle(deps.doc)
    if (title) recorder.setTitle(title)
  }

  const observer = new MutationObserver(() => {
    if (debounceTimer) return
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void run()
    }, OBSERVE_DEBOUNCE_MS)
  })
  observer.observe(deps.doc.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  const poll = setInterval(() => void run(), POLL_MS)
  const unsubscribeSettings = onSettingsChange((next) => {
    settings = next
    void run()
  })
  const refreshStops = async () => {
    stoppedCodes = await getStoppedCodes(deps.now())
  }
  const unsubscribeStops = onStorageKeysChange([STORAGE_KEYS.stops], () => {
    void refreshStops().then(run)
  })
  const onPageHide = () => {
    void recorder.leave()
  }
  deps.win.addEventListener('pagehide', onPageHide)

  const ready = Promise.all([getSettings(), refreshStops()]).then(
    ([loaded]) => {
      settings = loaded
      return run()
    }
  )

  return {
    ready,
    dispose: async () => {
      disposed = true
      observer.disconnect()
      if (debounceTimer) clearTimeout(debounceTimer)
      clearInterval(poll)
      unsubscribeSettings()
      unsubscribeStops()
      deps.win.removeEventListener('pagehide', onPageHide)
      await queue
      await recorder.leave()
      await clearStopped()
    },
  }
}

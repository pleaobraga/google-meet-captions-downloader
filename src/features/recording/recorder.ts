import {
  clearLiveStatus,
  findLatestMeetingByCode,
  getDiagnostics,
  getLiveStatus,
  getMeeting,
  saveDiagnostics,
  saveMeeting,
  setLiveStatus,
} from '@/shared/storage'
import type {
  CaptionsState,
  LiveState,
  Meeting,
  ObservedBlock,
  Session,
  Utterance,
} from '@/shared/types'
import { CaptionTracker } from './caption-tracker'
import { DiagnosticRecorder } from './diagnostics'
import { shouldContinueMeeting } from './meeting-identity'

export const SAVE_INTERVAL_MS = 1_000
export const HEARTBEAT_MS = 15_000
export const UNAVAILABLE_AFTER_MS = 20_000

export type RecorderOptions = {
  now: () => number
  createId: () => string
  tabToken: string
  diagnosticsEnabled: () => boolean
  userAgent: string
  language: string
}

/**
 * Grava uma reunião: transforma os blocos do Meet em falas, salva no storage
 * no máximo uma vez por segundo e publica o status ao vivo.
 */
export class Recorder {
  private readonly options: RecorderOptions
  private meeting: Meeting | null = null
  private persisted = false
  private tracker: CaptionTracker
  private lastSaveAt = 0
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private missingSince: number | null = null
  private state: LiveState = 'recording'
  private diagnostics: DiagnosticRecorder | null = null
  private blockedCode: string | null = null
  private sawCaptionsOn = false
  private versionCounter = 0

  constructor(options: RecorderOptions) {
    this.options = options
    this.tracker = new CaptionTracker(options.createId)
  }

  get active(): boolean {
    return this.meeting !== null || this.blockedCode !== null
  }

  get blocked(): boolean {
    return this.blockedCode !== null
  }

  get code(): string | null {
    return this.meeting?.code ?? this.blockedCode ?? null
  }

  /** Aumenta sempre que algo visível muda (falas, estado, entrar ou sair). */
  get version(): number {
    return this.versionCounter
  }

  snapshot(): {
    utterances: Utterance[]
    sessions: Session[]
    state: LiveState
  } | null {
    const meeting = this.meeting
    if (!meeting) return null
    return {
      utterances: this.tracker.utterances.map((u) => ({ ...u })),
      sessions: meeting.sessions.map((s) => ({ ...s })),
      state: this.state,
    }
  }

  get captionsOffByUser(): boolean {
    return this.meeting?.captionsOffByUser ?? false
  }

  /**
   * Libera o bloqueio quando a outra aba parou de mandar heartbeat (por exemplo,
   * o status ficou para trás depois de recarregar a página).
   */
  async refreshBlocked(): Promise<void> {
    const code = this.blockedCode
    if (code === null) return
    const live = await getLiveStatus(this.options.now())
    if (
      !live ||
      live.code !== code ||
      live.tabToken === this.options.tabToken
    ) {
      this.blockedCode = null
    }
  }

  async join(code: string, title: string): Promise<void> {
    const now = this.options.now()

    const live = await getLiveStatus(now)
    if (live && live.code === code && live.tabToken !== this.options.tabToken) {
      this.blockedCode = code
      return
    }

    this.tracker = new CaptionTracker(this.options.createId)
    this.persisted = false
    this.sawCaptionsOn = false

    const previous = await findLatestMeetingByCode(code)
    const existing =
      previous && shouldContinueMeeting(previous, now)
        ? await getMeeting(previous.id)
        : undefined

    if (existing) {
      existing.sessions.push({ startedAt: now, endedAt: now })
      this.meeting = existing
      this.persisted = true
      this.tracker.load(existing.utterances)
    } else {
      this.meeting = {
        id: `${code}_${now}`,
        code,
        title,
        startedAt: now,
        sessions: [{ startedAt: now, endedAt: now }],
        utterances: [],
      }
    }

    this.diagnostics = this.options.diagnosticsEnabled()
      ? new DiagnosticRecorder(
          {
            meetingId: this.meeting.id,
            code,
            startedAt: now,
            userAgent: this.options.userAgent,
            language: this.options.language,
          },
          await getDiagnostics(this.meeting.id)
        )
      : null

    this.state = 'recording'
    this.missingSince = null
    this.versionCounter++
    this.heartbeatTimer = setInterval(() => this.heartbeat(), HEARTBEAT_MS)
    await this.publishLive()
  }

  observe(
    blocks: ObservedBlock[] | null,
    captionsState: CaptionsState,
    region: Element | null
  ): void {
    const meeting = this.meeting
    if (!meeting) return
    const now = this.options.now()
    const previousState = this.state
    let changed: boolean

    this.diagnostics?.record(blocks, region, captionsState, now)

    if (blocks === null) {
      changed = this.tracker.sync([], now)
      if (captionsState === 'off') {
        this.state = 'captions-off'
        this.missingSince = null
        if (this.sawCaptionsOn && meeting.captionsOffByUser !== true) {
          meeting.captionsOffByUser = true
          changed = true
        }
      } else {
        this.missingSince ??= now
        if (now - this.missingSince >= UNAVAILABLE_AFTER_MS) {
          this.state = 'captions-unavailable'
        }
      }
    } else {
      this.missingSince = null
      this.state = 'recording'
      this.sawCaptionsOn = true
      changed = this.tracker.sync(blocks, now)
      if (meeting.captionsOffByUser) {
        meeting.captionsOffByUser = false
        changed = true
      }
    }

    if (changed) this.scheduleSave()
    if (changed || this.state !== previousState) this.versionCounter++
    if (this.state !== previousState) void this.publishLive()
  }

  setTitle(title: string): void {
    const meeting = this.meeting
    if (!meeting || !title || title === meeting.title) return
    meeting.title = title
    if (this.persisted) this.scheduleSave()
  }

  async flush(): Promise<void> {
    this.clearSaveTimer()
    const meeting = this.meeting
    if (!meeting) return
    this.lastSaveAt = this.options.now()
    await this.persist(meeting)
  }

  async leave(): Promise<void> {
    if (this.blockedCode !== null) {
      this.blockedCode = null
      return
    }
    const meeting = this.meeting
    if (!meeting) return
    // Zera antes de qualquer await: um timer pendente não pode salvar depois.
    this.meeting = null
    this.versionCounter++

    this.clearSaveTimer()
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null

    this.tracker.finalizeAll()
    const session = meeting.sessions.at(-1)
    if (session) session.endedAt = this.options.now()

    await this.persist(meeting)
    this.diagnostics = null
    await clearLiveStatus(this.options.tabToken)
  }

  private scheduleSave(): void {
    if (this.saveTimer) return
    const delay = Math.max(
      0,
      this.lastSaveAt + SAVE_INTERVAL_MS - this.options.now()
    )
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.flush()
    }, delay)
  }

  private clearSaveTimer(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = null
  }

  private async persist(meeting: Meeting): Promise<void> {
    meeting.utterances = this.tracker.utterances.map((utterance) => ({
      ...utterance,
    }))
    if (this.diagnostics) await saveDiagnostics(this.diagnostics.toLog())
    if (!this.persisted && meeting.utterances.length === 0) return
    this.persisted = true
    // Preserva o título que eu dei na tela de reuniões (R5.8).
    const stored = await getMeeting(meeting.id)
    if (stored?.customTitle) meeting.customTitle = stored.customTitle
    else delete meeting.customTitle
    await saveMeeting(structuredClone(meeting))
    if (this.meeting === meeting) void this.publishLive()
  }

  private heartbeat(): void {
    const meeting = this.meeting
    if (!meeting) return
    const session = meeting.sessions.at(-1)
    if (session) session.endedAt = this.options.now()
    if (this.persisted) this.scheduleSave()
    void this.publishLive()
  }

  private async publishLive(): Promise<void> {
    const meeting = this.meeting
    if (!meeting) return
    const now = this.options.now()
    await setLiveStatus({
      meetingId: this.persisted ? meeting.id : null,
      code: meeting.code,
      title: meeting.title,
      since: meeting.sessions.at(-1)?.startedAt ?? meeting.startedAt,
      heartbeatAt: now,
      state: this.state,
      utteranceCount: this.tracker.utterances.length,
      tabToken: this.options.tabToken,
    })
  }
}

export type Utterance = {
  id: string
  speaker: string
  startedAt: number
  text: string
  final: boolean
}

export type Session = {
  startedAt: number
  endedAt: number
}

export type Meeting = {
  id: string
  code: string
  title: string
  customTitle?: string
  startedAt: number
  sessions: Session[]
  utterances: Utterance[]
  legacy?: boolean
  captionsOffByUser?: boolean
}

export type MeetingSummary = {
  id: string
  code: string
  title: string
  customTitle?: string
  startedAt: number
  endedAt: number
  durationMs: number
  utteranceCount: number
  legacy?: boolean
}

export type AutoDeleteDays = 0 | 30 | 90 | 180

export type Settings = {
  enabled: boolean
  diagnostics: boolean
  autoDeleteDays: AutoDeleteDays // 0 = nunca apagar (etapa 2)
  myName: string // substitui "Você" nas transcrições (etapa 2)
  floatingFontSize: number // tamanho da letra da janela flutuante, em px (etapa 3)
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  diagnostics: false,
  autoDeleteDays: 0,
  myName: '',
  floatingFontSize: 16,
}

export type LiveState =
  'recording' | 'captions-off' | 'captions-unavailable' | 'stopped' // gravação parada só nesta reunião (etapa 2)

export type LiveStatus = {
  meetingId: string | null
  code: string
  title: string
  since: number
  heartbeatAt: number
  state: LiveState
  utteranceCount: number
  tabToken: string
}

export type CaptionsState = 'on' | 'off' | 'unknown'

export type ObservedBlock = {
  key: object
  speaker: string
  text: string
}

export type DiagnosticBlock = {
  k: number
  speaker: string
  text: string
}

export type DiagnosticEvent =
  | { t: number; kind: 'blocks'; blocks: DiagnosticBlock[] }
  | { t: number; kind: 'html'; html: string }
  | { t: number; kind: 'state'; state: string }

export type DiagnosticLog = {
  meetingId: string
  code: string
  startedAt: number
  userAgent: string
  language: string
  truncated: boolean
  events: DiagnosticEvent[]
}

export type DiagnosticSummary = {
  meetingId: string
  code: string
  startedAt: number
  eventCount: number
  truncated: boolean
}

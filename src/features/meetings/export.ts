import { buildTranscriptItems } from '@/components/transcript/transcript-items'
import {
  displayTitle,
  formatDate,
  formatIsoDate,
  formatTime,
} from '@/lib/format'
import { displaySpeaker, participantsOf } from '@/lib/speaker'
import type { Meeting } from '@/shared/types'

export type ExportFormat = 'md' | 'txt'

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g // eslint-disable-line no-control-regex

/** Gera o conteúdo do arquivo de exportação (seção 4.6). */
export function buildExport(
  meeting: Meeting,
  format: ExportFormat,
  myName: string
): string {
  const md = format === 'md'
  const title = displayTitle(meeting)
  const lastSession = meeting.sessions.at(-1)
  const end = lastSession?.endedAt ?? meeting.startedAt
  const date = formatDate(meeting.startedAt)
  const hours = `${formatTime(meeting.startedAt)}–${formatTime(end)}`
  const participants = participantsOf(meeting.utterances, myName)

  const blocks: string[] = []
  if (md) {
    blocks.push(`# ${title}`)
    const header = [`- **Data:** ${date}`, `- **Horário:** ${hours}`]
    if (participants.length > 0) {
      header.push(`- **Participantes:** ${participants.join(', ')}`)
    }
    blocks.push(header.join('\n'))
  } else {
    const header = [title, `Data: ${date}`, `Horário: ${hours}`]
    if (participants.length > 0) {
      header.push(`Participantes: ${participants.join(', ')}`)
    }
    blocks.push(header.join('\n'))
  }

  for (const item of buildTranscriptItems(
    meeting.utterances,
    meeting.sessions
  )) {
    if (item.kind === 'marker') {
      const text = `Saiu às ${formatTime(item.leftAt)} · voltou às ${formatTime(item.returnedAt)}`
      blocks.push(md ? `_${text}_` : `--- ${text} ---`)
      continue
    }
    const { utterance } = item
    const time = formatTime(utterance.startedAt)
    const speaker = displaySpeaker(utterance.speaker, myName).trim()
    if (md) {
      blocks.push(
        speaker
          ? `**${time} ${speaker}:** ${utterance.text}`
          : `**${time}** ${utterance.text}`
      )
    } else {
      blocks.push(
        speaker
          ? `${time} ${speaker}: ${utterance.text}`
          : `${time} ${utterance.text}`
      )
    }
  }

  return blocks.join('\n\n') + '\n'
}

export function exportFilename(meeting: Meeting, format: ExportFormat): string {
  const cleaned = displayTitle(meeting)
    .replace(INVALID_FILENAME_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
  return `${formatIsoDate(meeting.startedAt)} ${cleaned || 'Reunião'}.${format}`
}

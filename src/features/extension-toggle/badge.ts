import type { LiveStatus } from '@/shared/types'

const GRAY = '#6b7280'
const RED = '#dc2626'

/** Atualiza o selo e a dica do ícone da extensão (R3.8 e R1.9). */
export async function applyBadge(
  enabled: boolean,
  live: LiveStatus | undefined
): Promise<void> {
  if (!enabled) {
    await setBadge('OFF', GRAY, 'Meet Captions: desligada')
    return
  }
  if (live?.state === 'captions-unavailable') {
    await setBadge('!', RED, 'Meet Captions: não foi possível ler as legendas')
    return
  }
  if (live?.state === 'recording' && live.meetingId !== null) {
    await setBadge('REC', RED, 'Meet Captions: gravando')
    return
  }
  await chrome.action.setBadgeText({ text: '' })
  await chrome.action.setTitle({ title: 'Meet Captions: ligada' })
}

async function setBadge(text: string, color: string, title: string) {
  await chrome.action.setBadgeText({ text })
  await chrome.action.setBadgeBackgroundColor({ color })
  await chrome.action.setTitle({ title })
}

import { applyBadge } from '@/features/extension-toggle/badge'
import {
  STORAGE_KEYS,
  getLiveStatus,
  getSettings,
  onStorageKeysChange,
} from '@/shared/storage'

async function syncBadge() {
  const [settings, live] = await Promise.all([getSettings(), getLiveStatus()])
  await applyBadge(settings.enabled, live)
}

chrome.runtime.onInstalled.addListener(() => {
  void syncBadge()
})

chrome.runtime.onStartup.addListener(() => {
  void syncBadge()
})

onStorageKeysChange([STORAGE_KEYS.settings, STORAGE_KEYS.live], () => {
  void syncBadge()
})

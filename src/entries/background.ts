import { applyBadge } from '@/features/extension-toggle/badge'
import { RETENTION_ALARM, runRetention } from '@/features/retention/retention'
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

function scheduleRetention() {
  void chrome.alarms.create(RETENTION_ALARM, { periodInMinutes: 24 * 60 })
  void runRetention(Date.now())
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RETENTION_ALARM) void runRetention(Date.now())
})

chrome.runtime.onInstalled.addListener(() => {
  void syncBadge()
  scheduleRetention()
})

chrome.runtime.onStartup.addListener(() => {
  void syncBadge()
  scheduleRetention()
})

onStorageKeysChange([STORAGE_KEYS.settings, STORAGE_KEYS.live], () => {
  void syncBadge()
})

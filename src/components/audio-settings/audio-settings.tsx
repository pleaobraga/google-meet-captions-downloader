import { useEffect, useState } from 'react'
import { Select } from '../select'

export function AudioSettings() {
  const [audioInput, setAudioInput] = useState<MediaDeviceInfo[]>([])
  const [audioOutput, setAudioOutput] = useState<MediaDeviceInfo[]>([])

  async function listAudioDevices(): Promise<MediaDeviceInfo[]> {
    await navigator.mediaDevices.getUserMedia({ audio: true })
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
  }

  const getDevicesFromList = (list: MediaDeviceInfo[]) => {
    const { audioInput, audioOutput } = list.reduce(
      (acc, d) => {
        if (d.kind === 'audioinput') {
          acc.audioInput.push(d)
        }

        if (d.kind === 'audiooutput') {
          acc.audioOutput.push(d)
        }
        return acc
      },
      {
        audioInput: [] as MediaDeviceInfo[],
        audioOutput: [] as MediaDeviceInfo[],
      }
    )

    setAudioInput(audioInput)
    setAudioOutput(audioOutput)
  }

  useEffect(() => {
    listAudioDevices().then((devices) => {
      getDevicesFromList(devices)
    })
  }, [])

  return (
    <div className="flex flex-col gap-4 p-4">
      <Select
        label="Microphone"
        emptyOption="Select a microphone"
        options={audioInput.map((device) => ({
          value: device.deviceId,
          label: device.label || `Unknown Microphone`,
        }))}
      />
      <Select
        label="Speakers"
        emptyOption="Select a speaker"
        options={audioOutput.map((device) => ({
          value: device.deviceId,
          label: device.label || `Unknown Speaker`,
        }))}
      />
    </div>
  )
}

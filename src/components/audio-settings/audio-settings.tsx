import { useEffect, useState } from 'react'
import { Select } from '../select'

export function AudioSettings() {
  const [audioInput, setAudioInput] = useState<MediaDeviceInfo[]>([])
  const [audioOutput, setAudioOutput] = useState<MediaDeviceInfo[]>([])

  const [selectedAudioInput, setSelectedAudioInput] = useState<string>()

  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>()

  async function listAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      console.error('getUserMedia failed', err)
      return []
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices
    } catch (err) {
      console.error('enumerateDevices failed', err)
      return []
    }
  }

  const getDevicesFromList = (list: MediaDeviceInfo[]) => {
    const { audioInput, audioOutput } = list.reduce(
      (acc, d) => {
        if (d.kind === 'audioinput') acc.audioInput.push(d)
        if (d.kind === 'audiooutput') acc.audioOutput.push(d)
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
    let mounted = true

    const refresh = async () => {
      const devices = await listAudioDevices()
      if (mounted) getDevicesFromList(devices)
    }

    refresh()

    const onChange = () => {
      if (mounted) refresh()
    }
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange)

    return () => {
      mounted = false
      navigator.mediaDevices?.removeEventListener?.('devicechange', onChange)
    }
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Select
          label="Microphone"
          emptyOption="Select a microphone"
          options={audioInput.map((device) => ({
            value: device.deviceId,
            label: device.label || 'Unknown Microphone',
          }))}
          handleChange={(value) => setSelectedAudioInput(value)}
        />
        {/* <SoundMeter micDeviceId={selectedAudioInput} /> */}
      </div>

      <div className="flex flex-col gap-3">
        <Select
          handleChange={(value) => setSelectedAudioOutput(value)}
          label="Speakers"
          emptyOption="Select a speaker"
          options={audioOutput.map((device) => ({
            value: device.deviceId,
            label: device.label || 'Unknown Speaker',
          }))}
        />
        {/* <SoundMeter micDeviceId={selectedAudioOutput} /> */}
      </div>
    </div>
  )
}

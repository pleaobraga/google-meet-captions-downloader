// SoundMeterPro.tsx
import { useEffect, useRef, useState } from 'react'

type Props = {
  micDeviceId?: string // deviceId from your <Select/>
  height?: number // bar height (px)
  rangeDb?: [number, number] // dBFS scale, e.g. [-60, 0]
}

function dbFromRMS(rms: number) {
  const min = 1e-9 // avoid -Infinity
  return 20 * Math.log10(Math.max(rms, min))
}

function pctFromDb(db: number, [minDb, maxDb]: [number, number]) {
  const clamped = Math.min(maxDb, Math.max(minDb, db))
  return ((clamped - minDb) / (maxDb - minDb)) * 100
}

export function SoundMeter({
  micDeviceId,
  height = 14,
  rangeDb = [-60, 0],
}: Props) {
  const [rmsDb, setRmsDb] = useState(-60)
  const [peakDb, setPeakDb] = useState(-60)
  const rafRef = useRef<number>(0)
  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const heldRmsRef = useRef(-60)
  const heldPeakRef = useRef(-60)
  const lastTsRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      try {
        // 1) Raw mic (disable browser DSP so loud voice actually shows)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: micDeviceId ? { exact: micDeviceId } : undefined,
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        })
        if (cancelled) return
        streamRef.current = stream

        // Optional sanity check: ensure chosen device is actually used
        const settings = stream.getAudioTracks()[0]?.getSettings?.()
        if (
          micDeviceId &&
          settings?.deviceId &&
          settings.deviceId !== micDeviceId
        ) {
          console.warn('Requested micId != actual track deviceId', {
            requested: micDeviceId,
            actual: settings.deviceId,
          })
        }

        // 2) Audio graph
        const ctx = new (window.AudioContext ||
          (window as any).webkitAudioContext)({
          latencyHint: 'interactive',
        })
        ctxRef.current = ctx
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024 // small window → responsive
        analyser.smoothingTimeConstant = 0 // we’ll do our own ballistics
        analyserRef.current = analyser
        src.connect(analyser)

        const buf = new Float32Array(analyser.fftSize)

        // Ballistics: time constants (seconds)
        // Fast attack, slower release → feels "natural"
        const RMS_ATTACK = 0.01
        const RMS_RELEASE = 0.25
        const PEAK_ATTACK = 0.005
        const PEAK_RELEASE = 0.8

        const tick = (ts: number) => {
          if (cancelled) return

          analyser.getFloatTimeDomainData(buf)

          // Compute RMS & Peak in linear domain
          let sum = 0
          let peak = 0
          for (let i = 0; i < buf.length; i++) {
            const v = buf[i]
            sum += v * v
            const a = Math.abs(v)
            if (a > peak) peak = a
          }
          const rms = Math.sqrt(sum / buf.length)
          const instRmsDb = dbFromRMS(rms)
          const instPeakDb = dbFromRMS(peak)

          // Ballistics via time-constant smoothing (per frame)
          const dt = lastTsRef.current
            ? Math.max(0.001, (ts - lastTsRef.current) / 1000)
            : 1 / 60
          lastTsRef.current = ts

          const smooth = (
            prev: number,
            next: number,
            attack: number,
            release: number
          ) => {
            const rising = next > prev
            const tau = rising ? attack : release
            const alpha = Math.exp(-dt / tau)
            return alpha * prev + (1 - alpha) * next
          }

          heldRmsRef.current = smooth(
            heldRmsRef.current,
            instRmsDb,
            RMS_ATTACK,
            RMS_RELEASE
          )
          heldPeakRef.current = smooth(
            heldPeakRef.current,
            instPeakDb,
            PEAK_ATTACK,
            PEAK_RELEASE
          )

          setRmsDb(heldRmsRef.current)
          setPeakDb(heldPeakRef.current)

          rafRef.current = requestAnimationFrame(tick)
        }

        rafRef.current = requestAnimationFrame(tick)
      } catch (e) {
        console.error('Mic capture failed:', e)
        setRmsDb(rangeDb[0])
        setPeakDb(rangeDb[0])
      }
    }

    start()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      analyserRef.current?.disconnect()
      ctxRef.current?.close().catch(() => {})
      streamRef.current?.getTracks().forEach((t) => t.stop())
      ctxRef.current = null
      streamRef.current = null
      analyserRef.current = null
      heldRmsRef.current = rangeDb[0]
      heldPeakRef.current = rangeDb[0]
      lastTsRef.current = null
    }
  }, [micDeviceId])

  const rmsPct = pctFromDb(rmsDb, rangeDb)
  const peakPct = pctFromDb(peakDb, rangeDb)

  return (
    <div className="w-full">
      <div
        className="relative w-full bg-gray-200 rounded"
        style={{ height }}
        aria-label={`Level: ${rmsDb.toFixed(1)} dBFS`}
      >
        {/* RMS fill */}
        <div
          className="h-full rounded transition-[width] duration-75 ease-linear"
          style={{
            width: `${rmsPct}%`,
            background: 'linear-gradient(to right, #60a5fa, #22c55e)',
          }}
        />
        {/* Peak line */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `calc(${peakPct}% - 1px)`,
            width: 2,
            background: '#ef4444',
            opacity: 0.9,
          }}
          aria-hidden
        />
      </div>
      <div className="mt-1 text-xs tabular-nums">
        RMS {rmsDb.toFixed(1)} dBFS · Peak {peakDb.toFixed(1)} dBFS
      </div>
    </div>
  )
}

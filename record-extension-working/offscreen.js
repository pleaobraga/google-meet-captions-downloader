// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target === 'offscreen') {
    switch (message.type) {
      case 'start-recording':
        startRecording(message.data)
        break
      case 'stop-recording':
        stopRecording()
        break
      default:
        throw new Error('Unrecognized message:', message.type)
    }
  }
})

let recorder
let data = []

async function startRecording(streamId) {
  if (recorder?.state === 'recording') {
    throw new Error('Called startRecording while recording is in progress.')
  }

  const currentTabStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
  })

  const micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
    },
    video: false,
  })

  // Continue to play the captured audio to the user.
  // const output = new AudioContext();
  // const source = output.createMediaStreamSource(media);
  // source.connect(output.destination);
  const audioContext = new AudioContext()

  // Create source nodes from both streams
  const tabAudioSource = audioContext.createMediaStreamSource(currentTabStream)
  const micAudioSource = audioContext.createMediaStreamSource(micStream)

  // Create a destination node for the combined audio
  const destination = audioContext.createMediaStreamDestination()

  // Connect both audio sources to the destination to mix them
  tabAudioSource.connect(destination)
  tabAudioSource.connect(audioContext.destination)

  micAudioSource.connect(destination)

  // Get the video track from the current tab stream
  const videoTrack = currentTabStream.getVideoTracks()[0]
  // Get the newly combined audio track
  const combinedAudioTrack = destination.stream.getAudioTracks()[0]

  // Create the final stream with video from the tab and the combined audio
  const finalStream = new MediaStream([videoTrack, combinedAudioTrack])

  // Start recording.
  recorder = new MediaRecorder(finalStream, { mimeType: 'video/webm' })
  recorder.ondataavailable = (event) => data.push(event.data)
  recorder.onstop = () => {
    const blob = new Blob(data, { type: 'video/webm' })
    window.open(URL.createObjectURL(blob), '_blank')

    // Clear state ready for next recording
    recorder = undefined
    data = []
  }
  recorder.start()

  // Record the current state in the URL. This provides a very low-bandwidth
  // way of communicating with the service worker (the service worker can check
  // the URL of the document and see the current recording state). We can't
  // store that directly in the service worker as it may be terminated while
  // recording is in progress. We could write it to storage but that slightly
  // increases the risk of things getting out of sync.
  window.location.hash = 'recording'
}

async function stopRecording() {
  recorder.stop()

  // Stopping the tracks makes sure the recording icon in the tab is removed.
  recorder.stream.getTracks().forEach((t) => t.stop())

  // Update current state in URL
  window.location.hash = ''

  // Note: In a real extension, you would want to write the recording to a more
  // permanent location (e.g IndexedDB) and then close the offscreen document,
  // to avoid keeping a document around unnecessarily. Here we avoid that to
  // make sure the browser keeps the Object URL we create (see above) and to
  // keep the sample fairly simple to follow.
}

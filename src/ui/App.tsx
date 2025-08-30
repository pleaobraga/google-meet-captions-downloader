import { Toaster } from '@/components/chadcn/sonner'

import { CaptionsList } from '@/components/captions-list'
import { Button } from '@/components/chadcn/button'
import { MdDownload } from 'react-icons/md'
import { PulseLoader } from 'react-spinners'
import { useApp } from './useApp'

function App() {
  const { isLoading, getCaptionsTranscript, pastTranscriptions } = useApp()

  return (
    <>
      <div className="flex flex-col justify-center items-start gap-5 p-3">
        <div className="fixed top-0 left-0 right-0 p-3 border-b bg-background dark:border-gray-800">
          <h1 className="text-2xl font-semibold">Past Transcriptions</h1>
        </div>
        <div className="mt-16 mb-8  w-full">
          <CaptionsList pastTranscriptions={pastTranscriptions} />
        </div>
        <footer className="flex gap-3 fixed bottom-0 left-0 right-0 p-3 dark:bg-black border-t dark:border-gray-800">
          <Button
            className={`w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={getCaptionsTranscript}
            disabled={isLoading}
          >
            {isLoading ? (
              <PulseLoader color="white" size={12} />
            ) : (
              <div className="flex items-center gap-2">
                <MdDownload /> Download current Transcription
              </div>
            )}
          </Button>
        </footer>
      </div>
      <Toaster position="top-right" duration={2000} />
    </>
  )
}

export default App

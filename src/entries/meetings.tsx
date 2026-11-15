import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MeetingsApp } from '@/features/meetings/meetings-app'

import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MeetingsApp />
  </StrictMode>
)

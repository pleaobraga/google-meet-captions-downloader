import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PopupApp } from '@/features/popup/popup-app'

import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <p className="p-4">Meet Captions</p>
  </StrictMode>
)

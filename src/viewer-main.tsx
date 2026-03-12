import { createRoot } from 'react-dom/client'
import './index.css'
import { ModelViewer } from './ModelViewer'

createRoot(document.getElementById('root')!).render(
  <ModelViewer />,
)

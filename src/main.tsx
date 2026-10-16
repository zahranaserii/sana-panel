import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'react-multi-date-picker/styles/colors/teal.css'
import { appConfig } from './app/config'
import { modules } from './app/modules'
import { applyCssVars, configureApp, CoreApp } from './core'
import './core/theme/global.css'

// پیکربندی باید قبل از رندر ثبت شود (ماژول‌ها، نقش‌ها، تم، پیشوند storage)
configureApp(appConfig, modules)
applyCssVars(appConfig.theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CoreApp />
  </StrictMode>,
)

import './globals.css'
import CameraBackgroundProcessor from '@/components/CameraBackgroundProcessor'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>MITS — Multiple Identity Tracking System</title>
        <meta name="description" content="Multiple Identity Tracking System — ALPR & Facial Recognition" />
      </head>
      <body>
        <CameraBackgroundProcessor />
        {children}
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

// Only for tabular values (CNPJ, coordinates).
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: { default: 'ReloadCars Admin', template: '%s · ReloadCars Admin' },
  description: 'Painel de parceiros e pontos de recarga do ReloadCars.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

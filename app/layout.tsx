import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Abyss - AI 영어 내신 변형 문제 생성기',
  description: '시험 지문을 넣으면 변형 문제가 나온다. AI 기반 고등학교 영어 내신 변형 문제 자동 생성 서비스.',
  icons: {
    icon: [
      {
        url: '/EngenP/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/EngenP/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/EngenP/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/EngenP/apple-icon.png',
  },
  openGraph: {
    title: 'Abyss - AI 영어 내신 변형 문제 생성기',
    description: '시험 지문을 넣으면 변형 문제가 나온다. 모의고사, 교과서, 추가지문을 업로드하면 AI가 고품질 변형 문제를 자동 생성합니다.',
    url: 'https://enggeneartor.github.io/EngenP/',
    siteName: 'Abyss',
    images: [
      {
        url: 'https://enggeneartor.github.io/EngenP/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Abyss - AI 영어 내신 변형 문제 생성기',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Abyss - AI 영어 내신 변형 문제 생성기',
    description: '시험 지문을 넣으면 변형 문제가 나온다.',
    images: ['https://enggeneartor.github.io/EngenP/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

import type {Metadata} from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Character Continuity - AI Image Generator',
  description: 'Generate consistent character images with AI across multiple scenes and poses.',
};

import FirebaseProvider from './FirebaseProvider';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof window !== 'undefined') {
            window.chrome = window.chrome || {};
            if (!window.chrome.runtime) {
              window.chrome.runtime = {
                onMessage: {
                  addListener: function() {},
                  removeListener: function() {},
                  hasListener: function() { return false; }
                },
                sendMessage: function() {},
                connect: function() { return { onMessage: { addListener: function() {} }, onDisconnect: { addListener: function() {} }, postMessage: function() {}, disconnect: function() {} }; }
              };
            }
          }
        ` }} />
      </head>
      <body suppressHydrationWarning className="bg-[#050506] text-slate-100 font-sans antialiased selection:bg-purple-500/30">
        <FirebaseProvider>
          {children}
        </FirebaseProvider>
      </body>
    </html>
  );
}

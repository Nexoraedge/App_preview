import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Adityam Niramayaa | Call-Center CRM & Concierge Desk',
  description: 'Real-time patient concierge and booking dispatch system for 50k concurrent launch.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-mint selection:text-healthGreen">
        {children}
      </body>
    </html>
  );
}

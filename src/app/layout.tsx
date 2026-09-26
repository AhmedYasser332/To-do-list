import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal Planner',
  description: 'Connected personal planning tree for calm daily execution',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

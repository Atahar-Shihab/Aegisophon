import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AegisGateway | Enterprise AI Semantic Router & Circuit-Breaker Mesh',
  description:
    'Multi-Tenant AI Semantic Router, Fault-Tolerant Circuit-Breaker Mesh, and Real-Time Time-Travel Observability Platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-obsidian-bg text-obsidian-text-primary antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

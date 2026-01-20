
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './visualizer.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-primary',
    display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'TurnBackHoax Network Visualization',
    description: 'Interactive 3D network visualization of hoax articles growing over time',
};

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
            {children}
        </div>
    );
}

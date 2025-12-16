import { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'FlowNote',
  description: 'A Node-based Document Authoring System',
};

export default function FlowNoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


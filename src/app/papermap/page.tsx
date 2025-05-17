import { redirect } from 'next/navigation';

export default function PapermapPage() {
  redirect('/');
  return null; // Or some placeholder content, as redirect will happen before render
}

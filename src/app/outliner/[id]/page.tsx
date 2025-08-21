'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import '../styles/editor.css';
import { ResearchIdea} from './utils';
import { FullDocumentEditor } from './DocumentEditor';

export default function OutlinerDetailPage() {
    const params = useParams();
    const id = (params?.id as string) || '';
    const [idea, setIdea] = useState<ResearchIdea | null>(null);
    const [language, setLanguage] = useState<'en' | 'id'>('en');

    useEffect(() => {
        if (!id) return;
        try {
            const raw = localStorage.getItem(`outliner:${id}`);
            const languagePref = localStorage.getItem(`outliner:${id}:language`) as 'en' | 'id';

            if (raw) {
                const parsedIdea = JSON.parse(raw);
                console.log('Loaded idea:', parsedIdea);
                setIdea(parsedIdea);
            }

            if (languagePref && (languagePref === 'en' || languagePref === 'id')) {
                setLanguage(languagePref);
            }
        } catch (error) {
            console.error('Error loading idea from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem(`outliner:${id}`);
        }
    }, [id]);

    return (
        <div className="min-h-[100vh] w-full max-w-3xl mx-auto px-4 py-2">
            {!idea ? (
                <div className="text-center">
                    <p className="opacity-70 mb-4">No content found for this paper. It may have expired from your browser storage.</p>
                    <button
                        onClick={() => window.history.back()}
                        className="text-blue-600 hover:text-blue-800 underline"
                    >
                        Go back to outliner
                    </button>
                </div>
            ) : (
                <FullDocumentEditor id={id} idea={idea} language={language} />
            )}
        </div>
    );
}


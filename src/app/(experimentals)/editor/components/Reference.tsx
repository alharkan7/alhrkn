import React from 'react';

interface Author {
  name: string;
}

interface Citation {
  title: string;
  authors: string[];
  year: number;
  doi?: string;
  url?: string;
}

interface ReferenceProps {
  citations: Citation[];
}

const Reference: React.FC<ReferenceProps> = ({ citations }) => {
  // Helper function to format authors in APA style
  const formatAuthors = (authors: string[]): string => {
    if (!authors.length) return '';

    if (authors.length === 1) {
      return authors[0];
    }

    if (authors.length === 2) {
      return `${authors[0]} & ${authors[1]}`;
    }

    // For more than 2 authors, list first 6 followed by et al.
    const displayedAuthors = authors.slice(0, 6);
    if (authors.length > 6) {
      return `${displayedAuthors.join(', ')}, et al.`;
    }

    // For 3-6 authors, list all with & before the last one
    const lastAuthor = displayedAuthors.pop();
    return `${displayedAuthors.join(', ')}, & ${lastAuthor}`;
  };

  // Remove duplicates based on DOI or URL
  const uniqueCitations = citations.filter((citation, index, self) => {
    const key = citation.doi || citation.url;
    return key ? index === self.findIndex(c => (c.doi || c.url) === key) : true;
  });

  // Sort citations alphabetically by first author's last name
  const sortedCitations = [...uniqueCitations].sort((a, b) => {
    const aFirstAuthor = a.authors[0]?.split(' ').pop() || '';
    const bFirstAuthor = b.authors[0]?.split(' ').pop() || '';
    return aFirstAuthor.localeCompare(bFirstAuthor);
  });

  if (sortedCitations.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 border-t pt-8">
      <h2 className="text-xl font-bold mb-4">References</h2>
      <div className="space-y-4">
        {sortedCitations.map((citation, index) => {
          const authors = formatAuthors(citation.authors);
          const link = citation.doi ? `https://doi.org/${citation.doi}` : citation.url;

          return (
            <div 
              key={citation.doi || citation.url || index}
              className="pl-8 -indent-8" // Create hanging indent
            >
              {authors} ({citation.year}). {citation.title}
              {link && (
                <>
                  . Retrieved from <a 
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {link}
                  </a>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Reference; 
import { BlockTool, BlockToolData } from '@editorjs/editorjs';

interface Citation {
  title: string;
  authors: string[];
  year: number;
  doi?: string;
  url?: string;
}

export interface ReferenceData {
  text: string;
  level: number;
  citations: Citation[];
}

export default class ReferenceTool implements BlockTool {
  private data: ReferenceData;
  private wrapper: HTMLElement;

  static get toolbox() {
    return {
      title: 'References',
      icon: '<svg width="17" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
    };
  }

  constructor({ data }: { data: ReferenceData }) {
    this.data = {
      text: data.text || 'References',
      level: data.level || 2,
      citations: data.citations || []
    };
    this.wrapper = document.createElement('div');
  }

  render() {
    this.wrapper.classList.add('reference-block');

    // Create header
    const header = document.createElement('h2');
    header.textContent = this.data.text;
    header.contentEditable = 'false';
    this.wrapper.appendChild(header);

    // Create references list
    if (this.data.citations && this.data.citations.length > 0) {
      const list = document.createElement('div');
      list.classList.add('references-list');

      // Sort citations by first author's last name
      const sortedCitations = [...this.data.citations].sort((a, b) => {
        const aName = a.authors[0]?.split(' ').pop() || '';
        const bName = b.authors[0]?.split(' ').pop() || '';
        return aName.localeCompare(bName);
      });

      // Create citation entries
      sortedCitations.forEach(citation => {
        const entry = document.createElement('p');
        entry.classList.add('reference-entry');
        
        // Format authors
        const authors = citation.authors.map(author => {
          const parts = author.split(' ');
          const lastName = parts.pop() || '';
          const initials = parts.map(part => part[0]).join('.');
          return `${lastName}, ${initials}`;
        }).join(', ');

        // Build citation text
        let citationText = `${authors} (${citation.year}). ${citation.title}.`;
        
        // Add DOI or URL if available
        if (citation.doi) {
          const link = document.createElement('a');
          link.href = `https://doi.org/${citation.doi}`;
          link.textContent = ` doi:${citation.doi}`;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          entry.innerHTML = citationText;
          entry.appendChild(link);
        } else if (citation.url) {
          const link = document.createElement('a');
          link.href = citation.url;
          link.textContent = ` ${citation.url}`;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          entry.innerHTML = citationText;
          entry.appendChild(link);
        } else {
          entry.textContent = citationText;
        }

        // Add hanging indent
        entry.style.paddingLeft = '2em';
        entry.style.textIndent = '-2em';
        entry.style.marginBottom = '1em';
        
        list.appendChild(entry);
      });

      this.wrapper.appendChild(list);
    }

    return this.wrapper;
  }

  save(): BlockToolData<ReferenceData> {
    return {
      text: this.data.text,
      level: this.data.level,
      citations: this.data.citations
    };
  }

  validate(data: ReferenceData) {
    return data.citations && Array.isArray(data.citations);
  }
} 
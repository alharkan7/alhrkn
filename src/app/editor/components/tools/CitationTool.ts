import { BlockTool, BlockToolData } from '@editorjs/editorjs';

export interface CitationData {
  text: string;
  citation?: {
    title: string;
    authors: string[];
    year: number;
    doi?: string;
    url?: string;
  };
}

export default class CitationTool implements BlockTool {
  private data: CitationData;
  private wrapper: HTMLElement;

  static get toolbox() {
    return {
      title: 'Citation',
      icon: '<svg width="17" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/></svg>'
    };
  }

  constructor({ data }: { data: CitationData }) {
    this.data = {
      text: data.text || '',
      citation: data.citation
    };
    this.wrapper = document.createElement('div');
  }

  render() {
    this.wrapper.classList.add('citation-block');
    
    const textElement = document.createElement('div');
    textElement.classList.add('citation-text');
    textElement.contentEditable = 'true';
    textElement.innerHTML = this.data.text;

    const citationElement = document.createElement('div');
    citationElement.classList.add('citation-reference');
    
    if (this.data.citation) {
      const { title, authors, year, url, doi } = this.data.citation;
      const citationLink = document.createElement('a');
      citationLink.textContent = `(${authors[0]} et al., ${year})`;
      citationLink.title = title;
      citationLink.href = doi ? `https://doi.org/${doi}` : url || '#';
      citationLink.target = '_blank';
      citationLink.rel = 'noopener noreferrer';
      citationLink.style.textDecoration = 'none';
      citationLink.style.color = 'inherit';
      citationLink.addEventListener('mouseover', () => {
        citationLink.style.textDecoration = 'underline';
      });
      citationLink.addEventListener('mouseout', () => {
        citationLink.style.textDecoration = 'none';
      });
      citationElement.appendChild(citationLink);
    }

    this.wrapper.appendChild(textElement);
    this.wrapper.appendChild(citationElement);

    return this.wrapper;
  }

  save(blockContent: HTMLElement): BlockToolData<CitationData> {
    const textElement = blockContent.querySelector('.citation-text');
    
    return {
      text: textElement?.innerHTML || '',
      citation: this.data.citation
    };
  }

  validate(data: CitationData) {
    return data.text.trim() !== '';
  }
} 
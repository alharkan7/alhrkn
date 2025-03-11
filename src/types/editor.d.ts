declare module '@editorjs/marker' {
  import { API, BlockTool } from '@editorjs/editorjs';
  export default class Marker implements BlockTool {
    constructor({ api }: { api: API });
    static get isInline(): boolean;
    render(): HTMLElement;
    wrap(range: Range): void;
    surround(range: Range): void;
    checkState(selection: Selection): boolean;
  }
}

declare module '@editorjs/inline-code' {
  import { API, BlockTool } from '@editorjs/editorjs';
  export default class InlineCode implements BlockTool {
    constructor({ api }: { api: API });
    static get isInline(): boolean;
    render(): HTMLElement;
    wrap(range: Range): void;
    surround(range: Range): void;
    checkState(selection: Selection): boolean;
  }
}

declare module '@editorjs/underline' {
  import { API, BlockTool } from '@editorjs/editorjs';
  export default class Underline implements BlockTool {
    constructor({ api }: { api: API });
    static get isInline(): boolean;
    render(): HTMLElement;
    wrap(range: Range): void;
    surround(range: Range): void;
    checkState(selection: Selection): boolean;
  }
} 
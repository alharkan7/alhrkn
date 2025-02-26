//// filepath: /d:/Repositories/alhrkn/src/app/scholar/plugins/PredictionNode.tsx
import { DecoratorNode } from 'lexical';

// Define your own SerializedDecoratorNode type
export type SerializedDecoratorNode = {
  type: string;
  version: number;
  [key: string]: any;
};

export type SerializedPredictionNode = SerializedDecoratorNode & {
  __text: string;
};

export class PredictionNode extends DecoratorNode<string> {
  __text: string;

  static getType() {
    return 'prediction';
  }

  static clone(node: PredictionNode) {
    return new PredictionNode(node.__text, node.__key);
  }

  constructor(text: string, key?: string) {
    super(key);
    this.__text = text;
  }

  createDOM() {
    const span = document.createElement('span');
    span.className = 'prediction-text text-gray-400';
    return span;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return this.__text;
  }

  static importJSON(serializedNode: SerializedPredictionNode): PredictionNode {
    const node = new PredictionNode(serializedNode.__text);
    return node;
  }

  exportJSON(): SerializedPredictionNode {
    return {
      ...super.exportJSON(),
      __text: this.__text,
      type: 'prediction',
      version: 1,
    };
  }
}

export function $createPredictionNode(text: string) {
  return new PredictionNode(text);
}

export function $isPredictionNode(node: any): node is PredictionNode {
  return node instanceof PredictionNode;
}
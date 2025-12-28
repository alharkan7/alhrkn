export interface Comment {
  id: string
  text: string
  selectedText: string
  position: {
    start: number
    end: number
  }
  timestamp: Date
  author: string
}

export interface CommentableText {
  id: string
  content: string
  comments: Comment[]
}

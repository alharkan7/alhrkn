import { ChatSession } from '@google/generative-ai';

// Types for our session store
interface SessionData {
  chat: ChatSession;
  lastAccessed: number;
}

/**
 * Simple in-memory session store for Gemini chat sessions
 * In a production environment, this should be replaced with a proper database or Redis
 */
class SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Store a chat session with the given ID
   */
  set(sessionId: string, chat: ChatSession): void {
    this.sessions.set(sessionId, {
      chat,
      lastAccessed: Date.now()
    });

    // Schedule cleanup for this session
    setTimeout(() => this.removeIfExpired(sessionId), this.SESSION_TIMEOUT_MS + 1000);
  }

  /**
   * Retrieve a chat session by ID
   * Updates the lastAccessed timestamp to prevent premature expiration
   */
  get(sessionId: string): ChatSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Update last accessed time
    session.lastAccessed = Date.now();
    return session.chat;
  }

  /**
   * Check if a session exists
   */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Remove a session
   */
  remove(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Remove session if it has expired
   */
  private removeIfExpired(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const now = Date.now();
    if (now - session.lastAccessed > this.SESSION_TIMEOUT_MS) {
      this.remove(sessionId);
      console.log(`Session ${sessionId} expired and was removed`);
    }
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessed > this.SESSION_TIMEOUT_MS) {
        this.remove(sessionId);
        console.log(`Session ${sessionId} expired and was removed during cleanup`);
      }
    }
  }
}

// Create singleton instance
export const sessionStore = new SessionStore();

// Run cleanup every hour
setInterval(() => {
  sessionStore.cleanupExpiredSessions();
}, 60 * 60 * 1000); 
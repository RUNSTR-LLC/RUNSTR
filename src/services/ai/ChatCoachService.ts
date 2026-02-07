/**
 * ChatCoachService - Conversational AI Coach
 *
 * Enables multi-turn conversations with Coach RUNSTR.
 * Builds on PPQ.AI integration with conversation history.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { RunstrContextGenerator } from './RunstrContextGenerator';
import { ModelManager } from './ModelManager';

const SESSIONS_STORAGE_KEY = '@runstr:chat_sessions';
const ACTIVE_SESSION_KEY = '@runstr:active_chat_session';
const MAX_MESSAGES_PER_SESSION = 20;
const MAX_STORED_SESSIONS = 10;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  focus?: 'general' | 'weekly' | 'goals' | 'habits' | 'nutrition';
}

export type ChatFocus = ChatSession['focus'];

/**
 * Suggested prompts for different focus areas
 */
export const QUICK_PROMPTS: Record<string, string[]> = {
  general: [
    'How am I doing overall?',
    'Give me a pep talk',
    'What should I focus on this week?',
  ],
  weekly: [
    'Review my week',
    'What were my highlights?',
    'How can I improve next week?',
  ],
  goals: [
    'Help me set a new goal',
    'Am I on track?',
    'What milestones should I celebrate?',
  ],
  habits: [
    'How are my habits going?',
    "I'm struggling with consistency",
    'Suggest a new habit',
  ],
  nutrition: [
    'Any nutrition tips?',
    'How does diet affect my workouts?',
    'Pre-workout meal ideas?',
  ],
};

class ChatCoachServiceClass {
  private apiKey: string | null = null;
  private sessionsCache: ChatSession[] | null = null;

  /**
   * Initialize the service with API key
   */
  initialize(apiKey: string) {
    this.apiKey = apiKey;
    console.log('[ChatCoach] Service initialized');
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Get all chat sessions
   */
  async getSessions(): Promise<ChatSession[]> {
    if (this.sessionsCache) {
      return this.sessionsCache;
    }

    try {
      const stored = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
      const sessions: ChatSession[] = stored ? JSON.parse(stored) : [];
      sessions.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      this.sessionsCache = sessions;
      return sessions;
    } catch (error) {
      console.error('[ChatCoach] Error loading sessions:', error);
      return [];
    }
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    const sessions = await this.getSessions();
    return sessions.find((s) => s.id === sessionId) || null;
  }

  /**
   * Get or create the active session
   */
  async getActiveSession(): Promise<ChatSession | null> {
    try {
      const activeId = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      if (activeId) {
        const session = await this.getSession(activeId);
        if (session) return session;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Start a new conversation session
   */
  async startConversation(focus?: ChatFocus): Promise<ChatSession> {
    const now = new Date().toISOString();
    const focusLabel = focus
      ? focus.charAt(0).toUpperCase() + focus.slice(1)
      : 'Chat';

    const session: ChatSession = {
      id: uuidv4(),
      title: `${focusLabel} - ${new Date().toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
      messages: [],
      focus,
    };

    // Add initial assistant message
    const greeting = await this.getGreetingMessage(focus);
    session.messages.push({
      id: uuidv4(),
      role: 'assistant',
      content: greeting,
      timestamp: now,
    });

    await this.saveSession(session);
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, session.id);

    return session;
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    sessionId: string,
    message: string
  ): Promise<{ session: ChatSession; response: string }> {
    if (!this.apiKey) {
      throw new Error('ChatCoach not initialized with API key');
    }

    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(userMessage);

    try {
      // Generate AI response
      const response = await this.generateResponse(session, message);

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      session.messages.push(assistantMessage);

      // Trim old messages if needed
      if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
        // Keep system/greeting + recent messages
        const toKeep = session.messages.slice(0, 1);
        const recent = session.messages.slice(-MAX_MESSAGES_PER_SESSION + 1);
        session.messages = [...toKeep, ...recent];
      }

      session.updatedAt = new Date().toISOString();
      await this.saveSession(session);

      // Update conversation memory
      await RunstrContextGenerator.appendMemory(
        'weekly',
        message,
        response
      );

      return { session, response };
    } catch (error) {
      // Remove the user message if AI fails
      session.messages.pop();
      throw error;
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.getSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    await this.saveSessions(filtered);

    // Clear active session if it was deleted
    const activeId = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    if (activeId === sessionId) {
      await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }

  /**
   * Clear all sessions
   */
  async clearAllSessions(): Promise<void> {
    await AsyncStorage.removeItem(SESSIONS_STORAGE_KEY);
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    this.sessionsCache = null;
  }

  // Private methods

  private async generateResponse(
    session: ChatSession,
    userMessage: string
  ): Promise<string> {
    // Build system prompt with context
    const contextFile = await RunstrContextGenerator.getContext();
    const systemPrompt = await this.buildSystemPrompt(session.focus, contextFile);

    // Build conversation history (last 10 messages)
    const recentMessages = session.messages.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Add current user message
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...recentMessages,
      { role: 'user' as const, content: userMessage },
    ];

    const selectedModel = await ModelManager.getSelectedModel();

    const response = await fetch('https://api.ppq.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 300,
        temperature: 0.7,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 402) {
        throw new Error('Insufficient credits. Add Bitcoin to your PPQ.AI account.');
      }
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I'm here for you!";
  }

  private async buildSystemPrompt(
    focus?: ChatFocus,
    context?: string | null
  ): Promise<string> {
    const basePrompt = `You are Coach RUNSTR, a warm and supportive AI fitness coach.

## YOUR PERSONALITY
- Calm, confident, and encouraging
- Genuinely happy for every step of the user's journey
- Never judgmental - every workout counts
- Conversational and personable

## GUIDELINES
- Keep responses concise (2-4 sentences typically)
- Be specific when possible - reference actual data
- Celebrate wins, big and small
- Offer gentle suggestions, never pressure
- Ask follow-up questions to understand better

## CONVERSATION STYLE
- This is a back-and-forth chat, not a report
- Match the user's energy and pace
- Use natural language, not bullet points
- End with a question or invitation when appropriate`;

    const contextSection = context
      ? `\n\n## USER DATA\n${context}`
      : '\n\n## USER DATA\nNo fitness data available yet.';

    const focusSection = focus
      ? `\n\n## CURRENT FOCUS: ${focus.toUpperCase()}`
      : '';

    return basePrompt + contextSection + focusSection;
  }

  private async getGreetingMessage(focus?: ChatFocus): Promise<string> {
    const greetings: Record<string, string> = {
      general: "Hey! I'm Coach RUNSTR. How can I help you today?",
      weekly:
        "Let's review your week! I've been looking at your recent activity. What would you like to know?",
      goals:
        "Let's talk about your goals! Where are you hoping to take your fitness journey?",
      habits:
        "Habits are the building blocks of success. What's on your mind?",
      nutrition:
        'Nutrition fuels everything we do. What would you like to explore?',
    };

    return greetings[focus || 'general'] || greetings.general;
  }

  private async saveSession(session: ChatSession): Promise<void> {
    const sessions = await this.getSessions();
    const index = sessions.findIndex((s) => s.id === session.id);

    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }

    await this.saveSessions(sessions);
  }

  private async saveSessions(sessions: ChatSession[]): Promise<void> {
    // Keep only recent sessions
    const trimmed = sessions.slice(0, MAX_STORED_SESSIONS);
    await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(trimmed));
    this.sessionsCache = trimmed;
  }
}

// Export singleton instance
export const ChatCoachService = new ChatCoachServiceClass();
export default ChatCoachService;

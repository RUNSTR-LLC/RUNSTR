# Coach Components

UI components for the AI Coach conversational interface.

## Files

| File | Description |
|------|-------------|
| `ChatInterface.tsx` | Main chat view with message list, input, and quick prompts |
| `MessageBubble.tsx` | Styled chat message bubble for user/assistant messages |
| `ChatInput.tsx` | Text input with send button for chat |
| `QuickPromptChips.tsx` | Horizontal scrolling suggested conversation starters |
| `README.md` | This file |

## Usage

```tsx
import { ChatInterface } from '../components/coach/ChatInterface';

// In a screen:
<ChatInterface
  apiKey={ppqApiKey}
  focus="weekly" // optional: 'general' | 'weekly' | 'goals' | 'habits' | 'nutrition'
  onCreditWarning={() => console.log('Low credits!')}
/>
```

## Features

- Multi-turn conversation with Coach RUNSTR
- Typing indicator while AI responds
- Quick prompt suggestions at conversation start
- Keyboard-aware layout
- Error handling with credit warnings
- Auto-scroll to new messages

## Styling

All components use the RUNSTR dark theme:
- User messages: Orange background (#FF7B1C)
- Assistant messages: Dark card background (#0a0a0a)
- Input: Dark styled with orange send button

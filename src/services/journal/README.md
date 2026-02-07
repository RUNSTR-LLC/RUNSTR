# Journal Service

Service for managing journal entries in the AI Health & Fitness Tracker.

## Files

| File | Description |
|------|-------------|
| `JournalService.ts` | CRUD operations for journal entries with AsyncStorage persistence |
| `README.md` | This file |

## Usage

```typescript
import { JournalService } from '../services/journal/JournalService';

// Create entry
const entry = await JournalService.createEntry({
  content: 'Felt great after my morning run!',
  mood: 'great',
  energy: 4,
  tags: ['running', 'morning']
});

// Get all entries
const entries = await JournalService.getAllEntries();

// Get today's entry
const today = await JournalService.getTodayEntry();

// Get recent entries (last 7 days)
const recent = await JournalService.getRecentEntries(7);

// Get statistics
const stats = await JournalService.getStats();

// Update entry
await JournalService.updateEntry(entryId, { mood: 'good' });

// Delete entry
await JournalService.deleteEntry(entryId);
```

## Storage

Entries are stored in AsyncStorage at key `@runstr:journal_entries`.

## Features

- Automatic date-based organization
- Mood tracking (great/good/neutral/low/bad)
- Energy level tracking (1-5)
- Tag support for categorization
- Streak calculation for consecutive days
- Statistics (averages, top tags, streaks)

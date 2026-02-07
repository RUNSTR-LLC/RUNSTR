# Journal Components

UI components for the journal/notes feature of the AI Health & Fitness Tracker.

## Files

| File | Description |
|------|-------------|
| `JournalEntryCard.tsx` | Card display for a journal entry with mood, energy, and content preview |
| `JournalEditorModal.tsx` | Full-screen modal for creating/editing journal entries |
| `JournalList.tsx` | Scrollable list of entries grouped by month with pull-to-refresh |
| `MoodSelector.tsx` | Horizontal mood picker with emoji buttons |
| `EnergySelector.tsx` | Energy level picker (1-5 scale) |
| `README.md` | This file |

## Usage

```tsx
import { JournalList } from '../components/journal/JournalList';
import { JournalEditorModal } from '../components/journal/JournalEditorModal';
import { JournalEntryCard } from '../components/journal/JournalEntryCard';

// In a screen:
const [editorVisible, setEditorVisible] = useState(false);
const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

<JournalList
  onEntryPress={(entry) => {
    setSelectedEntry(entry);
    setEditorVisible(true);
  }}
  onNewEntry={() => {
    setSelectedEntry(null);
    setEditorVisible(true);
  }}
/>

<JournalEditorModal
  visible={editorVisible}
  onClose={() => setEditorVisible(false)}
  onSave={(entry) => console.log('Saved:', entry)}
  entry={selectedEntry}
/>
```

## Styling

All components use the RUNSTR dark theme:
- Black background (#000)
- Dark cards (#0a0a0a)
- Orange text accents (#FF9D42, #FF7B1C)
- Border color (#1a1a1a)

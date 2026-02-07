# Backup Components

UI components for encrypted workout backup to Nostr.

## Files

| File | Description |
|------|-------------|
| `ExportDataModal.tsx` | Export modal with data preview and relay selection |
| `ImportDataModal.tsx` | Import modal with search, preview, and merge |

## ExportDataModal

Full-screen modal for exporting data:
- Shows data summary (workout count, habits, journal entries)
- Relay selection (default relays + custom option)
- Security notice about encryption
- Export button with loading state

## ImportDataModal

Full-screen modal for importing data:
- Searches relays for existing backup
- Shows backup preview (contents, date exported)
- Import button with progress
- Success summary with counts

## Usage

```tsx
import { ExportDataModal } from '../components/backup/ExportDataModal';
import { ImportDataModal } from '../components/backup/ImportDataModal';

// In your component:
const [showExport, setShowExport] = useState(false);
const [showImport, setShowImport] = useState(false);

<ExportDataModal
  visible={showExport}
  onClose={() => setShowExport(false)}
/>

<ImportDataModal
  visible={showImport}
  onClose={() => setShowImport(false)}
/>
```

## Related

- `src/services/backup/BackupService.ts` - Export logic
- `src/services/backup/RestoreService.ts` - Import logic

# ElectriScribe Offline-First Architecture - Quick Start

**Last Updated:** 2025-11-16

---

## TL;DR

**Technology Stack:**
- Local DB: Dexie.js (IndexedDB wrapper)
- Schema: 7 tables (users, sites, panels, circuits, photos, field_notes, work_orders)
- Sync: Last-Write-Wins with server timestamp
- Photos: 1.5MB JPEG + 20KB thumbnails
- Performance: <1s app launch, 60 FPS scrolling on all devices

**Install:**
```bash
npm install dexie dexie-react-hooks pica react-window
```

**Files to Create:**
```
src/
  db/
    schema.ts          # Database definition (7 tables)
  sync/
    sync-engine.ts     # Sync logic
  services/
    photo-processor.ts # Image compression
  hooks/
    usePanels.ts       # React Query hooks
    useCircuits.ts
    usePhotos.ts
```

---

## 5-Minute Setup

### 1. Install Dependencies

```bash
npm install dexie dexie-react-hooks pica react-window
npm install -D @types/pica
```

### 2. Create Database Schema

Copy this entire file to `src/db/schema.ts`:

```typescript
import Dexie, { Table } from 'dexie';

// Interfaces
export interface Panel {
  id: string;
  site_id: string | null;
  user_id: string;
  name: string;
  panel_type: 'main' | 'sub';
  rating: number;
  manufacturer?: string;
  model?: string;
  location?: string;
  photo_ids: string[];
  created_at: number;
  updated_at: number;
  synced_at: number | null;
  sync_status: 'pending' | 'synced' | 'conflict';
  server_updated_at?: number;
  deleted_at?: number | null;
}

export interface Circuit {
  id: string;
  panel_id: string;
  user_id: string;
  circuit_number: number;
  name: string;
  breaker_size: number;
  wire_gauge?: number;
  phase: 'L1' | 'L2' | 'L1-L2' | 'unknown';
  load_type?: string;
  location?: string;
  is_spare: boolean;
  created_at: number;
  updated_at: number;
  synced_at: number | null;
  sync_status: 'pending' | 'synced' | 'conflict';
  server_updated_at?: number;
  deleted_at?: number | null;
}

export interface Photo {
  id: string;
  panel_id: string | null;
  user_id: string;
  original_blob: Blob;
  thumbnail_blob?: Blob;
  filename: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
  photo_type: 'panel_front' | 'panel_inside' | 'circuit_closeup' | 'other';
  caption?: string;
  server_url?: string;
  created_at: number;
  synced_at: number | null;
  sync_status: 'pending' | 'synced' | 'failed';
}

// Add other interfaces (User, Site, FieldNote, WorkOrder)
// See DATA_ARCHITECTURE.md for complete definitions

// Database
export class ElectriScribeDB extends Dexie {
  panels!: Table<Panel, string>;
  circuits!: Table<Circuit, string>;
  photos!: Table<Photo, string>;

  constructor() {
    super('ElectriScribeDB');

    this.version(1).stores({
      panels: 'id, user_id, site_id, [user_id+site_id], created_at, sync_status',
      circuits: 'id, panel_id, [user_id+panel_id], sync_status',
      photos: 'id, panel_id, created_at, sync_status'
    });
  }
}

export const db = new ElectriScribeDB();
```

### 3. Create React Hook

Create `src/hooks/usePanels.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, Panel } from '../db/schema';

export function usePanels(siteId?: string) {
  return useQuery({
    queryKey: ['panels', siteId],
    queryFn: async () => {
      const userId = 'current-user-id'; // Get from auth context

      if (siteId) {
        return db.panels
          .where('[user_id+site_id]')
          .equals([userId, siteId])
          .and(p => !p.deleted_at)
          .reverse()
          .sortBy('created_at');
      }

      return db.panels
        .where('user_id').equals(userId)
        .and(p => !p.deleted_at)
        .reverse()
        .sortBy('created_at');
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePanel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (panel: Omit<Panel, 'id' | 'created_at' | 'updated_at'>) => {
      const id = crypto.randomUUID();
      const now = Date.now();

      await db.panels.add({
        ...panel,
        id,
        created_at: now,
        updated_at: now,
        synced_at: null,
        sync_status: 'pending'
      });

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panels'] });
    }
  });
}
```

### 4. Use in Component

```typescript
import { usePanels, useCreatePanel } from '../hooks/usePanels';

function PanelList() {
  const { data: panels, isLoading } = usePanels();
  const createPanel = useCreatePanel();

  const handleCreate = () => {
    createPanel.mutate({
      site_id: 'site-123',
      user_id: 'user-123',
      name: 'Main Panel',
      panel_type: 'main',
      rating: 200,
      photo_ids: [],
      source_type: 'manual'
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreate}>Create Panel</button>
      {panels?.map(panel => (
        <div key={panel.id}>
          {panel.name} - {panel.rating}A
        </div>
      ))}
    </div>
  );
}
```

---

## Photo Compression

Create `src/services/photo-processor.ts`:

```typescript
export async function compressPhoto(file: File): Promise<{
  original: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
}> {
  const img = await createImageBitmap(file);

  // Create canvas for original (compressed)
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // Compress to JPEG 0.75 quality
  const original = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.75);
  });

  // Create thumbnail (200x200)
  const thumbSize = 200;
  const scale = Math.min(thumbSize / img.width, thumbSize / img.height);
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = img.width * scale;
  thumbCanvas.height = img.height * scale;
  const thumbCtx = thumbCanvas.getContext('2d')!;
  thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);

  const thumbnail = await new Promise<Blob>((resolve) => {
    thumbCanvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7);
  });

  return { original, thumbnail, width: img.width, height: img.height };
}
```

---

## Sync Engine (Basic)

Create `src/sync/sync-engine.ts`:

```typescript
import { db } from '../db/schema';
import { supabase } from '../services/supabase';

export async function syncPanels(): Promise<void> {
  const userId = 'current-user-id'; // Get from auth

  // 1. PUSH: Upload pending panels
  const pending = await db.panels
    .where('sync_status').equals('pending')
    .toArray();

  for (const panel of pending) {
    await supabase.from('panels').upsert({
      id: panel.id,
      site_id: panel.site_id,
      user_id: panel.user_id,
      name: panel.name,
      panel_type: panel.panel_type,
      rating: panel.rating,
      manufacturer: panel.manufacturer,
      model: panel.model,
      location: panel.location,
      created_at: new Date(panel.created_at).toISOString(),
      updated_at: new Date(panel.updated_at).toISOString()
    });

    await db.panels.update(panel.id, {
      sync_status: 'synced',
      synced_at: Date.now()
    });
  }

  // 2. PULL: Download new panels from server
  const lastSync = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: serverPanels } = await supabase
    .from('panels')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastSync);

  for (const serverPanel of serverPanels || []) {
    await db.panels.put({
      id: serverPanel.id,
      site_id: serverPanel.site_id,
      user_id: serverPanel.user_id,
      name: serverPanel.name,
      panel_type: serverPanel.panel_type,
      rating: serverPanel.rating,
      manufacturer: serverPanel.manufacturer,
      model: serverPanel.model,
      location: serverPanel.location,
      photo_ids: [],
      source_type: 'manual',
      created_at: new Date(serverPanel.created_at).getTime(),
      updated_at: new Date(serverPanel.updated_at).getTime(),
      synced_at: Date.now(),
      sync_status: 'synced',
      server_updated_at: new Date(serverPanel.updated_at).getTime()
    });
  }
}

// Auto-sync on app launch
if (navigator.onLine) {
  syncPanels();
}

// Auto-sync on network reconnect
window.addEventListener('online', () => {
  syncPanels();
});
```

---

## Performance: Virtual Scrolling

```typescript
import { FixedSizeList } from 'react-window';

function PanelList({ panels }: { panels: Panel[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={panels.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style} key={panels[index].id}>
          <PanelCard panel={panels[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

---

## Troubleshooting

### Database not persisting?

**Check IndexedDB in DevTools:**
- Chrome: F12 → Application → IndexedDB → ElectriScribeDB
- Should see tables: panels, circuits, photos

**If empty:**
```typescript
// Check if data was added
const count = await db.panels.count();
console.log(`Panels: ${count}`);
```

### Photos too large?

**Check compression:**
```typescript
const { original, thumbnail } = await compressPhoto(file);
console.log(`Original: ${(original.size / 1024 / 1024).toFixed(2)}MB`);
console.log(`Thumbnail: ${(thumbnail.size / 1024).toFixed(0)}KB`);
```

**Expected:**
- Original: 1-2 MB (from 4-5 MB)
- Thumbnail: 15-25 KB

### Sync not working?

**Check network:**
```typescript
console.log(`Online: ${navigator.onLine}`);
```

**Check pending items:**
```typescript
const pending = await db.panels.where('sync_status').equals('pending').count();
console.log(`Pending panels: ${pending}`);
```

---

## Next Steps

1. **Read full architecture:** `/docs/DATA_ARCHITECTURE.md`
2. **See validation reports:** `/docs/validations/`
3. **Follow roadmap:** `/docs/IMPLEMENTATION_ROADMAP.md`
4. **Start Phase 1:** Database schema + basic CRUD

---

## Support

**Questions?**
- Architecture decisions: See `DATA_ARCHITECTURE.md`
- Performance concerns: See `validations/MOBILE_PERFORMANCE_VALIDATION.md`
- Sync issues: See `validations/SYNC_PATTERN_VALIDATION.md`
- Schema changes: See `validations/SCHEMA_DESIGN_VALIDATION.md`

**Need help?**
- GitHub Issues: (your repo)
- Documentation: `/docs/`

---

**Ready to build!** 🚀

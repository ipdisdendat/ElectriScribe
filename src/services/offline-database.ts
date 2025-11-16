/**
 * Offline Database Service (Dexie.js)
 *
 * Provides offline-first local storage for panel documentation.
 * Data is stored in IndexedDB and synced to Supabase when online.
 *
 * Database Schema matches MVP simplified schema (7 tables):
 * - users (minimal user profile)
 * - sites (work locations)
 * - panels (electrical panels)
 * - circuits (breakers/circuits in panels)
 * - photos (panel photos and thumbnails)
 * - field_notes (observations and issues)
 * - work_orders (tasks and jobs)
 */

import Dexie, { type EntityTable } from 'dexie';

//=============================================================================
// Type Definitions
//=============================================================================

export interface OfflineUser {
  id: string; // UUID from Supabase
  email: string;
  name?: string;
  role?: 'apprentice' | 'journeyman' | 'contractor';
  created_at: number; // Timestamp
}

export interface OfflineSite {
  id: string; // UUID
  user_id: string;
  name: string;
  address?: string;
  created_at: number;
  // Sync fields
  sync_status: 'pending' | 'synced' | 'conflict';
  synced_at?: number;
  updated_at: number;
}

export interface OfflinePanel {
  id: string; // UUID
  user_id: string;
  site_id?: string;
  manufacturer?: string;
  model?: string;
  amperage?: number;
  voltage?: number;
  photo_url?: string; // Reference to photo in IndexedDB
  ocr_confidence?: number; // 0-100 OCR accuracy
  // Sync fields
  sync_status: 'pending' | 'synced' | 'conflict';
  created_at: number;
  updated_at: number;
  synced_at?: number;
}

export interface OfflineCircuit {
  id: string; // UUID
  panel_id: string;
  position: number; // Breaker slot number (1, 2, 3...)
  amperage?: number;
  voltage?: number;
  circuit_type?: 'single' | 'double' | 'triple';
  label?: string; // "Kitchen Outlets", "Master BR"
  room_location?: string;
  wire_gauge?: string; // "14 AWG", "12 AWG"
  notes?: string;
  created_at: number;
  updated_at: number;
}

export interface OfflinePhoto {
  id: string; // UUID
  panel_id: string;
  photo_type: 'original' | 'thumbnail' | 'annotated';
  blob: Blob; // Actual photo data stored in IndexedDB
  file_size: number; // Bytes
  mime_type: string; // 'image/jpeg'
  width?: number;
  height?: number;
  created_at: number;
  // Sync fields
  sync_status: 'pending' | 'synced' | 'conflict';
  synced_at?: number;
}

export interface OfflineFieldNote {
  id: string; // UUID
  user_id: string;
  panel_id?: string;
  note_text: string;
  note_type: 'observation' | 'issue' | 'question' | 'todo';
  voice_memo_blob?: Blob; // Optional voice recording
  created_at: number;
  updated_at: number;
  // Sync fields
  sync_status: 'pending' | 'synced' | 'conflict';
  synced_at?: number;
}

export interface OfflineWorkOrder {
  id: string; // UUID
  user_id: string;
  panel_id?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  title: string;
  description?: string;
  created_at: number;
  updated_at: number;
  completed_at?: number;
  // Sync fields
  sync_status: 'pending' | 'synced' | 'conflict';
  synced_at?: number;
}

//=============================================================================
// Dexie Database Class
//=============================================================================

class ElectriScribeDatabase extends Dexie {
  // Tables
  users!: EntityTable<OfflineUser, 'id'>;
  sites!: EntityTable<OfflineSite, 'id'>;
  panels!: EntityTable<OfflinePanel, 'id'>;
  circuits!: EntityTable<OfflineCircuit, 'id'>;
  photos!: EntityTable<OfflinePhoto, 'id'>;
  field_notes!: EntityTable<OfflineFieldNote, 'id'>;
  work_orders!: EntityTable<OfflineWorkOrder, 'id'>;

  constructor() {
    super('ElectriScribeDB');

    this.version(1).stores({
      users: 'id, email',
      sites: 'id, user_id, sync_status, updated_at',
      panels: 'id, user_id, site_id, sync_status, updated_at',
      circuits: 'id, panel_id, position, updated_at',
      photos: 'id, panel_id, photo_type, sync_status',
      field_notes: 'id, user_id, panel_id, note_type, sync_status, updated_at',
      work_orders: 'id, user_id, panel_id, status, sync_status, updated_at',
    });
  }
}

// Create database instance
export const offlineDB = new ElectriScribeDatabase();

//=============================================================================
// Helper Functions
//=============================================================================

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current timestamp
 */
export function now(): number {
  return Date.now();
}

/**
 * Create new panel
 */
export async function createPanel(
  userId: string,
  data: Partial<Omit<OfflinePanel, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status'>>
): Promise<OfflinePanel> {
  const panel: OfflinePanel = {
    id: generateUUID(),
    user_id: userId,
    sync_status: 'pending',
    created_at: now(),
    updated_at: now(),
    ...data,
  };

  await offlineDB.panels.add(panel);
  return panel;
}

/**
 * Update panel
 */
export async function updatePanel(
  panelId: string,
  updates: Partial<Omit<OfflinePanel, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  await offlineDB.panels.update(panelId, {
    ...updates,
    updated_at: now(),
    sync_status: 'pending', // Mark as needing sync
  });
}

/**
 * Get panel by ID
 */
export async function getPanel(panelId: string): Promise<OfflinePanel | undefined> {
  return await offlineDB.panels.get(panelId);
}

/**
 * Get all panels for user
 */
export async function getUserPanels(userId: string): Promise<OfflinePanel[]> {
  return await offlineDB.panels.where('user_id').equals(userId).sortBy('updated_at');
}

/**
 * Create circuit
 */
export async function createCircuit(
  panelId: string,
  data: Partial<Omit<OfflineCircuit, 'id' | 'panel_id' | 'created_at' | 'updated_at'>>
): Promise<OfflineCircuit> {
  const circuit: OfflineCircuit = {
    id: generateUUID(),
    panel_id: panelId,
    created_at: now(),
    updated_at: now(),
    ...data,
  };

  await offlineDB.circuits.add(circuit);

  // Mark panel as needing sync
  await updatePanel(panelId, {});

  return circuit;
}

/**
 * Get circuits for panel
 */
export async function getPanelCircuits(panelId: string): Promise<OfflineCircuit[]> {
  return await offlineDB.circuits.where('panel_id').equals(panelId).sortBy('position');
}

/**
 * Save photo
 */
export async function savePhoto(
  panelId: string,
  photoType: OfflinePhoto['photo_type'],
  blob: Blob,
  metadata: { width?: number; height?: number } = {}
): Promise<OfflinePhoto> {
  const photo: OfflinePhoto = {
    id: generateUUID(),
    panel_id: panelId,
    photo_type: photoType,
    blob,
    file_size: blob.size,
    mime_type: blob.type,
    width: metadata.width,
    height: metadata.height,
    created_at: now(),
    sync_status: 'pending',
  };

  await offlineDB.photos.add(photo);

  // Mark panel as needing sync
  await updatePanel(panelId, {});

  return photo;
}

/**
 * Get photos for panel
 */
export async function getPanelPhotos(panelId: string): Promise<OfflinePhoto[]> {
  return await offlineDB.photos.where('panel_id').equals(panelId).toArray();
}

/**
 * Create field note
 */
export async function createFieldNote(
  userId: string,
  data: Partial<Omit<OfflineFieldNote, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status'>>
): Promise<OfflineFieldNote> {
  const note: OfflineFieldNote = {
    id: generateUUID(),
    user_id: userId,
    note_text: data.note_text || '',
    note_type: data.note_type || 'observation',
    created_at: now(),
    updated_at: now(),
    sync_status: 'pending',
    ...data,
  };

  await offlineDB.field_notes.add(note);
  return note;
}

/**
 * Get field notes for panel
 */
export async function getPanelFieldNotes(panelId: string): Promise<OfflineFieldNote[]> {
  return await offlineDB.field_notes.where('panel_id').equals(panelId).sortBy('created_at');
}

/**
 * Get items pending sync
 */
export async function getPendingSyncItems() {
  const [panels, photos, fieldNotes, sites, workOrders] = await Promise.all([
    offlineDB.panels.where('sync_status').equals('pending').toArray(),
    offlineDB.photos.where('sync_status').equals('pending').toArray(),
    offlineDB.field_notes.where('sync_status').equals('pending').toArray(),
    offlineDB.sites.where('sync_status').equals('pending').toArray(),
    offlineDB.work_orders.where('sync_status').equals('pending').toArray(),
  ]);

  return {
    panels,
    photos,
    fieldNotes,
    sites,
    workOrders,
    total: panels.length + photos.length + fieldNotes.length + sites.length + workOrders.length,
  };
}

/**
 * Mark items as synced
 */
export async function markAsSynced(table: keyof ElectriScribeDatabase, ids: string[]): Promise<void> {
  const collection = offlineDB[table] as any;
  await Promise.all(
    ids.map((id) =>
      collection.update(id, {
        sync_status: 'synced',
        synced_at: now(),
      })
    )
  );
}

/**
 * Clear all data (for testing or reset)
 */
export async function clearAllData(): Promise<void> {
  await offlineDB.transaction('rw', offlineDB.tables, async () => {
    await Promise.all(offlineDB.tables.map((table) => table.clear()));
  });
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const [panelCount, circuitCount, photoCount, noteCount] = await Promise.all([
    offlineDB.panels.count(),
    offlineDB.circuits.count(),
    offlineDB.photos.count(),
    offlineDB.field_notes.count(),
  ]);

  // Calculate total storage used by photos
  const photos = await offlineDB.photos.toArray();
  const totalPhotoSize = photos.reduce((sum, photo) => sum + photo.file_size, 0);

  return {
    panelCount,
    circuitCount,
    photoCount,
    noteCount,
    totalPhotoSizeMB: (totalPhotoSize / (1024 * 1024)).toFixed(2),
  };
}

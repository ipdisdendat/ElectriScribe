/**
 * useOfflineStorage Hook
 *
 * React hook for offline-first data storage using IndexedDB (Dexie.js).
 * Provides CRUD operations for panels, circuits, photos, and field notes.
 *
 * Usage:
 * ```tsx
 * const { panels, createPanel, getPanels, updatePanel } = useOfflineStorage(userId);
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  offlineDB,
  createPanel as dbCreatePanel,
  updatePanel as dbUpdatePanel,
  getPanel,
  getUserPanels,
  createCircuit as dbCreateCircuit,
  getPanelCircuits,
  savePhoto,
  getPanelPhotos,
  createFieldNote as dbCreateFieldNote,
  getPanelFieldNotes,
  getPendingSyncItems,
  getDatabaseStats,
  type OfflinePanel,
  type OfflineCircuit,
  type OfflinePhoto,
  type OfflineFieldNote,
} from '../services/offline-database';

export interface UseOfflineStorageOptions {
  userId: string;
}

export interface UseOfflineStorageReturn {
  // Data (live queries)
  panels: OfflinePanel[] | undefined;
  stats: {
    panelCount: number;
    circuitCount: number;
    photoCount: number;
    noteCount: number;
    totalPhotoSizeMB: string;
  } | undefined;
  pendingSyncCount: number | undefined;

  // Panel operations
  createPanel: (data: Partial<Omit<OfflinePanel, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status'>>) => Promise<OfflinePanel>;
  updatePanel: (panelId: string, updates: Partial<Omit<OfflinePanel, 'id' | 'user_id' | 'created_at'>>) => Promise<void>;
  getPanel: (panelId: string) => Promise<OfflinePanel | undefined>;
  deletePanel: (panelId: string) => Promise<void>;

  // Circuit operations
  createCircuit: (panelId: string, data: Partial<Omit<OfflineCircuit, 'id' | 'panel_id' | 'created_at' | 'updated_at'>>) => Promise<OfflineCircuit>;
  getPanelCircuits: (panelId: string) => Promise<OfflineCircuit[]>;
  updateCircuit: (circuitId: string, updates: Partial<OfflineCircuit>) => Promise<void>;
  deleteCircuit: (circuitId: string) => Promise<void>;

  // Photo operations
  savePhoto: (panelId: string, photoType: OfflinePhoto['photo_type'], blob: Blob, metadata?: { width?: number; height?: number }) => Promise<OfflinePhoto>;
  getPanelPhotos: (panelId: string) => Promise<OfflinePhoto[]>;
  deletePhoto: (photoId: string) => Promise<void>;

  // Field note operations
  createFieldNote: (data: Partial<Omit<OfflineFieldNote, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status'>>) => Promise<OfflineFieldNote>;
  getPanelFieldNotes: (panelId: string) => Promise<OfflineFieldNote[]>;
  deleteFieldNote: (noteId: string) => Promise<void>;

  // Utility
  refreshStats: () => Promise<void>;
}

export function useOfflineStorage({ userId }: UseOfflineStorageOptions): UseOfflineStorageReturn {
  const [statsState, setStatsState] = useState<UseOfflineStorageReturn['stats']>();

  // Live queries - automatically re-render when data changes
  const panels = useLiveQuery(
    () => getUserPanels(userId),
    [userId]
  );

  const pendingSyncCount = useLiveQuery(
    async () => {
      const pending = await getPendingSyncItems();
      return pending.total;
    },
    []
  );

  //===========================================================================
  // Panel Operations
  //===========================================================================

  const createPanel = useCallback(
    async (data: Partial<Omit<OfflinePanel, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status'>>) => {
      return await dbCreatePanel(userId, data);
    },
    [userId]
  );

  const updatePanel = useCallback(async (panelId: string, updates: Partial<Omit<OfflinePanel, 'id' | 'user_id' | 'created_at'>>) => {
    return await dbUpdatePanel(panelId, updates);
  }, []);

  const deletePanel = useCallback(async (panelId: string) => {
    // Delete all related data first
    const circuits = await getPanelCircuits(panelId);
    const photos = await getPanelPhotos(panelId);
    const notes = await getPanelFieldNotes(panelId);

    await Promise.all([
      ...circuits.map((c) => offlineDB.circuits.delete(c.id)),
      ...photos.map((p) => offlineDB.photos.delete(p.id)),
      ...notes.map((n) => offlineDB.field_notes.delete(n.id)),
    ]);

    // Delete panel
    await offlineDB.panels.delete(panelId);
  }, []);

  //===========================================================================
  // Circuit Operations
  //===========================================================================

  const createCircuit = useCallback(
    async (panelId: string, data: Partial<Omit<OfflineCircuit, 'id' | 'panel_id' | 'created_at' | 'updated_at'>>) => {
      return await dbCreateCircuit(panelId, data);
    },
    []
  );

  const updateCircuit = useCallback(async (circuitId: string, updates: Partial<OfflineCircuit>) => {
    await offlineDB.circuits.update(circuitId, {
      ...updates,
      updated_at: Date.now(),
    });
  }, []);

  const deleteCircuit = useCallback(async (circuitId: string) => {
    await offlineDB.circuits.delete(circuitId);
  }, []);

  //===========================================================================
  // Photo Operations
  //===========================================================================

  const savePanelPhoto = useCallback(
    async (panelId: string, photoType: OfflinePhoto['photo_type'], blob: Blob, metadata?: { width?: number; height?: number }) => {
      return await savePhoto(panelId, photoType, blob, metadata);
    },
    []
  );

  const deletePhoto = useCallback(async (photoId: string) => {
    await offlineDB.photos.delete(photoId);
  }, []);

  //===========================================================================
  // Field Note Operations
  //===========================================================================

  const createFieldNote = useCallback(
    async (data: Partial<Omit<OfflineFieldNote, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status'>>) => {
      return await dbCreateFieldNote(userId, data);
    },
    [userId]
  );

  const deleteFieldNote = useCallback(async (noteId: string) => {
    await offlineDB.field_notes.delete(noteId);
  }, []);

  //===========================================================================
  // Statistics
  //===========================================================================

  const refreshStats = useCallback(async () => {
    const stats = await getDatabaseStats();
    setStatsState(stats);
  }, []);

  // Load stats on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    // Data
    panels,
    stats: statsState,
    pendingSyncCount,

    // Panel operations
    createPanel,
    updatePanel,
    getPanel,
    deletePanel,

    // Circuit operations
    createCircuit,
    getPanelCircuits,
    updateCircuit,
    deleteCircuit,

    // Photo operations
    savePhoto: savePanelPhoto,
    getPanelPhotos,
    deletePhoto,

    // Field note operations
    createFieldNote,
    getPanelFieldNotes,
    deleteFieldNote,

    // Utility
    refreshStats,
  };
}

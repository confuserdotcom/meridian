import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_UNDO = 20;

export const useCalendar = create(
  persist(
    (set, get) => ({
      customBlocks: {},
      deletedBlocks: {},
      undoStack: [],

      // ——— Undo system ———

      _pushUndo: () => {
        const { customBlocks, deletedBlocks, undoStack } = get();
        const snapshot = {
          customBlocks: JSON.parse(JSON.stringify(customBlocks)),
          deletedBlocks: JSON.parse(JSON.stringify(deletedBlocks)),
        };
        set({ undoStack: [...undoStack.slice(-(MAX_UNDO - 1)), snapshot] });
      },

      undo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return false;
        const prev = undoStack[undoStack.length - 1];
        set({
          customBlocks: prev.customBlocks,
          deletedBlocks: prev.deletedBlocks,
          undoStack: undoStack.slice(0, -1),
        });
        return true;
      },

      canUndo: () => get().undoStack.length > 0,

      // ——— Reset day to original base schedule ———

      resetDay: (phase, day) => {
        get()._pushUndo();
        set((s) => {
          const blockKey = `${phase}-${day}`;
          const newCustom = { ...s.customBlocks };
          delete newCustom[blockKey];

          const newDeleted = { ...s.deletedBlocks };
          Object.keys(newDeleted).forEach((k) => {
            if (k.startsWith(`${phase}-${day}-`)) delete newDeleted[k];
          });

          return { customBlocks: newCustom, deletedBlocks: newDeleted };
        });
      },

      // ——— AI-generated blocks ———

      addAiBlocks: (phase, day, blocks) => {
        get()._pushUndo();
        set((s) => {
          const key = `${phase}-${day}`;
          // Remove previous AI blocks before adding new ones
          const existing = (s.customBlocks[key] || []).filter((b) => !b.ai);
          const aiBlocks = blocks.map((b, i) => ({
            ...b,
            id: `ai-${Date.now()}-${i}`,
            custom: true,
            ai: true,
          }));
          return {
            customBlocks: {
              ...s.customBlocks,
              [key]: [...existing, ...aiBlocks],
            },
          };
        });
      },

      // ——— Standard block operations (all push undo) ———

      addBlock: (phase, day, block) => {
        get()._pushUndo();
        set((s) => {
          const key = `${phase}-${day}`;
          const existing = s.customBlocks[key] || [];
          return {
            customBlocks: {
              ...s.customBlocks,
              [key]: [...existing, { ...block, id: Date.now().toString(), custom: true }],
            },
          };
        });
      },

      updateBlock: (phase, day, blockId, updates) => {
        get()._pushUndo();
        set((s) => {
          const key = `${phase}-${day}`;
          const existing = s.customBlocks[key] || [];
          return {
            customBlocks: {
              ...s.customBlocks,
              [key]: existing.map((b) => (b.id === blockId ? { ...b, ...updates } : b)),
            },
          };
        });
      },

      removeCustomBlock: (phase, day, blockId) => {
        get()._pushUndo();
        set((s) => {
          const key = `${phase}-${day}`;
          const existing = s.customBlocks[key] || [];
          return {
            customBlocks: {
              ...s.customBlocks,
              [key]: existing.filter((b) => b.id !== blockId),
            },
          };
        });
      },

      convertBaseToCustom: (phase, day, baseIndex, baseBlock, updates) => {
        get()._pushUndo();
        set((s) => {
          const hideKey = `${phase}-${day}-${baseIndex}`;
          const blockKey = `${phase}-${day}`;
          const existing = s.customBlocks[blockKey] || [];
          const newBlock = {
            category: baseBlock.category,
            note: baseBlock.note || '',
            ...updates,
            id: Date.now().toString(),
            custom: true,
            convertedFrom: baseIndex,
          };
          return {
            deletedBlocks: { ...s.deletedBlocks, [hideKey]: true },
            customBlocks: {
              ...s.customBlocks,
              [blockKey]: [...existing, newBlock],
            },
          };
        });
      },

      hideBaseBlock: (phase, day, index) => {
        get()._pushUndo();
        set((s) => {
          const key = `${phase}-${day}-${index}`;
          return { deletedBlocks: { ...s.deletedBlocks, [key]: true } };
        });
      },

      restoreBaseBlock: (phase, day, index) => {
        get()._pushUndo();
        set((s) => {
          const key = `${phase}-${day}-${index}`;
          const copy = { ...s.deletedBlocks };
          delete copy[key];
          return { deletedBlocks: copy };
        });
      },

      // ——— Read helpers (no undo needed) ———

      isBaseBlockHidden: (phase, day, index) => {
        const key = `${phase}-${day}-${index}`;
        return !!get().deletedBlocks[key];
      },

      getCustomBlocks: (phase, day) => {
        const key = `${phase}-${day}`;
        return get().customBlocks[key] || [];
      },

      getMergedBlocks: (phase, day, baseBlocks) => {
        const { getCustomBlocks, isBaseBlockHidden } = get();
        const custom = getCustomBlocks(phase, day);
        const visible = baseBlocks.filter((_, i) => !isBaseBlockHidden(phase, day, i));
        const all = [...visible, ...custom];
        return all.sort((a, b) => {
          const ta = a.start.split(':').reduce((h, m) => parseInt(h) * 60 + parseInt(m));
          const tb = b.start.split(':').reduce((h, m) => parseInt(h) * 60 + parseInt(m));
          return ta - tb;
        });
      },
    }),
    {
      name: 'lcc-calendar',
      partialize: (state) => ({
        customBlocks: state.customBlocks,
        deletedBlocks: state.deletedBlocks,
        // undoStack is intentionally excluded — lives only in memory
      }),
    }
  )
);

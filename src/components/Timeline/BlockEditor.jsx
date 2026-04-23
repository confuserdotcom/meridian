import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';
import { categories } from '../../data/categories';
import { sounds } from '../../utils/sounds';

const categoryKeys = Object.keys(categories);

// Normalize time to HH:MM for <input type="time"> (e.g. "6:45" -> "06:45")
function normalizeTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function BlockEditor({ block, onSave, onDelete, onClose, isCustom }) {
  const [form, setForm] = useState({
    start: normalizeTime(block?.start) || '09:00',
    end: normalizeTime(block?.end) || '10:00',
    category: block?.category || 'study',
    note: block?.note || '',
  });

  const handleSave = () => {
    const normalized = {
      ...form,
      start: normalizeTime(form.start),
      end: normalizeTime(form.end),
    };
    if (normalized.start >= normalized.end) return;
    onSave(normalized);
    sounds.create();
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    sounds.remove();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-4 shadow-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold">{block ? 'Edit Block' : 'Add Block'}</h4>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[9px] uppercase tracking-wider text-stone-400 mb-0.5 block">Start</label>
          <input
            type="time"
            value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
            className="w-full bg-stone-50 dark:bg-stone-800 rounded-lg px-2 py-1.5 text-xs font-mono outline-none border border-stone-200 dark:border-stone-700"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-stone-400 mb-0.5 block">End</label>
          <input
            type="time"
            value={form.end}
            onChange={(e) => setForm({ ...form, end: e.target.value })}
            className="w-full bg-stone-50 dark:bg-stone-800 rounded-lg px-2 py-1.5 text-xs font-mono outline-none border border-stone-200 dark:border-stone-700"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[9px] uppercase tracking-wider text-stone-400 mb-1 block">Category</label>
        <div className="grid grid-cols-4 gap-1">
          {categoryKeys.map((key) => {
            const cat = categories[key];
            const isSelected = form.category === key;
            return (
              <button
                key={key}
                onClick={() => setForm({ ...form, category: key })}
                className={`px-1.5 py-1 text-[9px] rounded-md border transition-all truncate ${
                  isSelected
                    ? 'border-current font-semibold scale-105'
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300'
                }`}
                style={isSelected ? { color: cat.color, backgroundColor: cat.bg, borderColor: cat.color } : {}}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3">
        <label className="text-[9px] uppercase tracking-wider text-stone-400 mb-0.5 block">Note</label>
        <input
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="What are you doing?"
          className="w-full bg-stone-50 dark:bg-stone-800 rounded-lg px-2 py-1.5 text-xs outline-none border border-stone-200 dark:border-stone-700"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg hover:opacity-90"
        >
          <Save size={10} />
          Save
        </button>
        {(block && isCustom) && (
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

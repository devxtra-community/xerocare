import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface BulletDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function BulletDescriptionInput({
  value,
  onChange,
  placeholder = 'Add a feature or detail...',
  label = 'Product Description (Bullet Points)',
}: BulletDescriptionInputProps) {
  const [bullets, setBullets] = useState<string[]>(['']);

  // Sync from props
  useEffect(() => {
    if (value) {
      const lines = value.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        setBullets(lines);
      }
    }
  }, [value === '']); // Only re-sync if the value was cleared externally

  const handleUpdate = (updated: string[]) => {
    setBullets(updated);
    onChange(updated.filter((b) => b.trim().length > 0).join('\n'));
  };

  const addBullet = () => {
    handleUpdate([...bullets, '']);
  };

  const removeBullet = (index: number) => {
    const updated = bullets.filter((_, i) => i !== index);
    handleUpdate(updated.length > 0 ? updated : ['']);
  };

  const updateBullet = (index: number, text: string) => {
    const updated = [...bullets];
    updated[index] = text;
    handleUpdate(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm font-bold text-gray-700 uppercase tracking-tight pl-1">
          {label}
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addBullet}
          className="h-8 px-2 text-[11px] font-bold border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all gap-1"
        >
          <Plus size={14} /> Add Point
        </Button>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
        {bullets.map((bullet, index) => (
          <div key={index} className="flex gap-2 group items-start">
            <div className="pt-3 text-gray-300 group-hover:text-gray-400 transition-colors">
              <GripVertical size={14} />
            </div>
            <div className="flex-1 relative">
              <Input
                value={bullet}
                onChange={(e) => updateBullet(index, e.target.value)}
                placeholder={placeholder}
                className="h-10 rounded-lg border-gray-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400 pr-10"
              />
              {bullets.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBullet(index)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {bullets.length === 0 && (
        <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            No bullet points added
          </p>
        </div>
      )}
    </div>
  );
}

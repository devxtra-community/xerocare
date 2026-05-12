import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Wrench,
  Key,
  FileSignature,
  ArrowLeft,
  CheckCircle2,
  Eye,
} from 'lucide-react';

export interface LayoutSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLayout: (layoutType: string, layoutStyle: string) => void;
  selectedType?: string | null;
  selectedStyle?: string | null;
}

const CATEGORIES = [
  {
    id: 'product',
    label: 'Product Layout',
    description: 'Direct sales of machines and devices',
    icon: ShoppingCart,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBorder: 'hover:border-blue-500',
  },
  {
    id: 'sparepart',
    label: 'Sparepart Layout',
    description: 'Parts, consumables and accessories',
    icon: Wrench,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    hoverBorder: 'hover:border-orange-500',
  },
  {
    id: 'rental',
    label: 'Rental Layout',
    description: 'Short-term machine rentals',
    icon: Key,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    hoverBorder: 'hover:border-green-500',
  },
  {
    id: 'lease',
    label: 'Lease Layout',
    description: 'Long-term leasing and FSM contracts',
    icon: FileSignature,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    hoverBorder: 'hover:border-purple-500',
  },
];

const STYLES = [
  {
    id: 'normal',
    label: 'Normal',
    description: 'Clean, no-border table style',
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Teal/Gold wave header and footer',
  },
  {
    id: 'premium',
    label: 'Premium',
    description: 'High-end elegant presentation',
  },
];

export function LayoutSelectionDialog({
  open,
  onOpenChange,
  onSelectLayout,
  selectedType,
  selectedStyle,
}: LayoutSelectionDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [activeType, setActiveType] = useState<string | null>(selectedType || null);

  // Reset to step 1 when dialog opens
  React.useEffect(() => {
    if (open) {
      if (selectedType) {
        setActiveType(selectedType);
        setStep(2);
      } else {
        setStep(1);
        setActiveType(null);
      }
    }
  }, [open, selectedType]);

  const handleSelectType = (typeId: string) => {
    setActiveType(typeId);
    setStep(2);
  };

  const handleSelectStyle = (styleId: string) => {
    if (activeType) {
      onSelectLayout(activeType, styleId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {step === 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="space-y-1 mt-2">
              <DialogTitle className="text-xl">
                {step === 1 ? 'Select Layout Category' : 'Choose Layout Style'}
              </DialogTitle>
              <p className="text-sm text-slate-500">
                {step === 1
                  ? 'Choose the category of quotation layout you want to use.'
                  : 'Select a visual style for the generated document.'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {step === 1 ? (
            <div className="grid grid-cols-2 gap-4">
              {CATEGORIES.map((category) => {
                const isSelected = activeType === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleSelectType(category.id)}
                    className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? `border-${category.color.split('-')[1]}-500 ${category.bgColor} ring-4 ring-${category.color.split('-')[1]}-500/10`
                        : `border-slate-100 bg-white hover:border-slate-300 ${category.hoverBorder}`
                    }`}
                  >
                    <div
                      className={`h-12 w-12 rounded-full ${category.bgColor} flex items-center justify-center mb-4 ${category.color}`}
                    >
                      <category.icon className="h-6 w-6" />
                    </div>
                    <div className="font-bold text-lg text-slate-900 mb-1">{category.label}</div>
                    <div className="text-sm text-slate-500">{category.description}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {STYLES.map((style) => {
                const isSelected = selectedStyle === style.id && activeType === selectedType;
                return (
                  <button
                    key={style.id}
                    onClick={() => handleSelectStyle(style.id)}
                    className={`group flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all relative overflow-hidden ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 text-blue-600">
                        <CheckCircle2 className="h-5 w-5 fill-blue-100" />
                      </div>
                    )}

                    {/* Visual Preview Placeholder */}
                    <div className="relative w-24 h-32 rounded mb-4">
                      <div className="w-full h-full bg-white rounded shadow-sm border border-slate-200 p-2 flex flex-col gap-1">
                        {style.id === 'standard' && (
                          <>
                            <div className="w-full h-4 bg-teal-800 rounded-t-sm" />
                            <div className="w-1/2 h-1 bg-slate-200 mt-2 rounded-full" />
                            <div className="w-3/4 h-1 bg-slate-200 rounded-full" />
                            <div className="w-full h-10 bg-slate-50 mt-auto border border-slate-100 rounded-sm" />
                            <div className="w-full h-3 bg-gradient-to-r from-amber-400 to-teal-800 rounded-b-sm mt-auto" />
                          </>
                        )}
                        {style.id === 'normal' && (
                          <>
                            <div className="flex justify-between items-start pt-1">
                              <div className="w-1/3 h-2 bg-slate-800 rounded-full" />
                              <div className="w-4 h-4 bg-teal-800 rounded-full" />
                            </div>
                            <div className="w-full h-12 bg-slate-50 mt-2" />
                            <div className="w-1/3 h-1 bg-slate-200 ml-auto mt-2 rounded-full" />
                            <div className="w-1/4 h-1 bg-slate-800 ml-auto mt-1 rounded-full" />
                          </>
                        )}
                        {style.id === 'premium' && (
                          <>
                            <div className="w-full h-full bg-slate-900 rounded-sm flex flex-col p-2">
                              <div className="w-5 h-5 bg-amber-500 rounded-full mx-auto" />
                              <div className="w-3/4 h-1 bg-slate-700 mt-2 mx-auto rounded-full" />
                              <div className="w-full h-6 bg-slate-800 mt-auto border border-slate-700" />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Hover Overlay with Eye Icon */}
                      <div
                        className="absolute inset-0 bg-slate-900/40 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `/preview/${style.id}-quotation?category=${activeType}`,
                            '_blank',
                          );
                        }}
                      >
                        <Eye className="h-6 w-6 text-white drop-shadow-md" />
                      </div>
                    </div>

                    <div className="font-bold text-slate-900 mb-1">{style.label}</div>
                    <div className="text-xs text-slate-500 px-2 leading-relaxed">
                      {style.description}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

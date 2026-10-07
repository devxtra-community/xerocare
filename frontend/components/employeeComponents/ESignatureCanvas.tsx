'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { RotateCcw, Check } from 'lucide-react';

interface ESignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  label?: string;
  width?: number;
  height?: number;
  existingSignature?: string; // base64 data URL to display existing signature
  readOnly?: boolean;
}

export function ESignatureCanvas({
  onSave,
  onClear,
  label = 'Sign here',
  width = 400,
  height = 160,
  existingSignature,
  readOnly = false,
}: ESignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!existingSignature);
  // Feedback after "Save Signature": the button flips to "Saved ✓" for two seconds so
  // the person handing over the device can see the signature was actually captured —
  // without it the click looks like it did nothing.
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const getPos = (
    e: MouseEvent | TouchEvent,
    canvas: HTMLCanvasElement,
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'var(--card)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'var(--foreground)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (existingSignature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = existingSignature;
    }
  }, [existingSignature]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const startDraw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (readOnly) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Once somebody draws over a signature that was already saved, that saved copy no
      // longer matches the canvas — drop it so nothing can be submitted as "saved" while
      // the pad shows something different. The save button returns to "Save Signature".
      if (saved) {
        setSaved(false);
        onClear?.();
      }
      setIsDrawing(true);
      setIsEmpty(false);
      lastPos.current = getPos(e, canvas);
    },
    [readOnly, onClear, saved],
  );

  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || readOnly) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx || !lastPos.current) return;

      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    },
    [isDrawing, readOnly],
  );

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('mouseleave', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [startDraw, draw, stopDraw]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'var(--card)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setSaved(false);
    onClear?.();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty || saved) return;

    // Read the drawing straight off the canvas and hand it to the parent, which keeps it
    // in state — this is the only place the pixels leave the <canvas>.
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);

    // Confirm it landed: "Saved ✓" for two seconds, then back to the normal label.
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
      )}
      <div
        className={`border-2 rounded-xl overflow-hidden ${
          readOnly
            ? 'border-border bg-muted'
            : 'border-dashed border-border bg-card cursor-crosshair'
        }`}
        style={{ width: '100%', aspectRatio: `${width}/${height}` }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full h-full block"
          style={{ touchAction: 'none' }}
        />
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-8 px-3"
          >
            <RotateCcw size={12} className="mr-1" />
            Clear
          </Button>
          <LoadingButton
            type="button"
            onClick={handleSave}
            loading={saved}
            loadingText="Saved ✓"
            disabled={isEmpty}
            className="text-[10px] font-black uppercase tracking-widest bg-success hover:bg-success/90 text-success-foreground h-8 px-4 rounded-lg disabled:opacity-40"
          >
            <Check size={12} className="mr-1" />
            Save Signature
          </LoadingButton>
        </div>
      )}
    </div>
  );
}

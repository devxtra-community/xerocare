'use client';

import * as React from 'react';
import { Modal } from './Modal';
import { Button } from './button';
import { MapPin, Wrench, Play, Loader2, ArrowLeft } from 'lucide-react';

export interface ArrivalDiagnosisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ticket number shown for context, e.g. ST-202608-000 */
  ticketNo?: string;
  /** Customer site location/city recorded on the ticket, shown so the technician can verify it. */
  location?: string | null;
  /** Fired only after the technician confirms arrival AND presses Start Diagnosis. */
  onStart: () => void | Promise<void>;
  isLoading?: boolean;
}

/**
 * Two-step guard before the diagnosis timer starts.
 *
 * Step 1 asks the technician to confirm they physically arrived at the customer
 * site. The "Start Diagnosis" button only renders after that confirmation, so an
 * accidental tap on the row action cannot start the timer.
 */
export function ArrivalDiagnosisDialog({
  isOpen,
  onClose,
  ticketNo,
  location,
  onStart,
  isLoading = false,
}: ArrivalDiagnosisDialogProps) {
  const [step, setStep] = React.useState<'arrival' | 'ready'>('arrival');

  // Always reopen at step 1 so a stale "ready" state can't leak between tickets.
  React.useEffect(() => {
    if (isOpen) setStep('arrival');
  }, [isOpen]);

  const handleStart = async () => {
    try {
      await onStart();
    } catch (error) {
      console.error('Error while starting diagnosis:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      showCloseButton={!isLoading}
      closeOnOutsideClick={!isLoading}
    >
      <div className="flex flex-col items-center text-center p-2">
        {step === 'arrival' ? (
          <>
            <div className="p-3 rounded-full mb-4 bg-primary/10">
              <MapPin className="size-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Arrived at the location?</h3>
            <div
              className={`text-sm text-muted-foreground leading-relaxed ${location ? 'mb-3' : 'mb-6'}`}
            >
              Confirm you are at the customer site
              {ticketNo ? (
                <>
                  {' '}
                  for ticket <span className="font-semibold text-foreground">{ticketNo}</span>
                </>
              ) : null}{' '}
              before starting the diagnosis timer.
            </div>
            {location && (
              <div className="w-full flex items-center justify-center gap-1.5 mb-6 px-3 py-2 rounded-lg bg-primary/10 text-sm text-primary">
                <MapPin className="size-4 shrink-0" />
                <span className="font-semibold break-words">{location}</span>
              </div>
            )}
            <div className="flex w-full items-center justify-end gap-3 mt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="text-muted-foreground border-border hover:bg-muted hover:text-foreground min-w-[90px] h-9"
              >
                Not yet
              </Button>
              <Button
                onClick={() => setStep('ready')}
                className="min-w-[130px] h-9 bg-primary hover:bg-[var(--chart-indigo)] text-primary-foreground"
              >
                Yes, I&apos;ve arrived
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-full mb-4 bg-success/10">
              <Wrench className="size-6 text-success" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Start diagnosis now?</h3>
            <div className="text-sm text-muted-foreground mb-6 leading-relaxed">
              The diagnosis timer starts immediately. Only start when you are ready to work on the
              machine.
            </div>
            <div className="flex w-full items-center justify-between gap-3 mt-2">
              <Button
                variant="ghost"
                onClick={() => setStep('arrival')}
                disabled={isLoading}
                className="text-muted-foreground hover:bg-muted hover:text-foreground h-9 gap-1.5"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                variant="success"
                onClick={handleStart}
                disabled={isLoading}
                className="min-w-[150px] h-9 bg-success hover:bg-[var(--success-foreground)] text-success-foreground gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current" />
                    Start Diagnosis
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

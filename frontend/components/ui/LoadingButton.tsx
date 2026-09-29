import { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

// This is a button that automatically disables itself
// and shows a spinner when it is loading
interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean; // true = show spinner, disable button
  loadingText?: string; // text to show while loading
}

export function LoadingButton({
  loading,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading} // disable if loading OR already disabled
      className={`${className ?? ''} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText ?? 'Please wait...'}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

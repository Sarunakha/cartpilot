import { CircleAlert, RefreshCw, X } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, onRetry, onDismiss }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <p className="min-w-0 flex-1 break-words">{message}</p>
      <div className="flex shrink-0 items-center gap-1">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-red-900 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            className="rounded-md p-1 text-red-900 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

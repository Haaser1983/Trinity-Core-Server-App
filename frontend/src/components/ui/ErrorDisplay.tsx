import { AlertTriangle } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertTriangle size={32} className="text-red-400 mb-3" />
      <p className="text-red-300 text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm border border-wow-border text-gray-300 rounded hover:bg-wow-bg-light transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

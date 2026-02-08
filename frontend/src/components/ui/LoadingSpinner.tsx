import clsx from 'clsx';

interface LoadingSpinnerProps {
  className?: string;
  message?: string;
}

export default function LoadingSpinner({ className, message }: LoadingSpinnerProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12', className)}>
      <div className="w-8 h-8 border-2 border-wow-border border-t-wow-gold rounded-full animate-spin" />
      {message && <p className="mt-3 text-gray-500 text-sm">{message}</p>}
    </div>
  );
}

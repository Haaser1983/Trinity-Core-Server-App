import clsx from 'clsx';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, children, className }: CardProps) {
  return (
    <div className={clsx('bg-wow-bg-medium border border-wow-border rounded-lg', className)}>
      {title && (
        <div className="px-4 py-3 border-b border-wow-border">
          <h3 className="text-wow-gold font-semibold text-sm">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

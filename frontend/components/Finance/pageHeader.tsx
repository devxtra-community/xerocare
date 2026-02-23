type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

/**
 * Reusable header component for finance pages.
 * Displays title, description, and optional action buttons.
 */
export default function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex items-center justify-between p-2 mb-6">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

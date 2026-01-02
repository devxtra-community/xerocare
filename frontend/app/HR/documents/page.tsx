import { Button } from "@/components/ui/button";

export default function DocumentsPage() {
  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6">
      <h1 className="text-xl font-semibold">Documents</h1>

      <div className="flex justify-end">
        <Button>Upload Document</Button>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <p className="text-muted-foreground">
          Employee contracts, IDs, and statutory documents will be managed here.
        </p>
      </div>
    </div>
  );
}


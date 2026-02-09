import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { Vendor } from '@/components/AdminDahboardComponents/VendorComponents/VendorTable';

interface RequestProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
  onConfirm: (data: { products: string; message: string }) => Promise<void>;
}

export default function RequestProductDialog({
  open,
  onOpenChange,
  vendor,
  onConfirm,
}: RequestProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState('');
  const [message, setMessage] = useState('');

  const handleConfirm = async () => {
    if (!products.trim()) return;
    setLoading(true);
    try {
      await onConfirm({ products, message });
      setProducts('');
      setMessage('');
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
            <Send size={20} /> Request Products from {vendor?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="products">
              Product List <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="products"
              placeholder="e.g. 10x HP Toner Cartridges&#10;5x Samsung Monitors"
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Any additional instructions..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!products.trim() || loading}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

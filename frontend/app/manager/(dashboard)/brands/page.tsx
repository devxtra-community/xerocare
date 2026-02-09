import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getBrands, Brand, deleteBrand } from '@/lib/brand';
import { AddBrandDialog } from '@/components/ManagerDashboardComponents/BrandComponents/AddBrandDialog';
import { format } from 'date-fns';
import StatCard from '@/components/StatCard';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  // const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await getBrands();
      if (res.success) {
        setBrands(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch brands', error);
      toast.error('Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleDelete = async () => {
    if (!deletingBrand) return;
    try {
      await deleteBrand(deletingBrand.id);
      toast.success('Brand deleted successfully');
      fetchBrands();
    } catch (error: unknown) {
      console.error('Failed to delete brand', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete brand');
    } finally {
      setDeletingBrand(null);
    }
  };

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(search.toLowerCase()),
  );

  const activeBrands = brands.filter((b) => b.status === 'ACTIVE').length;
  const totalBrands = brands.length;

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
      <h3 className="text-xl sm:text-2xl font-bold text-primary">Brand Management</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard
          title="Total Brands"
          value={totalBrands.toString()}
          subtitle="All manufacturers"
        />
        <StatCard
          title="Active Brands"
          value={activeBrands.toString()}
          subtitle="Currently active"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search brands..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary text-white gap-2">
          <Plus size={16} /> Add Brand
        </Button>
      </div>

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {['BRAND NAME', 'STATUS', 'CREATED AT', 'DESCRIPTION', 'ACTION'].map((h) => (
                <TableHead key={h} className="text-[11px] font-semibold text-primary px-4">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <Loader2 className="animate-spin mr-2 h-6 w-6 text-primary" />
                    Loading brands...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredBrands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No brands found.
                </TableCell>
              </TableRow>
            ) : (
              filteredBrands.map((brand, i) => (
                <TableRow key={brand.id} className={i % 2 ? 'bg-sky-100/60' : ''}>
                  <TableCell className="px-4 font-medium">{brand.name}</TableCell>
                  <TableCell className="px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        brand.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {brand.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4">
                    {format(new Date(brand.created_at), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell
                    className="px-4 text-muted-foreground text-xs max-w-xs truncate"
                    title={brand.description}
                  >
                    {brand.description || '-'}
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex gap-3 text-sm">
                      {/* Edit functionality to be implemented fully if needed, currently reusing AddDialog might require updates to it */}
                      <button
                        className="text-red-600 hover:underline flex items-center gap-1"
                        onClick={() => setDeletingBrand(brand)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddBrandDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchBrands}
      />

      {deletingBrand && (
        <Dialog open={!!deletingBrand} onOpenChange={(open) => !open && setDeletingBrand(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center">
              <Trash2 className="mx-auto text-red-600 mb-2 h-10 w-10" />
              <p>
                Are you sure you want to delete <b>{deletingBrand.name}</b>?
              </p>
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingBrand(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

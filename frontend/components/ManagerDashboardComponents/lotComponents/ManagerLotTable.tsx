'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import StatCard from '@/components/StatCard';
import { Lot, lotService } from '@/lib/lot';
import { format } from 'date-fns';
import AddLotDialog from './AddLotDialog';
import LotDetailsDialog from './LotDetailsDialog';

export default function ManagerLotTable() {
    const [lots, setLots] = useState<Lot[]>([]);
    const [search, setSearch] = useState('');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [selectedLot, setSelectedLot] = useState<Lot | null>(null);

    const loadLots = async () => {
        try {
            const data = await lotService.getAllLots();
            setLots(data || []);
        } catch (error) {
            console.error('Failed to load lots:', error);
        }
    };

    useEffect(() => {
        loadLots();
    }, []);

    const filtered = lots.filter(
        (lot) =>
            lot.lotNumber?.toLowerCase().includes(search.toLowerCase()) ||
            lot.vendor?.name?.toLowerCase().includes(search.toLowerCase()),
    );

    const totalAmount = lots.reduce((sum, lot) => sum + Number(lot.totalAmount), 0);

    return (
        <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">
            <h3 className="text-xl sm:text-2xl font-bold text-primary">Lot Management</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <StatCard title="Total Lots" value={lots.length.toString()} subtitle="All orders" />
                <StatCard
                    title="Total Spending"
                    value={`$${totalAmount.toLocaleString()}`}
                    subtitle="Lifetime"
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="relative w-[260px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by Lot # or Vendor"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Button
                    className="bg-primary text-white gap-2"
                    onClick={() => setAddDialogOpen(true)}
                >
                    <Plus size={16} /> Add Lot
                </Button>
            </div>

            <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {['LOT NUMBER', 'VENDOR', 'DATE', 'ITEMS', 'TOTAL AMOUNT', 'STATUS', 'ACTION'].map(
                                (h) => (
                                    <TableHead key={h} className="text-[11px] font-semibold text-primary px-4">
                                        {h}
                                    </TableHead>
                                ),
                            )}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {filtered.length > 0 ? (
                            filtered.map((lot, i) => (
                                <TableRow key={lot.id} className={i % 2 ? 'bg-sky-100/60' : ''}>
                                    <TableCell className="px-4 font-medium">{lot.lotNumber}</TableCell>
                                    <TableCell className="px-4">{lot.vendor.name}</TableCell>
                                    <TableCell className="px-4">
                                        {format(new Date(lot.purchaseDate), 'MMM dd, yyyy')}
                                    </TableCell>
                                    <TableCell className="px-4">{lot.items.length} items</TableCell>
                                    <TableCell className="px-4 font-semibold">
                                        ${Number(lot.totalAmount).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="px-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                            {lot.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4">
                                        <button
                                            className="text-primary hover:underline text-sm"
                                            onClick={() => setSelectedLot(lot)}
                                        >
                                            View Details
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                    No lots found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {addDialogOpen && (
                <AddLotDialog
                    onClose={() => setAddDialogOpen(false)}
                    onSuccess={() => {
                        loadLots();
                        setAddDialogOpen(false);
                    }}
                />
            )}

            {selectedLot && (
                <LotDetailsDialog lot={selectedLot} onClose={() => setSelectedLot(null)} />
            )}
        </div>
    );
}

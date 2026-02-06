'use client';

import { useEffect, useState } from 'react';
import { getLeads, Lead } from '@/lib/lead';
import { LeadTable } from '@/components/employeeComponents/LeadTable';
import { LeadFormDialog } from '@/components/employeeComponents/LeadFormDialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import EmployeeLeadsStats from '@/components/employeeComponents/EmployeeLeadsStats';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      setLeads(data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedLead(null);
    setIsDialogOpen(true);
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ProtectedRoute requiredModules={['crm']}>
      <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
        <div className="flex flex-col space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-primary">Lead Management</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Manage your prospects and track their status.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={fetchLeads}
                disabled={loading}
                className="h-11 w-11 rounded-xl bg-card shadow-sm border-border hover:bg-muted/50"
              >
                <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={handleAddNew}
                className="h-11 px-6 rounded-xl bg-primary text-white font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                <span>Add New Lead</span>
              </Button>
            </div>
          </div>

          <EmployeeLeadsStats leads={leads} />

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-lg sm:text-xl font-bold text-primary">All Leads</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Total {filteredLeads.length} Leads
                </p>
              </div>
              <div className="relative w-full sm:w-[350px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 bg-card border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-xl"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-sm text-muted-foreground font-medium animate-pulse">
                  Syncing leads data...
                </p>
              </div>
            ) : (
              <LeadTable leads={filteredLeads} onRefresh={fetchLeads} onEdit={handleEdit} />
            )}
          </div>
        </div>

        <LeadFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          initialData={selectedLead}
          onSuccess={fetchLeads}
        />
      </div>
    </ProtectedRoute>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Phone, Mail, Edit, Trash2, CheckCircle, EyeOff, Eye } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LeadDialog from './LeadDialog';
import { Lead, getLeads, createLead, updateLead, deleteLead, CreateLeadData } from '@/lib/lead';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';

/**
 * Table displaying leads managed by the employee.
 * Features search, filtering by source, and lead management actions (add, edit, delete).
 */
export default function EmployeeLeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [showDeleted, setShowDeleted] = useState(false);

  const fetchLeads = React.useCallback(async () => {
    setLoading(true);
    try {
      // Pass showDeleted to API
      const data = await getLeads(showDeleted);
      setLeads(data);
    } catch (error) {
      console.error('Failed to fetch leads', error);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [showDeleted]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = Object.values(lead).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase()),
    );
    const matchesFilter = filterType === 'All' || lead.source === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleAddClick = () => {
    setCurrentLead(null);
    setDialogOpen(true);
  };

  const handleEditClick = (lead: Lead) => {
    setCurrentLead(lead);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, isDeleted: boolean) => {
    if (isDeleted) return; // Already deleted
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(id);
      toast.success('Lead deleted successfully');
      fetchLeads();
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const handleSave = async (leadData: CreateLeadData & { id?: string; status?: string }) => {
    try {
      if (leadData.id) {
        await updateLead(leadData.id, leadData);
        toast.success('Lead updated successfully');
      } else {
        await createLead(leadData);
        toast.success('Lead created successfully');
      }
      fetchLeads();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save lead');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Hot':
        return 'bg-red-100 text-red-600 hover:bg-red-200';
      case 'Warm':
        return 'bg-orange-100 text-orange-600 hover:bg-orange-200';
      case 'Cold':
        return 'bg-blue-100 text-blue-600 hover:bg-blue-50/20';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-purple-100 text-purple-600 hover:bg-purple-200';
      case 'contacted':
        return 'bg-blue-100 text-blue-600 hover:bg-blue-50/20';
      case 'qualified':
      case 'Follow-up':
        return 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200';
      case 'converted':
        return 'bg-green-100 text-green-600 hover:bg-green-200';
      case 'lost':
        return 'bg-red-100 text-red-600 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, showDeleted]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-primary">Leads Management</h2>
        <Button onClick={handleAddClick} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Lead
        </Button>
      </div>

      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Search Leads
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Filter by Source
            </label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 text-xs w-full bg-background border-gray-200">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sources</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Whatsapp">Whatsapp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Status Filter
            </label>
            <Button
              variant={showDeleted ? 'destructive' : 'outline'}
              onClick={() => setShowDeleted(!showDeleted)}
              className="h-9 text-xs w-full justify-start gap-2"
            >
              {showDeleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border p-4">
        <div className="overflow-x-auto mb-4">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-primary font-bold">NAME</TableHead>
                <TableHead className="text-primary font-bold">CONTACT</TableHead>
                <TableHead className="text-primary font-bold">SOURCE</TableHead>
                <TableHead className="text-primary font-bold">PRODUCT</TableHead>
                <TableHead className="text-primary font-bold">STATUS</TableHead>
                <TableHead className="text-primary font-bold">PRIORITY</TableHead>
                <TableHead className="text-primary font-bold text-right pr-6">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No leads found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLeads.map((lead, index) => (
                  <TableRow key={lead._id} className={index % 2 ? 'bg-blue-50/20' : 'bg-card'}>
                    <TableCell className="font-bold text-primary">
                      <div className="flex flex-col">
                        <span>{lead.name}</span>
                        {lead.isDeleted && (
                          <Badge variant="destructive" className="w-fit text-[10px] mt-1">
                            DELETED
                          </Badge>
                        )}
                        {lead.isCustomer && (
                          <Badge
                            variant="outline"
                            className="w-fit text-[10px] mt-1 border-green-500 text-green-700 bg-green-50 flex gap-1 items-center"
                          >
                            <CheckCircle size={10} /> CUSTOMER
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">{lead.email}</span>
                        <span className="text-xs text-muted-foreground">{lead.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.source}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {(lead.metadata as { product?: string })?.product || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(lead.status)} border-0`}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${getPriorityColor((lead.metadata as { priority?: string })?.priority || 'Warm')} border-0`}
                      >
                        {(lead.metadata as { priority?: string })?.priority || 'Warm'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleEditClick(lead)}
                          title="Edit Lead"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <a href={`tel:${lead.phone}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </a>
                        <a href={`mailto:${lead.email}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </a>
                        {!lead.isDeleted && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(lead._id, !!lead.isDeleted)}
                            title="Delete Lead"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </div>

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={currentLead}
        onSave={handleSave}
      />
    </div>
  );
}

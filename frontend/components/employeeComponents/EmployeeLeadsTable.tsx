'use client';

import React, { useState } from 'react';
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
import { Plus, Search, Phone, Mail, Edit } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LeadDialog, { Lead } from './LeadDialog';

const initialLeads: Lead[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    phone: '+1 555-0100',
    source: 'Website',
    product: 'Canon ImageRunner 2630',
    status: 'New',
    priority: 'Hot',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    phone: '+1 555-0123',
    source: 'Instagram',
    product: 'HP LaserJet Pro M404dn',
    status: 'Contacted',
    priority: 'Warm',
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    phone: '+1 555-0300',
    source: 'Whatsapp',
    product: 'Epson EcoTank L3250',
    status: 'Follow-up',
    priority: 'Cold',
  },
];

export default function EmployeeLeadsTable() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = Object.values(lead).some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
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

  const handleSave = (leadData: Lead) => {
    if (currentLead) {
      setLeads((prev) => prev.map((item) => (item.id === leadData.id ? leadData : item)));
    } else {
      setLeads((prev) => [...prev, { ...leadData, id: Math.random().toString() }]);
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
      case 'New':
        return 'bg-purple-100 text-purple-600 hover:bg-purple-200';
      case 'Contacted':
        return 'bg-blue-100 text-blue-600 hover:bg-blue-50/20';
      case 'Follow-up':
        return 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200';
      case 'Converted':
        return 'bg-green-100 text-green-600 hover:bg-green-200';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white border-blue-400/60 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none shadow-sm transition-all w-full"
            />
          </div>
          <div className="w-full sm:w-[150px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-10 bg-white border-blue-400/60 focus:ring-blue-100 rounded-lg w-full">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sources</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Whatsapp">Whatsapp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={handleAddClick}
          className="gap-2 bg-primary hover:bg-primary/90 w-full sm:w-auto mt-2 sm:mt-0"
        >
          <Plus className="h-4 w-4" /> Add Lead
        </Button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden border">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader>
              <TableRow className="bg-slate-50">
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
              {filteredLeads.map((lead, index) => (
                <TableRow key={lead.id} className={index % 2 ? 'bg-blue-50/20' : 'bg-white'}>
                  <TableCell className="font-bold text-primary">{lead.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500">{lead.email}</span>
                      <span className="text-xs text-slate-500">{lead.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500">{lead.source}</TableCell>
                  <TableCell className="text-gray-500">{lead.product}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(lead.status)} border-0`}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getPriorityColor(lead.priority)} border-0`}>
                      {lead.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => handleEditClick(lead)}
                        title="Edit Lead"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <a href={`tel:${lead.phone}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      </a>
                      <a href={`mailto:${lead.email}`}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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

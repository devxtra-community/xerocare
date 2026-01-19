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
import { Edit, Trash2, User, Mail, Phone, Loader2, FileText } from 'lucide-react';
import { Lead, deleteLead } from '@/lib/lead';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface LeadTableProps {
  leads: Lead[];
  onRefresh: () => void;
  onEdit: (lead: Lead) => void;
}

export function LeadTable({ leads, onRefresh, onEdit }: LeadTableProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      setIsDeleting(id);
      await deleteLead(id);
      toast.success('Lead deleted successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete lead');
      console.error(error);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
      <div className="overflow-x-auto">
        <Table className="min-w-[800px] sm:min-w-full">
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-primary font-bold">CONTACT</TableHead>
              <TableHead className="text-primary font-bold">SOURCE</TableHead>
              <TableHead className="text-primary font-bold">STATUS</TableHead>
              <TableHead className="text-primary font-bold">DATE</TableHead>
              <TableHead className="text-primary font-bold text-center">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead, index) => (
                <TableRow
                  key={lead._id}
                  className={`${index % 2 ? 'bg-blue-50/10' : 'bg-white'} hover:bg-slate-50 transition-colors`}
                >
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <span className="font-bold text-slate-900 flex items-center gap-2">
                        <User size={14} className="text-blue-500" />
                        {lead.name || 'No Name'}
                      </span>
                      {lead.email && (
                        <span className="text-xs text-slate-500 flex items-center gap-2">
                          <Mail size={12} />
                          {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="text-xs text-slate-500 flex items-center gap-2">
                          <Phone size={12} />
                          {lead.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider border-blue-100 bg-blue-50/50 text-blue-600"
                    >
                      {lead.source || 'Direct'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider shadow-none
                                            ${
                                              lead.status === 'converted'
                                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                                : lead.status === 'lost'
                                                  ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                            }`}
                    >
                      {lead.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm font-medium">
                    {new Date(lead.createdAt).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => onEdit(lead)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        disabled={isDeleting === lead._id}
                        onClick={() => handleDelete(lead._id)}
                      >
                        {isDeleting === lead._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

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
    <div className="rounded-2xl bg-card shadow-sm overflow-hidden border">
      <div className="overflow-x-auto">
        <Table className="min-w-[800px] sm:min-w-full">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-primary font-bold whitespace-nowrap">CONTACT</TableHead>
              <TableHead className="text-primary font-bold whitespace-nowrap">SOURCE</TableHead>
              <TableHead className="text-primary font-bold whitespace-nowrap">STATUS</TableHead>
              <TableHead className="text-primary font-bold whitespace-nowrap">DATE</TableHead>
              <TableHead className="text-primary font-bold whitespace-nowrap text-center">
                ACTION
              </TableHead>
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
                <TableRow key={lead._id} className={index % 2 !== 0 ? 'bg-blue-50/20' : 'bg-card'}>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <span className="font-bold text-primary flex items-center gap-2">
                        <User size={14} className="text-blue-500" />
                        {lead.name || 'No Name'}
                      </span>
                      {lead.email && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <Mail size={12} />
                          {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <Phone size={12} />
                          {lead.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-600">
                      {lead.source || 'Direct'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                                            ${
                                              lead.status === 'converted'
                                                ? 'bg-green-100 text-green-600'
                                                : lead.status === 'lost'
                                                  ? 'bg-red-100 text-red-600'
                                                  : 'bg-blue-100 text-blue-600'
                                            }`}
                    >
                      {lead.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-medium whitespace-nowrap">
                    {lead.createdAt &&
                      new Date(lead.createdAt).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-blue-50"
                        onClick={() => onEdit(lead)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
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

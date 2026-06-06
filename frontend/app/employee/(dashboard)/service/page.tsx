'use client';

import React, { useEffect, useState } from 'react';
import { getUserFromToken } from '@/lib/auth';
import { getCustomers, Customer } from '@/lib/customer';
import { getLeads, Lead } from '@/lib/lead';
import { getAllSpareParts, SparePart } from '@/lib/spare-part';
import {
  getServiceTickets,
  createServiceTicket,
  assignTechnician,
  diagnoseServiceTicket,
  submitServiceQuotation,
  approveServiceQuotation,
  rejectServiceQuotation,
  startServiceTicket,
  completeServiceTicket,
  cancelServiceTicket,
  getTechnicians,
  getCustomerServiceHistory,
  ServiceTicket,
  ServiceTechnicianInfo,
  CustomerServiceHistory,
} from '@/lib/serviceTicket';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Wrench, History, Briefcase, Search, DollarSign } from 'lucide-react';

interface AuthUser {
  userId: string;
  role: string;
  employeeJob?: string;
  branchId?: string;
}

export default function ServiceDashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [technicians, setTechnicians] = useState<ServiceTechnicianInfo[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals & States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDiagnoseModal, setShowDiagnoseModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showIntelModal, setShowIntelModal] = useState(false);

  // Form states
  const [newTicket, setNewTicket] = useState({
    customerId: '',
    leadId: '',
    productBrand: '',
    productModel: '',
    productName: '',
    serialNumber: '',
    serviceContext: 'CHARGEABLE',
    issueDescription: '',
    jobType: 'BREAKDOWN_REPAIR',
    scheduledVisitDate: '',
  });

  const [assignForm, setAssignForm] = useState({
    technicianId: '',
    scheduledVisitDate: '',
  });

  const [diagnosisForm, setDiagnosisForm] = useState<{
    notes: string;
    items: Array<{
      itemSource: 'SPARE_PART' | 'CUSTOM';
      sparePartId: string;
      customPartName: string;
      customPartBrand: string;
      customPartDescription: string;
      partName: string;
      quantity: number;
      unitPrice: number;
      isFree: boolean;
    }>;
  }>({
    notes: '',
    items: [],
  });

  const [quoteForm, setQuoteForm] = useState({
    laborCost: 0,
  });

  const [completionNotes, setCompletionNotes] = useState('');

  // Intel view states
  const [selectedIntelCustomer, setSelectedIntelCustomer] = useState<string>('');
  const [intelData, setIntelData] = useState<CustomerServiceHistory | null>(null);
  const [loadingIntel, setLoadingIntel] = useState(false);

  // General Filter/Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const currentUser = getUserFromToken() as AuthUser;
    setUser(currentUser);
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const ticketsList = await getServiceTickets();
      setTickets(ticketsList);

      // Fetch technicians, customers, leads, parts
      const [techs, custs, lds, parts] = await Promise.all([
        getTechnicians().catch(() => []),
        getCustomers().catch(() => []),
        getLeads().catch(() => []),
        getAllSpareParts().catch(() => []),
      ]);

      setTechnicians(techs);
      setCustomers(custs);
      setLeads(lds);
      setSpareParts(parts);
    } catch (error) {
      console.error('Failed to load initial service management data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await createServiceTicket({
        ...newTicket,
        customerId: newTicket.customerId || undefined,
        leadId: newTicket.leadId || undefined,
      });
      setShowCreateModal(false);
      // Reset form
      setNewTicket({
        customerId: '',
        leadId: '',
        productBrand: '',
        productModel: '',
        productName: '',
        serialNumber: '',
        serviceContext: 'CHARGEABLE',
        issueDescription: '',
        jobType: 'BREAKDOWN_REPAIR',
        scheduledVisitDate: '',
      });
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to create service ticket:', error);
      alert('Error creating ticket: Check inputs and context.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSubmitting(true);
      await assignTechnician(
        selectedTicket.id,
        assignForm.technicianId,
        assignForm.scheduledVisitDate,
      );
      setShowAssignModal(false);
      setAssignForm({ technicianId: '', scheduledVisitDate: '' });
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to assign technician:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiagnose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSubmitting(true);
      await diagnoseServiceTicket(selectedTicket.id, diagnosisForm.notes, diagnosisForm.items);
      setShowDiagnoseModal(false);
      setDiagnosisForm({ notes: '', items: [] });
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to save diagnosis:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSubmitting(true);
      await submitServiceQuotation(selectedTicket.id, quoteForm.laborCost);
      setShowQuoteModal(false);
      setQuoteForm({ laborCost: 0 });
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to submit quote:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartService = async (ticketId: string) => {
    if (!confirm('Start service job now?')) return;
    try {
      setLoading(true);
      await startServiceTicket(ticketId);
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to start ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSubmitting(true);
      await completeServiceTicket(selectedTicket.id, completionNotes);
      setShowCompleteModal(false);
      setCompletionNotes('');
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to complete ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to cancel this ticket?')) return;
    try {
      setLoading(true);
      await cancelServiceTicket(ticketId);
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to cancel ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveQuotation = async (ticketId: string) => {
    try {
      setLoading(true);
      await approveServiceQuotation(ticketId);
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectQuotation = async (ticketId: string) => {
    try {
      setLoading(true);
      await rejectServiceQuotation(ticketId);
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerIntel = async (customerId: string) => {
    if (!customerId) return;
    try {
      setLoadingIntel(true);
      const data = await getCustomerServiceHistory(customerId);
      setIntelData(data);
    } catch (error) {
      console.error('Failed to load customer intelligence history:', error);
    } finally {
      setLoadingIntel(false);
    }
  };

  const addDiagnosisItem = () => {
    setDiagnosisForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemSource: 'SPARE_PART',
          sparePartId: '',
          customPartName: '',
          customPartBrand: '',
          customPartDescription: '',
          partName: '',
          quantity: 1,
          unitPrice: 0,
          isFree: false,
        },
      ],
    }));
  };

  const updateDiagnosisItem = (index: number, key: string, value: string | number | boolean) => {
    setDiagnosisForm((prev) => {
      const updated = [...prev.items];
      if (key === 'sparePartId') {
        const part = spareParts.find((p) => p.id === value);
        if (part) {
          updated[index] = {
            ...updated[index],
            sparePartId: value as string,
            partName: part.part_name,
            unitPrice: Number(part.base_price) || 0,
          };
        }
      } else {
        updated[index] = {
          ...updated[index],
          [key]: value,
        } as unknown as (typeof updated)[0];
      }
      return { ...prev, items: updated };
    });
  };

  const removeDiagnosisItem = (index: number) => {
    setDiagnosisForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Filters
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.productName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'FREE_SERVICE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ASSIGNED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'DIAGNOSED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'WAITING_FINANCE_APPROVAL':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FINANCE_APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FINANCE_REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CUSTOMER_APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CUSTOMER_REJECTED':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'IN_PROGRESS':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isHelpDesk = user?.employeeJob === 'SERVICE_HELP_DESK';
  const isTechnician = user?.employeeJob === 'SERVICE_TECHNICIAN';
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  return (
    <div className="bg-slate-50 min-h-full p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Wrench className="text-primary h-6 w-6" /> Service Management Module
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Logged in as:{' '}
            <span className="font-bold text-slate-700">
              {user?.employeeJob || user?.role || 'Service Representative'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action buttons based on jobs */}
          {isHelpDesk && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl shadow-sm gap-2"
            >
              <Plus size={16} /> Create Service Ticket
            </Button>
          )}

          <Button
            onClick={() => {
              setShowIntelModal(true);
              setIntelData(null);
              setSelectedIntelCustomer('');
            }}
            variant="outline"
            className="border-slate-200 hover:bg-slate-100 rounded-xl shadow-none font-bold gap-2 text-slate-700"
          >
            <History size={16} /> Customer Intel History
          </Button>

          <Button
            onClick={fetchInitialData}
            variant="ghost"
            className="rounded-xl text-xs text-slate-500 font-bold"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Main List */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">Service Tickets</CardTitle>
            <CardDescription className="text-xs">
              Manage active customer breakdown, lease maintenance, and installation requests.
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search ticket #, serial, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs border border-slate-200 bg-slate-50 rounded-xl px-3 outline-none focus:border-primary text-slate-600 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="FREE_SERVICE">Free Service</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="DIAGNOSED">Diagnosed</option>
              <option value="WAITING_FINANCE_APPROVAL">Waiting Finance Approval</option>
              <option value="FINANCE_APPROVED">Finance Approved</option>
              <option value="FINANCE_REJECTED">Finance Rejected</option>
              <option value="CUSTOMER_APPROVED">Customer Approved</option>
              <option value="CUSTOMER_REJECTED">Customer Rejected</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <span className="text-xs text-slate-400 mt-2 block font-medium">
                Loading service tickets...
              </span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-xs">
              No service tickets found matching your selection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-slate-600">Ticket No</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">
                      Product / Serial
                    </TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">Context</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">Job Type</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">Visit Date</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600">Status</TableHead>
                    <TableHead className="font-bold text-xs text-slate-600 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-blue-600">
                        {ticket.ticketNumber}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-bold text-slate-700">
                          {ticket.productName || ticket.productModel || 'Device'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SN: {ticket.serialNumber || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-semibold">
                        {ticket.serviceContext}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {ticket.jobType}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-medium">
                        {ticket.scheduledVisitDate
                          ? new Date(ticket.scheduledVisitDate).toLocaleDateString()
                          : 'Unscheduled'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 shadow-none border ${getStatusColor(ticket.status)}`}
                        >
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right p-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* HELP DESK ACTIONS */}
                          {isHelpDesk && ticket.status === 'OPEN' && (
                            <Button
                              size="sm"
                              className="bg-primary text-white text-[11px] h-7 px-2.5 rounded-lg font-bold shadow-none"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setShowAssignModal(true);
                              }}
                            >
                              Assign Technician
                            </Button>
                          )}

                          {isHelpDesk && ticket.status === 'FINANCE_APPROVED' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 rounded-lg font-bold"
                                onClick={() => handleApproveQuotation(ticket.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-[11px] h-7 px-2.5 rounded-lg font-bold"
                                onClick={() => handleRejectQuotation(ticket.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {/* TECHNICIAN ACTIONS */}
                          {isTechnician && ticket.status === 'ASSIGNED' && (
                            <Button
                              size="sm"
                              className="bg-primary text-white text-[11px] h-7 px-2.5 rounded-lg font-bold"
                              onClick={() => handleStartService(ticket.id)}
                            >
                              Start Work
                            </Button>
                          )}

                          {isTechnician && ticket.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] h-7 px-2.5 rounded-lg font-bold"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setDiagnosisForm({ notes: '', items: [] });
                                setShowDiagnoseModal(true);
                              }}
                            >
                              Diagnose
                            </Button>
                          )}

                          {isTechnician &&
                            (ticket.status === 'DIAGNOSED' ||
                              ticket.status === 'FINANCE_REJECTED') && (
                              <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] h-7 px-2.5 rounded-lg font-bold"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setQuoteForm({ laborCost: 0 });
                                  setShowQuoteModal(true);
                                }}
                              >
                                Submit Quote
                              </Button>
                            )}

                          {isTechnician &&
                            (ticket.status === 'CUSTOMER_APPROVED' ||
                              ticket.status === 'FREE_SERVICE') && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white text-[11px] h-7 px-2.5 rounded-lg font-bold"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setCompletionNotes('');
                                  setShowCompleteModal(true);
                                }}
                              >
                                Complete Job
                              </Button>
                            )}

                          {/* MANAGER/ADMIN ACTIONS */}
                          {isManagerOrAdmin &&
                            ticket.status !== 'COMPLETED' &&
                            ticket.status !== 'CANCELLED' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-[11px] h-7 px-2.5 rounded-lg font-bold shadow-none"
                                onClick={() => handleCancelTicket(ticket.id)}
                              >
                                Cancel
                              </Button>
                            )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[11px] text-slate-500 h-7 px-2 rounded-lg font-bold"
                            onClick={() => {
                              alert(
                                `Ticket details:\n\nNumber: ${ticket.ticketNumber}\nContext: ${ticket.serviceContext}\nIssue: ${ticket.issueDescription}\nDiagnosis: ${ticket.diagnosisNotes || 'N/A'}\nCompletion Notes: ${ticket.completionNotes || 'N/A'}`,
                              );
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-xl bg-white border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="text-primary" size={18} /> Create Service Ticket
              </CardTitle>
              <CardDescription className="text-xs">
                Create a new ticket and associate it with a client or lead context.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateTicket}>
              <CardContent className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Customer (Existing)
                    </label>
                    <select
                      value={newTicket.customerId}
                      onChange={(e) =>
                        setNewTicket({ ...newTicket, customerId: e.target.value, leadId: '' })
                      }
                      className="w-full h-9 text-xs border border-slate-200 rounded-xl px-3 outline-none focus:border-primary bg-slate-50 text-slate-700 font-medium"
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Lead (New Target)
                    </label>
                    <select
                      value={newTicket.leadId}
                      onChange={(e) =>
                        setNewTicket({ ...newTicket, leadId: e.target.value, customerId: '' })
                      }
                      className="w-full h-9 text-xs border border-slate-200 rounded-xl px-3 outline-none focus:border-primary bg-slate-50 text-slate-700 font-medium"
                    >
                      <option value="">-- Select Lead --</option>
                      {leads.map((l) => (
                        <option key={l._id} value={l._id}>
                          {l.name} ({l.location || 'No Location'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Product Brand
                    </label>
                    <Input
                      placeholder="e.g. Xerox"
                      value={newTicket.productBrand}
                      onChange={(e) => setNewTicket({ ...newTicket, productBrand: e.target.value })}
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Product Model
                    </label>
                    <Input
                      placeholder="e.g. VersaLink C405"
                      value={newTicket.productModel}
                      onChange={(e) => setNewTicket({ ...newTicket, productModel: e.target.value })}
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Serial Number
                    </label>
                    <Input
                      placeholder="e.g. XL-12345"
                      value={newTicket.serialNumber}
                      onChange={(e) => setNewTicket({ ...newTicket, serialNumber: e.target.value })}
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Service Context
                    </label>
                    <select
                      value={newTicket.serviceContext}
                      onChange={(e) =>
                        setNewTicket({ ...newTicket, serviceContext: e.target.value })
                      }
                      className="w-full h-9 text-xs border border-slate-200 rounded-xl px-3 outline-none focus:border-primary bg-slate-50 text-slate-700 font-medium"
                    >
                      <option value="CHARGEABLE">Chargeable</option>
                      <option value="RENT">Rent Contract (Free)</option>
                      <option value="LEASE_UNDER_WARRANTY">Lease Contract (Warranty Check)</option>
                      <option value="LEASE_EXPIRED">Lease Contract (Expired / CPC charge)</option>
                      <option value="FSMA">FSMA contract (Free)</option>
                      <option value="SMA">SMA contract (Free)</option>
                      <option value="AMC">AMC contract (Free)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Job Type
                    </label>
                    <select
                      value={newTicket.jobType}
                      onChange={(e) => setNewTicket({ ...newTicket, jobType: e.target.value })}
                      className="w-full h-9 text-xs border border-slate-200 rounded-xl px-3 outline-none focus:border-primary bg-slate-50 text-slate-700 font-medium"
                    >
                      <option value="BREAKDOWN_REPAIR">Breakdown Repair</option>
                      <option value="INSTALLATION">Installation</option>
                      <option value="DEMO">Demo</option>
                      <option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance</option>
                      <option value="METER_READING">Meter Reading</option>
                      <option value="UPGRADE">Upgrade</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Scheduled Visit Date
                    </label>
                    <Input
                      type="date"
                      value={newTicket.scheduledVisitDate}
                      onChange={(e) =>
                        setNewTicket({ ...newTicket, scheduledVisitDate: e.target.value })
                      }
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Product Name
                    </label>
                    <Input
                      placeholder="e.g. Xerox Printer C405"
                      value={newTicket.productName}
                      onChange={(e) => setNewTicket({ ...newTicket, productName: e.target.value })}
                      className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Issue Description
                  </label>
                  <Textarea
                    placeholder="Describe the problem, error codes, and customer requirements..."
                    value={newTicket.issueDescription}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, issueDescription: e.target.value })
                    }
                    className="bg-slate-50 border-slate-200 rounded-xl text-xs focus-visible:ring-primary min-h-[80px]"
                  />
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl"
                >
                  {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Create Ticket
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ASSIGN TECHNICIAN MODAL */}
      {showAssignModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <CardTitle className="text-base font-bold text-slate-800">
                Assign Technician
              </CardTitle>
              <CardDescription className="text-xs">
                Select a qualified field technician and schedule the service appointment date.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAssignTechnician}>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Technician
                  </label>
                  <select
                    required
                    value={assignForm.technicianId}
                    onChange={(e) => setAssignForm({ ...assignForm, technicianId: e.target.value })}
                    className="w-full h-9 text-xs border border-slate-200 rounded-xl px-3 outline-none focus:border-primary bg-slate-50 text-slate-700 font-medium"
                  >
                    <option value="">-- Choose Technician --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Scheduled Date
                  </label>
                  <Input
                    type="date"
                    required
                    value={assignForm.scheduledVisitDate}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, scheduledVisitDate: e.target.value })
                    }
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAssignModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl"
                >
                  {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Assign Job
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DIAGNOSE TICKET MODAL */}
      {showDiagnoseModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <CardTitle className="text-base font-bold text-slate-800">
                Technician Diagnosis
              </CardTitle>
              <CardDescription className="text-xs">
                Record issue diagnosis notes and declare parts that need to be replaced.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleDiagnose}>
              <CardContent className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Diagnosis Notes
                  </label>
                  <Textarea
                    required
                    placeholder="Provide details of the findings, diagnostic tests run, and repairs needed..."
                    value={diagnosisForm.notes}
                    onChange={(e) => setDiagnosisForm({ ...diagnosisForm, notes: e.target.value })}
                    className="bg-slate-50 border-slate-200 rounded-xl text-xs focus-visible:ring-primary min-h-[80px]"
                  />
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Spare Parts / Items Required
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDiagnosisItem}
                      className="border-slate-200 text-xs font-bold text-primary rounded-xl h-8 gap-1.5"
                    >
                      <Plus size={12} /> Add Item
                    </Button>
                  </div>

                  {diagnosisForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">
                            Item Source
                          </label>
                          <select
                            value={item.itemSource}
                            onChange={(e) => updateDiagnosisItem(idx, 'itemSource', e.target.value)}
                            className="w-full h-8 text-[11px] border border-slate-200 rounded-lg px-2 bg-white text-slate-700 font-medium"
                          >
                            <option value="SPARE_PART">Registered Spare Part</option>
                            <option value="CUSTOM">Unregistered Custom Part</option>
                          </select>
                        </div>

                        {item.itemSource === 'SPARE_PART' ? (
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Spare Part
                            </label>
                            <select
                              required
                              value={item.sparePartId}
                              onChange={(e) =>
                                updateDiagnosisItem(idx, 'sparePartId', e.target.value)
                              }
                              className="w-full h-8 text-[11px] border border-slate-200 rounded-lg px-2 bg-white text-slate-700 font-medium"
                            >
                              <option value="">-- Choose Spare Part --</option>
                              {spareParts.map((sp) => (
                                <option key={sp.id} value={sp.id}>
                                  {sp.part_name} ({sp.sku}) - Price: ${sp.base_price}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Custom Part Name
                            </label>
                            <Input
                              required
                              placeholder="e.g. Custom Laser Roller"
                              value={item.customPartName}
                              onChange={(e) => {
                                updateDiagnosisItem(idx, 'customPartName', e.target.value);
                                updateDiagnosisItem(idx, 'partName', e.target.value);
                              }}
                              className="h-8 text-[11px] bg-white border-slate-200 rounded-lg"
                            />
                          </div>
                        )}
                      </div>

                      {item.itemSource === 'CUSTOM' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Brand
                            </label>
                            <Input
                              placeholder="e.g. Generic / HP"
                              value={item.customPartBrand}
                              onChange={(e) =>
                                updateDiagnosisItem(idx, 'customPartBrand', e.target.value)
                              }
                              className="h-8 text-[11px] bg-white border-slate-200 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">
                              Description / Spec
                            </label>
                            <Input
                              placeholder="Spec details..."
                              value={item.customPartDescription}
                              onChange={(e) =>
                                updateDiagnosisItem(idx, 'customPartDescription', e.target.value)
                              }
                              className="h-8 text-[11px] bg-white border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">
                            Quantity
                          </label>
                          <Input
                            type="number"
                            required
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateDiagnosisItem(idx, 'quantity', parseInt(e.target.value, 10))
                            }
                            className="h-8 text-[11px] bg-white border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">
                            Unit Price ($)
                          </label>
                          <Input
                            type="number"
                            required
                            min={0}
                            disabled={item.itemSource === 'SPARE_PART'}
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateDiagnosisItem(idx, 'unitPrice', parseFloat(e.target.value))
                            }
                            className="h-8 text-[11px] bg-white border-slate-200 rounded-lg"
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <input
                            type="checkbox"
                            checked={item.isFree}
                            onChange={(e) => updateDiagnosisItem(idx, 'isFree', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-200 text-primary focus:ring-primary"
                          />
                          <label className="text-[10px] font-bold text-slate-500">Free / FOC</label>
                        </div>
                        <div className="text-right mt-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDiagnosisItem(idx)}
                            className="text-red-500 text-xs font-bold hover:bg-red-50 rounded-lg h-8"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDiagnoseModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl"
                >
                  {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Submit Diagnosis
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* SUBMIT QUOTATION MODAL */}
      {showQuoteModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <CardTitle className="text-base font-bold text-slate-800">
                Submit Service Quotation
              </CardTitle>
              <CardDescription className="text-xs">
                Compile parts and labor costs. This will create a quotation record in the Billing
                system.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmitQuote}>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Labor Cost / Service Charge ($)
                  </label>
                  <Input
                    type="number"
                    required
                    min={0}
                    value={quoteForm.laborCost}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, laborCost: parseFloat(e.target.value) })
                    }
                    className="h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowQuoteModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl"
                >
                  {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Submit Quotation
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* COMPLETE SERVICE JOB MODAL */}
      {showCompleteModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <CardTitle className="text-base font-bold text-slate-800">
                Complete Service Job
              </CardTitle>
              <CardDescription className="text-xs">
                Confirm completion of repair. This will decrement inventory spare part stock levels.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCompleteService}>
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Completion Notes
                  </label>
                  <Textarea
                    required
                    placeholder="Detail work done, tests completed, and confirmation that the client device is fully functional..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    className="bg-slate-50 border-slate-200 rounded-xl text-xs focus-visible:ring-primary min-h-[100px]"
                  />
                </div>
              </CardContent>
              <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCompleteModal(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl"
                >
                  {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />} Mark Completed
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* CUSTOMER INTEL MODAL */}
      {showIntelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl bg-white border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <History className="text-primary" size={18} /> Customer Intelligence View
                </CardTitle>
                <CardDescription className="text-xs">
                  Cross-reference local service ticket logs with billing and lease contract invoice
                  history.
                </CardDescription>
              </div>
              <div>
                <select
                  value={selectedIntelCustomer}
                  onChange={(e) => {
                    setSelectedIntelCustomer(e.target.value);
                    loadCustomerIntel(e.target.value);
                  }}
                  className="h-9 text-xs border border-slate-200 bg-white rounded-xl px-3 outline-none focus:border-primary text-slate-700 font-bold"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
              {loadingIntel ? (
                <div className="text-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <span className="text-xs text-slate-400 mt-2 block font-medium">
                    Loading intel history...
                  </span>
                </div>
              ) : !selectedIntelCustomer ? (
                <div className="text-center py-20 text-slate-400 text-xs font-semibold">
                  Please select a customer from the dropdown above to pull intel history.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Service History */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Briefcase size={14} className="text-blue-500" /> Service Ticket History
                    </h3>
                    {intelData?.tickets?.length === 0 ? (
                      <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        No service tickets logged for this customer.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {intelData?.tickets?.map((t: ServiceTicket) => (
                          <div
                            key={t.id}
                            className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-blue-600">
                                {t.ticketNumber}
                              </span>
                              <Badge
                                className={`text-[9px] font-bold px-1.5 py-0.5 ${getStatusColor(t.status)}`}
                              >
                                {t.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-700 font-bold">
                              {t.productName || t.productModel} (Model)
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {t.issueDescription}
                            </p>
                            {t.completionNotes && (
                              <div className="bg-white p-2 rounded border border-slate-100 text-[10px] text-slate-500 font-medium">
                                <span className="font-bold text-slate-700">Completion:</span>{' '}
                                {t.completionNotes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Billing / Contract History */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-500" /> Contract & Invoice
                      History (Grouped)
                    </h3>
                    {!intelData?.billingHistory ||
                    Object.keys(intelData.billingHistory).length === 0 ? (
                      <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        No billing history / contracts found.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(intelData.billingHistory).map(([billType, invoices]) => (
                          <div key={billType} className="space-y-2">
                            <h4 className="text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-1">
                              {billType}
                            </h4>
                            <div className="space-y-2">
                              {invoices.map((inv) => (
                                <div
                                  key={inv.id}
                                  className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <div className="font-bold text-slate-700">
                                      {inv.invoiceNumber}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Total: ${Number(inv.totalAmount || 0).toLocaleString()}
                                    </div>
                                  </div>
                                  <div>
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-bold uppercase border-slate-200 text-slate-600 bg-white shadow-none"
                                    >
                                      {inv.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-end">
              <Button
                type="button"
                onClick={() => setShowIntelModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                Close Intel View
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

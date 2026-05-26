'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Loader2,
  Trash2,
  UserPlus,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  FilePlus2,
  Eye,
  Pencil,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProductSelect, SelectableItem } from '@/components/invoice/ProductSelect';
import { Product } from '@/lib/product';
import {
  createQuotationTemplate,
  getQuotationTemplates,
  assignQuotationTemplate,
  getTemplateAssignments,
  retakeQuotationAssignment,
  bulkRetakeQuotationAssignments,
  deleteInvoice,
  Invoice,
  InvoiceItem,
  CreateInvoicePayload,
  updateQuotation,
} from '@/lib/invoice';
import { getAllEmployees, Employee } from '@/lib/employee';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { QuotationViewDialog } from '../../employeeComponents/QuotationViewDialog';

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ASSIGNED: 'bg-indigo-100 text-indigo-700',
    RETAKEN: 'bg-red-100 text-red-700',
    DRAFT: 'bg-slate-100 text-slate-600',
    SENT: 'bg-blue-100 text-blue-600',
    SENT_TO_CUSTOMER: 'bg-blue-100 text-blue-600',
    ACCEPTED: 'bg-green-100 text-green-700',
    CUSTOMER_ACCEPTED: 'bg-green-100 text-green-700',
    APPROVED: 'bg-green-100 text-green-700',
    FINANCE_APPROVED: 'bg-green-100 text-green-700',
    EMPLOYEE_APPROVED: 'bg-yellow-100 text-yellow-700',
    REJECTED: 'bg-red-100 text-red-700',
    FINANCE_REJECTED: 'bg-red-100 text-red-700',
    CUSTOMER_REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-orange-100 text-orange-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-green-100 text-green-700',
    ACTIVE_LEASE: 'bg-green-100 text-green-700',
    TRANSACTION_COMPLETED: 'bg-green-100 text-green-700 font-bold border-green-200',
  };

  const label: Record<string, string> = {
    ASSIGNED: 'PENDING CUSTOMER',
    RETAKEN: 'RETAKEN BY MANAGER',
    DRAFT: 'DRAFT',
    SENT: 'SENT TO CUSTOMER',
    SENT_TO_CUSTOMER: 'SENT TO CUSTOMER',
    EMPLOYEE_APPROVED: 'SENT TO FINANCE',
    FINANCE_APPROVED: 'APPROVED BY FINANCE',
    FINANCE_REJECTED: 'REJECTED BY FINANCE',
    CUSTOMER_ACCEPTED: 'ACCEPTED BY CUSTOMER',
    CUSTOMER_REJECTED: 'REJECTED BY CUSTOMER',
    ACCEPTED: 'APPROVED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    PENDING_CONFIRMATION: 'PENDING ALLOCATION',
    TRANSACTION_COMPLETED: 'ACCOUNTING COMPLETED',
    PAID: 'FULLY PAID',
    ACTIVE_LEASE: 'ACTIVE',
  };

  return (
    <Badge
      className={`rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider shadow-none ${
        map[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {label[status] ?? status}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    PRODUCT_SALE: 'bg-blue-50 text-blue-600 border-blue-200',
    RENT: 'bg-green-50 text-green-600 border-green-200',
    LEASE: 'bg-purple-50 text-purple-600 border-purple-200',
  };
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider ${
        map[type] ?? ''
      }`}
    >
      {type}
    </Badge>
  );
}

// ─── Type Declarations ────────────────────────────────────────────────────────
interface TemplateAssignment {
  id: string;
  templateId: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  assignedAt: string;
  status: string;
  customerName?: string;
  invoiceNumber: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManagerQuotationTemplateTable() {
  const [templates, setTemplates] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Invoice | null>(null);

  // Assignment State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [initialEmployeeIds, setInitialEmployeeIds] = useState<string[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<
    Array<{
      id: string;
      employeeId: string;
      assignedAt: string;
      assignedBy: string;
      cloneId: string | null;
      customerId: string | null;
      status: string;
    }>
  >([]);

  // Drill-down State
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // View / Edit Modal States
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<Invoice | null>(null);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Invoice | null>(null);

  // Delete Modal States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateIdToDelete, setTemplateIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [search, setSearch] = useState('');

  const { page, limit, total, setPage, setTotal, totalPages } = usePagination(10);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getQuotationTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error('Failed to fetch quotation templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    setPage(1);
  }, [search, setPage]);

  // Fetch employees when assignment modal opens
  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await getAllEmployees(1, 1000);
      // Filter only sales and rent/lease staff
      const filtered = (res.data.employees || []).filter(
        (emp) => emp.employee_job === 'SALES' || emp.employee_job === 'RENT_AND_LEASE',
      );
      setEmployees(filtered);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to load employee list.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleOpenAssignModal = async (template: Invoice) => {
    setSelectedTemplate(template);
    setSelectedEmployeeIds([]);
    setInitialEmployeeIds([]);
    setActiveAssignments([]);
    setAssignModalOpen(true);
    fetchEmployees();

    try {
      const data = await getTemplateAssignments(template.id);
      const assignmentsTyped = data as unknown as Array<{
        id: string;
        employeeId: string;
        assignedAt: string;
        assignedBy: string;
        cloneId: string | null;
        customerId: string | null;
        status: string;
      }>;
      const active = assignmentsTyped.filter(
        (asg) =>
          asg.status && !['RETAKEN', 'DELETED', 'SUPERSEDED'].includes(asg.status.toUpperCase()),
      );
      const activeIds = active.map((asg) => asg.employeeId);
      setSelectedEmployeeIds(activeIds);
      setInitialEmployeeIds(activeIds);
      setActiveAssignments(assignmentsTyped);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  const handleAssignSubmit = async () => {
    if (!selectedTemplate) return;

    try {
      const toAssign = selectedEmployeeIds.filter((id) => !initialEmployeeIds.includes(id));
      const toRetake = initialEmployeeIds.filter((id) => !selectedEmployeeIds.includes(id));

      if (toAssign.length === 0 && toRetake.length === 0) {
        toast.info('No changes made to assignments.');
        setAssignModalOpen(false);
        return;
      }

      // 1. Assign new employees
      if (toAssign.length > 0) {
        await assignQuotationTemplate(selectedTemplate.id, toAssign);
      }

      // 2. Retake (unassign) unselected employees
      for (const empId of toRetake) {
        const asg = activeAssignments.find(
          (a) =>
            a.employeeId === empId &&
            a.status &&
            !['DELETED', 'RETAKEN', 'SUPERSEDED'].includes(a.status.toUpperCase()),
        );
        if (asg && asg.cloneId) {
          await retakeQuotationAssignment(asg.cloneId);
        }
      }

      toast.success('Template assignments updated successfully.');
      setAssignModalOpen(false);
      // Refresh assignments if expanded
      if (expandedTemplateId === selectedTemplate.id) {
        fetchAssignments(selectedTemplate.id);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update template assignments.');
    }
  };

  // Toggle drill-down
  const handleToggleDrillDown = async (templateId: string) => {
    if (expandedTemplateId === templateId) {
      setExpandedTemplateId(null);
      setAssignments([]);
    } else {
      setExpandedTemplateId(templateId);
      fetchAssignments(templateId);
    }
  };

  const fetchAssignments = async (templateId: string) => {
    try {
      setLoadingAssignments(true);
      const data = await getTemplateAssignments(templateId);
      setAssignments(data);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      toast.error('Failed to fetch assignments tracking.');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleRetake = async (id: string, templateId: string) => {
    try {
      await retakeQuotationAssignment(id);
      toast.success('Assignment retaken successfully.');
      fetchAssignments(templateId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to retake assignment.');
    }
  };

  const handleBulkRetake = async (templateId: string) => {
    try {
      await bulkRetakeQuotationAssignments(templateId);
      toast.success('All eligible assignments retaken successfully.');
      fetchAssignments(templateId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to retake assignments.');
    }
  };

  const promptDeleteTemplate = (templateId: string) => {
    setTemplateIdToDelete(templateId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteTemplate = async () => {
    if (!templateIdToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(templateIdToDelete);
      toast.success('Template deleted successfully.');
      fetchTemplates();
      if (expandedTemplateId === templateIdToDelete) {
        setExpandedTemplateId(null);
      }
      setDeleteConfirmOpen(false);
      setTemplateIdToDelete(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to delete template.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter
  const filtered = templates.filter((q) => {
    const s = search.toLowerCase();
    const productNames = (q.items || [])
      .map((it) => it.description || '')
      .join(' ')
      .toLowerCase();
    return (
      q.invoiceNumber?.toLowerCase().includes(s) ||
      q.saleType?.toLowerCase().includes(s) ||
      productNames.includes(s)
    );
  });

  useEffect(() => {
    setTotal(filtered.length);
  }, [filtered.length, setTotal]);

  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const getCleanProductName = (name: string) => {
    let clean = name.replace(/^(Black & White - |Color - |Combined - )/i, '');
    clean = clean.replace(/(\s*-\s*SN-[^,]+|\s*\(SN-[^)]+\)|\s*\(Serial[^)]+\))/gi, '');
    const lastDashIndex = clean.lastIndexOf(' - ');
    if (lastDashIndex !== -1 && clean.length - lastDashIndex < 25) {
      clean = clean.substring(0, lastDashIndex).trim();
    }
    return clean.trim();
  };

  const getProductNames = (invoice: Invoice) => {
    if (!invoice.items || invoice.items.length === 0) return 'No items';
    const productItems = invoice.items.filter(
      (item) => item.itemType !== 'PRICING_RULE' && item.description,
    );
    if (productItems.length === 0) {
      const allWithDesc = invoice.items.filter((item) => item.description);
      if (allWithDesc.length === 0) return 'N/A';
      return allWithDesc.map((item) => getCleanProductName(item.description)).join(', ');
    }
    return productItems.map((item) => getCleanProductName(item.description)).join(', ');
  };

  const handleCreate = async (payload: CreateInvoicePayload) => {
    try {
      await createQuotationTemplate(payload);
      fetchTemplates();
      setFormOpen(false);
      toast.success('Quotation template created successfully.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create template.');
    }
  };

  const handleEditSubmit = async (payload: CreateInvoicePayload) => {
    if (!editingTemplate) return;
    try {
      await updateQuotation(editingTemplate.id, payload);
      fetchTemplates();
      setEditTemplateOpen(false);
      setEditingTemplate(null);
      toast.success('Quotation template updated successfully.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update template.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading quotation templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-primary">Quotation Templates</h2>
          <p className="text-sm text-muted-foreground">
            Create product templates and assign them to sales employee portfolios
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button
            className="bg-primary text-white gap-2 shadow-md hover:shadow-lg transition-all"
            onClick={() => setFormOpen(true)}
          >
            <Plus size={16} /> Create Template
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by number, product, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden border border-slate-100 p-4">
        <div className="overflow-x-auto mb-4">
          <Table className="min-w-[750px] sm:min-w-full">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-primary font-bold">TEMPLATE NUMBER</TableHead>
                <TableHead className="text-primary font-bold">PRODUCTS</TableHead>
                <TableHead className="text-primary font-bold">TYPE</TableHead>
                <TableHead className="text-primary font-bold">VALUES</TableHead>
                <TableHead className="text-primary font-bold">CREATED DATE</TableHead>
                <TableHead className="text-primary font-bold text-right pr-6">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-14 text-muted-foreground">
                    <FilePlus2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No templates found. Create your first quotation template!
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((q) => {
                  const isExpanded = expandedTemplateId === q.id;
                  return (
                    <React.Fragment key={q.id}>
                      <TableRow className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleToggleDrillDown(q.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-blue-500 font-bold tracking-tight">
                          {q.invoiceNumber}
                        </TableCell>
                        <TableCell
                          className="font-semibold text-slate-700 max-w-[250px] truncate"
                          title={getProductNames(q)}
                        >
                          {getProductNames(q)}
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={q.saleType} />
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {q.saleType === 'RENT' && q.monthlyRent ? (
                            <span>Rent: {formatCurrency(q.monthlyRent)}/mo</span>
                          ) : q.saleType === 'LEASE' && q.monthlyEmiAmount ? (
                            <span>EMI: {formatCurrency(q.monthlyEmiAmount)}/mo</span>
                          ) : (
                            formatCurrency(q.totalAmount || 0)
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-medium">
                          {new Date(q.createdAt).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right space-x-1.5 pr-6">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setViewingTemplate(q);
                              setViewDialogOpen(true);
                            }}
                            className="h-8 text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-50 gap-1"
                          >
                            <Eye size={12} />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAssignModal(q)}
                            className="h-8 text-xs font-bold text-primary border-primary/20 hover:bg-primary/5 gap-1"
                          >
                            <UserPlus size={12} />
                            Assign
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTemplate(q);
                              setEditTemplateOpen(true);
                            }}
                            className="h-8 text-xs font-bold text-amber-600 border-amber-200 hover:bg-amber-50 gap-1"
                          >
                            <Pencil size={12} />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => promptDeleteTemplate(q.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            title="Delete Template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Drill-down panel */}
                      {isExpanded && (
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-t-0">
                          <TableCell colSpan={7} className="p-4 pl-12 pr-6">
                            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                                  Sales Assignment Tracking
                                </h4>
                                {assignments.length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBulkRetake(q.id)}
                                    className="h-7 text-[10px] font-bold text-red-700 border-red-200 hover:bg-red-50 gap-1 uppercase"
                                  >
                                    <RotateCcw size={10} />
                                    Retake All Assignments
                                  </Button>
                                )}
                              </div>

                              {loadingAssignments ? (
                                <div className="flex justify-center py-6">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                              ) : assignments.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                  Not assigned to any employees yet. Click &quot;Assign&quot; to
                                  dispatch.
                                </p>
                              ) : (
                                <Table className="min-w-full text-xs">
                                  <TableHeader className="bg-slate-50">
                                    <TableRow>
                                      <TableHead className="font-bold">EMPLOYEE</TableHead>
                                      <TableHead className="font-bold">ASSIGNED AT</TableHead>
                                      <TableHead className="font-bold">QUOTE NUMBER</TableHead>
                                      <TableHead className="font-bold">CUSTOMER</TableHead>
                                      <TableHead className="font-bold">STATUS</TableHead>
                                      <TableHead className="text-right pr-4 font-bold">
                                        ACTION
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {assignments.map((asg) => (
                                      <TableRow key={asg.id} className="hover:bg-slate-50/30">
                                        <TableCell className="font-bold text-slate-700">
                                          {asg.assignedEmployeeName}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                          {new Date(asg.assignedAt).toLocaleDateString(undefined, {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </TableCell>
                                        <TableCell className="font-semibold text-blue-600">
                                          {asg.invoiceNumber}
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-600">
                                          {asg.customerName || 'Pending Customer'}
                                        </TableCell>
                                        <TableCell>
                                          <StatusBadge status={asg.status} />
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                          {['ASSIGNED', 'DRAFT'].includes(asg.status) && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleRetake(asg.id, q.id)}
                                              className="h-7 text-[10px] font-bold text-red-500 hover:bg-red-50 uppercase"
                                              title="Retake assignment"
                                            >
                                              Retake
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Assignment Modal */}
      {assignModalOpen && selectedTemplate && (
        <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
          <DialogContent className="sm:max-w-md bg-white border border-slate-100 rounded-xl shadow-lg p-6 flex flex-col max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-800">
                Assign Quotation Template
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Select one or more Sales Employees to dispatch template{' '}
                <strong className="text-slate-700">{selectedTemplate.invoiceNumber}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto my-4 min-h-[200px] border border-slate-100 rounded-lg p-3 space-y-2">
              {loadingEmployees ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : employees.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-10">
                  No eligible employees found.
                </p>
              ) : (
                employees.map((emp) => {
                  const isChecked = selectedEmployeeIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmployeeIds((prev) =>
                          isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id],
                        );
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all hover:bg-slate-50
                        ${isChecked ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by div click
                          className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {emp.email} • {emp.employee_job || 'SALES'}
                          </p>
                        </div>
                      </div>
                      <Badge className="text-[9px] bg-slate-100 text-slate-600 shadow-none border-none">
                        {emp.reporting_manager ? 'Branch Staff' : 'HQ'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setAssignModalOpen(false)}
                className="text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignSubmit}
                className="bg-primary text-white font-bold text-xs uppercase tracking-wider px-5"
              >
                Assign Selected
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {formOpen && (
        <QuotationTemplateFormModal onClose={() => setFormOpen(false)} onConfirm={handleCreate} />
      )}

      {viewDialogOpen && viewingTemplate && (
        <QuotationViewDialog
          quotation={viewingTemplate}
          onClose={() => {
            setViewDialogOpen(false);
            setViewingTemplate(null);
          }}
        />
      )}

      {editTemplateOpen && editingTemplate && (
        <QuotationTemplateFormModal
          template={editingTemplate}
          onClose={() => {
            setEditTemplateOpen(false);
            setEditingTemplate(null);
          }}
          onConfirm={handleEditSubmit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-100 rounded-xl shadow-lg p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-red-600">
            <div className="h-10 w-10 shrink-0 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                Delete Quotation Template
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                This action cannot be undone. Are you sure you want to delete this template?
              </DialogDescription>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setTemplateIdToDelete(null);
              }}
              disabled={isDeleting}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider px-6 gap-1"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Quotation Template Form Modal ─────────────────────────────────────────────

interface CategoryCardProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  desc: string;
  color: string;
  onClick: () => void;
}

function CategoryCard({ icon: Icon, label, desc, color, onClick }: CategoryCardProps) {
  return (
    <div
      onClick={onClick}
      className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 bg-card flex flex-col gap-3 ${color}`}
    >
      <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-50 flex items-center justify-center text-slate-700">
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <div>
        <h4 className="font-bold text-sm text-slate-800">{label}</h4>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">
          {desc}
        </p>
      </div>
    </div>
  );
}

interface SaleItem {
  description: string;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  discount: number;
  maxDiscount: number;
  isManual: boolean;
  productId?: string;
  modelId?: string;
  brand?: string;
  model?: string;
  productName?: string;
  hsCode?: string;
  itemType: 'PRODUCT' | 'SPAREPART';
  isEditable: boolean;
  bwIncludedLimit?: number;
  colorIncludedLimit?: number;
  combinedIncludedLimit?: number;
  bwExcessRate?: number;
  colorExcessRate?: number;
  combinedExcessRate?: number;
  bwSlabRanges?: Array<{ from: string; to: string; rate: string }>;
  colorSlabRanges?: Array<{ from: string; to: string; rate: string }>;
  comboSlabRanges?: Array<{ from: string; to: string; rate: string }>;
}

function QuotationTemplateFormModal({
  onClose,
  onConfirm,
  template,
}: {
  onClose: () => void;
  onConfirm: (data: CreateInvoicePayload) => Promise<void>;
  template?: Invoice;
}) {
  const [step, setStep] = useState<1 | 2>(template ? 2 : 1);
  const [activeCategory, setActiveCategory] = useState<'SALE' | 'RENT' | 'LEASE' | null>(() => {
    if (template) {
      if (template.saleType === 'PRODUCT_SALE' || template.saleType === 'SALE') return 'SALE';
      return template.saleType as 'RENT' | 'LEASE';
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLayoutCategory, setSelectedLayoutCategory] = useState<string | null>(() => {
    if (template?.layoutId) {
      return template.layoutId.split(':')[0] || 'product';
    }
    return 'product';
  });
  const [selectedLayoutStyle, setSelectedLayoutStyle] = useState<string | null>(() => {
    if (template?.layoutId) {
      return template.layoutId.split(':')[1] || 'normal';
    }
    return 'normal';
  });

  // ── SALE state ──────────────────────────────────────────────────────────
  const [saleItems, setSaleItems] = useState<SaleItem[]>(() => {
    if (template?.items) {
      return template.items.map((it: InvoiceItem) => {
        const bwSlabs = (it.bwSlabRanges || []).map((s) => ({
          from: s.from !== undefined ? String(s.from) : '',
          to: s.to !== undefined ? String(s.to) : '',
          rate: s.rate !== undefined ? String(s.rate) : '',
        }));
        const colorSlabs = (it.colorSlabRanges || []).map((s) => ({
          from: s.from !== undefined ? String(s.from) : '',
          to: s.to !== undefined ? String(s.to) : '',
          rate: s.rate !== undefined ? String(s.rate) : '',
        }));
        const comboSlabs = (it.comboSlabRanges || []).map((s) => ({
          from: s.from !== undefined ? String(s.from) : '',
          to: s.to !== undefined ? String(s.to) : '',
          rate: s.rate !== undefined ? String(s.rate) : '',
        }));

        const isManual = !it.productId;

        return {
          description: it.description || '',
          quantity: it.quantity || 1,
          basePrice: it.unitPrice || 0,
          unitPrice: (it.unitPrice || 0) - (it.discount || 0),
          discount: it.discount || 0,
          maxDiscount: 0,
          isManual,
          productId: it.productId,
          modelId: it.modelId,
          itemType: it.itemType === 'SPAREPART' ? 'SPAREPART' : 'PRODUCT',
          isEditable: isManual || !it.productId || it.unitPrice === 0,
          bwIncludedLimit: it.bwIncludedLimit,
          colorIncludedLimit: it.colorIncludedLimit,
          combinedIncludedLimit: it.combinedIncludedLimit,
          bwExcessRate: it.bwExcessRate,
          colorExcessRate: it.colorExcessRate,
          combinedExcessRate: it.combinedExcessRate,
          bwSlabRanges: bwSlabs,
          colorSlabRanges: colorSlabs,
          comboSlabRanges: comboSlabs,
        };
      });
    }
    return [];
  });
  const [notes, setNotes] = useState(template?.notes || '');
  const [validDays] = useState(30);

  // ── RENT state ──────────────────────────────────────────────────────────
  const [rentType, setRentType] = useState<string>(template?.rentType || 'FIXED_LIMIT');
  const [rentPeriod, setRentPeriod] = useState<string>(template?.rentPeriod || 'MONTHLY');
  const [monthlyRent, setMonthlyRent] = useState(
    template?.monthlyRent !== undefined && template?.monthlyRent !== null
      ? String(template.monthlyRent)
      : '',
  );
  const [advanceAmount, setAdvanceAmount] = useState(
    template?.advanceAmount !== undefined && template?.advanceAmount !== null
      ? String(template.advanceAmount)
      : '',
  );
  const [discountPercent, setDiscountPercent] = useState(
    template?.discountPercent !== undefined && template?.discountPercent !== null
      ? String(template.discountPercent)
      : '',
  );
  const [durationMonths, setDurationMonths] = useState(() => {
    if (template?.effectiveFrom && template?.effectiveTo) {
      const from = new Date(template.effectiveFrom);
      const to = new Date(template.effectiveTo);
      const months = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
      return String(months || 12);
    }
    return '12';
  });

  // ── LEASE state ─────────────────────────────────────────────────────────
  const [leaseType, setLeaseType] = useState<string>(template?.leaseType || 'EMI');
  const [leaseTenureMonths, setLeaseTenureMonths] = useState(
    template?.leaseTenureMonths !== undefined && template?.leaseTenureMonths !== null
      ? String(template.leaseTenureMonths)
      : '12',
  );
  const [totalLeaseAmount, setTotalLeaseAmount] = useState(
    template?.totalLeaseAmount !== undefined && template?.totalLeaseAmount !== null
      ? String(template.totalLeaseAmount)
      : '',
  );
  const [monthlyEmiAmount, setMonthlyEmiAmount] = useState(
    template?.monthlyEmiAmount !== undefined && template?.monthlyEmiAmount !== null
      ? String(template.monthlyEmiAmount)
      : '',
  );
  const [lastEditedLease, setLastEditedLease] = useState<'TOTAL' | 'PERIODIC'>('TOTAL');

  // ── SECURITY DEPOSIT state ──────────────────────────────────────────────
  const [securityDepositAmount, setSecurityDepositAmount] = useState(
    template?.securityDepositAmount !== undefined && template?.securityDepositAmount !== null
      ? String(template.securityDepositAmount)
      : '',
  );
  const [securityDepositMode, setSecurityDepositMode] = useState<string>(
    template?.securityDepositMode || 'CASH',
  );

  // ── Auto-Calculators ───────────────────────────────────────────────────
  const getPeriodsForRent = (period: string, duration: number) => {
    if (!duration || duration <= 0) return 0;
    switch (period) {
      case 'MONTHLY':
        return duration;
      case 'QUARTERLY':
        return duration / 3;
      case 'HALF_YEARLY':
        return duration / 6;
      case 'YEARLY':
        return duration / 12;
      default:
        return 0;
    }
  };

  useEffect(() => {
    if (activeCategory !== 'LEASE' || !leaseTenureMonths) return;

    if (leaseType === 'EMI') {
      if (lastEditedLease === 'TOTAL' && totalLeaseAmount) {
        setMonthlyEmiAmount((Number(totalLeaseAmount) / Number(leaseTenureMonths)).toFixed(2));
      } else if (lastEditedLease === 'PERIODIC' && monthlyEmiAmount) {
        setTotalLeaseAmount((Number(monthlyEmiAmount) * Number(leaseTenureMonths)).toFixed(2));
      }
    } else if (leaseType === 'FSM') {
      const p = getPeriodsForRent(rentPeriod, Number(leaseTenureMonths));
      if (p <= 0) return;
      if (lastEditedLease === 'TOTAL' && totalLeaseAmount) {
        setMonthlyRent((Number(totalLeaseAmount) / p).toFixed(2));
      } else if (lastEditedLease === 'PERIODIC' && monthlyRent) {
        setTotalLeaseAmount((Number(monthlyRent) * p).toFixed(2));
      }
    }
  }, [
    totalLeaseAmount,
    monthlyEmiAmount,
    monthlyRent,
    leaseType,
    rentPeriod,
    leaseTenureMonths,
    lastEditedLease,
    activeCategory,
  ]);

  // Auto-calc EMI
  useEffect(() => {
    if (leaseTenureMonths && totalLeaseAmount) {
      const tenure = Number(leaseTenureMonths);
      const total = Number(totalLeaseAmount);
      if (tenure > 0) setMonthlyEmiAmount(String(Math.round(total / tenure)));
    }
  }, [leaseTenureMonths, totalLeaseAmount]);

  // ── Sale item helpers ────────────────────────────────────────────────────
  const addItem = (item: SelectableItem) => {
    let description = '',
      basePrice = 0,
      maxDiscount = 0,
      itemType: 'PRODUCT' | 'SPAREPART' = 'PRODUCT';

    const pr = item as Product;
    description = pr.name || pr.description || pr.model?.description || 'Product';

    basePrice = pr.sale_price || 0;
    maxDiscount = pr.max_discount_amount || 0;
    const productId = pr.id;
    const modelId = pr.model?.id;
    itemType = 'PRODUCT';

    setSaleItems((prev) => [
      ...prev,
      {
        description,
        quantity: 1,
        basePrice,
        discount: 0,
        unitPrice: basePrice,
        maxDiscount,
        isManual: false,
        productId,
        modelId,
        itemType,
        isEditable: !productId || basePrice === 0,
        bwSlabRanges: [],
        colorSlabRanges: [],
        comboSlabRanges: [],
      },
    ]);
    toast.success(`Added ${description}`);
  };

  const removeItem = (i: number) => setSaleItems((prev) => prev.filter((_, idx) => idx !== i));

  const addManualItem = () => {
    setSaleItems((prev) => [
      ...prev,
      {
        description: '',
        brand: '',
        model: '',
        productName: '',
        hsCode: '',
        quantity: 1,
        basePrice: 0,
        discount: 0,
        unitPrice: 0,
        maxDiscount: 0,
        isManual: true,
        productId: undefined,
        modelId: undefined,
        itemType: 'PRODUCT',
        isEditable: true,
        bwSlabRanges: [],
        colorSlabRanges: [],
        comboSlabRanges: [],
      },
    ]);
  };

  const updateItemField = (i: number, field: keyof SaleItem, val: string | number) => {
    setSaleItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[i] };

      if (field === 'quantity') {
        item.quantity = Math.max(1, Number(val));
      } else if (field === 'discount') {
        const disc = Math.max(0, Number(val));
        item.discount = disc;
        item.unitPrice = item.basePrice - disc;
      } else if (field === 'basePrice' && item.isEditable) {
        item.basePrice = Number(val);
        item.unitPrice = Number(val) - item.discount;
      } else {
        (item as unknown as Record<string, string | number>)[field as string] = val;
      }

      copy[i] = item;
      return copy;
    });
  };

  // ── Pricing slab helpers (Rental & FSM Lease) ───────────────────────────
  const addSlabRange = (i: number, type: 'bw' | 'color' | 'combo') => {
    setSaleItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[i] };
      const slabField = `${type}SlabRanges` as
        | 'bwSlabRanges'
        | 'colorSlabRanges'
        | 'comboSlabRanges';
      const current = item[slabField] || [];
      const target = item as unknown as Record<
        string,
        Array<{ from: string; to: string; rate: string }> | undefined
      >;
      target[slabField] = [...current, { from: '', to: '', rate: '' }];
      copy[i] = item;
      return copy;
    });
  };

  const removeSlabRange = (i: number, type: 'bw' | 'color' | 'combo', slabIdx: number) => {
    setSaleItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[i] };
      const slabField = `${type}SlabRanges` as
        | 'bwSlabRanges'
        | 'colorSlabRanges'
        | 'comboSlabRanges';
      const current = item[slabField] || [];
      const target = item as unknown as Record<
        string,
        Array<{ from: string; to: string; rate: string }> | undefined
      >;
      target[slabField] = current.filter((_, idx) => idx !== slabIdx);
      copy[i] = item;
      return copy;
    });
  };

  const updateSlabField = (
    i: number,
    type: 'bw' | 'color' | 'combo',
    slabIdx: number,
    field: 'from' | 'to' | 'rate',
    val: string,
  ) => {
    setSaleItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[i] };
      const slabField = `${type}SlabRanges` as
        | 'bwSlabRanges'
        | 'colorSlabRanges'
        | 'comboSlabRanges';
      const current = [...(item[slabField] || [])];
      const target = item as unknown as Record<
        string,
        Array<{ from: string; to: string; rate: string }> | undefined
      >;
      current[slabIdx] = { ...current[slabIdx], [field]: val };
      target[slabField] = current;
      copy[i] = item;
      return copy;
    });
  };

  // ── Submit logic ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (saleItems.length === 0) {
      toast.error('Please add at least one product.');
      return;
    }

    // Validation
    for (const item of saleItems) {
      if (item.isManual) {
        if (!item.brand || !item.model || !item.productName) {
          toast.error('All manual product rows must specify Brand, Model, and Product Name.');
          return;
        }
        item.description = `${item.brand} ${item.model} ${item.productName}`.trim();
        if (item.hsCode) {
          item.description = `[HS:${item.hsCode}] ${item.description}`;
        }
      }
      if (!item.description) {
        toast.error('Please enter a description for all products.');
        return;
      }
      if (activeCategory === 'SALE' && item.basePrice <= 0) {
        toast.error('Product unit price must be greater than 0.');
        return;
      }
    }

    setIsSubmitting(true);

    const layoutId = `${selectedLayoutCategory || 'product'}:${selectedLayoutStyle || 'normal'}`;

    try {
      const payload: CreateInvoicePayload = {
        customerId: '', // No customer for template
        saleType: activeCategory === 'SALE' ? 'PRODUCT_SALE' : activeCategory!,
        layoutId,
        notes,
      };

      if (activeCategory === 'SALE') {
        payload.items = saleItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.basePrice,
          discount: it.discount,
          productId: it.productId,
          modelId: it.modelId,
          itemType: it.itemType,
        }));
        // Valid for
        const d = new Date();
        d.setDate(d.getDate() + validDays);
        payload.effectiveTo = d.toISOString().split('T')[0];
        payload.effectiveFrom = new Date().toISOString().split('T')[0];
      } else if (activeCategory === 'RENT') {
        payload.rentType = rentType as NonNullable<CreateInvoicePayload>['rentType'];
        payload.rentPeriod = rentPeriod as NonNullable<CreateInvoicePayload>['rentPeriod'];
        payload.monthlyRent = Number(monthlyRent);
        payload.advanceAmount = Number(advanceAmount);
        payload.discountPercent = Number(discountPercent);

        payload.effectiveFrom = new Date().toISOString().split('T')[0];
        const d = new Date();
        d.setMonth(d.getMonth() + Number(durationMonths));
        payload.effectiveTo = d.toISOString().split('T')[0];

        if (securityDepositAmount) {
          payload.securityDepositAmount = Number(securityDepositAmount);
          payload.securityDepositMode =
            securityDepositMode as NonNullable<CreateInvoicePayload>['securityDepositMode'];
        }

        payload.items = saleItems.map((it) => ({
          description: it.description,
          productId: it.productId,
          modelId: it.modelId,
          quantity: it.quantity,
          unitPrice: 0,
          bwIncludedLimit: Number(it.bwIncludedLimit || 0),
          colorIncludedLimit: Number(it.colorIncludedLimit || 0),
          combinedIncludedLimit: Number(it.combinedIncludedLimit || 0),
          bwExcessRate: Number(it.bwExcessRate || 0),
          colorExcessRate: Number(it.colorExcessRate || 0),
          combinedExcessRate: Number(it.combinedExcessRate || 0),
          bwSlabRanges: (it.bwSlabRanges || []).map((s) => ({
            from: Number(s.from),
            to: Number(s.to),
            rate: Number(s.rate),
          })),
          colorSlabRanges: (it.colorSlabRanges || []).map((s) => ({
            from: Number(s.from),
            to: Number(s.to),
            rate: Number(s.rate),
          })),
          comboSlabRanges: (it.comboSlabRanges || []).map((s) => ({
            from: Number(s.from),
            to: Number(s.to),
            rate: Number(s.rate),
          })),
        }));
      } else if (activeCategory === 'LEASE') {
        payload.leaseType = leaseType as 'EMI' | 'FSM';
        payload.leaseTenureMonths = Number(leaseTenureMonths);
        payload.totalLeaseAmount = Number(totalLeaseAmount);

        payload.effectiveFrom = new Date().toISOString().split('T')[0];
        const d = new Date();
        d.setMonth(d.getMonth() + Number(leaseTenureMonths));
        payload.effectiveTo = d.toISOString().split('T')[0];

        if (securityDepositAmount) {
          payload.securityDepositAmount = Number(securityDepositAmount);
          payload.advanceAmount = Number(securityDepositAmount);
          payload.securityDepositMode =
            securityDepositMode as NonNullable<CreateInvoicePayload>['securityDepositMode'];
        }

        if (leaseType === 'EMI') {
          payload.monthlyEmiAmount = Number(monthlyEmiAmount);
        } else {
          payload.rentType = rentType as NonNullable<CreateInvoicePayload>['rentType'];
          payload.rentPeriod = rentPeriod as NonNullable<CreateInvoicePayload>['rentPeriod'];
          payload.monthlyRent = Number(monthlyRent);
          payload.discountPercent = Number(discountPercent);
        }

        payload.items = saleItems.map((it) => ({
          description: it.description,
          productId: it.productId,
          modelId: it.modelId,
          quantity: it.quantity,
          unitPrice: 0,
          bwIncludedLimit: Number(it.bwIncludedLimit || 0),
          colorIncludedLimit: Number(it.colorIncludedLimit || 0),
          combinedIncludedLimit: Number(it.combinedIncludedLimit || 0),
          bwExcessRate: Number(it.bwExcessRate || 0),
          colorExcessRate: Number(it.colorExcessRate || 0),
          combinedExcessRate: Number(it.combinedExcessRate || 0),
          bwSlabRanges: (it.bwSlabRanges || []).map((s) => ({
            from: Number(s.from),
            to: Number(s.to),
            rate: Number(s.rate),
          })),
          colorSlabRanges: (it.colorSlabRanges || []).map((s) => ({
            from: Number(s.from),
            to: Number(s.to),
            rate: Number(s.rate),
          })),
          comboSlabRanges: (it.comboSlabRanges || []).map((s) => ({
            from: Number(s.from),
            to: Number(s.to),
            rate: Number(s.rate),
          })),
        }));
      }

      await onConfirm(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col bg-white border border-slate-100 rounded-xl shadow-lg p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {template ? 'Edit Quotation Template' : 'Create Quotation Template'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {template
              ? 'Update the details and items of your quotation template'
              : 'Configure product-focused template quotation without attaching customer info'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest text-center">
              Select Quotation Deal Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CategoryCard
                icon={Plus}
                label="Cash Sale Portfolio"
                desc="Direct product and spare part sales"
                color={
                  activeCategory === 'SALE'
                    ? 'border-blue-500 bg-blue-50/10'
                    : 'border-slate-100 hover:border-blue-300'
                }
                onClick={() => {
                  setActiveCategory('SALE');
                  setSelectedLayoutCategory('product');
                  setSaleItems([]);
                }}
              />
              <CategoryCard
                icon={Plus}
                label="Rental Agreement"
                desc="Fixed limits or CPC excess models"
                color={
                  activeCategory === 'RENT'
                    ? 'border-green-500 bg-green-50/10'
                    : 'border-slate-100 hover:border-green-300'
                }
                onClick={() => {
                  setActiveCategory('RENT');
                  setSelectedLayoutCategory('rent');
                  setSaleItems([]);
                }}
              />
              <CategoryCard
                icon={Plus}
                label="Lease-To-Own Scheme"
                desc="EMI or FSM monthly rental contracts"
                color={
                  activeCategory === 'LEASE'
                    ? 'border-purple-500 bg-purple-50/10'
                    : 'border-slate-100 hover:border-purple-300'
                }
                onClick={() => {
                  setActiveCategory('LEASE');
                  setSelectedLayoutCategory('lease');
                  setSaleItems([]);
                }}
              />
            </div>

            {activeCategory && (
              <div className="flex justify-end pt-6 border-t">
                <Button
                  onClick={() => setStep(2)}
                  className="bg-primary text-white font-bold text-xs uppercase tracking-wider px-6"
                >
                  Continue to Details
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-6 max-h-[70vh]">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-xs font-bold text-slate-700">
                Selected Type: <strong className="uppercase text-primary">{activeCategory}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep(1);
                  setSaleItems([]);
                }}
                className="h-8 text-[10px] font-bold text-slate-500 hover:text-primary uppercase"
              >
                Change Category
              </Button>
            </div>

            {/* Layout selector */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Layout Class
                </label>
                <Select
                  value={selectedLayoutCategory || 'product'}
                  onValueChange={setSelectedLayoutCategory}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product Sale Layout</SelectItem>
                    <SelectItem value="spareparts">Spare Parts Layout</SelectItem>
                    <SelectItem value="rent">Rent Layout</SelectItem>
                    <SelectItem value="lease">Lease Layout</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Design Aesthetics
                </label>
                <Select
                  value={selectedLayoutStyle || 'normal'}
                  onValueChange={setSelectedLayoutStyle}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal Style (Basic)</SelectItem>
                    <SelectItem value="standard">Standard Style (Structured)</SelectItem>
                    <SelectItem value="premium">Premium Style (Interactive/Visual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rent details */}
            {activeCategory === 'RENT' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-6 border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Rent Type
                  </label>
                  <Select value={rentType} onValueChange={setRentType}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED_LIMIT">Fixed Copies Limit (BW/CL)</SelectItem>
                      <SelectItem value="FIXED_COMBO">Combined Copies Limit</SelectItem>
                      <SelectItem value="FIXED_FLAT">Fixed Flat Rate (No Free Limit)</SelectItem>
                      <SelectItem value="CPC">CPC Billing (No Rent, Charge per click)</SelectItem>
                      <SelectItem value="CPC_COMBO">
                        CPC Combo Billing (Charge combined per click)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Billing Cycle
                  </label>
                  <Select value={rentPeriod} onValueChange={setRentPeriod}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Monthly Base Rent (QAR)
                  </label>
                  <Input
                    type="number"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    disabled={rentType.startsWith('CPC')}
                    placeholder="e.g. 500"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Discount Percent (%)
                  </label>
                  <Input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="e.g. 10"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Duration (Months)
                  </label>
                  <Input
                    type="number"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    placeholder="e.g. 12"
                    className="text-xs h-9"
                  />
                </div>
              </div>
            )}

            {/* Lease details */}
            {activeCategory === 'LEASE' && (
              <div className="space-y-4 border-b pb-6 border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">
                      Lease Scheme
                    </label>
                    <Select
                      value={leaseType}
                      onValueChange={(val: 'EMI' | 'FSM') => setLeaseType(val)}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMI">EMI Instalments Scheme</SelectItem>
                        <SelectItem value="FSM">Free Service Lease (FSM Rental)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">
                      Tenure (Months)
                    </label>
                    <Input
                      type="number"
                      value={leaseTenureMonths}
                      onChange={(e) => setLeaseTenureMonths(e.target.value)}
                      placeholder="e.g. 12"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500">
                      Total Valuation (QAR)
                    </label>
                    <Input
                      type="number"
                      value={totalLeaseAmount}
                      onChange={(e) => {
                        setTotalLeaseAmount(e.target.value);
                        setLastEditedLease('TOTAL');
                      }}
                      placeholder="e.g. 12000"
                      className="text-xs h-9 font-bold"
                    />
                  </div>
                </div>

                {leaseType === 'EMI' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">
                        Monthly EMI (QAR)
                      </label>
                      <Input
                        type="number"
                        value={monthlyEmiAmount}
                        onChange={(e) => {
                          setMonthlyEmiAmount(e.target.value);
                          setLastEditedLease('PERIODIC');
                        }}
                        className="text-xs h-9 font-bold text-primary bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg border">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">
                        Rent Type
                      </label>
                      <Select value={rentType} onValueChange={setRentType}>
                        <SelectTrigger className="text-xs h-9 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXED_LIMIT">Fixed Copies Limit (BW/CL)</SelectItem>
                          <SelectItem value="FIXED_COMBO">Combined Copies Limit</SelectItem>
                          <SelectItem value="FIXED_FLAT">
                            Fixed Flat Rate (No Free Limit)
                          </SelectItem>
                          <SelectItem value="CPC">
                            CPC Billing (No Rent, Charge per click)
                          </SelectItem>
                          <SelectItem value="CPC_COMBO">
                            CPC Combo Billing (Charge combined per click)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">
                        Billing Cycle
                      </label>
                      <Select value={rentPeriod} onValueChange={setRentPeriod}>
                        <SelectTrigger className="text-xs h-9 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">
                        Monthly Base Rent (QAR)
                      </label>
                      <Input
                        type="number"
                        value={monthlyRent}
                        onChange={(e) => {
                          setMonthlyRent(e.target.value);
                          setLastEditedLease('PERIODIC');
                        }}
                        disabled={rentType.startsWith('CPC')}
                        className="text-xs h-9 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-500">
                        Discount Percent (%)
                      </label>
                      <Input
                        type="number"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(e.target.value)}
                        className="text-xs h-9 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Security Deposit (Rental / Lease only) */}
            {(activeCategory === 'RENT' || activeCategory === 'LEASE') && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Advance / Caution Deposit
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700">Amount (QAR)</label>
                    <Input
                      type="number"
                      value={securityDepositAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSecurityDepositAmount(val);
                        setAdvanceAmount(val);
                      }}
                      placeholder="e.g. 1000"
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700">Deposit Mode</label>
                    <Select
                      value={securityDepositMode}
                      onValueChange={(val: 'CASH' | 'CHEQUE') => setSecurityDepositMode(val)}
                    >
                      <SelectTrigger className="text-xs h-9 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CHEQUE">Cheque / PDC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Product selection panel */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Select Products
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addManualItem}
                  className="h-8 text-xs font-bold text-slate-600 gap-1"
                >
                  <Plus size={12} /> Add Custom Item
                </Button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border">
                <ProductSelect onSelect={addItem} />
              </div>

              {/* Items Table */}
              {saleItems.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold">ITEM DESCRIPTION</TableHead>
                        <TableHead className="font-bold text-right w-24">QTY</TableHead>
                        {activeCategory === 'SALE' && (
                          <>
                            <TableHead className="font-bold text-right w-28">PRICE (QAR)</TableHead>
                            <TableHead className="font-bold text-right w-28">DISCOUNT</TableHead>
                            <TableHead className="font-bold text-right w-28">TOTAL</TableHead>
                          </>
                        )}
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saleItems.map((item, i) => (
                        <React.Fragment key={i}>
                          <TableRow className="bg-white">
                            <TableCell className="font-bold text-slate-700">
                              {item.isManual ? (
                                <div className="grid grid-cols-4 gap-2">
                                  <Input
                                    value={item.brand || ''}
                                    placeholder="Brand"
                                    onChange={(e) => updateItemField(i, 'brand', e.target.value)}
                                    className="text-xs h-8"
                                  />
                                  <Input
                                    value={item.model || ''}
                                    placeholder="Model"
                                    onChange={(e) => updateItemField(i, 'model', e.target.value)}
                                    className="text-xs h-8"
                                  />
                                  <Input
                                    value={item.productName || ''}
                                    placeholder="Product Name"
                                    onChange={(e) =>
                                      updateItemField(i, 'productName', e.target.value)
                                    }
                                    className="text-xs h-8"
                                  />
                                  <Input
                                    value={item.hsCode || ''}
                                    placeholder="HS Code (Optional)"
                                    onChange={(e) => updateItemField(i, 'hsCode', e.target.value)}
                                    className="text-xs h-8"
                                  />
                                </div>
                              ) : (
                                <span>{item.description}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemField(i, 'quantity', e.target.value)}
                                className="text-xs h-8 text-right w-20 ml-auto font-bold"
                              />
                            </TableCell>
                            {activeCategory === 'SALE' && (
                              <>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    value={item.basePrice}
                                    onChange={(e) =>
                                      updateItemField(i, 'basePrice', e.target.value)
                                    }
                                    readOnly={!item.isEditable}
                                    className={`text-xs h-8 text-right w-24 ml-auto font-bold ${
                                      !item.isEditable ? 'bg-slate-50 text-slate-500' : ''
                                    }`}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    value={item.discount}
                                    onChange={(e) => updateItemField(i, 'discount', e.target.value)}
                                    placeholder={`max ${item.maxDiscount}`}
                                    className="text-xs h-8 text-right w-24 ml-auto font-bold text-red-600"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-800">
                                  {formatCurrency(item.quantity * item.unitPrice)}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(i)}
                                className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Slabs / limits config row for Rent & FSM Lease */}
                          {(activeCategory === 'RENT' ||
                            (activeCategory === 'LEASE' && leaseType === 'FSM')) && (
                            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                              <TableCell colSpan={3} className="p-3 pl-8">
                                <div className="space-y-4">
                                  {/* Limit configuration */}
                                  <div className="grid grid-cols-3 gap-4">
                                    {(rentType === 'FIXED_LIMIT' || rentType === 'CPC') && (
                                      <>
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-500">
                                            BW Included Limit
                                          </label>
                                          <Input
                                            type="number"
                                            value={item.bwIncludedLimit || ''}
                                            onChange={(e) =>
                                              updateItemField(i, 'bwIncludedLimit', e.target.value)
                                            }
                                            placeholder="e.g. 3000"
                                            className="text-xs h-8 bg-white"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-500">
                                            Color Included Limit
                                          </label>
                                          <Input
                                            type="number"
                                            value={item.colorIncludedLimit || ''}
                                            onChange={(e) =>
                                              updateItemField(
                                                i,
                                                'colorIncludedLimit',
                                                e.target.value,
                                              )
                                            }
                                            placeholder="e.g. 500"
                                            className="text-xs h-8 bg-white"
                                          />
                                        </div>
                                      </>
                                    )}

                                    {rentType === 'FIXED_COMBO' && (
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500">
                                          Combined Limit
                                        </label>
                                        <Input
                                          type="number"
                                          value={item.combinedIncludedLimit || ''}
                                          onChange={(e) =>
                                            updateItemField(
                                              i,
                                              'combinedIncludedLimit',
                                              e.target.value,
                                            )
                                          }
                                          placeholder="e.g. 4000"
                                          className="text-xs h-8 bg-white"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Excess rate configuration */}
                                  <div className="grid grid-cols-3 gap-4">
                                    {(rentType === 'FIXED_LIMIT' || rentType === 'CPC') && (
                                      <>
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-500">
                                            BW Excess Rate (QAR)
                                          </label>
                                          <Input
                                            type="number"
                                            step="0.001"
                                            value={item.bwExcessRate || ''}
                                            onChange={(e) =>
                                              updateItemField(i, 'bwExcessRate', e.target.value)
                                            }
                                            placeholder="e.g. 0.035"
                                            className="text-xs h-8 bg-white font-bold"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] font-bold text-slate-500">
                                            Color Excess Rate (QAR)
                                          </label>
                                          <Input
                                            type="number"
                                            step="0.001"
                                            value={item.colorExcessRate || ''}
                                            onChange={(e) =>
                                              updateItemField(i, 'colorExcessRate', e.target.value)
                                            }
                                            placeholder="e.g. 0.350"
                                            className="text-xs h-8 bg-white font-bold"
                                          />
                                        </div>
                                      </>
                                    )}

                                    {(rentType === 'FIXED_COMBO' || rentType === 'CPC_COMBO') && (
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-slate-500">
                                          Combined Excess Rate (QAR)
                                        </label>
                                        <Input
                                          type="number"
                                          step="0.001"
                                          value={item.combinedExcessRate || ''}
                                          onChange={(e) =>
                                            updateItemField(i, 'combinedExcessRate', e.target.value)
                                          }
                                          placeholder="e.g. 0.050"
                                          className="text-xs h-8 bg-white font-bold"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Slabs configuration */}
                                  {(rentType === 'FIXED_LIMIT' ||
                                    rentType === 'CPC' ||
                                    rentType === 'FIXED_COMBO') && (
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center border-t pt-2 mt-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                          Excess Charging Slabs (Optional)
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* BW Slabs */}
                                        {(rentType === 'FIXED_LIMIT' || rentType === 'CPC') && (
                                          <div className="space-y-2 bg-white p-2.5 rounded-lg border">
                                            <div className="flex justify-between items-center">
                                              <span className="text-[9px] font-bold text-slate-600">
                                                Black & White Slabs
                                              </span>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addSlabRange(i, 'bw')}
                                                className="h-6 text-[8px] font-bold px-2"
                                              >
                                                + Add BW Slab
                                              </Button>
                                            </div>

                                            {(item.bwSlabRanges || []).map((slab, sIdx) => (
                                              <div key={sIdx} className="flex items-center gap-1.5">
                                                <Input
                                                  type="number"
                                                  value={slab.from}
                                                  placeholder="From"
                                                  onChange={(e) =>
                                                    updateSlabField(
                                                      i,
                                                      'bw',
                                                      sIdx,
                                                      'from',
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="text-[10px] h-7 px-1 text-center"
                                                />
                                                <span className="text-slate-400 font-bold">-</span>
                                                <Input
                                                  type="number"
                                                  value={slab.to}
                                                  placeholder="To"
                                                  onChange={(e) =>
                                                    updateSlabField(
                                                      i,
                                                      'bw',
                                                      sIdx,
                                                      'to',
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="text-[10px] h-7 px-1 text-center"
                                                />
                                                <Input
                                                  type="number"
                                                  step="0.001"
                                                  value={slab.rate}
                                                  placeholder="Rate"
                                                  onChange={(e) =>
                                                    updateSlabField(
                                                      i,
                                                      'bw',
                                                      sIdx,
                                                      'rate',
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="text-[10px] h-7 px-1 text-center font-bold"
                                                />
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeSlabRange(i, 'bw', sIdx)}
                                                  className="h-6 w-6 p-0 text-red-500"
                                                >
                                                  ×
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Color Slabs */}
                                        {(rentType === 'FIXED_LIMIT' || rentType === 'CPC') && (
                                          <div className="space-y-2 bg-white p-2.5 rounded-lg border">
                                            <div className="flex justify-between items-center">
                                              <span className="text-[9px] font-bold text-slate-600">
                                                Color Slabs
                                              </span>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addSlabRange(i, 'color')}
                                                className="h-6 text-[8px] font-bold px-2"
                                              >
                                                + Add Color Slab
                                              </Button>
                                            </div>

                                            {(item.colorSlabRanges || []).map((slab, sIdx) => (
                                              <div key={sIdx} className="flex items-center gap-1.5">
                                                <Input
                                                  type="number"
                                                  value={slab.from}
                                                  placeholder="From"
                                                  onChange={(e) =>
                                                    updateSlabField(
                                                      i,
                                                      'color',
                                                      sIdx,
                                                      'from',
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="text-[10px] h-7 px-1 text-center"
                                                />
                                                <span className="text-slate-400 font-bold">-</span>
                                                <Input
                                                  type="number"
                                                  value={slab.to}
                                                  placeholder="To"
                                                  onChange={(e) =>
                                                    updateSlabField(
                                                      i,
                                                      'color',
                                                      sIdx,
                                                      'to',
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="text-[10px] h-7 px-1 text-center"
                                                />
                                                <Input
                                                  type="number"
                                                  step="0.001"
                                                  value={slab.rate}
                                                  placeholder="Rate"
                                                  onChange={(e) =>
                                                    updateSlabField(
                                                      i,
                                                      'color',
                                                      sIdx,
                                                      'rate',
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="text-[10px] h-7 px-1 text-center font-bold"
                                                />
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeSlabRange(i, 'color', sIdx)}
                                                  className="h-6 w-6 p-0 text-red-500"
                                                >
                                                  ×
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Combo Slabs */}
                                        {rentType === 'FIXED_COMBO' && (
                                          <div className="space-y-2 bg-white p-2.5 rounded-lg border col-span-2">
                                            <div className="flex justify-between items-center">
                                              <span className="text-[9px] font-bold text-slate-600">
                                                Combined Slabs
                                              </span>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addSlabRange(i, 'combo')}
                                                className="h-6 text-[8px] font-bold px-2"
                                              >
                                                + Add Combined Slab
                                              </Button>
                                            </div>

                                            {(item.comboSlabRanges || []).map((slab, sIdx) => (
                                              <div key={sIdx} className="flex items-center gap-1.5">
                                                <Input
                                                  type="number"
                                                  value={slab.from}
                                                  placeholder="From"
                                                  onChange={(e) =>
                                                    updateSlabField(
                                                      i,
                                                      'combo',
                                                      sIdx,
                                                      'from',
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="text-[10px] h-7 px-1 text-center"
                                                />
                                                <span className="text-slate-400 font-bold">-</span>
                                                <Input
                                                  type="number"
                                                  value={slab.to}
                                                  placeholder="To"
                                                  onChange={(e) =>
                                                    updateSlabField(
                                                      i,
                                                      'combo',
                                                      sIdx,
                                                      'to',
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="text-[10px] h-7 px-1 text-center"
                                                />
                                                <Input
                                                  type="number"
                                                  step="0.001"
                                                  value={slab.rate}
                                                  placeholder="Rate"
                                                  onChange={(e) =>
                                                    updateSlabField(
                                                      i,
                                                      'combo',
                                                      sIdx,
                                                      'rate',
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="text-[10px] h-7 px-1 text-center font-bold"
                                                />
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => removeSlabRange(i, 'combo', sIdx)}
                                                  className="h-6 w-6 p-0 text-red-500"
                                                >
                                                  ×
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Notes / remarks */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Internal Remarks / Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specify lease terms, contract conditions, or reference codes..."
                className="text-xs h-20"
              />
            </div>

            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || saleItems.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-8"
              >
                {isSubmitting ? 'Saving Template...' : 'Save Template'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

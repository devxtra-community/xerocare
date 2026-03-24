'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { HelpCircle, Shield, Package, LayoutDashboard, Settings } from 'lucide-react';

interface HelpGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpGuideDialog({ open, onOpenChange }: HelpGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Xerocare User Guide</DialogTitle>
              <DialogDescription>
                Everything you need to know about using the Xerocare Enterprise Application.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Overview Section */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <LayoutDashboard className="h-5 w-5 text-blue-500" />
              1. System Overview & Purpose
            </h3>
            <div className="text-sm text-muted-foreground space-y-3 pl-7">
              <p>
                <strong>Xerocare</strong> is an enterprise resource planning (ERP) system designed
                specifically for managing multi-branch operations, warehouse inventory, employee
                payroll, and financial analytics.
              </p>
              <p>
                The primary advantage of Xerocare is its centralized cloud architecture. It
                eliminates data silos between departments, ensuring that when an HR Manager runs
                payroll, the Finance Dashboard updates instantly, and when a Warehouse Manager
                registers a new Shipment (Lot), the overarching Admin can track the expenses
                dynamically.
              </p>
            </div>
          </section>

          {/* Roles & Permissions */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-green-500" />
              2. Roles & Permissions
            </h3>
            <div className="text-sm text-muted-foreground space-y-4 pl-7">
              <p>Access is tightly controlled based on your assigned role:</p>
              <ul className="list-disc pl-4 space-y-2">
                <li>
                  <strong>ADMIN:</strong> Unrestricted access. Can manage global settings, view all
                  branches, supervise all transactions, and modify existing users.
                </li>
                <li>
                  <strong>MANAGER:</strong> Branch-specific leaders. They create Lots, issue RFQs
                  (Request for Quotations), and manage Inventory for their designated branch.
                </li>
                <li>
                  <strong>HR:</strong> Responsible for Employee Management, Attendance tracking, and
                  generating Payroll (Salaries).
                </li>
                <li>
                  <strong>FINANCE:</strong> Handles Accounts Payable (AP), Accounts Receivable (AR),
                  revenue tracking, expense reports, and ledger bookkeeping.
                </li>
                <li>
                  <strong>EMPLOYEE:</strong> Deals with daily operational tasks like logging Sales,
                  handling Leads, and managing Customer Accounts.
                </li>
              </ul>
            </div>
          </section>

          {/* Core Workflows - Lots & Products */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-orange-500" />
              3. Managing Inventory (Lots & Products)
            </h3>
            <div className="text-sm text-muted-foreground space-y-3 pl-7">
              <p>How to add inventory and manage shipments:</p>
              <ol className="list-decimal pl-4 space-y-3">
                <li>
                  <strong>Creating a Lot:</strong> Only <em>Managers</em> and <em>Admins</em> can
                  create Lots. A Lot represents a batch of goods imported or procured from a vendor.
                  Navigate to <strong>Purchases &gt; Lots</strong> and click &quot;Create Lot&quot;.
                </li>
                <li>
                  <strong>Adding Products to a Lot:</strong> After a lot is registered, you can
                  start associating specific Products and Spare Parts to it. This step tracks what
                  precisely was delivered in that shipment.
                </li>
                <li>
                  <strong>Updating Pricing:</strong> Prices, shipping costs, and customs duties are
                  applied at the Lot level. The system will evenly distribute these costs across the
                  connected products.
                </li>
                <li>
                  <strong>Receiving Goods:</strong> Verify the shipment on the &quot;Receiving&quot;
                  screen. Once verified, the products automatically increment the global Inventory
                  levels.
                </li>
              </ol>
            </div>
          </section>

          {/* Settings & Notifications */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Settings className="h-5 w-5 text-purple-500" />
              4. Notifications & Settings
            </h3>
            <div className="text-sm text-muted-foreground space-y-3 pl-7">
              <p>
                <strong>Notifications (The Bell Icon):</strong> The system pushes real-time alerts
                right here. For instance, when a Manager successfully Creates a Lot or HR runs
                Payroll, Admins will receive a notification.
              </p>
              <p>
                <strong>Device Sessions:</strong> Under your profile dropdown, you can access
                &quot;Session Info&quot; to securely monitor and sign out any other active computers
                or devices that are logged into your account.
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { InvoiceRepository } from '../repositories/invoiceRepository';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';
import { UsageRecord } from '../entities/usageRecordEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { Invoice } from '../entities/invoiceEntity';

export class NotificationService {
  private invoiceRepo = new InvoiceRepository();

  /**
   * Sends the consolidated invoice via email/WhatsApp.
   */
  async sendConsolidatedInvoice(contractId: string) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    try {
      const customerDetails = await this.getCustomerDetails(contract.customerId);
      const history = await new (
        await import('../repositories/usageRepository')
      ).UsageRepository().getUsageHistory(contract.id, 'ASC');

      const customerName = customerDetails?.firstName
        ? `${customerDetails.firstName} ${customerDetails.lastName || ''}`.trim()
        : (contract as { customerName?: string }).customerName || 'Customer';

      const customerEmail =
        customerDetails?.email || (contract as { customerEmail?: string }).customerEmail;
      const invoiceNumber = contract.invoiceNumber;

      if (!customerEmail) {
        throw new AppError('Customer email not found', 400);
      }

      // --- HTML Generation Logic (Corrected Field Mapping & Formatting) ---
      const formatCurrency = (amount: number) =>
        `QAR ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

      let historyRows = '';
      let calculatedGrossTotal = 0;
      let calculatedAdvanceAdjusted = 0;

      history.forEach((record: UsageRecord) => {
        const period = `${new Date(record.billingPeriodStart).toLocaleDateString()} - ${new Date(
          record.billingPeriodEnd,
        ).toLocaleDateString()}`;

        // Calculate Total Usage (including A3 multiplier)
        const bwA4D = Number(record.bwA4Delta || 0);
        const bwA3D = Number(record.bwA3Delta || 0);
        const colorA4D = Number(record.colorA4Delta || 0);
        const colorA3D = Number(record.colorA3Delta || 0);
        const usage = bwA4D + bwA3D * 2 + (colorA4D + colorA3D * 2);

        const rent = Number(record.monthlyRent || 0);
        const excess = Number(record.exceededCharge || 0);
        const monthTotal = rent + excess; // This month's billing before advance adjustment

        calculatedGrossTotal += monthTotal;
        calculatedAdvanceAdjusted += Number(record.advanceAdjusted || 0);

        historyRows += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${period}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px;">${usage.toLocaleString()}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px;">${formatCurrency(
                  rent,
                )}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px; color: ${
                  excess > 0 ? '#e53e3e' : 'inherit'
                };">${formatCurrency(excess)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px; font-weight: bold;">${formatCurrency(
                  monthTotal,
                )}</td>
            </tr>
        `;
      });

      const securityDeposit = Number(contract.securityDepositAmount || 0);
      const advanceAmountCollected = Number(contract.advanceAmount || 0);
      const discountAmount = Number(contract.discountAmount || 0);

      const grandTotal = calculatedGrossTotal - calculatedAdvanceAdjusted - discountAmount;

      let securityDepositRow = '';
      if (securityDeposit > 0) {
        securityDepositRow = `
            <div style="margin-top: 15px; padding: 15px; background-color: #f0f7ff; border-radius: 8px; border: 1px solid #c3dafe;">
                <span style="font-size: 12px; font-weight: bold; color: #1e40af; text-transform: uppercase; letter-spacing: 0.05em;">Security Deposit Held</span>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 5px;">
                    <span style="font-size: 24px; font-weight: 900; color: #1e40af;">${formatCurrency(
                      securityDeposit,
                    )}</span>
                    <span style="font-size: 10px; color: #60a5fa; background: #fff; padding: 2px 8px; border-radius: 99px; font-weight: bold;">RECORDED</span>
                </div>
            </div>
         `;
      }

      let discountSettlementRow = '';
      if (discountAmount > 0) {
        discountSettlementRow = `
            <div style="margin-top: 10px; padding: 10px; background-color: #f0fff4; border-radius: 8px; border: 1px solid #c6f6d5; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 800; color: #2f855a; text-transform: uppercase;">Discount Applied</span>
                <span style="font-size: 14px; font-weight: 900; color: #2f855a;">-${formatCurrency(discountAmount)}</span>
            </div>
        `;
      }

      let pricingRulesHTML = '';
      const pricingRules = (contract.items || []).filter(
        (i: InvoiceItem) => i.itemType === 'PRICING_RULE',
      );
      if (pricingRules.length > 0) {
        let rulesRows = '';
        pricingRules.forEach((rule: InvoiceItem) => {
          rulesRows += `
            <div style="margin-bottom: 15px; padding: 15px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
              <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #111827;">${rule.description}</h4>
          `;

          if (rule.bwIncludedLimit || rule.colorIncludedLimit) {
            rulesRows += `<div style="margin-bottom: 10px; font-size: 12px; color: #4b5563;">`;
            if (rule.bwIncludedLimit)
              rulesRows += `<span style="margin-right: 15px;"><strong>B/W Included:</strong> ${rule.bwIncludedLimit}</span>`;
            if (rule.colorIncludedLimit)
              rulesRows += `<span><strong>Color Included:</strong> ${rule.colorIncludedLimit}</span>`;
            rulesRows += `</div>`;
          }

          const renderSlabs = (
            slabs: Array<{ from: number; to: number; rate: number }>,
            title: string,
            excessRate?: number,
          ) => {
            if ((!slabs || slabs.length === 0) && !excessRate) return '';
            let html = `<div style="margin-bottom: 10px;"><strong style="font-size: 11px; text-transform: uppercase; color: #6b7280;">${title} Slabs:</strong><table style="width: 100%; border-collapse: collapse; margin-top: 5px;">`;
            if (slabs && slabs.length > 0) {
              slabs.forEach((s) => {
                html += `<tr><td style="padding: 4px 0; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">${s.from} - ${s.to}</td><td style="padding: 4px 0; font-size: 12px; font-weight: 600; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">QAR ${s.rate}</td></tr>`;
              });
              if (excessRate) {
                const maxTo = Math.max(...slabs.map((s) => Number(s.to) || 0));
                html += `<tr><td style="padding: 4px 0; font-size: 12px; color: #374151;">> ${maxTo}</td><td style="padding: 4px 0; font-size: 12px; font-weight: 600; text-align: right; color: #111827;">QAR ${excessRate}</td></tr>`;
              }
            } else if (excessRate) {
              html += `<tr><td style="padding: 4px 0; font-size: 12px; color: #374151;">Base Rate</td><td style="padding: 4px 0; font-size: 12px; font-weight: 600; text-align: right; color: #111827;">QAR ${excessRate}</td></tr>`;
            }
            html += `</table></div>`;
            return html;
          };

          rulesRows += renderSlabs(rule.bwSlabRanges || [], 'Black & White', rule.bwExcessRate);
          rulesRows += renderSlabs(rule.colorSlabRanges || [], 'Color', rule.colorExcessRate);
          rulesRows += renderSlabs(rule.comboSlabRanges || [], 'Combined', rule.combinedExcessRate);

          rulesRows += `</div>`;
        });

        pricingRulesHTML = `
          <div style="margin-bottom: 30px;">
            <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 800; color: #374151; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Pricing Details</h3>
            ${rulesRows}
          </div>
        `;
      }

      const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.025em;">Statement of Account</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280; font-weight: 500;">Contract #${invoiceNumber}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
            <p style="margin: 0; font-size: 16px; line-height: 24px;">Dear <strong>${customerName}</strong>,</p>
            <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 24px; color: #4b5563;">Please find below the consolidated statement for your contract. This summary includes all usage and final settlement details.</p>
        </div>

        ${pricingRulesHTML}

        <div style="margin-bottom: 40px;">
            <h3 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 800; color: #374151; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Transaction History</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f9fafb;">
                        <th style="padding: 12px 8px; text-align: left; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Period</th>
                        <th style="padding: 12px 8px; text-align: right; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Usage</th>
                        <th style="padding: 12px 8px; text-align: right; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Rent</th>
                        <th style="padding: 12px 8px; text-align: right; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Excess</th>
                        <th style="padding: 12px 8px; text-align: right; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${historyRows}
                    ${
                      discountAmount > 0
                        ? `
                    <tr style="background-color: #f0fff4;">
                        <td colspan="4" style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #2f855a; font-weight: 700;">Discount Applied</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 900; color: #2f855a;">-${formatCurrency(
                          discountAmount,
                        )}</td>
                    </tr>
                    `
                        : ''
                    }
                    ${
                      advanceAmountCollected > 0
                        ? `
                    <tr style="background-color: #fef3c7;">
                        <td colspan="4" style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #92400e; font-weight: 700;">Advance Amount (Adjustable)</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 900; color: #92400e;">${formatCurrency(
                          advanceAmountCollected,
                        )}</td>
                    </tr>
                    `
                        : ''
                    }
                    ${
                      securityDeposit > 0
                        ? `
                    <tr style="background-color: #f0f7ff;">
                        <td colspan="4" style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #1e40af; font-weight: 700;">Security Deposit (Collected)</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 900; color: #1e40af;">${formatCurrency(
                          securityDeposit,
                        )}</td>
                    </tr>
                    `
                        : ''
                    }
                </tbody>
                <tfoot>
                    <tr style="border-top: 2px solid #f3f4f6;">
                        <td colspan="4" style="padding: 20px 12px 10px 12px; text-align: right; font-size: 14px; font-weight: 700; color: #374151;">Total Billed (Gross):</td>
                        <td style="padding: 20px 12px 10px 12px; text-align: right; font-size: 16px; font-weight: 800; color: #111827;">${formatCurrency(
                          calculatedGrossTotal,
                        )}</td>
                    </tr>
                    ${
                      discountAmount > 0
                        ? `
                    <tr>
                        <td colspan="4" style="padding: 5px 12px; text-align: right; font-size: 14px; font-weight: 700; color: #2f855a;">Less: Total Discount:</td>
                        <td style="padding: 5px 12px; text-align: right; font-size: 16px; font-weight: 800; color: #2f855a;">-${formatCurrency(
                          discountAmount,
                        )}</td>
                    </tr>
                    `
                        : ''
                    }
                    ${
                      calculatedAdvanceAdjusted > 0
                        ? `
                    <tr>
                        <td colspan="4" style="padding: 5px 12px; text-align: right; font-size: 14px; font-weight: 700; color: #3182ce;">Less: Total Advance Adjusted:</td>
                        <td style="padding: 5px 12px; text-align: right; font-size: 16px; font-weight: 800; color: #3182ce;">-${formatCurrency(
                          calculatedAdvanceAdjusted,
                        )}</td>
                    </tr>
                    `
                        : ''
                    }
                </tfoot>
            </table>
        </div>

        <div style="background-color: #f9fafb; border-radius: 16px; padding: 30px; border: 1px solid #f3f4f6;">
            <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                <span style="font-size: 11px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">Final Settlement</span>
                <div style="margin-bottom: 4px;">
                    <span style="font-size: 40px; font-weight: 900; color: #111827; letter-spacing: -0.05em;">${formatCurrency(
                      grandTotal,
                    )}</span>
                </div>
                <span style="display: inline-block; background-color: #e5e7eb; color: #4b5563; font-size: 10px; font-weight: 800; padding: 4px 12px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.05em;">Grand Total Due</span>
            </div>

            ${securityDepositRow}
            ${discountSettlementRow}
        </div>

        <div style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #f3f4f6; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #9ca3af;">Thank you for your business. For any queries, please contact our accounts department.</p>
        </div>
      </div>
    `;

      const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');

      await NotificationPublisher.publishEmailRequest({
        recipient: customerEmail,
        subject: `Statement of Account - #${invoiceNumber}`,
        body: htmlBody,
        invoiceId: contract.id,
      });

      logger.info(
        `[Email Service] Published consolidated invoice email task for ${contract.invoiceNumber} via NotificationPublisher`,
      );
    } catch (error) {
      logger.error('Failed to publish email task to NotificationPublisher', error);
      throw error;
    }

    contract.emailSentAt = new Date();
    await this.invoiceRepo.save(contract);

    return { success: true, message: 'Invoice sending queued successfully' };
  }

  /**
   * Sends a generic email notification.
   */
  async sendEmailNotification(
    contractId: string,
    recipient: string,
    subject: string,
    body: string,
    attachments?: { filename: string; content: string; encoding: string }[],
  ) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');

    await NotificationPublisher.publishEmailRequest({
      recipient,
      subject,
      body,
      invoiceId: contract.id,
      attachments,
    });

    contract.emailSentAt = new Date();
    await this.invoiceRepo.save(contract);
  }

  /**
   * Sends a generic WhatsApp notification.
   */
  async sendWhatsappNotification(contractId: string, recipient: string, body: string) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');

    await NotificationPublisher.publishWhatsappRequest({
      recipient,
      body,
      invoiceId: contract.id,
    });
  }

  private async getCustomerDetails(customerId: string | null | undefined) {
    if (!customerId) return null;
    try {
      const crmServiceUrl = process.env.CRM_SERVICE_URL || 'http://localhost:3005';
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN' },
        process.env.ACCESS_SECRET as string,
        { expiresIn: '1m' },
      );

      const response = await fetch(`${crmServiceUrl}/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    } catch {
      return null;
    }
  }

  /**
   * Sends a confirmation email to the customer when a lease is accepted, including warranty details.
   */
  async sendWarrantyConfirmationEmail(contractId: string) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (
      !contract ||
      contract.saleType !== 'LEASE' ||
      !contract.warrantyType ||
      contract.warrantyType === 'none'
    ) {
      return;
    }
    if (contract.warrantyEmailSent) return;

    try {
      const customerDetails = await this.getCustomerDetails(contract.customerId);
      const customerEmail =
        customerDetails?.email || (contract as Invoice & { customerEmail?: string }).customerEmail;
      if (!customerEmail) {
        logger.warn(`No email found for customer in contract ${contract.id}`);
        return;
      }

      const customerName = customerDetails?.firstName
        ? `${customerDetails.firstName} ${customerDetails.lastName || ''}`.trim()
        : (contract as Invoice & { customerName?: string }).customerName || 'Customer';

      const productsList = (contract.productAllocations || [])
        .map(
          (p) => `
          <div style="padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 8px;">
            <p style="margin: 0; font-size: 14px;"><strong>Model:</strong> ${p.serialNumber.split('-')[0]} (${
              p.serialNumber
            })</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">Initial Meter: ${
              p.initialBwA4
            } (B/W), ${p.initialColorA4} (Color)</p>
          </div>
        `,
        )
        .join('');

      const agreementDetails = `
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <p style="margin: 5px 0; font-size: 13px;"><strong>Lease Type:</strong> ${
                contract.leaseType || 'N/A'
              }</p>
              <p style="margin: 5px 0; font-size: 13px;"><strong>Tenure:</strong> ${
                contract.leaseTenureMonths || 0
              } Months</p>
              <p style="margin: 5px 0; font-size: 13px;"><strong>Start Date:</strong> ${new Date(
                contract.effectiveFrom,
              ).toLocaleDateString()}</p>
              ${
                contract.effectiveTo
                  ? `<p style="margin: 5px 0; font-size: 13px;"><strong>Expiry Date:</strong> ${new Date(
                      contract.effectiveTo,
                    ).toLocaleDateString()}</p>`
                  : ''
              }
            </div>
            <div>
              <p style="margin: 5px 0; font-size: 13px;"><strong>Monthly Rent:</strong> QAR ${Number(
                contract.monthlyLeaseAmount || contract.monthlyRent || 0,
              ).toLocaleString()}</p>
              <p style="margin: 5px 0; font-size: 13px;"><strong>Advance Paid:</strong> QAR ${Number(
                contract.advanceAmount || 0,
              ).toLocaleString()}</p>
              <p style="margin: 5px 0; font-size: 13px;"><strong>Security Deposit:</strong> QAR ${Number(
                contract.securityDepositAmount || 0,
              ).toLocaleString()}</p>
              <p style="margin: 5px 0; font-size: 13px;"><strong>Billing Cycle:</strong> ${
                contract.billingCycleInDays || 30
              } Days</p>
            </div>
          </div>
        </div>
      `;

      // Build warranty info string
      const warrantyInfo =
        contract.warrantyType === 'duration'
          ? `${contract.warrantyDurationValue || ''} ${contract.warrantyDurationUnit || ''}`.trim()
          : contract.warrantyCopyLimit
            ? `${contract.warrantyCopyLimit.toLocaleString()} copies`
            : 'N/A';

      // Build optional notes section
      const notesSection = contract.notes
        ? `<div style="margin-top: 25px; padding: 15px; background-color: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">Additional Notes</h4>
            <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.6;">${contract.notes}</p>
          </div>`
        : '';

      const htmlBody = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; color: #374151;">
          <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 25px;">
            <h1 style="color: #1e3a8a; margin: 0; font-size: 24px;">Lease Agreement & Warranty Confirmation</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Contract Reference: ${contract.invoiceNumber}</p>
          </div>

          <p>Dear <strong>${customerName}</strong>,</p>
          <p>We are pleased to confirm that your lease agreement with Xerocare has been successfully activated. Below are the finalized details of your contract, allocated equipment, and warranty coverage.</p>
          
          <h3 style="font-size: 18px; color: #1e3a8a; border-left: 4px solid #3b82f6; padding-left: 10px; margin-top: 30px;">1. Lease Agreement Details</h3>
          ${agreementDetails}

          <h3 style="font-size: 18px; color: #1e3a8a; border-left: 4px solid #3b82f6; padding-left: 10px; margin-top: 30px;">2. Allocated Equipment</h3>
          <div style="margin: 15px 0;">
            ${productsList || '<p style="font-style: italic; color: #9ca3af;">No specific machines listed.</p>'}
          </div>

          <h3 style="font-size: 18px; color: #1e3a8a; border-left: 4px solid #3b82f6; padding-left: 10px; margin-top: 30px;">3. Warranty Coverage</h3>
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; border: 1px solid #bae6fd; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Warranty Type:</strong> ${
              contract.warrantyType === 'duration' ? 'By Duration' : 'By Count of Copies'
            }</p>
            <p style="margin: 5px 0;"><strong>Warranty Limit:</strong> ${warrantyInfo}</p>
          </div>

          ${notesSection}

          <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; border: 1px solid #fde68a; margin-top: 35px;">
            <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 15px;">⚠️ Important Technical Support Notice</h4>
            <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
              Upon expiration of the warranty period (${warrantyInfo}), complimentary technical support, periodic maintenance, and replacement parts will no longer be provided under the initial warranty terms. 
              Subsequent technical assistance, repair services, or replacement components requested will be subject to standard service charges and parts costs at our prevailing market rates.
            </p>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 13px; color: #9ca3af;">
            <p style="margin: 0;">This is an automated confirmation. Please keep this for your records.</p>
            <p style="margin: 5px 0 0 0;">Thank you for choosing Xerocare for your office equipment needs.</p>
          </div>
        </div>
      `;

      const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
      await NotificationPublisher.publishEmailRequest({
        recipient: customerEmail,
        subject: `Lease Warranty Confirmation - ${contract.invoiceNumber}`,
        body: htmlBody,
        invoiceId: contract.id,
      });

      contract.warrantyEmailSent = true;
      await this.invoiceRepo.save(contract);
      logger.info(
        `[NotificationService] Warranty confirmation email sent for ${contract.invoiceNumber}`,
      );
    } catch (error) {
      logger.error('Failed to send warranty confirmation email', error);
    }
  }

  /**
   * Sends an automated email to the customer when their warranty expires (by duration or copy count).
   */
  async sendWarrantyExpiryEmail(contractId: string) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (
      !contract ||
      contract.saleType !== 'LEASE' ||
      !contract.warrantyType ||
      contract.warrantyType === 'none'
    ) {
      return;
    }
    if (contract.warrantyExpiryEmailSent) return;

    try {
      const customerDetails = await this.getCustomerDetails(contract.customerId);
      const customerEmail =
        customerDetails?.email || (contract as Invoice & { customerEmail?: string }).customerEmail;
      if (!customerEmail) return;

      const customerName = customerDetails?.firstName
        ? `${customerDetails.firstName} ${customerDetails.lastName || ''}`.trim()
        : (contract as Invoice & { customerName?: string }).customerName || 'Customer';

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 8px;">
          <h2 style="color: #991b1b;">Warranty Expiry Notice</h2>
          <p>Dear ${customerName},</p>
          <p>Please be advised that the warranty coverage for your lease contract <strong>${contract.invoiceNumber}</strong> has expired.</p>
          
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; border: 1px solid #fecaca; margin: 20px 0;">
             <p style="margin: 0; font-size: 14px; color: #991b1b;"><strong>Warranty Status: EXPIRED</strong></p>
          </div>

          <div style="background-color: #fffbeb; padding: 15px; border-radius: 6px; border: 1px solid #fde68a;">
            <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>Important Legal Notice:</strong></p>
            <p style="margin: 5px 0; font-size: 13px; color: #92400e; line-height: 1.5;">
              As per the terms of your lease agreement, upon expiration of the warranty period, complimentary technical support, maintenance services, and replacement parts will no longer be provided. Any technical assistance, repair services, replacement components, or related support requested from this date forward will be subject to applicable service charges and parts costs at the prevailing rates.
            </p>
          </div>

          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">If you wish to discuss extended maintenance options, please contact our support team.</p>
          <p style="margin-top: 10px; font-size: 14px; color: #6b7280;">Thank you, <br/> Xerocare Management</p>
        </div>
      `;

      const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');
      await NotificationPublisher.publishEmailRequest({
        recipient: customerEmail,
        subject: `Warranty Expiry Notice - ${contract.invoiceNumber}`,
        body: htmlBody,
        invoiceId: contract.id,
      });

      contract.warrantyExpiryEmailSent = true;
      await this.invoiceRepo.save(contract);
      logger.info(`[NotificationService] Warranty expiry email sent for ${contract.invoiceNumber}`);
    } catch (error) {
      logger.error('Failed to send warranty expiry email', error);
    }
  }
}

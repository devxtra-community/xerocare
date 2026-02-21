import { InvoiceRepository } from '../repositories/invoiceRepository';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';
import { UsageRecord } from '../entities/usageRecordEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';

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
        `₹${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

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
      const grandTotal = calculatedGrossTotal - calculatedAdvanceAdjusted;

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
                html += `<tr><td style="padding: 4px 0; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">${s.from} - ${s.to}</td><td style="padding: 4px 0; font-size: 12px; font-weight: 600; text-align: right; color: #111827; border-bottom: 1px solid #f3f4f6;">₹${s.rate}</td></tr>`;
              });
              if (excessRate) {
                const maxTo = Math.max(...slabs.map((s) => Number(s.to) || 0));
                html += `<tr><td style="padding: 4px 0; font-size: 12px; color: #374151;">> ${maxTo}</td><td style="padding: 4px 0; font-size: 12px; font-weight: 600; text-align: right; color: #111827;">₹${excessRate}</td></tr>`;
              }
            } else if (excessRate) {
              html += `<tr><td style="padding: 4px 0; font-size: 12px; color: #374151;">Base Rate</td><td style="padding: 4px 0; font-size: 12px; font-weight: 600; text-align: right; color: #111827;">₹${excessRate}</td></tr>`;
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
                      advanceAmountCollected > 0
                        ? `
                    <tr style="background-color: #fef3c7;">
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #92400e; font-weight: 700;">Advance Amount (Adjustable)</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">-</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">-</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">-</td>
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
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #1e40af; font-weight: 700;">Security Deposit (Collected)</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">-</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">-</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">-</td>
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
  ) {
    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    const { NotificationPublisher } = await import('../events/publisher/notificationPublisher');

    await NotificationPublisher.publishEmailRequest({
      recipient,
      subject,
      body,
      invoiceId: contract.id,
    });
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

  private async getCustomerDetails(customerId: string) {
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
}

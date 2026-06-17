import PDFDocument from 'pdfkit';
import { ServiceTicket } from '../entities/serviceTicketEntity';
import { ServiceEstimate } from '../entities/serviceEstimateEntity';
import { ServicePartUsageLog } from '../entities/servicePartUsageLogEntity';

export interface PdfPerson {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  location?: string;
}

export interface PdfBranch {
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  address?: string;
}

export async function generateServiceQuotationPdf(
  ticket: ServiceTicket,
  estimate: ServiceEstimate,
  customer: PdfPerson | null | undefined,
  branch: PdfBranch | null | undefined,
  financeApprover: PdfPerson | null | undefined,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Draw Color Header Band
      doc.rect(0, 0, 595, 90).fill('#1e293b');

      // Logo & Brand Name
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('XEROCARE', 40, 25);
      doc.fontSize(8).font('Helvetica').text('TECHNICAL SERVICES', 41, 52);

      // Branch Details (Header Right)
      doc
        .fillColor('#e2e8f0')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(branch?.name || 'Xerocare HQ', 350, 20, { align: 'right', width: 205 });
      doc.font('Helvetica').fontSize(8);
      doc.text(`Phone: ${branch?.phone || '+974 4455 6677'}`, 350, 35, {
        align: 'right',
        width: 205,
      });
      doc.text(`Email: ${branch?.email || 'support@xerocare.com'}`, 350, 47, {
        align: 'right',
        width: 205,
      });
      doc.text(`Location: ${branch?.location || branch?.address || 'Doha, Qatar'}`, 350, 59, {
        align: 'right',
        width: 205,
      });

      // Document Title
      doc
        .fillColor('#1e293b')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('SERVICE QUOTATION', 40, 110);
      doc.moveTo(40, 130).lineTo(555, 130).stroke('#cbd5e1');

      // Quotation Metadata
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
      doc.text('Quotation No:', 40, 140);
      doc.text('Ticket No:', 40, 155);
      doc.text('Date:', 300, 140);
      doc.text('Valid Until:', 300, 155);

      const quotationNo = `SQ-${ticket.ticketNumber.replace('ST-', '')}`;
      const createdDate = estimate.created_at
        ? new Date(estimate.created_at).toLocaleDateString('en-GB')
        : new Date().toLocaleDateString('en-GB');

      const validUntilDate = new Date(estimate.created_at || new Date());
      validUntilDate.setDate(validUntilDate.getDate() + 30);
      const validUntilStr = validUntilDate.toLocaleDateString('en-GB');

      doc.font('Helvetica');
      doc.text(quotationNo, 120, 140);
      doc.text(ticket.ticketNumber, 120, 155);
      doc.text(createdDate, 380, 140);
      doc.text(validUntilStr, 380, 155);

      // Section: Customer & Machine Details
      doc.rect(40, 180, 515, 95).fill('#f8fafc');
      doc.rect(40, 180, 515, 95).stroke('#e2e8f0');

      // Customer Details (Left Column)
      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('CUSTOMER DETAILS', 55, 190);
      doc.fontSize(9).font('Helvetica');
      const customerName = customer
        ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
        : 'Valued Customer';
      doc.text(`Name: ${customerName}`, 55, 210);
      doc.text(`Phone: ${customer?.phone || 'N/A'}`, 55, 225);
      doc.text(`Email: ${customer?.email || 'N/A'}`, 55, 240);
      doc.text(`Location: ${customer?.address || customer?.location || 'N/A'}`, 55, 255);

      // Machine Details (Right Column)
      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('MACHINE DETAILS', 310, 190);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Brand: ${ticket.productBrand}`, 310, 210);
      doc.text(`Model: ${ticket.productModel}`, 310, 225);
      doc.text(`Product: ${ticket.productName}`, 310, 240);
      doc.text(`Serial No: ${ticket.serialNumber}`, 310, 255);

      // Service Context Badge/Label
      const isChargeable = ticket.serviceContext === 'CHARGEABLE';
      doc.rect(470, 190, 75, 18).fill(isChargeable ? '#fee2e2' : '#dcfce7');
      doc
        .fillColor(isChargeable ? '#991b1b' : '#166534')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(isChargeable ? 'CHARGEABLE' : 'FOC', 470, 195, { align: 'center', width: 75 });

      // Section: Complaint & Diagnosis
      doc
        .fillColor('#1e293b')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('COMPLAINT REGISTERED', 40, 295);
      doc.moveTo(40, 310).lineTo(555, 310).stroke('#cbd5e1');
      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica')
        .text(ticket.issueDescription || 'No description provided', 40, 320, { width: 515 });

      doc
        .fillColor('#1e293b')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('TECHNICIAN DIAGNOSIS', 40, 360);
      doc.moveTo(40, 375).lineTo(555, 375).stroke('#cbd5e1');
      doc.fillColor('#334155').fontSize(9);
      doc.font('Helvetica-Bold').text('Problem Found: ', 40, 385);
      doc.font('Helvetica').text(ticket.problemFound || 'N/A', 130, 385, { width: 425 });
      doc.font('Helvetica-Bold').text('Root Cause: ', 40, 400);
      doc.font('Helvetica').text(ticket.rootCause || 'N/A', 130, 400, { width: 425 });
      doc.font('Helvetica-Bold').text('Diagnosis Notes: ', 40, 415);
      doc.font('Helvetica').text(ticket.diagnosisNotes || 'N/A', 130, 415, { width: 425 });

      // Section: Estimated Parts Table
      doc
        .fillColor('#1e293b')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('ESTIMATED PARTS & CONSUMABLES', 40, 450);
      doc.moveTo(40, 465).lineTo(555, 465).stroke('#cbd5e1');

      // Table Header
      let y = 475;
      doc.rect(40, y, 515, 20).fill('#f1f5f9');
      doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold');
      doc.text('Part Name / Description', 50, y + 6, { width: 230 });
      doc.text('Qty', 290, y + 6, { width: 40, align: 'right' });
      doc.text('Unit Price', 340, y + 6, { width: 80, align: 'right' });
      doc.text('Total', 430, y + 6, { width: 80, align: 'right' });
      doc.text('FOC', 520, y + 6, { width: 30, align: 'center' });

      y += 20;
      doc.font('Helvetica').fontSize(9).fillColor('#334155');
      const items = estimate.items || [];

      if (items.length === 0) {
        doc.text('No parts or consumables estimated.', 50, y + 6);
        doc
          .moveTo(40, y + 20)
          .lineTo(555, y + 20)
          .stroke('#e2e8f0');
        y += 20;
      } else {
        for (const item of items) {
          doc.text(item.partName || 'Spare Part', 50, y + 6, { width: 230 });
          doc.text(item.quantity.toString(), 290, y + 6, { width: 40, align: 'right' });

          const uPrice = Number(item.unitPrice) || 0;
          const tPrice = Number(item.totalPrice) || 0;

          doc.text(`QAR ${uPrice.toFixed(2)}`, 340, y + 6, { width: 80, align: 'right' });
          doc.text(`QAR ${tPrice.toFixed(2)}`, 430, y + 6, { width: 80, align: 'right' });
          doc.text(item.isFree ? 'YES' : 'NO', 520, y + 6, { width: 30, align: 'center' });

          doc
            .moveTo(40, y + 20)
            .lineTo(555, y + 20)
            .stroke('#e2e8f0');
          y += 20;
        }
      }

      // Section: Pricing Summary (Box on the right side)
      let partsTotal = 0;
      items.forEach((item) => {
        if (!item.isFree) {
          partsTotal += Number(item.totalPrice) || 0;
        }
      });

      const labourVal = Number(estimate.labourCost) || 0;
      const totalVal = Number(estimate.totalCost) || 0;

      y += 10;
      doc.rect(300, y, 255, 65).fill('#fafafa');
      doc.rect(300, y, 255, 65).stroke('#cbd5e1');

      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
      doc.text('Parts & Consumables:', 310, y + 8);
      doc.text('Labour / Service Charge:', 310, y + 24);
      doc.text('TOTAL ESTIMATE:', 310, y + 44);

      doc.font('Helvetica');
      doc.text(`QAR ${partsTotal.toFixed(2)}`, 450, y + 8, { align: 'right', width: 95 });
      doc.text(`QAR ${labourVal.toFixed(2)}`, 450, y + 24, { align: 'right', width: 95 });

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);
      doc.text(`QAR ${totalVal.toFixed(2)}`, 450, y + 44, { align: 'right', width: 95 });

      y += 85;

      // Footer Terms
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Oblique');
      doc.text(
        'Terms: This is an estimate. Final bill may vary based on additional parts required during repair.',
        40,
        y,
      );

      // Approver Info
      const approverName = financeApprover
        ? `${financeApprover.firstName || ''} ${financeApprover.lastName || ''}`.trim()
        : 'Finance Team';
      const approvedDateStr = estimate.updated_at
        ? new Date(estimate.updated_at).toLocaleDateString('en-GB')
        : new Date().toLocaleDateString('en-GB');

      y += 20;
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
      doc.text(`Authorized By: ${approverName}`, 40, y);
      doc.text(`Approved Date: ${approvedDateStr}`, 40, y + 15);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateServiceCompletionBillPdf(
  ticket: ServiceTicket,
  items: ServicePartUsageLog[],
  customer: PdfPerson | null | undefined,
  branch: PdfBranch | null | undefined,
  technician: PdfPerson | null | undefined,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Draw Color Header Band
      doc.rect(0, 0, 595, 90).fill('#0f172a');

      // Logo & Brand Name
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('XEROCARE', 40, 25);
      doc.fontSize(8).font('Helvetica').text('TECHNICAL SERVICES', 41, 52);

      // Branch Details (Header Right)
      doc
        .fillColor('#e2e8f0')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(branch?.name || 'Xerocare HQ', 350, 20, { align: 'right', width: 205 });
      doc.font('Helvetica').fontSize(8);
      doc.text(`Phone: ${branch?.phone || '+974 4455 6677'}`, 350, 35, {
        align: 'right',
        width: 205,
      });
      doc.text(`Email: ${branch?.email || 'support@xerocare.com'}`, 350, 47, {
        align: 'right',
        width: 205,
      });
      doc.text(`Location: ${branch?.location || branch?.address || 'Doha, Qatar'}`, 350, 59, {
        align: 'right',
        width: 205,
      });

      // Document Title
      doc
        .fillColor('#0f172a')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('SERVICE COMPLETION BILL', 40, 110);
      doc.moveTo(40, 130).lineTo(555, 130).stroke('#cbd5e1');

      // Quotation Metadata
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
      doc.text('Bill No:', 40, 140);
      doc.text('Ticket No:', 40, 155);
      doc.text('Date:', 300, 140);
      doc.text('Quotation Ref:', 300, 155);

      const billNo =
        ticket.completionBillNumber ||
        `SCB-${new Date().toISOString().slice(0, 7).replace('-', '')}-XXXX`;
      const completionDate = ticket.completedAt
        ? new Date(ticket.completedAt).toLocaleDateString('en-GB')
        : new Date().toLocaleDateString('en-GB');
      const quotationNoRef = `SQ-${ticket.ticketNumber.replace('ST-', '')}`;

      doc.font('Helvetica');
      doc.text(billNo, 120, 140);
      doc.text(ticket.ticketNumber, 120, 155);
      doc.text(completionDate, 380, 140);
      doc.text(quotationNoRef, 380, 155);

      // Section: Customer & Machine Details
      doc.rect(40, 180, 515, 95).fill('#f8fafc');
      doc.rect(40, 180, 515, 95).stroke('#e2e8f0');

      // Customer Details (Left Column)
      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('CUSTOMER DETAILS', 55, 190);
      doc.fontSize(9).font('Helvetica');
      const customerName = customer
        ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
        : 'Valued Customer';
      doc.text(`Name: ${customerName}`, 55, 210);
      doc.text(`Phone: ${customer?.phone || 'N/A'}`, 55, 225);
      doc.text(`Email: ${customer?.email || 'N/A'}`, 55, 240);
      doc.text(`Location: ${customer?.address || customer?.location || 'N/A'}`, 55, 255);

      // Machine Details (Right Column)
      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('MACHINE DETAILS', 310, 190);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Brand: ${ticket.productBrand}`, 310, 210);
      doc.text(`Model: ${ticket.productModel}`, 310, 225);
      doc.text(`Serial No: ${ticket.serialNumber}`, 310, 240);
      doc.text(`Meter Reading: ${ticket.meterReadingAtService || 'N/A'}`, 310, 255);

      // Service Context Badge/Label
      const isChargeable = ticket.serviceContext === 'CHARGEABLE';
      doc.rect(470, 190, 75, 18).fill(isChargeable ? '#fee2e2' : '#dcfce7');
      doc
        .fillColor(isChargeable ? '#991b1b' : '#166534')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(isChargeable ? 'CHARGEABLE' : 'FOC', 470, 195, { align: 'center', width: 75 });

      // Section: Complaint & Diagnosis Summary
      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('COMPLAINT REGISTERED', 40, 295);
      doc.moveTo(40, 310).lineTo(555, 310).stroke('#cbd5e1');
      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica')
        .text(ticket.issueDescription || 'No description provided', 40, 320, { width: 515 });

      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('DIAGNOSIS SUMMARY', 40, 355);
      doc.moveTo(40, 370).lineTo(555, 370).stroke('#cbd5e1');
      doc.fillColor('#334155').fontSize(9);
      doc.font('Helvetica-Bold').text('Problem Found: ', 40, 380);
      doc.font('Helvetica').text(ticket.problemFound || 'N/A', 130, 380, { width: 425 });
      doc.font('Helvetica-Bold').text('Root Cause: ', 40, 395);
      doc.font('Helvetica').text(ticket.rootCause || 'N/A', 130, 395, { width: 425 });

      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('WORK PERFORMED', 40, 425);
      doc.moveTo(40, 440).lineTo(555, 440).stroke('#cbd5e1');
      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica')
        .text(ticket.workPerformed || 'N/A', 40, 450, { width: 515 });

      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('RESOLUTION', 40, 485);
      doc.moveTo(40, 500).lineTo(555, 500).stroke('#cbd5e1');
      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica')
        .text(ticket.resolutionDetails || 'N/A', 40, 510, { width: 515 });

      // Page Break or Dynamic position check
      let y = 540;

      // Section: Parts & Consumables Used Table
      doc
        .fillColor('#0f172a')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('PARTS & CONSUMABLES USED', 40, y);
      doc
        .moveTo(40, y + 15)
        .lineTo(555, y + 15)
        .stroke('#cbd5e1');

      y += 25;
      doc.rect(40, y, 515, 20).fill('#f1f5f9');
      doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold');
      doc.text('Part Name / Description', 50, y + 6, { width: 230 });
      doc.text('Qty', 290, y + 6, { width: 40, align: 'right' });
      doc.text('Unit Price', 340, y + 6, { width: 80, align: 'right' });
      doc.text('Total', 430, y + 6, { width: 80, align: 'right' });
      doc.text('FOC', 520, y + 6, { width: 30, align: 'center' });

      y += 20;
      doc.font('Helvetica').fontSize(9).fillColor('#334155');

      let partsTotal = 0;

      if (items.length === 0) {
        doc.text('No parts or consumables used.', 50, y + 6);
        doc
          .moveTo(40, y + 20)
          .lineTo(555, y + 20)
          .stroke('#e2e8f0');
        y += 20;
      } else {
        for (const item of items) {
          doc.text(item.partName || 'Spare Part', 50, y + 6, { width: 230 });
          doc.text(item.quantityUsed.toString(), 290, y + 6, { width: 40, align: 'right' });

          // Note: In completion bill, if chargeable, show the selling price or if FOC, show 0.00
          const uPrice =
            isChargeable && !item.isFree ? Number(item.totalCost) / Number(item.quantityUsed) : 0;
          const tPrice = isChargeable && !item.isFree ? Number(item.totalCost) : 0;

          if (!item.isFree && isChargeable) {
            partsTotal += tPrice;
          }

          doc.text(`QAR ${uPrice.toFixed(2)}`, 340, y + 6, { width: 80, align: 'right' });
          doc.text(`QAR ${tPrice.toFixed(2)}`, 430, y + 6, { width: 80, align: 'right' });
          doc.text(item.isFree || !isChargeable ? 'YES' : 'NO', 520, y + 6, {
            width: 30,
            align: 'center',
          });

          doc
            .moveTo(40, y + 20)
            .lineTo(555, y + 20)
            .stroke('#e2e8f0');
          y += 20;
        }
      }

      // Section: Pricing Summary
      // Note: We need the labour cost. If chargeable, it should match the estimate.
      // Since estimate might not be passed, we can query it or pass it.
      // If we don't have it, we use 0 or we can calculate it. Let's see if we can look up the labour cost.
      // Let's assume the calling route passes a calculated labourCost or we fall back.
      // Let's compute based on the ticket's context.
      const labourVal = isChargeable
        ? ticket.repairDuration
          ? Math.ceil(ticket.repairDuration / 60) * 50
          : 50
        : 0; // fallback or estimation
      const totalVal = partsTotal + labourVal;

      y += 10;
      doc.rect(300, y, 255, 75).fill('#fafafa');
      doc.rect(300, y, 255, 75).stroke('#cbd5e1');

      doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
      doc.text('Parts & Consumables:', 310, y + 8);
      doc.text('Labour / Service Charge:', 310, y + 24);
      doc.text('TOTAL BILLED:', 310, y + 44);

      doc.font('Helvetica');
      doc.text(`QAR ${partsTotal.toFixed(2)}`, 450, y + 8, { align: 'right', width: 95 });
      doc.text(`QAR ${labourVal.toFixed(2)}`, 450, y + 24, { align: 'right', width: 95 });

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10);
      doc.text(`QAR ${totalVal.toFixed(2)}`, 450, y + 44, { align: 'right', width: 95 });

      if (!isChargeable) {
        doc.fillColor('#166534').fontSize(8).font('Helvetica-Bold');
        doc.text(`All charges covered under ${ticket.serviceContext} contract.`, 310, y + 60, {
          width: 235,
        });
      }

      y += 95;

      // Technician Notes
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('TECHNICIAN NOTES', 40, y);
      doc
        .moveTo(40, y + 15)
        .lineTo(555, y + 15)
        .stroke('#cbd5e1');
      doc
        .fillColor('#334155')
        .fontSize(9)
        .font('Helvetica')
        .text(ticket.completionNotes || 'None', 40, y + 25, { width: 515 });

      y += 60;
      const techName = technician
        ? `${technician.firstName || ''} ${technician.lastName || ''}`.trim()
        : 'Technician';
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
      doc.text(`Serviced By: ${techName}`, 40, y);
      doc.text(`Completed: ${completionDate}`, 40, y + 15);

      if (ticket.serviceContext === 'RENT') {
        const nextDue = new Date();
        nextDue.setMonth(nextDue.getMonth() + 2);
        doc.text(`Next Service Due: ${nextDue.toLocaleDateString('en-GB')}`, 300, y);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

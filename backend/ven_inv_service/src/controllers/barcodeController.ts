import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/appError';
import { Source } from '../config/db';
import { Product, ProductStatus } from '../entities/productEntity';
import { SparePart } from '../entities/sparePartEntity';
import { LotItem, LotItemType } from '../entities/lotItemEntity';
import { logger } from '../config/logger';
import { createCanvas } from 'canvas';
import JsBarcode from 'jsbarcode';
import PDFDocument from 'pdfkit';

/**
 * Generates a Code 128 barcode image buffer using canvas.
 */
function generateBarcodePngBuffer(text: string): Buffer {
  const canvas = createCanvas(1, 1);
  JsBarcode(canvas, text, {
    format: 'CODE128',
    width: 2,
    height: 40,
    displayValue: false,
    margin: 0,
  });
  return canvas.toBuffer('image/png');
}

/**
 * Draws a standard 50mm x 25mm sticker layout on a PDF page.
 */
function drawSticker(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle: string,
  barcodeText: string,
) {
  // 50mm x 25mm = 142 x 71 points
  // Add a border for guidance/margin spacing
  doc.fontSize(6).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.fontSize(5).font('Helvetica').text(subtitle, { align: 'center', height: 8, ellipsis: true });

  try {
    const barcodeBuffer = generateBarcodePngBuffer(barcodeText);
    doc.image(barcodeBuffer, 11, doc.y + 2, { width: 120, height: 28 });
  } catch (err) {
    logger.error('Failed to generate barcode image', err);
  }

  doc.y = 56;
  doc.fontSize(5).font('Helvetica-Bold').text(barcodeText, { align: 'center' });
}

/**
 * Look up product or spare part by barcode ID.
 */
export const scanLookup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = req.query.code as string;
    const warehouseId = req.query.warehouseId as string;
    if (!code) {
      throw new AppError('Barcode code parameter is required', 400);
    }

    logger.info(
      `Barcode scan lookup initiated for code: ${code}, warehouseId: ${warehouseId || 'any'}`,
    );

    // Try lookup in Products first
    const product = await Source.getRepository(Product).findOne({
      where: { barcode_id: code },
      relations: ['model', 'warehouse'],
    });

    if (product) {
      let warning: string | undefined = undefined;
      if (product.product_status !== ProductStatus.AVAILABLE) {
        warning = 'This product is currently not available for sale';
      }

      if (warehouseId && product.warehouse_id !== warehouseId) {
        warning = `This product is stored in warehouse "${product.warehouse?.warehouseName || product.warehouse_id}" and not the selected warehouse`;
      }

      return res.status(200).json({
        success: true,
        type: 'PRODUCT',
        item: product,
        warning,
      });
    }

    // Try lookup in SpareParts next
    const sparePart = await Source.getRepository(SparePart).findOne({
      where: { barcode_id: code },
      relations: ['model', 'warehouse'],
    });

    if (sparePart) {
      let finalSparePart = sparePart;
      let warning: string | undefined = undefined;

      if (warehouseId && sparePart.warehouse_id !== warehouseId) {
        // Find spare part of same SKU in the selected warehouse
        const warehouseSpecificPart = await Source.getRepository(SparePart).findOne({
          where: { sku: sparePart.sku, warehouse_id: warehouseId },
          relations: ['model', 'warehouse'],
        });

        if (warehouseSpecificPart) {
          finalSparePart = warehouseSpecificPart;
        } else {
          // No stock of this SKU in the selected warehouse
          finalSparePart = {
            ...sparePart,
            id: '', // Empty ID to prevent allocating from a non-existent warehouse record
            quantity: 0,
            warehouse_id: warehouseId,
            warehouse: undefined,
          } as unknown as SparePart;
          warning = `No stock of this spare part found in the selected warehouse`;
        }
      }

      return res.status(200).json({
        success: true,
        type: 'SPARE_PART',
        item: finalSparePart,
        warning,
      });
    }

    throw new AppError('Item not found', 404);
  } catch (err) {
    next(err);
  }
};

/**
 * Generate a printable PDF sheet of barcodes for products in a lot.
 */
export const getProductBarcodePdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lotId = req.query.lotId as string;
    if (!lotId) {
      throw new AppError('Lot ID parameter is required', 400);
    }

    const products = await Source.getRepository(Product).find({
      where: { lot_id: lotId },
      relations: ['model'],
    });

    if (!products || products.length === 0) {
      throw new AppError('No products found for the specified Lot ID', 404);
    }

    // Initialize 50mm x 25mm PDF document (142pt x 71pt)
    const doc = new PDFDocument({
      size: [142, 71],
      margins: { top: 4, bottom: 4, left: 4, right: 4 },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="product-barcodes-lot-${lotId}.pdf"`);

    doc.pipe(res);

    products.forEach((product, idx) => {
      if (idx > 0) {
        doc.addPage();
      }
      const title = 'XEROCARE';
      const subtitle = `${product.name} (SN: ${product.serial_no})`;
      const barcodeText = product.barcode_id || `XC-P-${product.serial_no}`;
      drawSticker(doc, title, subtitle, barcodeText);
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};

/**
 * Generate a printable PDF of barcodes for spare parts in a lot.
 */
export const getSparePartBarcodePdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lotId = req.query.lotId as string;
    if (!lotId) {
      throw new AppError('Lot ID parameter is required', 400);
    }

    const lotItems = await Source.getRepository(LotItem).find({
      where: { lotId, itemType: LotItemType.SPARE_PART },
      relations: ['sparePart'],
    });

    // Filter only items that have a resolved sparePart with a barcode_id / SKU
    const validSpares = lotItems.filter((item) => item.sparePart);

    if (validSpares.length === 0) {
      throw new AppError('No registered spare parts found for this Lot ID', 404);
    }

    const doc = new PDFDocument({
      size: [142, 71],
      margins: { top: 4, bottom: 4, left: 4, right: 4 },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="sparepart-barcodes-lot-${lotId}.pdf"`);

    doc.pipe(res);

    let pageAdded = false;

    for (const lotItem of validSpares) {
      const sparePart = lotItem.sparePart!;
      // Repeat label for expected quantity (fallback if not received yet) or received quantity
      const quantity = Math.max(1, lotItem.receivedQuantity || lotItem.expectedQuantity);

      for (let i = 0; i < quantity; i++) {
        if (pageAdded) {
          doc.addPage();
        } else {
          pageAdded = true;
        }

        const title = 'XEROCARE SPARES';
        const subtitle = `${sparePart.part_name} (${sparePart.brand})`;
        const barcodeText = sparePart.barcode_id || `XC-S-${sparePart.sku}`;
        drawSticker(doc, title, subtitle, barcodeText);
      }
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};

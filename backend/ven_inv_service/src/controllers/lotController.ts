import { NextFunction, Request, Response } from 'express';
import { LotService } from '../services/lotService';
import { AppError } from '../errors/appError';
import { LotStatus } from '../entities/lotEntity';
import { LotDocumentType } from '../entities/lotDocumentEntity';
import { TransportMode, MODE_DETAIL_FIELDS } from '../entities/enums/transportMode';
import { ShipmentStatus } from '../entities/enums/shipmentStatus';

const lotService = new LotService();
import { getRabbitChannel } from '../config/rabbitmq';
import { r2SignedGetUrl } from '../utils/r2Url';

/**
 * Creates a new lot.
 */
export const createLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    const lotData = { ...req.body, branchId };
    const lot = await lotService.createLot(lotData);

    // Dispatch in-app notification to Admins
    try {
      const channel = await getRabbitChannel();
      const payload = {
        notifyAdmins: true,
        title: 'New Lot Created',
        message: `Lot #${lot.lotNumber} has been created in branch ${branchId}.`,
        type: 'LOT_CREATED',
        data: { lotId: lot.id, branchId },
      };
      channel.sendToQueue('notification_queue', Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      });
    } catch (e) {
      console.error('Failed to dispatch lot creation notification', e);
    }

    res.status(201).json({ success: true, data: lot });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves all lots, optionally filtered by the user's branch.
 */
export const getAllLots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    const isAdmin = req.user?.role === 'ADMIN';

    // Admins see all, others only their branch
    const filteredBranchId = isAdmin ? undefined : branchId;

    const lots = await lotService.getAllLots(filteredBranchId);
    res.status(200).json({ success: true, data: lots });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a single lot by ID.
 */
export const getLotById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const lot = await lotService.getLotById(id);

    // Branch isolation
    const isAdmin = req.user?.role === 'ADMIN';
    if (!isAdmin && lot.branch_id !== req.user?.branchId) {
      throw new AppError('Access denied: Lot belongs to another branch', 403);
    }

    res.status(200).json({ success: true, data: lot });
  } catch (err) {
    next(err);
  }
};

/**
 * Generates and downloads an Excel report for a lot.
 */
export const downloadLotExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const lot = await lotService.getLotById(id);

    // Branch isolation
    const isAdmin = req.user?.role === 'ADMIN';
    if (!isAdmin && lot.branch_id !== req.user?.branchId) {
      throw new AppError('Access denied: Cannot download lot from another branch', 403);
    }

    const buffer = await lotService.generateExcel(id);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=lot-export-${id}.xlsx`);

    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Uploads an Excel file to create/update a lot.
 */
export const uploadLotExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new Error('Branch ID is required for upload');
    }
    const lot = await lotService.processExcelUpload(req.file.buffer, branchId);

    res.status(201).json({
      success: true,
      message: 'Lot created successfully from Excel',
      data: lot,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Downloads an Excel report of products in a lot.
 */
export const downloadLotProductsExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const buffer = await lotService.generateProductsExcel(id);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=lot-products-${id}.xlsx`);

    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Downloads an Excel report of spare parts in a lot.
 */
export const downloadLotSparePartsExcel = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const buffer = await lotService.generateSparePartsExcel(id);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=lot-spareparts-${id}.xlsx`);

    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Checks if a lot number already exists.
 */
export const checkLotNumber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lotNumberRaw = req.params.lotNumber;
    const lotNumber = Array.isArray(lotNumberRaw) ? lotNumberRaw[0] : lotNumberRaw;

    if (!lotNumber) {
      return res.status(400).json({ success: false, message: 'Lot number is required' });
    }
    const lot = await lotService.getLotByNumber(lotNumber);
    res.status(200).json({ success: true, exists: !!lot });
  } catch (err) {
    next(err);
  }
};
/**
 * Retrieves lot statistics (total and monthly spending).
 */
export const getLotStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user?.branchId;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!branchId && !isAdmin) {
      return res.status(400).json({ success: false, message: 'Branch ID missing' });
    }
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    const [total, monthly] = await Promise.all([
      lotService.getLotTotals(branchId, year),
      lotService.getMonthlyLotTotals(branchId, year),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalExpenses: total,
        monthlyExpenses: monthly,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /lots/:id/receive
 * Updates received and damaged quantities for lot items.
 * Transitions lot status to RECEIVING.
 */
export const updateReceivingQuantities = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isAdmin = req.user?.role === 'ADMIN';
    const branchId = isAdmin ? undefined : req.user?.branchId;

    const { items } = req.body as {
      items: { item_id: string; received_quantity: number; damaged_quantity: number }[];
    };

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('items array is required', 400);
    }

    // Validate individual item payloads
    for (const item of items) {
      if (!item.item_id) throw new AppError('item_id is required for each item', 400);
      if (typeof item.received_quantity !== 'number' || item.received_quantity < 0) {
        throw new AppError('received_quantity must be a non-negative number', 400);
      }
      if (typeof item.damaged_quantity !== 'number' || item.damaged_quantity < 0) {
        throw new AppError('damaged_quantity must be a non-negative number', 400);
      }
    }

    const updatedLot = await lotService.updateReceivingQuantities(id, items, branchId);
    res.status(200).json({ success: true, data: updatedLot });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /lots/:id/confirm
 * Confirms lot as RECEIVED. After this, inventory creation is unlocked.
 */
export const confirmLotReceived = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isAdmin = req.user?.role === 'ADMIN';
    const branchId = isAdmin ? undefined : req.user?.branchId;

    // Fetch the lot first to do an extra branch-isolation check
    const lot = await lotService.getLotById(id);
    if (!isAdmin && lot.branch_id !== req.user?.branchId) {
      throw new AppError('Access denied: Lot belongs to another branch', 403);
    }

    if (lot.status === LotStatus.RECEIVED) {
      throw new AppError('Lot is already confirmed as received', 400);
    }

    const confirmedLot = await lotService.confirmLotReceived(id, branchId);
    res.status(200).json({ success: true, data: confirmedLot });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /lots/:id/shipment
 * Updates a lot's shipment/logistics info (transport mode, carrier, dates,
 * shipment status, mode-specific details). Callable repeatedly as the
 * shipment progresses — independent of the receiving workflow.
 */
export const updateLotShipment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isAdmin = req.user?.role === 'ADMIN';
    const branchId = isAdmin ? undefined : req.user?.branchId;

    const existingLot = await lotService.getLotById(id);
    if (!isAdmin && existingLot.branch_id !== req.user?.branchId) {
      throw new AppError('Access denied: Lot belongs to another branch', 403);
    }

    const body = req.body ?? {};
    const update: {
      transportMode?: TransportMode;
      carrierName?: string;
      dispatchDate?: string;
      estimatedArrival?: string;
      actualArrival?: string;
      shipmentStatus?: ShipmentStatus;
      shipmentDetails?: Record<string, string>;
    } = {};

    if (body.transportMode !== undefined) {
      if (!Object.values(TransportMode).includes(body.transportMode)) {
        throw new AppError('Invalid transport mode', 400);
      }
      update.transportMode = body.transportMode as TransportMode;
    }

    if (body.shipmentStatus !== undefined) {
      if (!Object.values(ShipmentStatus).includes(body.shipmentStatus)) {
        throw new AppError('Invalid shipment status', 400);
      }
      update.shipmentStatus = body.shipmentStatus as ShipmentStatus;
    }

    if (body.carrierName !== undefined) update.carrierName = String(body.carrierName).trim();
    if (body.dispatchDate !== undefined) update.dispatchDate = body.dispatchDate;
    if (body.estimatedArrival !== undefined) update.estimatedArrival = body.estimatedArrival;
    if (body.actualArrival !== undefined) update.actualArrival = body.actualArrival;

    if (body.shipmentDetails !== undefined) {
      const effectiveMode = update.transportMode ?? existingLot.transportMode;
      if (!effectiveMode) {
        throw new AppError('Set transport mode before shipment details', 400);
      }
      const allowedKeys = MODE_DETAIL_FIELDS[effectiveMode];
      const details: Record<string, string> = {};
      for (const key of allowedKeys) {
        const value = body.shipmentDetails[key];
        if (typeof value === 'string' && value.trim()) {
          details[key] = value.trim();
        }
      }
      update.shipmentDetails = details;
    }

    const updatedLot = await lotService.updateShipment(id, update, branchId);
    res.status(200).json({ success: true, data: updatedLot });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /lots/:id/documents
 * Uploads a shipping/customs document (bill of lading, customs declaration,
 * etc.) and attaches it to the lot. Stored in R2 — retained indefinitely.
 */
export const uploadLotDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isAdmin = req.user?.role === 'ADMIN';
    const lot = await lotService.getLotById(id);
    if (!isAdmin && lot.branch_id !== req.user?.branchId) {
      throw new AppError('Access denied: Lot belongs to another branch', 403);
    }

    const file = req.file as unknown as
      | { key?: string; originalname?: string; mimetype?: string; size?: number }
      | undefined;
    if (!file?.key) {
      throw new AppError('No file uploaded', 400);
    }

    const documentType = Object.values(LotDocumentType).includes(req.body.documentType)
      ? (req.body.documentType as LotDocumentType)
      : LotDocumentType.OTHER;

    const documentName = String(req.body.documentName || '').trim();
    if (!documentName) {
      throw new AppError('Document name is required', 400);
    }

    const document = await lotService.addLotDocument(id, {
      documentType,
      documentName,
      notes: req.body.notes ? String(req.body.notes).trim() : undefined,
      // Lot documents are private: store the object key and hand out a
      // short-lived signed URL at read time.
      fileUrl: file.key,
      fileName: file.originalname || 'document',
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy: req.user?.userId,
    });

    res.status(201).json({
      success: true,
      data: { ...document, fileUrl: (await r2SignedGetUrl(document.fileUrl)) ?? document.fileUrl },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /lots/:id/documents
 * Lists shipping/customs documents attached to a lot.
 */
export const getLotDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isAdmin = req.user?.role === 'ADMIN';
    const lot = await lotService.getLotById(id);
    if (!isAdmin && lot.branch_id !== req.user?.branchId) {
      throw new AppError('Access denied: Lot belongs to another branch', 403);
    }

    const documents = await lotService.getLotDocuments(id);
    const signed = await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        fileUrl: (await r2SignedGetUrl(doc.fileUrl)) ?? doc.fileUrl,
      })),
    );
    res.status(200).json({ success: true, data: signed });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /lots/:id/documents/:documentId
 * Removes a document record. Admin-only — these files back compliance and
 * retention requirements and should not be casually deleted by branch staff.
 */
export const deleteLotDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Only admins can delete lot documents', 403);
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const documentId = Array.isArray(req.params.documentId)
      ? req.params.documentId[0]
      : req.params.documentId;

    await lotService.deleteLotDocument(id, documentId);
    res.status(200).json({ success: true, message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
};

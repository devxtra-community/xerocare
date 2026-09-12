import { Request, Response, NextFunction } from 'express';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AppError } from '../errors/appError';
import { Source } from '../config/dataSource';
import { EmployeeDocument } from '../entities/employeeDocumentEntity';
import { EmployeeRole } from '../constants/employeeRole';
import { EMPLOYEE_DOCUMENT_TYPES } from '../constants/employeeDocumentType';
import { EmployeeService } from '../services/employeeService';
import { MulterS3File } from '../types/multer-s3-file';
import { getSignedIdProofUrl } from '../utils/r2SignedUrl';
import { r2 } from '../config/r2';
import { logger } from '../config/logger';

const service = new EmployeeService();
const docRepo = () => Source.getRepository(EmployeeDocument);

/**
 * A Manager may only touch employees inside their own branch. ADMIN/HR are
 * company-wide. Throws 403/404 as appropriate; returns the employee otherwise.
 */
async function assertCanManage(req: Request, employeeId: string) {
  const employee = await service.getEmployeeById(employeeId);
  if (req.user?.role === EmployeeRole.MANAGER && employee.branch_id !== req.user.branchId) {
    throw new AppError('Access denied: employee belongs to another branch', 403);
  }
  return employee;
}

function normalizeDate(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw new AppError('Invalid date', 400);
  return d.toISOString().split('T')[0];
}

async function withViewUrl(doc: EmployeeDocument) {
  let viewUrl: string | null = null;
  try {
    viewUrl = await getSignedIdProofUrl(doc.file_key);
  } catch (err) {
    logger.error('Failed to sign employee document URL', err);
  }
  return { ...doc, viewUrl };
}

/** GET /employee/:id/documents */
export const listEmployeeDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertCanManage(req, req.params.id as string);
    const docs = await docRepo().find({
      where: { employee_id: req.params.id as string },
      order: { createdAt: 'DESC' },
    });
    const data = await Promise.all(docs.map(withViewUrl));
    return res.json({ success: true, data });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 500));
  }
};

/** POST /employee/:id/documents  (multipart, field `file`) */
export const uploadEmployeeDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertCanManage(req, req.params.id as string);

    const file = req.file as MulterS3File | undefined;
    if (!file?.key) throw new AppError('A document file is required', 400);

    const { docType, label, documentNumber } = req.body as Record<string, string>;
    if (!docType || !EMPLOYEE_DOCUMENT_TYPES.includes(docType as never)) {
      throw new AppError('A valid document type is required', 400);
    }

    const doc = docRepo().create({
      employee_id: req.params.id as string,
      doc_type: docType,
      label: label?.trim() || null,
      document_number: documentNumber?.trim() || null,
      issue_date: normalizeDate(req.body.issueDate),
      expiry_date: normalizeDate(req.body.expiryDate),
      file_key: file.key,
      file_name: file.originalname ?? null,
      file_mime: file.mimetype ?? null,
      uploaded_by: req.user?.userId ?? null,
    });
    const saved = await docRepo().save(doc);
    return res.status(201).json({ success: true, data: await withViewUrl(saved) });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

/** PATCH /employee/:id/documents/:docId  (metadata only) */
export const updateEmployeeDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertCanManage(req, req.params.id as string);

    const doc = await docRepo().findOne({
      where: { id: req.params.docId as string, employee_id: req.params.id as string },
    });
    if (!doc) throw new AppError('Document not found', 404);

    const { docType, label, documentNumber } = req.body as Record<string, string>;
    if (docType !== undefined) {
      if (!EMPLOYEE_DOCUMENT_TYPES.includes(docType as never)) {
        throw new AppError('Invalid document type', 400);
      }
      doc.doc_type = docType;
    }
    if (label !== undefined) doc.label = label?.trim() || null;
    if (documentNumber !== undefined) doc.document_number = documentNumber?.trim() || null;
    if (req.body.issueDate !== undefined) doc.issue_date = normalizeDate(req.body.issueDate);
    if (req.body.expiryDate !== undefined) doc.expiry_date = normalizeDate(req.body.expiryDate);

    const saved = await docRepo().save(doc);
    return res.json({ success: true, data: await withViewUrl(saved) });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

/** DELETE /employee/:id/documents/:docId */
export const deleteEmployeeDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await assertCanManage(req, req.params.id as string);

    const doc = await docRepo().findOne({
      where: { id: req.params.docId as string, employee_id: req.params.id as string },
    });
    if (!doc) throw new AppError('Document not found', 404);

    await docRepo().remove(doc);

    // Best-effort: a leftover object in R2 is harmless, a failed delete here must not.
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: doc.file_key }));
    } catch (err) {
      logger.warn('Failed to delete employee document object from R2', err);
    }

    return res.json({ success: true, message: 'Document deleted' });
  } catch (err: unknown) {
    const error = err as { message: string; statusCode?: number };
    next(new AppError(error.message, error.statusCode || 400));
  }
};

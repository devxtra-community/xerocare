import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { InvoiceAggregationService } from '../services/invoiceAggregationService';

const router = Router();
const invoiceAggregationService = new InvoiceAggregationService();

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.id as string;
    const aggregatedInvoice = await invoiceAggregationService.getInvoiceById(invoiceId);

    return res.status(200).json({
      success: true,
      data: aggregatedInvoice,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

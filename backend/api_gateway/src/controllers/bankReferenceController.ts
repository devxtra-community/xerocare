import { Request, Response, NextFunction } from 'express';
import { getBanksForCountry, BANK_REFERENCE_COUNTRIES } from '../data/bankReferenceData';
import { logger } from '../config/logger';

/**
 * GET /bank-reference/banks/:countryCode — curated bank-name list for a country.
 * Returns { available: true, banks: [...] } for the 5 countries with real reference
 * data, or { available: false, banks: [] } so the frontend can fall back to free text
 * gracefully for any other country — same fallback principle used elsewhere in the app.
 */
export const getBanksByCountry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countryCode = String(req.params.countryCode || '').toUpperCase();
    const banks = getBanksForCountry(countryCode);
    res.json({
      success: true,
      data: {
        available: banks !== null,
        banks: banks ?? [],
        supportedCountries: BANK_REFERENCE_COUNTRIES,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /bank-reference/ifsc/:code — live branch lookup for India via Razorpay's public
 * IFSC dataset (https://ifsc.razorpay.com), the standard free/open source for this —
 * India has genuine branch-level reference data, unlike UAE/Saudi/Qatar/Pakistan, where
 * no equivalent free dataset exists (confirmed before building this — see Part 3
 * investigation). Used to verify/auto-fill Branch, City, State and Address once the
 * customer/vendor provides their IFSC code, rather than requiring free-text branch
 * entry for India specifically.
 */
export const lookupIfsc = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.params.code || '')
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Invalid IFSC code format' });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`https://ifsc.razorpay.com/${code}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        return res.status(404).json({ success: false, message: 'IFSC code not found' });
      }
      const data = (await response.json()) as {
        BANK: string;
        BRANCH: string;
        ADDRESS: string;
        CITY: string;
        STATE: string;
        IFSC: string;
      };
      res.json({
        success: true,
        data: {
          bankName: data.BANK,
          branch: data.BRANCH,
          address: data.ADDRESS,
          city: data.CITY,
          state: data.STATE,
          ifsc: data.IFSC,
        },
      });
    } catch (err) {
      clearTimeout(timer);
      logger.warn('[bank-reference] IFSC lookup unavailable', err);
      res.status(503).json({
        success: false,
        message: 'IFSC lookup service unavailable — enter branch details manually',
      });
    }
  } catch (err) {
    next(err);
  }
};

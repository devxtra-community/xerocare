'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Loader2, CheckCircle2 } from 'lucide-react';
import {
  getBankCodeType,
  getBankCodeLabel,
  getBankCodePlaceholder,
  validateBankCode,
} from '@/lib/bankCodeType';
import api from '@/lib/api';
import { toast } from 'sonner';

interface BankReferenceResponse {
  available: boolean;
  banks: string[];
  supportedCountries: string[];
}

interface IfscLookupResult {
  bankName: string;
  branch: string;
  address: string;
  city: string;
  state: string;
  ifsc: string;
}

async function fetchBanksForCountry(countryCode: string): Promise<BankReferenceResponse> {
  const res = await api.get(`/bank-reference/banks/${countryCode}`);
  return res.data.data;
}

async function lookupIfsc(code: string): Promise<IfscLookupResult> {
  const res = await api.get(`/bank-reference/ifsc/${code}`);
  return res.data.data;
}

export interface BankBranchSelectorProps {
  /** ISO2 country code of the BANK itself — independent of the customer's/vendor's
   * own residence/business country (a Saudi customer may bank in India, etc.).
   * The parent renders its own "Bank Country" selector and passes the result here. */
  bankCountryCode?: string;
  bankName: string;
  onBankNameChange: (value: string) => void;
  branch?: string;
  onBranchChange?: (value: string) => void;
  /** The country-correct identifier (IFSC for India, IBAN elsewhere it applies,
   * free-text "Bank Code" otherwise). Stored in the same field previously used
   * for a hardcoded "IBAN" input, so no data migration is needed. */
  code?: string;
  onCodeChange?: (value: string) => void;
  /** Called with the full IFSC lookup result when a code is successfully verified —
   * lets the parent form also auto-fill address/city/state fields if it has them. */
  onIfscVerified?: (result: IfscLookupResult) => void;
  bankLabel?: string;
  branchLabel?: string;
  required?: boolean;
  className?: string;
}

/**
 * Bank + Branch + country-correct code selector, driven by the bank's own country
 * (bankCountryCode) rather than the customer's/vendor's residence country. Real
 * reference-data-driven dropdown for the 5 countries with actual bank-name data
 * (India via live IFSC lookup, UAE/Saudi/Qatar/Pakistan via a curated static
 * bank-name list), gracefully falling back to free-text bank name entry for any
 * other country. The identifier field is IFSC for India, IBAN (with real
 * per-country format validation) for the ~85 countries in the ISO 13616 IBAN
 * registry, and a generic free-text "Bank Code" for everything else — see
 * lib/bankCodeType.ts.
 */
export function BankBranchSelector({
  bankCountryCode,
  bankName,
  onBankNameChange,
  branch,
  onBranchChange,
  code,
  onCodeChange,
  onIfscVerified,
  bankLabel = 'Name of the Bank',
  branchLabel = 'Branch',
  required,
  className,
}: BankBranchSelectorProps) {
  const [ifscVerified, setIfscVerified] = useState(false);
  const [ifscChecking, setIfscChecking] = useState(false);

  const codeType = getBankCodeType(bankCountryCode);
  const isIndia = codeType === 'IFSC';

  const { data, isLoading } = useQuery({
    queryKey: ['bank-reference', bankCountryCode],
    queryFn: () => fetchBanksForCountry(bankCountryCode as string),
    enabled: !!bankCountryCode,
  });

  // Reset Bank/Branch/Code when the Bank Country genuinely changes (not on initial
  // mount / when loading an existing record for edit) — stale data from a previous
  // country's bank must not silently carry over.
  const prevCountryRef = useRef(bankCountryCode);
  useEffect(() => {
    if (prevCountryRef.current !== bankCountryCode) {
      prevCountryRef.current = bankCountryCode;
      setIfscVerified(false);
      onBankNameChange('');
      onBranchChange?.('');
      onCodeChange?.('');
    }
  }, [bankCountryCode, onBankNameChange, onBranchChange, onCodeChange]);

  const bankOptions: SearchableSelectOption[] = (data?.banks ?? []).map((b) => ({
    value: b,
    label: b,
  }));

  const handleVerifyIfsc = async () => {
    if (!code?.trim()) {
      toast.error('Enter an IFSC code first');
      return;
    }
    setIfscChecking(true);
    try {
      const result = await lookupIfsc(code.trim().toUpperCase());
      onBankNameChange(result.bankName);
      onBranchChange?.(result.branch);
      onIfscVerified?.(result);
      setIfscVerified(true);
      toast.success(`Verified: ${result.bankName} — ${result.branch}`);
    } catch {
      setIfscVerified(false);
      toast.error('IFSC code not found — check the code or enter branch details manually');
    } finally {
      setIfscChecking(false);
    }
  };

  const codeValidation =
    code?.trim() && onCodeChange ? validateBankCode(bankCountryCode, code) : { valid: true };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-gray-400 uppercase">
            {bankLabel} {required && '*'}
          </Label>
          {bankCountryCode && data?.available ? (
            <SearchableSelect
              options={bankOptions}
              value={bankName}
              onValueChange={onBankNameChange}
              placeholder={isLoading ? 'Loading banks…' : 'Select bank'}
              emptyText="No bank found — type to search"
              loading={isLoading}
              className="h-9 text-sm"
            />
          ) : (
            <Input
              placeholder={
                bankCountryCode && !isLoading
                  ? 'No bank list for this country — enter manually'
                  : 'e.g. Emirates NBD'
              }
              value={bankName}
              onChange={(e) => onBankNameChange(e.target.value)}
              className="h-9 text-sm"
            />
          )}
        </div>

        {onBranchChange && (
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-gray-400 uppercase">{branchLabel}</Label>
            <div className="flex items-center gap-1">
              <Input
                placeholder="Branch name"
                value={branch || ''}
                onChange={(e) => onBranchChange(e.target.value)}
                className="h-9 text-sm"
              />
              {ifscVerified && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
            </div>
          </div>
        )}
      </div>

      {onCodeChange && (
        <div className="mt-2 space-y-1">
          {isIndia ? (
            <div className="flex items-end gap-2 rounded-lg border border-blue-100 bg-blue-50/40 p-2">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] font-bold text-blue-600 uppercase">
                  IFSC Code (optional — auto-fills Branch, City, State)
                </Label>
                <Input
                  placeholder={getBankCodePlaceholder(bankCountryCode)}
                  value={code || ''}
                  onChange={(e) => {
                    onCodeChange(e.target.value.toUpperCase());
                    setIfscVerified(false);
                  }}
                  className="h-9 text-sm font-mono bg-card"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={ifscChecking}
                onClick={handleVerifyIfsc}
                className="h-9"
              >
                {ifscChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
            </div>
          ) : (
            <>
              <Label className="text-[10px] font-bold text-gray-400 uppercase">
                {getBankCodeLabel(bankCountryCode)}
              </Label>
              <Input
                placeholder={getBankCodePlaceholder(bankCountryCode)}
                value={code || ''}
                onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
                className="h-9 text-sm font-mono"
              />
              {!codeValidation.valid && (
                <p className="text-[10px] text-red-500">{codeValidation.message}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

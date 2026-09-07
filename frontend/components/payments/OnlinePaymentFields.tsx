'use client';

import * as React from 'react';
import { CreditCard, Loader2, ShieldCheck, Info } from 'lucide-react';

import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { getUserFromToken } from '@/lib/auth';
import {
  CardNetwork,
  CardType,
  CARD_NETWORK_LABEL,
  cardOptionsFor,
  cardSearchText,
  countryName,
} from '@/lib/payments/gccCards';

/**
 * The card facts an ONLINE_PAYMENT is recorded with.
 *
 * Note what this shape does NOT carry: the PAN and the CVV. The card number the user
 * types is used locally to derive `cardLast4` and is then discarded — it is never put
 * in state that gets submitted, never sent to the server, and never stored.
 */
export interface OnlinePaymentDetails {
  cardType: CardType | '';
  cardNetwork: CardNetwork | '';
  issuerCountry: string;
  issuerBank: string;
  cardLast4: string;
  cardHolderName: string;
  transactionReference: string;
}

export const EMPTY_ONLINE_PAYMENT: OnlinePaymentDetails = {
  cardType: '',
  cardNetwork: '',
  issuerCountry: '',
  issuerBank: '',
  cardLast4: '',
  cardHolderName: '',
  transactionReference: '',
};

export interface FeeQuote {
  ratePercentApplied: number;
  fixedFeeApplied: number;
  commissionAmount: number;
  netSettlementAmount: number;
  currency: string;
  cappedBy?: 'MINIMUM' | 'MAXIMUM';
}

/** True once every field the backend insists on has been supplied. */
export function onlinePaymentComplete(d: OnlinePaymentDetails): boolean {
  return !!(
    d.cardType &&
    d.cardNetwork &&
    d.issuerCountry &&
    d.issuerBank &&
    d.cardHolderName.trim() &&
    /^[0-9]{4}$/.test(d.cardLast4)
  );
}

interface Props {
  value: OnlinePaymentDetails;
  onChange: (next: OnlinePaymentDetails) => void;
  /** Gross amount being charged — drives the fee quote. */
  amount: number;
  currency: string;
  /** Lifted so the parent can show the settlement summary in its own totals block. */
  onQuoteChange?: (quote: FeeQuote | null, error: string | null) => void;
  disabled?: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function OnlinePaymentFields({
  value,
  onChange,
  amount,
  currency,
  onQuoteChange,
  disabled = false,
}: Props) {
  // The full number the operator keys in, held in local component state ONLY.
  // It is never put into `value`, never included in a submit payload, never sent to the
  // server and never logged — the component hands out `cardLast4` and nothing else.
  // It is also never rendered in the clear: everything but the last four shows as dots,
  // so the number cannot be read off the screen either.
  const [pan, setPan] = React.useState('');
  const [quote, setQuote] = React.useState<FeeQuote | null>(null);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  const [quoting, setQuoting] = React.useState(false);

  const set = (patch: Partial<OnlinePaymentDetails>) => onChange({ ...value, ...patch });

  const cardOptions: SearchableSelectOption[] = React.useMemo(() => {
    if (!value.cardType) return [];
    return cardOptionsFor(value.cardType as CardType).map((o) => ({
      value: o.id,
      searchText: cardSearchText(o),
      label: (
        <span className="flex flex-col">
          <span className="font-medium">{o.issuerBank}</span>
          <span className="text-xs text-slate-500">
            {countryName(o.country)} · {o.networks.map((n) => CARD_NETWORK_LABEL[n]).join(' / ')}
          </span>
        </span>
      ),
      country: o.country,
      issuerBank: o.issuerBank,
      networks: o.networks,
    }));
  }, [value.cardType]);

  const selectedCardId = React.useMemo(() => {
    if (!value.issuerBank || !value.cardType || !value.issuerCountry) return '';
    return `${value.issuerCountry}-${value.issuerBank}-${value.cardType}`
      .replace(/\s+/g, '_')
      .toUpperCase();
  }, [value.issuerBank, value.cardType, value.issuerCountry]);

  const availableNetworks = React.useMemo(() => {
    const opt = cardOptionsFor((value.cardType || 'DEBIT') as CardType).find(
      (o) => o.id === selectedCardId,
    );
    return opt?.networks ?? [];
  }, [selectedCardId, value.cardType]);

  // ── Fee quote ───────────────────────────────────────────────────────────────
  // Asks the SAME engine the approval path uses, rather than computing a rate here.
  // The number shown is therefore the number that will post — and if no agreement is
  // configured for this card, this surfaces that refusal now rather than at approval.
  const complete = onlinePaymentComplete(value);
  React.useEffect(() => {
    if (!complete || !amount || amount <= 0) {
      setQuote(null);
      setQuoteError(null);
      onQuoteChange?.(null, null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setQuoting(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const res = await fetch(`${API}/b/card-fees/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            issuerCountry: value.issuerCountry,
            issuerBank: value.issuerBank,
            cardType: value.cardType,
            cardNetwork: value.cardNetwork,
            currency,
            grossAmount: amount,
          }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setQuote(null);
          setQuoteError(json.message || 'Could not determine the processing fee for this card.');
          onQuoteChange?.(null, json.message || 'Could not determine the processing fee.');
        } else {
          setQuote(json.data);
          setQuoteError(null);
          onQuoteChange?.(json.data, null);
        }
      } catch {
        if (cancelled) return;
        setQuote(null);
        setQuoteError('Could not reach the fee service.');
        onQuoteChange?.(null, 'Could not reach the fee service.');
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    complete,
    amount,
    currency,
    value.issuerCountry,
    value.issuerBank,
    value.cardType,
    value.cardNetwork,
  ]);

  /** Dots for every digit but the last four, grouped in fours for readability. */
  const maskedPan = React.useMemo(() => {
    if (!pan) return '';
    const shown = pan.length > 4 ? '\u2022'.repeat(pan.length - 4) + pan.slice(-4) : pan;
    return shown.replace(/(.{4})/g, '$1 ').trim();
  }, [pan]);

  /**
   * Rebuilds the real number from an edit made against the masked display.
   *
   * The field shows dots for the hidden prefix, so what comes back on change is part
   * mask, part real digits. The dots say how many leading digits to keep from what we
   * already hold; the digits are whatever is currently visible or newly typed. A paste
   * arrives with no dots at all and is taken verbatim.
   */
  const handlePanChange = (raw: string) => {
    const chars = raw.replace(/\s/g, '');
    const hiddenCount = (chars.match(/\u2022/g) || []).length;
    const digits = chars.replace(/[^0-9]/g, '');
    const next = hiddenCount === 0 ? digits : (pan.slice(0, hiddenCount) + digits).slice(0, 19);
    const clean = next.slice(0, 19);
    setPan(clean);
    set({ cardLast4: clean.length >= 4 ? clean.slice(-4) : '' });
  };

  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;

  // Whoever can actually fix a missing rate gets a link straight to the page. A
  // salesperson cannot reach Accounts at all, so telling them to "add the rate there"
  // is a dead end — they need to know who to ask instead.
  const role = (getUserFromToken()?.role ?? '').toUpperCase();
  const canConfigureRates = ['ADMIN', 'SUPER_ADMIN', 'FINANCE', 'FINANCE_MANAGER'].includes(role);
  const ratesHref =
    role.startsWith('ADMIN') || role === 'SUPER_ADMIN'
      ? '/admin/accounts/card-fees'
      : '/finance/accounts/card-fees';

  return (
    <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
        <CreditCard size={14} />
        Online Payment Details
      </h4>

      {/* Level 2: Debit or Credit — chosen first, because it filters the bank list. */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">Payment Type *</label>
        <div className="flex gap-2">
          {(['DEBIT', 'CREDIT'] as CardType[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  cardType: t,
                  // The bank list is type-scoped, so a stale bank/network must not survive.
                  issuerBank: '',
                  issuerCountry: '',
                  cardNetwork: '',
                })
              }
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                value.cardType === t
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400'
              }`}
            >
              {t === 'DEBIT' ? 'Debit Card' : 'Credit Card'}
            </button>
          ))}
        </div>
      </div>

      {value.cardType && (
        <>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Issuing Bank / Card *
            </label>
            <SearchableSelect
              options={cardOptions}
              value={selectedCardId}
              disabled={disabled}
              placeholder="Search by bank, country or network…"
              emptyText="No matching card found."
              onValueChange={() => {}}
              onSelect={(o) => {
                const networks = (o.networks as CardNetwork[]) ?? [];
                set({
                  issuerBank: o.issuerBank as string,
                  issuerCountry: o.country as string,
                  // Only ask for the network when the bank genuinely issues on several.
                  cardNetwork: networks.length === 1 ? networks[0] : '',
                });
              }}
            />
          </div>

          {availableNetworks.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Card Network *
              </label>
              <select
                disabled={disabled}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                value={value.cardNetwork}
                onChange={(e) => set({ cardNetwork: e.target.value as CardNetwork })}
              >
                <option value="">Select network…</option>
                {availableNetworks.map((n) => (
                  <option key={n} value={n}>
                    {CARD_NETWORK_LABEL[n]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              {/*
                Four digits, not a card number.
                This asked for the full PAN and kept only the last four of it, which meant
                a complete card number was typed into a browser field — exposed to
                autofill, password managers, screen shares and shoulders — to derive
                something the operator can read straight off the terminal slip. It also
                had to Luhn-check what was typed, so a perfectly good four-digit entry got
                warned at as a failed checksum. Asking only for what is stored removes the
                exposure and the false warning together.
              */}
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Card Number *
                <span className="ml-1 font-normal text-slate-400">(only last 4 are kept)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                // Keeps browsers, password managers and mobile keyboards from
                // remembering or suggesting the number.
                data-lpignore="true"
                data-1p-ignore="true"
                disabled={disabled}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tracking-wider"
                value={maskedPan}
                onChange={(e) => handlePanChange(e.target.value)}
                placeholder="•••• •••• •••• 1234"
              />
              {value.cardLast4 ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700">
                  <ShieldCheck size={11} /> Stored as ••••{value.cardLast4} — the full number never
                  leaves this screen.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  Type the card number — all but the last four digits are hidden as you go.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Card Holder Name *
              </label>
              <input
                type="text"
                disabled={disabled}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                value={value.cardHolderName}
                onChange={(e) => set({ cardHolderName: e.target.value })}
                placeholder="As printed on the card"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Transaction / Approval Reference
            </label>
            <input
              type="text"
              disabled={disabled}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={value.transactionReference}
              onChange={(e) => set({ transactionReference: e.target.value })}
              placeholder="POS approval code or gateway reference"
            />
          </div>

          {/* Says why there is no fee yet, rather than showing an empty space. */}
          {complete && !(amount > 0) && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-2.5 text-[11px] text-slate-500">
              Enter the amount being charged above to see the processing fee and the net settlement.
            </p>
          )}

          {/* Settlement preview — quoted by the server, shown read-only. */}
          {(quoting || quote || quoteError) && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              {quoting && (
                <p className="flex items-center gap-2 text-slate-500">
                  <Loader2 size={13} className="animate-spin" /> Checking the processing fee…
                </p>
              )}
              {/* No rate on file is not an error here. The commission is set by Accounts
                  when the receipt is approved — blocking the counter on a number the
                  salesperson has no way of knowing would strand a card that has already
                  been swiped. */}
              {!quoting && quoteError && (
                <div className="flex items-start gap-2 text-slate-600">
                  <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                  <div>
                    <span>
                      The bank&apos;s commission for this card is not on file yet, so it will be
                      applied by Accounts when this receipt is approved. You can record the payment
                      now.
                    </span>
                    {canConfigureRates && (
                      <a
                        href={ratesHref}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 block font-semibold text-indigo-600 underline underline-offset-2"
                      >
                        Set this bank&apos;s rate now →
                      </a>
                    )}
                  </div>
                </div>
              )}
              {!quoting && quote && (
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Customer pays (gross)</span>
                    <span className="font-medium">{fmt(amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>
                      Processing fee ({quote.ratePercentApplied}%
                      {quote.fixedFeeApplied ? ` + ${fmt(quote.fixedFeeApplied)}` : ''})
                      {quote.cappedBy === 'MAXIMUM' && (
                        <span className="ml-1 text-[11px] text-slate-400">(capped)</span>
                      )}
                      {quote.cappedBy === 'MINIMUM' && (
                        <span className="ml-1 text-[11px] text-slate-400">(minimum applied)</span>
                      )}
                    </span>
                    <span className="font-medium text-red-600">
                      − {fmt(quote.commissionAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-slate-200 pt-1 font-semibold text-slate-800">
                    <span>Net settlement to bank</span>
                    <span className="text-emerald-700">{fmt(quote.netSettlementAmount)}</span>
                  </div>
                  <p className="pt-1 text-[11px] text-slate-400">
                    The customer is billed {fmt(amount)}. The fee is the merchant&apos;s cost and is
                    not added to the invoice.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

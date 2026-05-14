import React from 'react';

export interface SlabRange {
  from: number;
  to: number;
  rate: number;
}

export interface RentLineItem {
  model: string;
  brand: string;
  productName: string;
  slNo: string;
  description: string;
  qty: number;
  limit: string;
  excessRate: string;
  image?: string;
  bwSlabs?: SlabRange[];
  colorSlabs?: SlabRange[];
  comboSlabs?: SlabRange[];
}

export interface RentPremiumQuotationProps {
  billTo: {
    name: string;
    address?: string;
    trn?: string;
    phone?: string;
    email?: string;
  };
  quotation: {
    number: string;
    date: string;
    terms: string;
    dueDate: string;
    contractStartDate?: string;
    contractEndDate?: string;
  };
  lineItems: RentLineItem[];
  agreementDetails: {
    rentType: string;
    period: string;
    advance: number;
    deposit: number;
    duration: string;
    monthlyRentAmount: number;
    discountPercent: number;
    discountedMonthlyRent: number;
  };
  totals: {
    subTotal: number;
    tax: number;
    total: number;
  };
}

const BG_GRAY = '#1a1c23';
const CARD_GRAY = '#252833';
const ACCENT_COLOR = '#8b5cf6'; // Violet/Purple accent
const TEXT_WHITE = '#ffffff';
const TEXT_MUTED = '#94a3b8';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const RentPremiumQuotation: React.FC<RentPremiumQuotationProps> = ({
  billTo,
  quotation,
  lineItems = [],
  agreementDetails,
}) => {
  const LOGO_PATH =
    '/quatationLayouts/productsalequatation/normal/normallogo/xerocarelogo-removebg-preview.png';

  return (
    <div
      style={{
        width: '900px',
        minHeight: '1122px',
        margin: '0 auto',
        backgroundColor: BG_GRAY,
        background: `linear-gradient(135deg, ${BG_GRAY} 0%, #111217 100%)`,
        fontFamily: "'Inter', sans-serif",
        color: TEXT_WHITE,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 50px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}
    >
      {/* ─── DECORATIVE BACKGROUND GLOWS ─── */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          background: ACCENT_COLOR,
          filter: 'blur(150px)',
          opacity: 0.1,
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-100px',
          width: '400px',
          height: '400px',
          background: ACCENT_COLOR,
          filter: 'blur(150px)',
          opacity: 0.05,
          borderRadius: '50%',
        }}
      />

      {/* ─── HEADER SECTION ─── */}
      <div
        style={{
          padding: '60px 50px 30px',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                background: '#fff',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 15px rgba(0,0,0,0.3)`,
              }}
            >
              <img
                src={LOGO_PATH}
                alt="Logo"
                style={{ width: '45px', height: '45px', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '900',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}
              >
                XEROCARE
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: TEXT_MUTED,
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                }}
              >
                Trading & Services
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: '56px',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              lineHeight: '1',
            }}
          >
            QUOTATION
          </div>
          <div
            style={{ fontSize: '14px', color: TEXT_MUTED, marginTop: '10px', fontWeight: '600' }}
          >
            #{quotation.number}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '11px',
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '15px',
            }}
          >
            Issued To:
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>
            {billTo.name}
          </div>
          <div style={{ fontSize: '12px', color: TEXT_MUTED, lineHeight: '1.6' }}>
            <div>{billTo.email}</div>
            <div>{billTo.phone}</div>
            {billTo.trn && <div>TRN: {billTo.trn}</div>}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 50px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: '40px', marginTop: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span
              style={{
                fontSize: '10px',
                color: TEXT_MUTED,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Date
            </span>
            <span style={{ fontWeight: '600' }}>{quotation.date}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span
              style={{
                fontSize: '10px',
                color: TEXT_MUTED,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Terms
            </span>
            <span style={{ fontWeight: '600' }}>{quotation.terms}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span
              style={{
                fontSize: '10px',
                color: TEXT_MUTED,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              Due Date
            </span>
            <span style={{ fontWeight: '600' }}>{quotation.dueDate}</span>
          </div>
        </div>
      </div>

      {/* ─── MACHINE INFO BAR ─── */}
      <div style={{ padding: '40px 50px 20px', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            backgroundColor: CARD_GRAY,
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '20px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div
              style={{
                fontSize: '10px',
                color: TEXT_MUTED,
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Brand
            </div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>
              {lineItems[0]?.brand || 'N/A'}
            </div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div
              style={{
                fontSize: '10px',
                color: TEXT_MUTED,
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Model
            </div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>
              {lineItems[0]?.model || 'N/A'}
            </div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div
              style={{
                fontSize: '10px',
                color: TEXT_MUTED,
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Product Name
            </div>
            <div style={{ fontWeight: '700', fontSize: '15px' }}>
              {lineItems[0]?.productName || 'N/A'}
            </div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div
              style={{
                fontSize: '10px',
                color: TEXT_MUTED,
                fontWeight: '700',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Serial Number
            </div>
            <div
              style={{
                fontWeight: '900',
                fontSize: '15px',
                color: ACCENT_COLOR,
                letterSpacing: '1px',
              }}
            >
              {lineItems[0]?.slNo || 'TBD'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN TABLE ─── */}
      <div style={{ padding: '10px 50px 30px', flex: 1, position: 'relative', zIndex: 1 }}>
        <div
          style={{
            backgroundColor: CARD_GRAY,
            borderRadius: '30px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <th
                  style={{
                    padding: '25px',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: '800',
                    letterSpacing: '2px',
                    color: ACCENT_COLOR,
                    width: '45%',
                  }}
                >
                  <span
                    style={{
                      backgroundColor: ACCENT_COLOR,
                      padding: '6px 16px',
                      borderRadius: '20px',
                      color: '#fff',
                    }}
                  >
                    DESCRIPTION
                  </span>
                </th>
                <th
                  style={{
                    padding: '25px',
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: '800',
                    letterSpacing: '2px',
                    color: ACCENT_COLOR,
                  }}
                >
                  <span
                    style={{
                      backgroundColor: ACCENT_COLOR,
                      padding: '6px 16px',
                      borderRadius: '20px',
                      color: '#fff',
                    }}
                  >
                    QTY
                  </span>
                </th>
                <th
                  style={{
                    padding: '25px',
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: '800',
                    letterSpacing: '2px',
                    color: ACCENT_COLOR,
                  }}
                >
                  <span
                    style={{
                      backgroundColor: ACCENT_COLOR,
                      padding: '6px 16px',
                      borderRadius: '20px',
                      color: '#fff',
                    }}
                  >
                    FREE LIMIT
                  </span>
                </th>
                <th
                  style={{
                    padding: '25px',
                    textAlign: 'right',
                    fontSize: '10px',
                    fontWeight: '800',
                    letterSpacing: '2px',
                    color: ACCENT_COLOR,
                  }}
                >
                  <span
                    style={{
                      backgroundColor: ACCENT_COLOR,
                      padding: '6px 16px',
                      borderRadius: '20px',
                      color: '#fff',
                    }}
                  >
                    EXCESS RATE
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', height: '320px' }}
                >
                  <td
                    style={{
                      padding: 0,
                      position: 'relative',
                      overflow: 'hidden',
                      verticalAlign: 'top',
                    }}
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          height: '120%',
                          width: '100%',
                          objectFit: 'contain',
                          opacity: 0.25,
                          zIndex: 0,
                          filter: 'grayscale(100%)',
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        padding: '30px',
                        textAlign: 'left',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: '800',
                          color: ACCENT_COLOR,
                          marginBottom: '4px',
                        }}
                      >
                        {item.productName}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: TEXT_MUTED,
                          marginBottom: '12px',
                        }}
                      >
                        {item.brand} {item.model} • S/N: {item.slNo || 'TBD'}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#fff',
                          fontWeight: '500',
                          maxWidth: '95%',
                          lineHeight: '1.6',
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '25px',
                      textAlign: 'center',
                      fontSize: '18px',
                      fontWeight: '700',
                      verticalAlign: 'top',
                      paddingTop: '30px',
                    }}
                  >
                    {item.qty}
                  </td>
                  <td
                    style={{
                      padding: '25px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: TEXT_MUTED,
                      verticalAlign: 'top',
                      paddingTop: '30px',
                    }}
                  >
                    {item.limit}
                  </td>
                  <td
                    style={{
                      padding: '25px',
                      textAlign: 'right',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: ACCENT_COLOR,
                      verticalAlign: 'top',
                      paddingTop: '30px',
                    }}
                  >
                    {item.excessRate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── AGREEMENT DETAILS GLASS CARD ─── */}
      <div style={{ padding: '0 50px 40px', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            backgroundColor: CARD_GRAY,
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '30px',
            padding: '30px',
            display: 'flex',
            gap: '30px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '10px',
                color: TEXT_MUTED,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '20px',
              }}
            >
              Agreement Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {[
                { label: 'RENT TYPE', value: agreementDetails.rentType },
                { label: 'PERIOD', value: agreementDetails.period },
                { label: 'MONTHS COUNT', value: agreementDetails.duration },
                { label: 'ADVANCE', value: `QAR ${fmt(agreementDetails.advance)}` },
                { label: 'DEPOSIT', value: `QAR ${fmt(agreementDetails.deposit)}` },
                { label: 'DISCOUNT', value: `${agreementDetails.discountPercent}%` },
                { label: 'START DATE', value: quotation.contractStartDate || 'TBD' },
                { label: 'END DATE', value: quotation.contractEndDate || 'TBD' },
              ].map((d) => (
                <div key={d.label}>
                  <div style={{ fontSize: '9px', color: TEXT_MUTED, fontWeight: '700' }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />

          <div
            style={{
              flex: 0.8,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end',
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '12px', color: TEXT_MUTED, marginBottom: '8px' }}>
              Monthly Rental Charge
            </div>
            <div style={{ fontSize: '42px', fontWeight: '900', color: '#fff', lineHeight: '1' }}>
              QAR {fmt(agreementDetails.discountedMonthlyRent)}
            </div>
            <div
              style={{ fontSize: '11px', color: ACCENT_COLOR, marginTop: '8px', fontWeight: '700' }}
            >
              (Excluding Excess Usage)
            </div>
          </div>
        </div>
      </div>

      {/* ─── CPC & CAMPAIGN DETAILS ─── */}
      {lineItems.some(
        (item) =>
          (item.bwSlabs && item.bwSlabs.length > 0) ||
          (item.colorSlabs && item.colorSlabs.length > 0) ||
          (item.comboSlabs && item.comboSlabs.length > 0),
      ) && (
        <div style={{ padding: '0 50px 30px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              backgroundColor: CARD_GRAY,
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '20px',
              padding: '25px 30px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: TEXT_MUTED,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                marginBottom: '20px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                paddingBottom: '12px',
              }}
            >
              CPC &amp; Campaign Details
            </div>
            {lineItems.map((item, idx) => (
              <div key={idx}>
                {((item.bwSlabs && item.bwSlabs.length > 0) ||
                  (item.colorSlabs && item.colorSlabs.length > 0) ||
                  (item.comboSlabs && item.comboSlabs.length > 0)) && (
                  <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                    {item.bwSlabs && item.bwSlabs.length > 0 && (
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <div
                          style={{
                            fontSize: '10px',
                            color: ACCENT_COLOR,
                            fontWeight: '800',
                            marginBottom: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                          }}
                        >
                          B&amp;W Slabs
                        </div>
                        <table
                          style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}
                        >
                          <tbody>
                            {item.bwSlabs.map((s, i) => (
                              <tr
                                key={i}
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                              >
                                <td style={{ padding: '5px 0', color: TEXT_MUTED }}>
                                  {s.from} – {s.to >= 999999 ? 'Max' : s.to}
                                </td>
                                <td
                                  style={{
                                    padding: '5px 0',
                                    textAlign: 'right',
                                    color: '#fff',
                                    fontWeight: '700',
                                  }}
                                >
                                  QAR {Number(s.rate || 0).toFixed(3)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {item.colorSlabs && item.colorSlabs.length > 0 && (
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <div
                          style={{
                            fontSize: '10px',
                            color: ACCENT_COLOR,
                            fontWeight: '800',
                            marginBottom: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                          }}
                        >
                          Color Slabs
                        </div>
                        <table
                          style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}
                        >
                          <tbody>
                            {item.colorSlabs.map((s, i) => (
                              <tr
                                key={i}
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                              >
                                <td style={{ padding: '5px 0', color: TEXT_MUTED }}>
                                  {s.from} – {s.to >= 999999 ? 'Max' : s.to}
                                </td>
                                <td
                                  style={{
                                    padding: '5px 0',
                                    textAlign: 'right',
                                    color: '#fff',
                                    fontWeight: '700',
                                  }}
                                >
                                  QAR {Number(s.rate || 0).toFixed(3)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {item.comboSlabs && item.comboSlabs.length > 0 && (
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <div
                          style={{
                            fontSize: '10px',
                            color: ACCENT_COLOR,
                            fontWeight: '800',
                            marginBottom: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                          }}
                        >
                          Combined Slabs
                        </div>
                        <table
                          style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}
                        >
                          <tbody>
                            {item.comboSlabs.map((s, i) => (
                              <tr
                                key={i}
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                              >
                                <td style={{ padding: '5px 0', color: TEXT_MUTED }}>
                                  {s.from} – {s.to >= 999999 ? 'Max' : s.to}
                                </td>
                                <td
                                  style={{
                                    padding: '5px 0',
                                    textAlign: 'right',
                                    color: '#fff',
                                    fontWeight: '700',
                                  }}
                                >
                                  QAR {Number(s.rate || 0).toFixed(3)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TERMS & SIGNATURE ─── */}
      <div
        style={{
          padding: '0 50px 60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ flex: 1, paddingRight: '60px' }}>
          <div
            style={{
              fontSize: '10px',
              color: ACCENT_COLOR,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '15px',
            }}
          >
            Terms & Conditions
          </div>
          <div
            style={{ fontSize: '11px', color: TEXT_MUTED, lineHeight: '1.8', maxWidth: '400px' }}
          >
            1. This quotation is valid for 15 days from the date of issue.
            <br />
            2. Security deposit is refundable after the contract period.
            <br />
            3. Maintenance and consumables included as per agreement terms.
          </div>
        </div>

        <div style={{ textAlign: 'center', position: 'relative' }}>
          <img
            src="/seel/seel1.png"
            alt="Seal"
            style={{
              position: 'absolute',
              left: '-40px',
              top: '-70px',
              width: '100px',
              height: 'auto',
              transform: 'rotate(-15deg)',
              opacity: 0.9,
              filter: 'brightness(1.5)',
            }}
          />
          <div
            style={{
              borderTop: '2px solid rgba(255,255,255,0.3)',
              width: '200px',
              margin: '0 auto 10px',
            }}
          ></div>
          <div
            style={{
              fontSize: '10px',
              color: TEXT_MUTED,
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            Authorized Signature
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div
        style={{
          marginTop: 'auto',
          padding: '40px 50px',
          background: 'rgba(0,0,0,0.2)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: '11px', color: TEXT_MUTED }}>
          <div style={{ fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
            XEROCARE TRADING & SERVICES W.L.L
          </div>
          <div>Agrico Quarter, Doha, Qatar | +974 7071 7282</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', color: TEXT_MUTED }}>
          <div>mail@xerocare.com</div>
          <div>www.xerocare.com</div>
        </div>
      </div>
    </div>
  );
};

export default RentPremiumQuotation;

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Wrench, Key, FileSignature, ArrowLeft, CheckCircle2 } from 'lucide-react';

// --- Normal Quotation Layouts ---
import ProductNormalQuotation from '../../public/quatationLayouts/productsalequatation/normal/productnormalqatation';
import SparePartsNormalQuotation from '../../public/quatationLayouts/sparepartsalequatation/normal/sparepartsnormalquatation';
import RentNormalQuotation from '../../public/quatationLayouts/rentquatation/normal/rentnormalquatatio';
import LeaseNormalQuotation from '../../public/quatationLayouts/leasequatation/normal/leasenormalquatation';

// --- Standard Quotation Layouts ---
import ProductStandardQuotation from '../../public/quatationLayouts/productsalequatation/statnderd/productstatnderdquatation';
import SparePartsStandardQuotation from '../../public/quatationLayouts/sparepartsalequatation/standerd/sparepartsstanderdquatation';
import RentStandardQuotation from '../../public/quatationLayouts/rentquatation/stanterd/rentstanderdquatation';
import LeaseStandardQuotation from '../../public/quatationLayouts/leasequatation/standerd/leasestanterdquatation';

// --- Premium Quotation Layouts ---
import ProductPremiumQuotation from '../../public/quatationLayouts/productsalequatation/premium/productpremiumquatation';
import SparePartsPremiumQuotation from '../../public/quatationLayouts/sparepartsalequatation/premium/sparepartspremiumquatation';
import RentPremiumQuotation from '../../public/quatationLayouts/rentquatation/premium/rentpremiumquatation';
import LeasePremiumQuotation from '../../public/quatationLayouts/leasequatation/premium/leasepremiumqutation';

export interface LayoutSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLayout: (layoutType: string, layoutStyle: string) => void;
  selectedType?: string | null;
  selectedStyle?: string | null;
}

const CATEGORIES = [
  {
    id: 'product',
    label: 'Product Layout',
    description: 'Direct sales of machines and devices',
    icon: ShoppingCart,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    hoverBorder: 'hover:border-primary',
  },
  {
    id: 'sparepart',
    label: 'Sparepart Layout',
    description: 'Parts, consumables and accessories',
    icon: Wrench,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    hoverBorder: 'hover:border-warning',
  },
  {
    id: 'rental',
    label: 'Rental Layout',
    description: 'Short-term machine rentals',
    icon: Key,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    hoverBorder: 'hover:border-success',
  },
  {
    id: 'lease',
    label: 'Lease Layout',
    description: 'Long-term leasing and FSM contracts',
    icon: FileSignature,
    color: 'text-lease',
    bgColor: 'bg-lease/10',
    borderColor: 'border-lease/30',
    hoverBorder: 'hover:border-lease',
  },
];

const STYLES = [
  {
    id: 'normal',
    label: 'Normal',
    description: 'Clean, no-border table style',
  },
];

export function LayoutSelectionDialog({
  open,
  onOpenChange,
  onSelectLayout,
  selectedType,
  selectedStyle,
}: LayoutSelectionDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [activeType, setActiveType] = useState<string | null>(selectedType || null);
  const [previewStyle, setPreviewStyle] = useState<string | null>(null);

  // Reset to step 1 when dialog opens
  React.useEffect(() => {
    if (open) {
      if (selectedType) {
        setActiveType(selectedType);
        setStep(2);
      } else {
        setStep(1);
        setActiveType(null);
      }
    }
  }, [open, selectedType]);

  const handleSelectType = (typeId: string) => {
    setActiveType(typeId);
    setStep(2);
  };

  const handleSelectStyle = (styleId: string) => {
    if (activeType) {
      onSelectLayout(activeType, styleId);
      onOpenChange(false);
    }
  };

  const renderPreviewContent = () => {
    if (!activeType || !previewStyle) return null;

    const isSparePart = activeType === 'sparepart';
    const isRental = activeType === 'rental' || activeType === 'rent';
    const isLease = activeType === 'lease';

    if (previewStyle === 'normal') {
      if (isSparePart) return <SparePartsNormalQuotation />;
      if (isRental) return <RentNormalQuotation />;
      if (isLease) return <LeaseNormalQuotation />;
      return <ProductNormalQuotation />;
    }

    if (previewStyle === 'standard') {
      if (isSparePart) return <SparePartsStandardQuotation />;
      if (isRental) return <RentStandardQuotation />;
      if (isLease) return <LeaseStandardQuotation />;
      return <ProductStandardQuotation />;
    }

    if (previewStyle === 'premium') {
      if (isSparePart) return <SparePartsPremiumQuotation />;
      if (isRental) {
        return (
          <RentPremiumQuotation
            billTo={{
              name: 'XEROCARE W. L. L',
              email: 'mail@xerocare.com',
              phone: '+974 7071 7282',
            }}
            quotation={{
              number: 'EST-PRM-001',
              date: '13/05/2026',
              terms: 'Due on Receipt',
              dueDate: '13/05/2026',
              contractStartDate: '13/05/2026',
              contractEndDate: '12/05/2027',
            }}
            lineItems={[
              {
                brand: 'Xerox',
                productName: 'ALTA Link',
                model: 'C8130',
                slNo: 'SN123456',
                description:
                  'Xerox AltaLink C8130 Color Multifunction Printer\n- Speed: 30 PPM\n- High Quality Color Output',
                qty: 1,
                limit: 'Color: 1000, BW: 2000',
                excessRate: 'Color: 0.150, BW: 0.050',
                image: '/quatationLayouts/rentquatation/stanterd/img/machine.png',
                bwSlabs: [
                  { from: 1, to: 2000, rate: 0.0 },
                  { from: 2001, to: 5000, rate: 0.045 },
                  { from: 5001, to: 999999, rate: 0.04 },
                ],
                colorSlabs: [
                  { from: 1, to: 1000, rate: 0.0 },
                  { from: 1001, to: 3000, rate: 0.15 },
                  { from: 3001, to: 999999, rate: 0.13 },
                ],
              },
            ]}
            agreementDetails={{
              rentType: 'Fixed Flat',
              period: 'Monthly',
              advance: 3500,
              deposit: 5000,
              duration: '36 Months',
              monthlyRentAmount: 3500,
              discountPercent: 0,
              discountedMonthlyRent: 3500,
            }}
            totals={{ subTotal: 3500, tax: 0, total: 3500 }}
          />
        );
      }
      if (isLease) {
        return (
          <LeasePremiumQuotation
            billTo={{
              name: 'XEROCARE W. L. L',
              email: 'mail@xerocare.com',
              phone: '+974 7071 7282',
            }}
            quotation={{
              number: 'LSE-PRM-001',
              date: '14/05/2026',
              dueDate: '14/06/2026',
              terms: 'Net 30',
            }}
            lineItems={[
              {
                productName: 'EPSON EcoTank',
                brand: 'EPSON',
                model: 'L15150',
                description: 'A3 Color Inkjet Multifunction Printer with low-cost maintenance',
                qty: 1,
                limit: 'N/A',
                rate: '4000',
                discount: 0,
              },
            ]}
            leaseDetails={{
              leaseType: 'EMI',
              duration: '3 Months',
              advance: 4000,
              deposit: 0,
              startDate: '14/05/2026',
              endDate: '13/08/2026',
              monthlyEmi: 4000,
            }}
            totals={{ subTotal: 12000, tax: 0, total: 12000 }}
          />
        );
      }
      return <ProductPremiumQuotation />;
    }

    return null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {step === 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="space-y-1 mt-2">
                <DialogTitle className="text-xl">
                  {step === 1 ? 'Select Layout Category' : 'Choose Layout Style'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {step === 1
                    ? 'Choose the category of quotation layout you want to use.'
                    : 'Select a visual style for the generated document.'}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            {step === 1 ? (
              <div className="grid grid-cols-2 gap-4">
                {CATEGORIES.map((category) => {
                  const isSelected = activeType === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleSelectType(category.id)}
                      className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all text-left ${
                        isSelected
                          ? `border-${category.color.split('-')[1]}-500 ${category.bgColor} ring-4 ring-${category.color.split('-')[1]}-500/10`
                          : `border-border bg-card hover:border-border ${category.hoverBorder}`
                      }`}
                    >
                      <div
                        className={`h-12 w-12 rounded-full ${category.bgColor} flex items-center justify-center mb-4 ${category.color}`}
                      >
                        <category.icon className="h-6 w-6" />
                      </div>
                      <div className="font-bold text-lg text-foreground mb-1">{category.label}</div>
                      <div className="text-sm text-muted-foreground">{category.description}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {STYLES.map((style) => {
                  const isSelected = selectedStyle === style.id && activeType === selectedType;
                  return (
                    <div
                      key={style.id}
                      onClick={() => handleSelectStyle(style.id)}
                      className={`group flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all relative overflow-hidden cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-muted/50 hover:border-border hover:bg-card'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-primary">
                          <CheckCircle2 className="h-5 w-5 fill-primary" />
                        </div>
                      )}

                      {/* Visual Preview Placeholder */}
                      <div className="relative w-24 h-32 rounded mb-3">
                        <div className="w-full h-full bg-card rounded shadow-sm border border-border p-2 flex flex-col gap-1">
                          {style.id === 'standard' && (
                            <>
                              <div className="w-full h-4 bg-info rounded-t-sm" />
                              <div className="w-1/2 h-1 bg-muted mt-2 rounded-full" />
                              <div className="w-3/4 h-1 bg-muted rounded-full" />
                              <div className="w-full h-10 bg-muted mt-auto border border-border rounded-sm" />
                              <div className="w-full h-3 bg-gradient-to-r from-warning to-info rounded-b-sm mt-auto" />
                            </>
                          )}
                          {style.id === 'normal' && (
                            <>
                              <div className="flex justify-between items-start pt-1">
                                <div className="w-1/3 h-2 bg-foreground rounded-full" />
                                <div className="w-4 h-4 bg-info rounded-full" />
                              </div>
                              <div className="w-full h-12 bg-muted mt-2" />
                              <div className="w-1/3 h-1 bg-muted ml-auto mt-2 rounded-full" />
                              <div className="w-1/4 h-1 bg-foreground ml-auto mt-1 rounded-full" />
                            </>
                          )}
                          {style.id === 'premium' && (
                            <>
                              <div className="w-full h-full bg-foreground rounded-sm flex flex-col p-2">
                                <div className="w-5 h-5 bg-warning rounded-full mx-auto" />
                                <div className="w-3/4 h-1 bg-foreground mt-2 mx-auto rounded-full" />
                                <div className="w-full h-6 bg-foreground mt-auto border border-border" />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="font-bold text-foreground mb-1 text-sm">{style.label}</div>
                      <div className="text-[11px] text-muted-foreground px-1 leading-relaxed min-h-[32px] flex items-center justify-center">
                        {style.description}
                      </div>

                      {/* Show Layout Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full text-[10px] font-black uppercase tracking-wider h-8 border-border text-foreground bg-card hover:bg-muted hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewStyle(style.id);
                        }}
                      >
                        Show Layout
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Big Inline Layout Preview Dialog */}
      <Dialog open={!!previewStyle} onOpenChange={(open) => !open && setPreviewStyle(null)}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[900px] md:max-w-[950px] lg:max-w-[1000px] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-foreground border-border text-primary-foreground rounded-2xl"
        >
          {/* Custom Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-foreground border-b border-border">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-success">
                Live Layout Preview
              </p>
              <DialogTitle className="text-base font-black text-primary-foreground capitalize">
                {previewStyle} Style — {activeType} Layout
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-success hover:bg-success/90 text-success-foreground font-bold text-xs"
                onClick={() => {
                  if (previewStyle) {
                    handleSelectStyle(previewStyle);
                    setPreviewStyle(null);
                  }
                }}
              >
                Use This Layout
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-muted-foreground hover:bg-foreground hover:text-primary-foreground text-xs"
                onClick={() => setPreviewStyle(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>

          {/* Preview Sheet Area */}
          <div className="flex-1 overflow-auto w-full bg-muted p-8 flex justify-center items-start">
            <div className="shadow-2xl rounded-lg overflow-hidden bg-card min-w-[794px] max-w-[794px] w-[794px] my-4">
              {renderPreviewContent()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

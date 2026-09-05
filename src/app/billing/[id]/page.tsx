import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { COMPANY } from "@/lib/company";
import PrintButton from "./PrintButton";

function inr2(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { society: { include: { rateConfig: true } } },
  });
  if (!invoice) notFound();

  const { society } = invoice;
  const rate = society.rateConfig;

  const days = Math.round((invoice.periodEnd.getTime() - invoice.periodStart.getTime()) / 86400000) + 1;
  const monthLabel = invoice.periodStart.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const baseAmount = Number(invoice.baseAmount);
  const gstAmount = Number(invoice.gstAmount);
  const totalAmount = Number(invoice.totalAmount);
  const gstPercentage = Number(invoice.gstPercentage);
  const hasGst = gstAmount > 0;
  const gstDirectToGovt = invoice.gstMode === "PAID_DIRECTLY_BY_SOCIETY";
  const ratePerGuardMonthly = rate ? Number(rate.ratePerGuardMonthly) : null;

  const billToAddressLines = [
    society.billingAddress || society.address,
    [society.city, society.pincode ? `- ${society.pincode}` : society.state].filter(Boolean).join(" "),
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto px-4 print:px-0">
        <div className="print:hidden mb-4 flex items-center justify-between">
          <a href="/billing" className="btn-secondary">
            ← Back to Billing
          </a>
          <PrintButton />
        </div>

        <div className="bg-white text-slate-900 rounded-xl shadow-sm print:shadow-none print:rounded-none p-10 print:p-8 border border-slate-200 print:border-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-red-600">{COMPANY.name} [Invoice]</h1>
            <img src={COMPANY.logoPath} alt={`${COMPANY.name} logo`} className="h-16 w-16 object-contain shrink-0" />
          </div>

          {/* Company / Bill-to grid */}
          <div className="grid grid-cols-2 gap-8 text-sm mb-8">
            <div className="space-y-1">
              <p className="font-semibold">{COMPANY.name}</p>
              {COMPANY.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>{COMPANY.phone}</p>
              <p className="text-blue-700 underline">{COMPANY.email}</p>
              <p>GST - {COMPANY.gstNumber}</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="font-semibold">Invoice No.</span>
                <span>{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold">Bill To</span>
                <span className="text-right">{society.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold shrink-0">Address</span>
                <span className="text-right">
                  {billToAddressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold">Phone</span>
                <span>{society.contactPhone}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="font-semibold">GST No</span>
                <span>{society.gstNumber || "—"}</span>
              </div>
            </div>
          </div>

          {/* Totals summary */}
          <div className="flex justify-end mb-8">
            <div className="w-full max-w-sm space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Charges for month of {monthLabel}</span>
                <span>{inr2(baseAmount)}</span>
              </div>
              {hasGst && (
                <>
                  <div className="flex justify-between bg-slate-100 px-2 py-1">
                    <span>GST applicable per Govt Regulation</span>
                    <span>{gstPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{gstDirectToGovt ? "GST (payable directly by society to government)" : "GST Payable"}</span>
                    <span>{inr2(gstAmount)}</span>
                  </div>
                  {gstDirectToGovt && (
                    <p className="text-xs text-slate-500 italic">Shown for reference only — not included in the amount due to us.</p>
                  )}
                </>
              )}
              <div className="flex justify-between bg-slate-100 px-2 py-2 font-semibold text-base border-t border-slate-300">
                <span>Total Amount Due</span>
                <span>{inr2(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Signature / period label */}
          <div className="flex items-end justify-between mb-8">
            <p className="text-sm">Authorized Signature</p>
            <p className="text-sm font-semibold text-red-600">Invoice for {monthLabel}</p>
          </div>

          {/* Particulars */}
          <h2 className="text-lg font-semibold mb-2">Particulars</h2>
          <table className="w-full text-sm border border-slate-300">
            <thead>
              <tr className="bg-slate-200">
                <th className="text-left px-3 py-2 border border-slate-300 font-semibold">Unit (Security Guard)</th>
                <th className="text-left px-3 py-2 border border-slate-300 font-semibold">
                  No of Days {ratePerGuardMonthly ? `(Rate per unit ${inr2(ratePerGuardMonthly).replace(".00", "")} per month)` : ""}
                </th>
                <th className="text-right px-3 py-2 border border-slate-300 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 border border-slate-300">{invoice.guardsBilled}</td>
                <td className="px-3 py-2 border border-slate-300">{days}</td>
                <td className="px-3 py-2 border border-slate-300 text-right">{inr2(baseAmount)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 border border-slate-300 text-right font-medium">
                  Subtotal
                </td>
                <td className="px-3 py-2 border border-slate-300 text-right">{inr2(baseAmount)}</td>
              </tr>
              {hasGst && (
                <tr>
                  <td colSpan={2} className="px-3 py-2 border border-slate-300 text-right font-medium">
                    GST ({gstPercentage}%){gstDirectToGovt ? " — payable directly to government" : ""}
                  </td>
                  <td className="px-3 py-2 border border-slate-300 text-right">{inr2(gstAmount)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={2} className="px-3 py-2 border border-slate-300 text-right font-semibold">
                  Total{gstDirectToGovt ? " (excl. GST, paid directly to government)" : ""}
                </td>
                <td className="px-3 py-2 border border-slate-300 text-right font-semibold">{inr2(totalAmount)}</td>
              </tr>
            </tbody>
          </table>

          {invoice.notes && <p className="text-xs text-slate-500 mt-4">{invoice.notes}</p>}

          <div className="text-center text-sm mt-10 space-y-1">
            <p className="italic">Make all checks payable to {COMPANY.name}</p>
            <p>Thank you for your business</p>
          </div>
        </div>
      </div>
    </div>
  );
}

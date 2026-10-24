// apps/mobile/src/data/pharmacyData.ts
// Decoupled types, history data, and invoice generation for Pharmacy

import { BillLine } from './pharmacySample';

export type Stage = 'home' | 'shops' | 'track';
export type Mode = 'delivery' | 'pickup';
export type HistoryStatus = 'delivered' | 'picked_up' | 'ready' | 'out_for_delivery';

export interface HistoryItem {
  ref: string;
  shop: string;
  shopHi?: string;
  shopAddress?: string;
  shopPhone?: string;
  total: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  mode: Mode;
  paidInApp: boolean;
  date: string;
  status: HistoryStatus;
  patientName: string;
  items: BillLine[];
}

export const INITIAL_HISTORY: HistoryItem[] = [
  {
    ref: 'RX-5730',
    shop: 'Saket Care Pharmacy',
    shopHi: 'साकेत केयर फार्मेसी',
    shopAddress: 'Shop 4, Main Market, Saket, South Delhi',
    shopPhone: '+91 98112 34567',
    total: 306,
    subtotal: 360,
    discount: 54,
    deliveryFee: 0,
    mode: 'delivery',
    paidInApp: true,
    date: '19 Oct 2026, 04:30 PM',
    status: 'delivered',
    patientName: 'Myself (Rahul Sharma)',
    items: [
      {
        id: 'm1',
        name: 'Paracetamol 500 mg (10 tablets)',
        nameHi: 'पैरासिटामोल 500 मि.ग्रा. (10 गोलियां)',
        qty: 2,
        price: 30,
      },
      {
        id: 'm2',
        name: 'Azithromycin 500 mg (3 tablets)',
        nameHi: 'एज़िथ्रोमाइसिन 500 मि.ग्रा. (3 गोलियां)',
        qty: 1,
        price: 120,
      },
      {
        id: 'm3',
        name: 'Cetirizine 10 mg (10 tablets)',
        nameHi: 'सिट्रीज़िन 10 मि.ग्रा. (10 गोलियां)',
        qty: 1,
        price: 40,
      },
      {
        id: 'm4',
        name: 'Vitamin D3 60000 IU (4 capsules)',
        nameHi: 'विटामिन D3 60000 IU (4 कैप्सूल)',
        qty: 1,
        price: 140,
      },
    ],
  },
];

/**
 * Generates clean, print-ready HTML for tax invoice & receipt
 */
export function generateInvoiceHtml(order: HistoryItem): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice - ${order.ref}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 36px; color: #0F172A; max-width: 740px; margin: 0 auto; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #2563EB; padding-bottom: 20px; margin-bottom: 24px; }
        .logo-title { font-size: 22px; font-weight: 800; color: #172554; }
        .logo-sub { font-size: 13px; color: #2563EB; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2px; }
        .inv-title { font-size: 22px; font-weight: 900; text-align: right; color: #0F172A; letter-spacing: 0.5px; }
        .inv-meta { font-size: 13px; color: #64748B; text-align: right; margin-top: 4px; }
        .details-grid { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 13.5px; line-height: 1.6; background: #F8FAFC; padding: 16px; border-radius: 12px; border: 1px solid #E2E8F0; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px; }
        .table th { background: #F1F5F9; text-align: left; padding: 11px 12px; border-bottom: 2px solid #CBD5E1; color: #334155; font-weight: 700; }
        .table td { padding: 12px; border-bottom: 1px solid #E2E8F0; }
        .total-box { margin-left: auto; width: 280px; font-size: 14px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; }
        .total-row.final { border-top: 2px solid #0F172A; margin-top: 8px; padding-top: 10px; font-size: 17px; font-weight: 900; color: #0F172A; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
        .badge { display: inline-block; background: #ECFDF5; color: #059669; font-weight: 700; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo-title">ADITYAM NIRAMAYAA</div>
          <div class="logo-sub">Partner Pharmacy Network</div>
        </div>
        <div>
          <div class="inv-title">TAX INVOICE / RECEIPT</div>
          <div class="inv-meta">Order #${order.ref} • ${order.date}</div>
          <div class="badge">✓ PAID IN FULL (APP PRIVILEGE)</div>
        </div>
      </div>

      <div class="details-grid">
        <div>
          <strong>Billed By (Partner Pharmacy):</strong><br/>
          ${order.shop}<br/>
          ${order.shopAddress || 'Saket, New Delhi 110017'}<br/>
          Helpline: ${order.shopPhone || '+91 98112 34567'}
        </div>
        <div style="text-align: right;">
          <strong>Patient & Delivery Details:</strong><br/>
          ${order.patientName}<br/>
          Fulfillment: ${order.mode === 'delivery' ? 'Home Delivery (Direct Dispatch)' : 'Self Pickup at Pharmacy'}<br/>
          Payment Mode: In-App Exclusive Tariff (UPI / Cards)
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Item / Medicine Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (it) => `
            <tr>
              <td><strong>${it.name}</strong></td>
              <td style="text-align: center;">${it.qty}</td>
              <td style="text-align: right;">₹${it.price}</td>
              <td style="text-align: right;">₹${it.price * it.qty}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="total-box">
        <div class="total-row">
          <span>Pharmacy MRP Subtotal:</span>
          <span>₹${order.subtotal}</span>
        </div>
        <div class="total-row" style="color: #059669; font-weight: 700;">
          <span>Adityam Network Savings:</span>
          <span>- ₹${order.discount}</span>
        </div>
        <div class="total-row">
          <span>Delivery & Packaging:</span>
          <span style="color: #059669; font-weight: 700;">FREE</span>
        </div>
        <div class="total-row final">
          <span>Total Paid:</span>
          <span>₹${order.total}</span>
        </div>
      </div>

      <div class="footer">
        Computer-generated tax invoice. No signature required.<br/>
        Adityam Niramayaa Health Technologies Pvt Ltd • 24/7 Concierge: 1800-890-2424
      </div>
    </body>
    </html>
  `;
}

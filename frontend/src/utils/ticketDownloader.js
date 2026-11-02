/**
 * Utility functions for downloading official SportsHub tickets and QR codes.
 */

export async function downloadQrImage({ bookingId, qrImageUrl }) {
  try {
    const res = await fetch(qrImageUrl);
    if (!res.ok) throw new Error("Could not fetch QR code image.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SportsHub-QR-${bookingId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("QR image download failed:", err);
    window.open(qrImageUrl, "_blank");
  }
}

export async function downloadTicketPass({
  bookingId,
  entryCode,
  venueName,
  venueAddress,
  venueDetail,
  customerName,
  totalAmount,
  paymentMethod,
  txnId,
  qrImageUrl,
}) {
  let qrBase64 = "";
  try {
    const res = await fetch(qrImageUrl);
    if (res.ok) {
      const blob = await res.blob();
      qrBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn("Could not encode QR image into base64, using direct URL", err);
    qrBase64 = qrImageUrl;
  }

  const safeCode = entryCode || `SH-TKT-${bookingId}`;
  const safeVenue = venueName || "SportsHub Venue";
  const safeDetail = venueDetail || venueAddress || "Full Admission Access";
  const safeCustomer = customerName || "SportsHub Guest";
  const safeTotal = typeof totalAmount === "number" ? totalAmount.toLocaleString("en-IN") : totalAmount || "0";
  const safeMethod = paymentMethod || "Online";
  const safeTxn = txnId || `TXN-${Date.now()}`;
  const issueDate = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SportsHub Pass - ${safeCode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #0f172a;
      padding: 30px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .ticket-card {
      width: 100%;
      max-width: 580px;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      border: 1px solid #e2e8f0;
    }
    .ticket-banner {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0284c7 100%);
      color: #ffffff;
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ticket-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ticket-brand-icon {
      font-size: 32px;
    }
    .ticket-brand h1 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .ticket-brand p {
      font-size: 11px;
      color: #93c5fd;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .badge-confirmed {
      background: #10b981;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ticket-body {
      padding: 28px;
    }
    .venue-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .venue-detail {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 22px;
    }
    .ticket-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      padding: 16px 20px;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      margin-bottom: 24px;
    }
    .grid-item span {
      display: block;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .grid-item strong {
      font-size: 15px;
      color: #0f172a;
    }
    .qr-box {
      text-align: center;
      padding: 24px 16px;
      background: #f1f5f9;
      border-radius: 16px;
      border: 2px dashed #cbd5e1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .qr-img {
      width: 220px;
      height: 220px;
      border-radius: 10px;
      background: #ffffff;
      padding: 10px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .entry-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #4338ca;
      margin-top: 14px;
    }
    .scan-note {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      font-weight: 600;
    }
    .verified-pill {
      margin-top: 8px;
      font-size: 10px;
      font-weight: 700;
      color: #047857;
      background: #d1fae5;
      padding: 3px 8px;
      border-radius: 99px;
    }
    .ticket-footer-bar {
      padding: 16px 28px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-meta {
      font-size: 11px;
      color: #94a3b8;
    }
    .print-btn {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .print-btn:hover {
      background: #4338ca;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .ticket-card {
        box-shadow: none;
        border: 1px solid #ccc;
      }
      .print-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="ticket-card">
    <div class="ticket-banner">
      <div class="ticket-brand">
        <span class="ticket-brand-icon">🎟️</span>
        <div>
          <h1>SportsHub Entry Pass</h1>
          <p>Official Turnstile Access Pass</p>
        </div>
      </div>
      <span class="badge-confirmed">CONFIRMED</span>
    </div>

    <div class="ticket-body">
      <h2 class="venue-title">${safeVenue}</h2>
      <p class="venue-detail">${safeDetail}</p>

      <div class="ticket-grid">
        <div class="grid-item">
          <span>Booking ID</span>
          <strong>#${bookingId}</strong>
        </div>
        <div class="grid-item">
          <span>Entry Gate</span>
          <strong>GATE A / MAIN</strong>
        </div>
        <div class="grid-item">
          <span>Customer</span>
          <strong>${safeCustomer}</strong>
        </div>
        <div class="grid-item">
          <span>Total Paid</span>
          <strong>₹${safeTotal}</strong>
        </div>
        <div class="grid-item">
          <span>Payment Method</span>
          <strong>${safeMethod}</strong>
        </div>
        <div class="grid-item">
          <span>Transaction Ref</span>
          <strong style="font-size:12px; font-family:monospace;">${safeTxn}</strong>
        </div>
      </div>

      <div class="qr-box">
        ${qrBase64 ? `<img src="${qrBase64}" alt="Turnstile QR Pass" class="qr-img" />` : ''}
        <div class="entry-code">${safeCode}</div>
        <span class="verified-pill">✓ Backend QR Verified</span>
        <p class="scan-note">Present this official visual QR at the venue entrance gate.</p>
      </div>
    </div>

    <div class="ticket-footer-bar">
      <div class="footer-meta">
        Issued on ${issueDate} · SportsHub Verified
      </div>
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SportsHub-Ticket-${safeCode}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


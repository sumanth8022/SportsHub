import React, { useState } from "react";
import "./PaymentGateway.css";
import { downloadTicketPass, downloadQrImage } from "../../utils/ticketDownloader";

export default function PaymentGateway({
  booking,
  quote,
  selected,
  onSuccess,
  onClose,
  secondsLeft,
  onNotify,
  onViewTicket,
}) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
  const bookingId = booking?.bookingId || booking?.id || 101;
  const totalAmount = quote?.total ?? selected?.price ?? 1000;

  // Wizard Step: 1 = Customer, 2 = Checkout, 3 = Receipt & Pass
  const [step, setStep] = useState(1);

  // Step 1: Customer Info
  const [fullName, setFullName] = useState("Rahul Sharma");
  const [email, setEmail] = useState("rahul.sharma@example.com");
  const [mobileNumber, setMobileNumber] = useState("9876543210");
  const [customer, setCustomer] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");

  // Step 2: Payment Method
  const [method, setMethod] = useState("UPI"); // 'UPI' | 'QR_CODE' | 'NET_BANKING' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'CASH' | 'CHEQUE_DD'
  const [payerName, setPayerName] = useState("Rahul Sharma");
  const [upiId, setUpiId] = useState("rahul@okaxis");
  const [bankName, setBankName] = useState("HDFC Bank");
  const [cardHolder, setCardHolder] = useState("Rahul Sharma");
  const [instrumentType, setInstrumentType] = useState("CHEQUE");
  const [instrumentNumber, setInstrumentNumber] = useState("CHQ992011");
  const [instrumentDate, setInstrumentDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    } catch (e) {
      return new Date().toISOString().split("T")[0];
    }
  });

  // Step 3: Receipt & Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [activePayment, setActivePayment] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Format countdown
  const formatTimer = (sec) => {
    if (!sec || sec <= 0) return "00:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  /* ================== STEP 1: REGISTER CUSTOMER ================== */
  const handleRegisterCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!fullName || !email || !mobileNumber) {
      setCustomerMessage("Please fill in all customer fields.");
      return;
    }
    setCustomerLoading(true);
    setCustomerMessage("");

    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          mobileNumber,
          paymentAmount: totalAmount,
          bookingId: bookingId,
        }),
      });
      if (!res.ok) throw new Error("Customer registration failed");
      const data = await res.json();
      setCustomer(data);
      setStep(2);
    } catch (err) {
      setCustomerMessage(err.message || "Failed to register customer.");
    } finally {
      setCustomerLoading(false);
    }
  };

  /* ================== STEP 2: CREATE & COMPLETE PAYMENT ================== */
  const handleExecutePayment = async () => {
    let currentCustomer = customer;

    // Fallback registration if customer not created yet
    if (!currentCustomer?.id) {
      try {
        setPaymentLoading(true);
        const res = await fetch(`${API_BASE}/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            email,
            mobileNumber,
            paymentAmount: totalAmount,
            bookingId: bookingId,
          }),
        });
        if (res.ok) {
          currentCustomer = await res.json();
          setCustomer(currentCustomer);
        }
      } catch (e) {
        console.error("Auto customer create failed", e);
      }
    }

    if (!currentCustomer?.id) {
      setPaymentError("Customer details required before checkout.");
      setPaymentLoading(false);
      return;
    }

    setPaymentLoading(true);
    setPaymentError("");

    try {
      // 1. Create payment record
      const payload = {
        customerId: String(currentCustomer.id),
        paymentMethod: method,
        payerName: payerName || fullName,
        paymentReference: method === "UPI" ? upiId : `REF-${Date.now()}`,
        bankName: method === "NET_BANKING" ? bankName : null,
      };

      const res = await fetch(`${API_BASE}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const paymentData = await res.json();
      if (!res.ok) throw new Error(paymentData.message || "Failed to create payment.");

      setActivePayment(paymentData);
      const paymentId = paymentData.paymentId || paymentData.id;

      // 2. Complete payment electronically
      let finalReceipt = paymentData.receipt;
      if (paymentId) {
        const completeRes = await fetch(`${API_BASE}/demo/payments/${paymentId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ simulationOutcome: "SUCCESS" }),
        });
        const completeData = await completeRes.json();
        if (completeData.receipt) finalReceipt = completeData.receipt;
      }

      setReceipt(finalReceipt);

      // Fetch freshly confirmed booking from backend
      let fullConfirmedBooking = {
        bookingId: bookingId,
        id: bookingId,
        confirmed: true,
        status: "CONFIRMED",
        paymentStatus: "COMPLETED",
        ticketCode: `SH-TKT-${bookingId}`,
        qrImageUrl: `${API_BASE}/bookings/${bookingId}/qr`,
      };

      try {
        const bRes = await fetch(`${API_BASE}/bookings/${bookingId}`);
        if (bRes.ok) {
          const bData = await bRes.json();
          fullConfirmedBooking = {
            ...bData,
            bookingId: bookingId,
            id: bookingId,
            confirmed: true,
            status: "CONFIRMED",
            paymentStatus: "COMPLETED",
            qrImageUrl: `${API_BASE}/bookings/${bookingId}/qr`,
          };
        }
      } catch (e) {
        console.warn("Could not fetch updated booking details", e);
      }

      setConfirmedBooking(fullConfirmedBooking);

      // Notify parent app of success & confirmed booking
      if (onSuccess) {
        onSuccess({
          success: true,
          bookingId: bookingId,
          paymentMethod: method,
          receipt: finalReceipt,
          amount: totalAmount,
          booking: fullConfirmedBooking,
        });
      }

      if (onNotify) {
        onNotify({
          type: "payment_success",
          title: "🎉 Payment Successful!",
          message: `Payment confirmed. Official Entry Pass generated.`,
          severity: "success",
        });
      }

      // Move to Step 3 (Receipt & Pass)
      setStep(3);
    } catch (err) {
      setPaymentError(err.message || "Payment execution failed.");
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="pf-modal-overlay" role="dialog" aria-modal="true" aria-label="PayFlow Payment Gateway">
      <div className="pf-modal-container">
        {/* Header */}
        <header className="pf-header">
          <div>
            <p className="pf-eyebrow">PayFlow Payment Gateway</p>
            <h2>{selected?.title || "Sports Reservation"}</h2>
            <p className="pf-subtitle">
              Booking #{bookingId} · Hold expires in <b>{formatTimer(secondsLeft)}</b>
            </p>
          </div>
          <button type="button" className="pf-close-btn" onClick={onClose} aria-label="Close Payment">
            ✕
          </button>
        </header>

        {/* 3-Step Progress Bar */}
        <nav className="pf-wizard-progress" aria-label="Wizard Steps">
          <div className={`pf-progress-step ${step === 1 ? "active" : step > 1 ? "complete" : ""}`}>
            <span>1</span>
            <small>Customer</small>
          </div>
          <div className="pf-progress-line" />

          <div className={`pf-progress-step ${step === 2 ? "active" : step > 2 ? "complete" : ""}`}>
            <span>2</span>
            <small>Checkout</small>
          </div>
          <div className="pf-progress-line" />

          <div className={`pf-progress-step ${step === 3 ? "active" : ""}`}>
            <span>3</span>
            <small>Receipt &amp; Pass</small>
          </div>
        </nav>

        {/* ===================== STEP 1: CUSTOMER REGISTRATION ===================== */}
        {step === 1 && (
          <div className="pf-step-content">
            <div className="pf-section-head">
              <p className="pf-eyebrow">STEP 1 OF 2</p>
              <h3>Customer Registration</h3>
              <p>Enter billing details to initialize your secure booking session.</p>
            </div>

            <form onSubmit={handleRegisterCustomer}>
              <div className="pf-form-grid">
                <div className="pf-field">
                  <label htmlFor="pf-name">Full Name *</label>
                  <input
                    id="pf-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>

                <div className="pf-field">
                  <label htmlFor="pf-email">Email Address *</label>
                  <input
                    id="pf-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>

                <div className="pf-field">
                  <label htmlFor="pf-mobile">Mobile Number (10 digits) *</label>
                  <input
                    id="pf-mobile"
                    type="tel"
                    required
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                  />
                </div>

                <div className="pf-field">
                  <label htmlFor="pf-amt">Payment Amount (₹)</label>
                  <input id="pf-amt" type="text" readOnly value={`₹${totalAmount.toLocaleString("en-IN")}`} />
                </div>
              </div>

              {customerMessage && <p className="pf-subtitle" style={{ color: "red", marginBottom: 12 }}>{customerMessage}</p>}

              <div className="pf-wizard-footer">
                <span className="pf-subtitle">Fill customer details to proceed to payment options.</span>
                <button type="submit" className="pf-btn primary" disabled={customerLoading}>
                  {customerLoading ? "Saving Details..." : "Continue to Payment →"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================== STEP 2: CHECKOUT & PAYMENT ===================== */}
        {step === 2 && (
          <div className="pf-step-content">
            <div className="pf-section-head">
              <p className="pf-eyebrow">STEP 2 OF 2</p>
              <h3>Checkout &amp; Payment Options</h3>
              <p>Select your preferred payment method to complete reservation #{bookingId}.</p>
            </div>

            {/* Customer & Amount Summary Bar */}
            <div className="pf-checkout-summary">
              <div className="pf-summary-item">
                <span>Customer</span>
                <strong>{customer?.fullName || fullName}</strong>
                <small style={{ color: "#64748b", display: "block", fontSize: 11, marginTop: 2 }}>
                  {customer?.email || email} · +91 {customer?.mobileNumber || mobileNumber}
                </small>
              </div>
              <div className="pf-summary-item" style={{ textAlign: "right" }}>
                <span>Amount Due</span>
                <strong style={{ color: "var(--pf-primary)", fontSize: 22 }}>
                  ₹{totalAmount.toLocaleString("en-IN")}
                </strong>
                <small style={{ color: "#16a34a", display: "block", fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                  ● Demo Sandbox
                </small>
              </div>
            </div>

            {/* Method Grid */}
            <p className="pf-eyebrow" style={{ marginBottom: 10, fontSize: 10 }}>CHOOSE PAYMENT METHOD</p>
            <div className="pf-method-grid" role="radiogroup" aria-label="Payment Methods">
              {[
                { id: "UPI", icon: "⚡", title: "UPI", subtitle: "GPay, PhonePe, Paytm" },
                { id: "QR_CODE", icon: "📱", title: "QR Code", subtitle: "Instant Scan & Pay" },
                { id: "NET_BANKING", icon: "🏦", title: "Net Banking", subtitle: "All Major Banks" },
                { id: "DEBIT_CARD", icon: "💳", title: "Debit Card", subtitle: "Visa, MC, RuPay" },
                { id: "CREDIT_CARD", icon: "💳", title: "Credit Card", subtitle: "Instant Processing" },
              ].map((m) => {
                const isSelected = method === m.id;
                return (
                  <div
                    key={m.id}
                    className={`pf-method-card ${isSelected ? "selected" : ""}`}
                    onClick={() => setMethod(m.id)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setMethod(m.id);
                      }
                    }}
                  >
                    <div className="pf-method-card-top">
                      <span className="pf-method-icon">{m.icon}</span>
                      <input
                        type="radio"
                        name="paymentMethodRadio"
                        checked={isSelected}
                        onChange={() => setMethod(m.id)}
                        tabIndex={-1}
                        aria-label={m.title}
                      />
                    </div>
                    <strong>{m.title}</strong>
                    <small>{m.subtitle}</small>
                  </div>
                );
              })}
            </div>

            {/* Method Details Box */}
            <div className="pf-method-details-box">
              <div className="pf-method-heading-row">
                <h4>
                  {method === "UPI" && "⚡ UPI Payment Details"}
                  {method === "QR_CODE" && "📱 Instant QR Code Payment"}
                  {method === "NET_BANKING" && "🏦 Net Banking Authorization"}
                  {method === "DEBIT_CARD" && "💳 Debit Card Checkout"}
                  {method === "CREDIT_CARD" && "💳 Credit Card Checkout"}
                </h4>
                <span className="pf-method-badge">
                  Simulated Instant
                </span>
              </div>

              {method === "UPI" && (
                <div className="pf-form-grid">
                  <div className="pf-field">
                    <label>Payer Name *</label>
                    <input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Full Name" />
                  </div>
                  <div className="pf-field">
                    <label>Virtual Payment Address (UPI ID) *</label>
                    <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@okaxis" />
                  </div>
                </div>
              )}

              {method === "QR_CODE" && (
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <div
                    style={{
                      width: 170,
                      height: 170,
                      margin: "0 auto 14px",
                      background: "#ffffff",
                      border: "2px dashed #cbd5e1",
                      borderRadius: 16,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 8px -2px rgba(0,0,0,0.06)",
                    }}
                  >
                    <span style={{ fontSize: 44 }}>📱</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5", letterSpacing: 0.5 }}>
                      BHIM UPI · QR READY
                    </span>
                    <small style={{ fontSize: 10, color: "#64748b" }}>Instant Demo Payment</small>
                  </div>
                  <p className="pf-subtitle" style={{ marginBottom: 14 }}>
                    Click <b>Pay ₹{totalAmount.toLocaleString("en-IN")}</b> below to simulate instant UPI QR confirmation.
                  </p>
                  <div className="pf-field" style={{ maxWidth: 320, margin: "0 auto", textAlign: "left" }}>
                    <label>Payer Name</label>
                    <input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
                  </div>
                </div>
              )}

              {method === "NET_BANKING" && (
                <div className="pf-form-grid">
                  <div className="pf-field">
                    <label>Select Bank *</label>
                    <select value={bankName} onChange={(e) => setBankName(e.target.value)}>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="Punjab National Bank">Punjab National Bank</option>
                    </select>
                  </div>
                  <div className="pf-field">
                    <label>Account Holder Name *</label>
                    <input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
                  </div>
                </div>
              )}

              {(method === "DEBIT_CARD" || method === "CREDIT_CARD") && (
                <div>
                  <div className="pf-form-grid">
                    <div className="pf-field">
                      <label>Cardholder Name *</label>
                      <input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                    </div>
                    <div className="pf-field">
                      <label>Card Number (Demo Auto-filled)</label>
                      <input readOnly value="4111 •••• •••• 1111 (Demo Secure)" />
                    </div>
                    <div className="pf-field">
                      <label>Expiry Date</label>
                      <input readOnly value="12 / 28" />
                    </div>
                    <div className="pf-field">
                      <label>CVV / CVC</label>
                      <input readOnly value="••• (Protected)" />
                    </div>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>
                    🔒 End-to-end sandbox encrypted. No real card details are collected or transmitted.
                  </p>
                </div>
              )}


            </div>

            {paymentError && <p className="pf-subtitle" style={{ color: "red", marginBottom: 12 }}>{paymentError}</p>}

            <div className="pf-wizard-footer">
              <button type="button" className="pf-btn secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                type="button"
                className="pf-btn primary"
                disabled={paymentLoading}
                onClick={handleExecutePayment}
                style={{ background: "#16a34a", padding: "12px 28px", fontSize: 14 }}
              >
                {paymentLoading ? "Processing Payment..." : `✓ Pay ₹${totalAmount.toLocaleString("en-IN")}`}
              </button>
            </div>
          </div>
        )}

        {/* ===================== STEP 3: RECEIPT & ENTRY PASS ===================== */}
        {step === 3 && (
          <div className="pf-step-content">
            <div className="pf-section-head">
              <p className="pf-eyebrow" style={{ color: "#16a34a" }}>PAYMENT COMPLETED</p>
              <h3>Payment Receipt &amp; Official Entry Pass</h3>
              <p>Your payment was recorded successfully and your booking is confirmed.</p>
            </div>

            {/* Official PayFlow Receipt */}
            <div className="pf-receipt-wrapper">
              <div className="pf-receipt-header">
                <div>
                  <span className="pf-receipt-brand">PayFlow Official Receipt</span>
                  <p className="pf-subtitle" style={{ margin: "2px 0 0" }}>
                    Transaction Ref: {receipt?.transactionReference || `TXN-SH-${Date.now()}`}
                  </p>
                </div>
                <span className="pf-receipt-num">{receipt?.receiptNumber || `RCPT-${bookingId}-OK`}</span>
              </div>

              <div className="pf-receipt-grid">
                <div><span>Customer:</span> <strong>{receipt?.customerName || fullName}</strong></div>
                <div><span>Email:</span> <strong>{receipt?.customerEmail || email}</strong></div>
                <div><span>Mobile:</span> <strong>{receipt?.mobileNumber || mobileNumber}</strong></div>
                <div><span>Method:</span> <strong>{receipt?.paymentMethod || method}</strong></div>
                <div><span>Booking ID:</span> <strong>#{bookingId}</strong></div>
                <div><span>Status:</span> <strong style={{ color: "#16a34a" }}>PAID &amp; CONFIRMED</strong></div>
              </div>

              <div className="pf-receipt-total">
                <span>Total Amount Paid</span>
                <strong>₹{totalAmount.toLocaleString("en-IN")}</strong>
              </div>
            </div>

            {/* Official Ticket Entry Pass Preview */}
            <div className="pf-ticket-preview">
              <div className="pf-ticket-main">
                <span className="pf-eyebrow" style={{ fontSize: 9 }}>OFFICIAL SPORTSHUB ENTRY PASS</span>
                <h4>{selected?.title || confirmedBooking?.location?.venueName || "Sports Reservation"}</h4>
                <p><b>Date &amp; Details:</b> {selected?.detail || "Full Pass Reservation"}</p>
                <p><b>Entry Code:</b> {confirmedBooking?.ticketCode || `SH-TKT-${bookingId}`}</p>
                <p><b>Status:</b> <span style={{ color: "#16a34a", fontWeight: "bold" }}>CONFIRMED</span></p>
                <p style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                  Show this official backend QR code at the entrance turnstile for instant admission.
                </p>
              </div>

              <div className="pf-ticket-qr-side">
                <img
                  src={`${API_BASE}/bookings/${bookingId}/qr`}
                  alt={`Official Backend QR Pass for Booking #${bookingId}`}
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = `${API_BASE}/bookings/${bookingId}/qr/image`;
                  }}
                />
                <span>Backend Verified</span>
              </div>
            </div>

            {/* Footer Buttons with Dedicated Download Options */}
            <div className="pf-wizard-footer" style={{ flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="pf-btn primary"
                  style={{ background: "#16a34a", display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={() =>
                    downloadTicketPass({
                      bookingId,
                      entryCode: confirmedBooking?.ticketCode || `SH-TKT-${bookingId}`,
                      venueName: selected?.title || confirmedBooking?.location?.venueName,
                      venueDetail: selected?.detail || confirmedBooking?.location?.address,
                      customerName: receipt?.customerName || fullName,
                      totalAmount,
                      paymentMethod: receipt?.paymentMethod || method,
                      txnId: receipt?.transactionReference,
                      qrImageUrl: `${API_BASE}/bookings/${bookingId}/qr`,
                    })
                  }
                >
                  📥 Download Ticket
                </button>

                <button
                  type="button"
                  className="pf-btn secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={() =>
                    downloadQrImage({
                      bookingId,
                      qrImageUrl: `${API_BASE}/bookings/${bookingId}/qr`,
                    })
                  }
                >
                  🖼️ Download QR
                </button>

                <button
                  type="button"
                  className="pf-btn secondary"
                  onClick={() => window.print()}
                >
                  🖨️ Print Pass
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {onViewTicket && (
                  <button
                    type="button"
                    className="pf-btn primary"
                    onClick={onViewTicket}
                    style={{ background: "#4f46e5" }}
                  >
                    🎟️ View Full Pass &amp; Directions
                  </button>
                )}
                <button type="button" className="pf-btn secondary" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

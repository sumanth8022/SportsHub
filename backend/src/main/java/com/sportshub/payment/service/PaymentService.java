
package com.sportshub.payment.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sportshub.payment.entity.Customer;
import com.sportshub.payment.entity.Payment;
import com.sportshub.payment.repository.CustomerRepository;
import com.sportshub.payment.repository.PaymentRepository;

@Service
public class PaymentService {

    private static final Set<String> SUPPORTED_METHODS = Set.of(
            "UPI",
            "NET_BANKING",
            "QR_CODE",
            "DEBIT_CARD",
            "CREDIT_CARD",
            "CASH",
            "CHEQUE_DD"
    );

    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;

    public PaymentService(
            PaymentRepository paymentRepository,
            CustomerRepository customerRepository) {
        this.paymentRepository = paymentRepository;
        this.customerRepository = customerRepository;
    }

    public String normalizeMethod(String method) {
        if (method == null || method.isBlank()) {
            throw new IllegalArgumentException(
                    "Payment method is required");
        }

        return method.trim()
                .toUpperCase(Locale.ROOT)
                .replace(' ', '_')
                .replace('-', '_')
                .replace('/', '_');
    }

    @Transactional
    public Payment createPayment(
            Long customerId,
            Map<String, String> request) {

        if (customerId == null) {
            throw new IllegalArgumentException(
                    "Customer ID is required");
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Customer not found"));

        String method = normalizeMethod(
                request.get("paymentMethod"));

        if (method.equals("CHEQUE__DD")) {
            method = "CHEQUE_DD";
        }

        if (!SUPPORTED_METHODS.contains(method)) {
            throw new IllegalArgumentException(
                    "Unsupported payment method. Supported methods: "
                    + SUPPORTED_METHODS);
        }

        if (customer.getPaymentAmount() == null
                || customer.getPaymentAmount() <= 0) {
            throw new IllegalArgumentException(
                    "Payment amount must be greater than zero");
        }

        Payment payment = new Payment();
        payment.setCustomerId(customerId);
        payment.setBookingId(customer.getBookingId());
        payment.setAmount(BigDecimal.valueOf(
                customer.getPaymentAmount()));
        payment.setPaymentMethod(method);
        payment.setPaymentStatus("PENDING");

        // Shared payer information
        payment.setPayerName(
                clean(request.get("payerName")));

        payment.setPaymentReference(
                clean(request.get("paymentReference")));

        // Method-specific validation
        switch (method) {
            case "UPI":
                require(payment.getPayerName(), "Payer name");
                require(payment.getPaymentReference(), "UPI ID/reference");
                break;

            case "QR_CODE":
                require(payment.getPayerName(), "Payer name");
                require(payment.getPaymentReference(),
                        "QR payment reference");
                break;

            case "NET_BANKING":
                require(request.get("bankName"), "Bank name");
                require(payment.getPayerName(), "Account holder name");
                payment.setBankName(clean(request.get("bankName")));
                break;

            case "DEBIT_CARD":
            case "CREDIT_CARD":
                require(payment.getPayerName(), "Cardholder name");
                // Do not collect or store card numbers, CVVs, or PINs.
                break;

            case "CASH":
                require(payment.getPayerName(), "Received from");
                require(request.get("receivedBy"), "Receiver name");

                BigDecimal received;
                try {
                    received = new BigDecimal(
                            request.get("amountReceived"));
                } catch (Exception ex) {
                    throw new IllegalArgumentException(
                            "A valid amount received is required");
                }

                if (received.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException(
                            "Amount received must be greater than zero");
                }

                if (received.compareTo(payment.getAmount()) != 0) {
                    throw new IllegalArgumentException(
                            "Amount received must match the payment amount");
                }

                payment.setAmountReceived(received);
                payment.setReceivedBy(clean(request.get("receivedBy")));
                payment.setPaymentStatus("SUCCESS");
                payment.setTransactionReference(
                        "CASH-" + System.currentTimeMillis());
                break;

            case "CHEQUE_DD":
                String instrumentType = clean(
                        request.get("instrumentType"));

                if (instrumentType == null) {
                    throw new IllegalArgumentException(
                            "Instrument type is required: CHEQUE or DD");
                }

                instrumentType = instrumentType.toUpperCase(Locale.ROOT);

                if (!instrumentType.equals("CHEQUE")
                        && !instrumentType.equals("DD")) {
                    throw new IllegalArgumentException(
                            "Instrument type must be CHEQUE or DD");
                }

                require(request.get("instrumentNumber"),
                        "Cheque/DD number");
                require(request.get("bankName"), "Bank name");
                require(payment.getPayerName(), "Remitter name");

                payment.setInstrumentType(instrumentType);
                payment.setInstrumentNumber(
                        clean(request.get("instrumentNumber")));
                payment.setBankName(clean(request.get("bankName")));
                payment.setRemitterName(payment.getPayerName());

                String date = clean(request.get("instrumentDate"));
                if (date == null) {
                    throw new IllegalArgumentException(
                            "Instrument date is required (YYYY-MM-DD)");
                }

                try {
                    payment.setInstrumentDate(LocalDate.parse(date));
                } catch (Exception ex) {
                    throw new IllegalArgumentException(
                            "Instrument date must use YYYY-MM-DD format");
                }

                // Receipt of an instrument does not mean it has cleared.
                payment.setPaymentStatus("PENDING");
                payment.setClearanceStatus("PENDING_CLEARANCE");
                break;

            default:
                throw new IllegalArgumentException(
                        "Unsupported payment method");
        }

        return paymentRepository.save(payment);
    }

    private String clean(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void require(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                    field + " is required");
        }
    }
}

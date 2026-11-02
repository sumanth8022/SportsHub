
package com.sportshub.payment.service;

import com.sportshub.payment.entity.PaymentReceipt;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailSenderService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    public EmailSenderService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // Send payment receipt by email
    public void sendReceipt(PaymentReceipt receipt) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(senderEmail);
        message.setTo(receipt.getCustomerEmail());

        message.setSubject(
                "PayFlow - Payment Receipt " + receipt.getReceiptNumber()
        );

        message.setText(
                "Hello " + receipt.getCustomerName() + ",\n\n"
                + "Your payment was completed successfully in our demo system.\n\n"
                + "========== PAYMENT RECEIPT ==========\n"
                + "Receipt Number: " + receipt.getReceiptNumber() + "\n"
                + "Payment ID: " + receipt.getPaymentId() + "\n"
                + "Amount: INR " + receipt.getAmount() + "\n"
                + "Payment Method: " + receipt.getPaymentMethod() + "\n"
                + "Transaction Reference: "
                + receipt.getTransactionReference() + "\n"
                + "Date: " + receipt.getGeneratedAt() + "\n"
                + "=====================================\n\n"
                + "This is a demo receipt. No real money was collected.\n\n"
                + "Thank you,\nPayFlow Team"
        );

        mailSender.send(message);
    }
}

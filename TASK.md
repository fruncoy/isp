# Project Implementation Plan - ISP Management System

This document outlines the roadmap for implementing key features and improvements to the ISP Management System.

## 1. Notification System (In-app & Email)
- **Email Integration**: Setup Brevo (formerly Sendinblue) for transactional emails.
- **Email Templates**: Create professional, minimalist, and emoji-free templates for:
    - Welcome email to new customers.
    - Sales rep onboarding (with password details).
    - Payment reminders.
    - Subscription expiry/renewal alerts.
- **In-app Notifications**: Implement a notification bell and center for real-time updates within the dashboard.

## 2. Paystack Payment Integration
- **Automated Processing**: Integrate Paystack API to handle customer payments.
- **Full Payment Enforcement**: 
    - Remove manual "Record Payment" functionality for sales reps.
    - System will only mark a package as paid when the Paystack transaction is successful for the **full amount**.
    - No partial payments allowed for package activation/renewal.
- **Customer Payment Link**: Sales reps can generate or trigger a Paystack payment prompt for the customer.

## 3. Subscription Management Enhancements
- **Subscription Period Tracking**: 
    - Display clear start and end dates for subscriptions (Monthly, 3 Months, etc.).
    - Automated calculation of expiry dates based on payment date and package duration.
- **Admin Management**: Allow admins to view and manage all subscription cycles.

## 4. Admin Customer-Sales Rep Management
- **Sales Rep Reassignment**: 
    - Admins can change the assigned sales rep for a customer.
    - **Historical Integrity**: Ensure that sales made *before* the change remain associated with the original sales rep for reporting and commission purposes.

## 5. System Integrity & Firestore Rules
- **Validation**: Ensure Firestore rules and backend logic enforce that packages are only activated upon full payment.
- **Audit Logs**: Maintain clear logs for all reassignments and payment events.

---

### Implementation Phases
1. **Phase 1**: Notification System (Brevo & In-app) - [COMPLETED]
2. **Phase 2**: Paystack Integration & Payment Enforcement - [COMPLETED]
3. **Phase 3**: Subscription Tracking & Admin Features - [COMPLETED]

# Talent Marketplace - Full Implementation Architecture

**Feature:** Local Talent Sourcing & Booking Module  
**Version:** Premium Add-On (Option E)  
**Estimated Development Time:** 4-6 weeks  
**Status:** 🚧 In Development  
**Date Started:** October 15, 2025

---

## 🎯 Executive Summary

A complete marketplace platform that connects agencies/entrepreneurs with local creative talent (photographers, videographers, copywriters). Features end-to-end payment processing via Stripe Connect, escrow system, platform commission, earnings dashboards, invoicing, tax documentation, and dispute resolution.

**Revenue Model:** Platform takes 10-15% commission on all bookings

---

## 🏗️ System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                      TALENT MARKETPLACE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Talent     │  │   Booking    │  │   Payment    │     │
│  │  Profiles    │  │   System     │  │   System     │     │
│  │              │  │              │  │  (Stripe)    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         └─────────────────┴─────────────────┘              │
│                           │                                │
│         ┌─────────────────┴─────────────────┐              │
│         │                                   │              │
│  ┌──────▼───────┐                    ┌──────▼───────┐     │
│  │  Messaging   │                    │   Reviews    │     │
│  │   System     │                    │   & Ratings  │     │
│  └──────────────┘                    └──────────────┘     │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Invoicing  │  │     Tax      │  │   Dispute    │   │
│  │   System     │  │ Documentation│  │  Resolution  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Asset Library        │
              │   Integration          │
              └────────────────────────┘
```

---

## 📊 Database Schema Design

### Domain Assignment: **Domain 2 - Project & Finance**

### Tables Overview

| Table | Purpose | Relations |
|-------|---------|-----------|
| `talent_profiles` | Core talent information | Links to users |
| `talent_portfolios` | Portfolio items (images/videos) | Links to talent_profiles |
| `talent_services` | Services offered by talent | Links to talent_profiles |
| `talent_availability` | Calendar availability slots | Links to talent_profiles |
| `talent_bookings` | Booking requests/confirmations | Links to projects & talent |
| `booking_payments` | Payment records via Stripe | Links to bookings |
| `talent_messages` | In-platform messaging | Links to bookings |
| `talent_reviews` | Ratings and reviews | Links to bookings |
| `talent_earnings` | Earnings tracking for talent | Links to talent_profiles |
| `platform_fees` | Commission tracking | Links to bookings |
| `talent_invoices` | Invoice generation | Links to bookings |
| `talent_disputes` | Dispute resolution | Links to bookings |
| `talent_payouts` | Stripe payout tracking | Links to talent_profiles |
| `tax_documents` | 1099 form generation | Links to talent_profiles |

---

## 💳 Stripe Integration Architecture

### Stripe Connect Flow

```
Platform Account (Your Stripe Account)
    │
    ├─ Connected Account 1 (Talent A)
    ├─ Connected Account 2 (Talent B)
    └─ Connected Account 3 (Talent C)
```

### Payment Flow

1. **Client Books Talent:** Creates booking request
2. **Payment Authorization:** Stripe creates payment intent
3. **Funds Captured:** Money held in escrow
4. **Talent Delivers:** Assets uploaded to project
5. **Client Confirms:** Marks booking as complete
6. **Platform Fee Deducted:** 10-15% commission taken
7. **Talent Paid:** Remaining funds transferred to talent's connected account
8. **Invoice Generated:** Automatic invoice sent to both parties

### Stripe APIs Used

- **Stripe Connect:** Onboard talent as connected accounts
- **Payment Intents:** Process payments with escrow
- **Transfers:** Send money to talent accounts
- **Payouts:** Schedule automatic payouts
- **Invoicing:** Generate professional invoices
- **Tax Forms:** Generate 1099 data

---

## 🔄 Booking Workflow

### Status Flow

```
pending → accepted → paid → in_progress → review_pending → completed
   │         │         │
   └─ declined       cancelled
```

### Detailed Flow

1. **Request Created (pending)**
   - Client fills booking form
   - Talent notified via email + in-app
   - Status: `pending`

2. **Talent Responds**
   - Accept → Status: `accepted` → Payment required
   - Decline → Status: `declined` → Booking closed
   - Counter-offer → Status: `negotiating` → Client can accept/decline

3. **Payment Processing (accepted → paid)**
   - Client enters payment details
   - Stripe creates payment intent
   - Funds captured but NOT transferred yet (escrow)
   - Status: `paid`

4. **Work Begins (in_progress)**
   - Talent receives confirmation
   - Both parties can message
   - Status: `in_progress`

5. **Delivery (review_pending)**
   - Talent uploads assets to project
   - Client notified to review
   - Status: `review_pending`

6. **Completion (completed)**
   - Client approves deliverables
   - Platform fee deducted (10-15%)
   - Talent receives payout (within 2-7 days)
   - Both can leave reviews
   - Invoice generated
   - Status: `completed`

### Cancellation/Dispute Flow

- **Before work starts:** Full refund minus processing fee
- **During work:** Escrow held, dispute opened
- **After delivery:** Dispute resolution process with evidence review

---

## 💰 Financial Model

### Commission Structure

| Booking Amount | Platform Fee | Talent Receives |
|----------------|--------------|-----------------|
| $0 - $500 | 15% | 85% |
| $501 - $2,000 | 12% | 88% |
| $2,001+ | 10% | 90% |

### Fee Breakdown Example

**Booking Total:** $1,000
- **Platform Fee (12%):** $120
- **Stripe Processing (2.9% + $0.30):** $29.30
- **Talent Receives:** $850.70

### Payout Schedule

- **Standard:** Weekly automatic payouts (7-day rolling)
- **Instant:** Available for additional fee (1.5%)
- **Monthly:** Available on request

---

## 🛡️ Legal & Compliance

### Terms of Service Requirements

1. **Independent Contractor Agreement**
   - Talent acknowledged as independent contractors
   - Platform is facilitator, not employer
   - No employee benefits or protections

2. **Payment Terms**
   - Escrow period (funds held until delivery)
   - Refund policy
   - Dispute resolution process

3. **Liability Waivers**
   - Platform not liable for quality of work
   - Background checks not performed (talent responsibility)
   - Insurance requirements for high-value bookings

### Tax Compliance

**1099-NEC Forms:**
- Required for talent earning $600+ per year
- Platform must collect W-9 forms
- Forms generated automatically
- Deadline: January 31st annually

**Sales Tax:**
- Some states require marketplace facilitator tax collection
- Varies by state and service type
- Consult tax professional for compliance

### Data Protection

- **PII Storage:** SSN/EIN for tax forms (encrypted)
- **Payment Data:** PCI DSS compliance via Stripe
- **GDPR/CCPA:** Right to data deletion

---

## 🎨 User Roles & Permissions

### Role Definitions

| Role | Can Do |
|------|--------|
| **Client** | Browse talent, create bookings, make payments, leave reviews |
| **Talent** | Create profile, accept bookings, upload deliverables, receive payments |
| **Admin** | Manage all profiles, resolve disputes, view financials, adjust fees |
| **Super Admin** | Full system access, platform settings, Stripe configuration |

### Permission Matrix

| Action | Client | Talent | Admin | Super Admin |
|--------|--------|--------|-------|-------------|
| Create booking | ✅ | ❌ | ✅ | ✅ |
| Accept booking | ❌ | ✅ | ✅ | ✅ |
| Process payment | ✅ | ❌ | ✅ | ✅ |
| Upload deliverables | ❌ | ✅ | ✅ | ✅ |
| Resolve dispute | ❌ | ❌ | ✅ | ✅ |
| View all financials | ❌ | Own only | ✅ | ✅ |
| Adjust commission | ❌ | ❌ | ❌ | ✅ |

---

## 🔐 Security Considerations

### Payment Security

- **PCI Compliance:** All payment data handled by Stripe (no card data stored)
- **Stripe Webhooks:** Verify signature on all webhook events
- **Idempotency Keys:** Prevent duplicate charges
- **3D Secure:** Enable for high-value transactions

### Data Security

- **Encryption at Rest:** Sensitive data (SSN, bank info) encrypted
- **Encryption in Transit:** All API calls over HTTPS
- **Access Control:** Multi-tenant isolation (same pattern as Late API)
- **Audit Logs:** Track all financial transactions

### Fraud Prevention

- **Identity Verification:** Talent must verify identity for payouts
- **Dispute Monitoring:** Flag accounts with high dispute rates
- **Review System:** Helps identify bad actors
- **Hold Periods:** Initial bookings have longer escrow periods

---

## 📱 Frontend UI Requirements

### Talent Profile Page

- Portfolio gallery (images/videos)
- Service list with pricing
- Availability calendar
- Reviews and ratings
- Location and service areas
- Response time indicator
- "Book Now" CTA button

### Booking Flow

1. **Browse:** Search/filter talent by location, service, price
2. **Select:** View full profile and availability
3. **Request:** Fill booking form (date, service, budget, details)
4. **Pay:** Enter payment info (Stripe Elements)
5. **Track:** View booking status and messages
6. **Review:** Approve deliverables
7. **Rate:** Leave review for talent

### Talent Dashboard

- **Bookings:** Active, pending, completed
- **Calendar:** Availability management
- **Messages:** Client communications
- **Earnings:** Total earned, pending, paid out
- **Invoices:** Download/view all invoices
- **Reviews:** Client feedback
- **Payout Settings:** Bank info, payout schedule

### Admin Panel

- **All Bookings:** System-wide view
- **Financial Reports:** Revenue, commissions, payouts
- **Dispute Management:** Review and resolve disputes
- **Talent Approval:** Vet new talent applications
- **Fee Configuration:** Adjust commission rates
- **Tax Reports:** Annual 1099 data export

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)
- Database schema design and migration
- Talent profile CRUD operations
- Portfolio management
- Service listings
- Basic search/filter

### Phase 2: Booking System (Week 2)
- Booking request workflow
- Status management
- Email notifications
- In-platform messaging
- Availability calendar

### Phase 3: Payment Integration (Week 2-3)
- Stripe Connect onboarding
- Payment processing
- Escrow system
- Platform fee calculation
- Refund handling

### Phase 4: Deliverables & Reviews (Week 3)
- Asset upload integration
- Delivery confirmation
- Review/rating system
- Completion workflow

### Phase 5: Financial Systems (Week 4)
- Earnings dashboard
- Invoice generation
- Payout scheduling
- Tax document generation

### Phase 6: Dispute & Admin (Week 5)
- Dispute resolution workflow
- Admin panel
- Financial reporting
- Analytics

### Phase 7: Testing & Polish (Week 6)
- End-to-end testing
- Security audit
- Performance optimization
- UI/UX refinements
- Documentation

---

## 📊 Success Metrics

### Platform Metrics

- **GMV (Gross Merchandise Value):** Total booking value
- **Take Rate:** Average commission percentage
- **Active Talent:** Talent with bookings in last 30 days
- **Booking Conversion:** Search → Booking rate
- **Completion Rate:** Bookings successfully completed
- **Dispute Rate:** % of bookings with disputes

### User Metrics

- **Talent Earnings:** Average earnings per talent
- **Client Satisfaction:** Average review rating
- **Repeat Bookings:** % of clients booking again
- **Response Time:** Talent average response time

---

## 🔧 Technical Stack

### Backend
- **Language:** Node.js/Express
- **Database:** PostgreSQL (Supabase)
- **Payment Processing:** Stripe Connect
- **Email:** SendGrid or AWS SES
- **File Storage:** Bunny.net CDN (existing)

### Frontend
- **Framework:** React.js
- **Payment UI:** Stripe Elements
- **Calendar:** React Big Calendar
- **Messaging:** Real-time with Socket.io or Pusher

### Infrastructure
- **Webhooks:** Stripe webhook endpoints
- **Cron Jobs:** Payout processing, invoice generation
- **Background Jobs:** Tax document generation

---

## 🎯 Next Steps

1. **Legal Review:** Terms of Service, Independent Contractor Agreement
2. **Stripe Account:** Set up Stripe Connect
3. **Tax Consultation:** Confirm 1099 requirements
4. **Insurance:** Consider platform liability insurance
5. **Beta Testing:** Launch with small group of vetted talent

---

**Created:** October 15, 2025  
**Last Updated:** October 15, 2025  
**Owner:** Marketing SaaS Platform Development Team


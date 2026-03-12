/* ------------------------------------------------------------------ */
/*  GUIDE DATA – Comprehensive role-based help content                */
/* ------------------------------------------------------------------ */

// ── Types ──────────────────────────────────────────────────────────

export type ProcessNode = {
  status: string;
  label: string;
  actor: string;
  description: string;
};

export type TutorialStep = {
  action: string;
  where: string;
  detail: string;
  tip?: string;
};

export type Tutorial = {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
};

export type GlossaryTerm = {
  term: string;
  definition: string;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type TroubleshootItem = {
  problem: string;
  cause: string;
  solution: string;
};

export type RoleGuide = {
  role: string;
  label: string;
  iconName: string;
  summary: string;
  mainArea: string;
  menuItems: string[];
  capabilities: string[];
  restrictions: string[];
  inheritsFrom?: string[];
  processFlow: ProcessNode[];
  tutorials: Tutorial[];
  glossary: GlossaryTerm[];
  faq: FAQItem[];
  troubleshooting: TroubleshootItem[];
};

// ── Visibility hierarchy ───────────────────────────────────────────

export const ROLE_VISIBILITY: Record<string, string[]> = {
  MASTER: ["CLIENT", "DELIVERY", "SALES", "ADMIN", "MASTER"],
  ADMIN: ["CLIENT", "DELIVERY", "SALES", "ADMIN"],
  SALES: ["CLIENT", "DELIVERY", "SALES"],
  DELIVERY: ["DELIVERY"],
  CLIENT: ["CLIENT"],
};

// ── Shared glossary terms ──────────────────────────────────────────

const COMMON_GLOSSARY: GlossaryTerm[] = [
  { term: "Quote", definition: "A price proposal created by Sales and sent to a client before they commit to an order. Clients can approve, reject, or request changes." },
  { term: "Order", definition: "A confirmed catering request. Once confirmed, pricing is locked and the order enters the fulfillment pipeline." },
  { term: "Invoice", definition: "A billing document generated from an order. Contains line items, totals, and can be paid online via Stripe." },
  { term: "Status", definition: "The current stage of an order: PENDING → CONFIRMED → READY → IN_TRANSIT → DELIVERED → COMPLETED." },
  { term: "Pricing Lock", definition: "When an order is confirmed, item prices are frozen and cannot be edited. Ensures pricing integrity." },
  { term: "Route", definition: "A planned sequence of delivery stops for a specific date, assigned to one driver." },
  { term: "Stop", definition: "A single delivery point within a route — one order at one address." },
  { term: "Delivery Report", definition: "Documentation created after delivery: receiver name, quantities delivered, photos, signature, and any issues." },
  { term: "Add-on", definition: "Optional items that can be suggested for an order (e.g., Fresh Fruit Cup, Coffee Service)." },
  { term: "Tier", definition: "A pricing level based on guest count ranges — different headcount brackets have different per-unit prices." },
  { term: "Coupon", definition: "A discount code that can be applied to orders. Has a code, discount type (% or flat), amount, and expiry date." },
  { term: "Loyalty Points", definition: "Points earned by clients for placing orders. Can be redeemed for discounts on future orders." },
  { term: "Referral Code", definition: "A unique code clients share with others. When used, both parties earn bonus loyalty points." },
];

const STATUS_GLOSSARY: GlossaryTerm[] = [
  { term: "PENDING", definition: "Order created but not yet reviewed or confirmed by Sales." },
  { term: "CONFIRMED", definition: "Order confirmed — pricing locked. Invoice can be generated. Next: mark ready for delivery." },
  { term: "READY", definition: "Order is prepared and ready for delivery. A driver can be assigned." },
  { term: "READY_FOR_PICKUP", definition: "Order is ready for the driver to pick up from the kitchen/warehouse." },
  { term: "IN_TRANSIT", definition: "Driver is on the way to deliver the order." },
  { term: "DELIVERED", definition: "Order has been delivered to the client's location." },
  { term: "UNDER_REVIEW", definition: "Post-delivery review — checking delivery report for discrepancies." },
  { term: "DISPUTED", definition: "Issues found after delivery (missing items, damage). Requires adjustment resolution." },
  { term: "COMPLETED", definition: "Order fully processed — delivered, reviewed, invoice paid, case closed." },
  { term: "CANCELLED", definition: "Order was cancelled before completion." },
];

const QUOTE_STATUS_GLOSSARY: GlossaryTerm[] = [
  { term: "REQUESTED", definition: "Client has submitted a quote request. Awaiting Sales to build pricing." },
  { term: "PRICING", definition: "Sales is actively working on pricing for this quote." },
  { term: "SENT", definition: "Quote has been sent to the client for review via email." },
  { term: "CLIENT_APPROVED", definition: "Client accepted the quote. It can now be converted to an order." },
  { term: "CLIENT_REJECTED", definition: "Client declined the quote." },
];

const ADMIN_GLOSSARY: GlossaryTerm[] = [
  { term: "Status Request", definition: "A formal request from Sales to change an order's status that requires Admin/Master approval." },
  { term: "Adjustment Request", definition: "A request to modify pricing or items after delivery due to discrepancies (e.g., missing items)." },
  { term: "Audit Log", definition: "A chronological record of all significant actions in the system: status changes, user actions, approvals." },
  { term: "Order Closure Checklist", definition: "A checklist that must be completed before an order can move to COMPLETED: delivery report reviewed, invoice paid, no pending adjustments." },
  { term: "Rollback", definition: "Reverting an order to its previous status. Only Master users can perform rollbacks, and a reason is required." },
];

// ── CLIENT GUIDE ───────────────────────────────────────────────────

const CLIENT_GUIDE: RoleGuide = {
  role: "CLIENT",
  label: "Client",
  iconName: "user",
  summary: "As a Client, you use the Client Portal to review quotes, track your catering orders, pay invoices, manage loyalty points, and browse offers. You cannot access the internal dashboard.",
  mainArea: "/client",
  menuItems: ["My Orders", "Invoices", "Quotes", "Loyalty", "Offers", "Settings"],
  capabilities: [
    "View and track all your orders and their status",
    "Review, approve, or reject quotes sent by Sales",
    "Request changes to a quote before approving",
    "Pay invoices online with credit/debit card via Stripe",
    "View your loyalty points balance and history",
    "Copy and share your referral code",
    "Browse active offers and copy coupon codes",
    "Configure notification preferences (email alerts)",
  ],
  restrictions: [
    "Cannot access the internal dashboard",
    "Cannot view other clients' orders or invoices",
    "Cannot create orders or quotes directly",
    "Cannot modify pricing or products",
  ],
  processFlow: [
    { status: "REQUEST", label: "Request Quote", actor: "You", description: "Contact Super Crown or fill out the quote request form" },
    { status: "REVIEW", label: "Review Quote", actor: "You", description: "Check items, quantities, and pricing in your email or portal" },
    { status: "APPROVE", label: "Approve / Reject", actor: "You", description: "Approve to proceed, reject, or request changes" },
    { status: "TRACK", label: "Track Order", actor: "You", description: "Monitor your order status from the portal" },
    { status: "RECEIVE", label: "Receive Delivery", actor: "You", description: "The driver delivers to your location" },
    { status: "PAY", label: "Pay Invoice", actor: "You", description: "Pay online with card or mark as paid" },
  ],
  tutorials: [
    {
      id: "client-review-quote",
      title: "How to Review and Approve a Quote",
      description: "When Sales sends you a quote, here's how to review and respond.",
      steps: [
        { action: "Open the quote link", where: "Email or Client Portal → Quotes", detail: "You'll receive an email with a link to view the quote. Click it or log in to the Client Portal and go to Quotes.", tip: "Check your spam folder if you don't see the email." },
        { action: "Review items and pricing", where: "Quote detail page", detail: "Check each item, quantity, and unit price. The total will be calculated automatically. Look for any add-ons (drinks, sides, etc.)." },
        { action: "Approve, reject, or request changes", where: "Quote detail page → Action buttons", detail: "Click 'Approve Quote' if everything looks good. Click 'Reject' if you don't want to proceed. Click 'Request Changes' to send a message to Sales about modifications needed." },
        { action: "Confirm your decision", where: "Confirmation dialog", detail: "A confirmation dialog will appear. Review your choice and confirm. Sales will be notified automatically." },
      ],
    },
    {
      id: "client-track-orders",
      title: "How to Track Your Orders",
      description: "Follow your order from confirmation through delivery.",
      steps: [
        { action: "Go to My Orders", where: "Client Portal → My Orders", detail: "Log in and click 'Mis pedidos' (My Orders) in the navigation bar." },
        { action: "Find your order", where: "Orders list", detail: "Orders are listed with the most recent first. Each shows the order number, date, status, and total amount." },
        { action: "Click for details", where: "Order card", detail: "Click on any order to see the full detail: items, quantities, delivery address, and current status." },
        { action: "Check the status", where: "Order detail page", detail: "The status badge shows where your order is: CONFIRMED (being prepared), READY (ready for delivery), IN_TRANSIT (on its way), DELIVERED (arrived)." },
      ],
    },
    {
      id: "client-pay-invoice",
      title: "How to Pay an Invoice Online",
      description: "Pay your catering invoice securely with a credit or debit card.",
      steps: [
        { action: "Go to Invoices", where: "Client Portal → Invoices (Facturas)", detail: "Navigate to your invoices list. Unpaid invoices are highlighted." },
        { action: "Open the invoice", where: "Invoice list → Click invoice", detail: "Click on the unpaid invoice to view the full breakdown: items, taxes, total amount due." },
        { action: "Click 'Pay Now'", where: "Invoice detail page", detail: "Click the 'Pay Now' button. This opens Stripe's secure payment form." },
        { action: "Enter payment details", where: "Stripe payment form", detail: "Enter your card number, expiration, and CVC. Stripe handles all payment security — your card data never touches our servers." },
        { action: "Confirm payment", where: "Stripe payment form", detail: "Click 'Pay' to process. You'll see a confirmation and the invoice status will update to PAID.", tip: "You'll also receive a payment confirmation email." },
      ],
    },
    {
      id: "client-loyalty",
      title: "Using Loyalty Points & Referral Codes",
      description: "Earn points on every order and get rewards by referring others.",
      steps: [
        { action: "Check your points", where: "Client Portal → Loyalty", detail: "View your current points balance, points history, and tier status." },
        { action: "Find your referral code", where: "Loyalty page → Referral section", detail: "Your unique referral code is displayed. Copy it with one click." },
        { action: "Share with others", where: "Any communication channel", detail: "Share your referral code with friends, colleagues, or other businesses. When they place their first order using your code, you both earn bonus points." },
        { action: "Redeem points", where: "Loyalty page", detail: "Points can be applied as discounts on future orders. Check the minimum redemption threshold on the loyalty page." },
      ],
    },
    {
      id: "client-offers",
      title: "Browsing Offers & Using Coupons",
      description: "Find active promotions and apply discount codes to your orders.",
      steps: [
        { action: "Browse active offers", where: "Client Portal → Offers (Ofertas)", detail: "View all current promotions with their discount amounts, conditions, and expiry dates." },
        { action: "Copy coupon code", where: "Offer card → Copy button", detail: "Click the copy icon next to the coupon code. It's copied to your clipboard." },
        { action: "Apply when ordering", where: "During order / quote process", detail: "Mention the coupon code to Sales when requesting a quote, or it will be applied automatically if conditions are met.", tip: "Coupons have expiry dates — use them before they expire!" },
      ],
    },
  ],
  glossary: [...COMMON_GLOSSARY.filter(t => ["Quote", "Order", "Invoice", "Status", "Loyalty Points", "Referral Code", "Coupon", "Add-on"].includes(t.term))],
  faq: [
    { question: "How long does it take to receive a quote?", answer: "Typically within 24 business hours. For urgent requests, call Super Crown directly. The Sales team will prepare pricing and send the quote to your email." },
    { question: "Can I modify a quote after approving it?", answer: "Once approved, the quote is converted to an order with locked pricing. Contact Sales directly if you need changes — they may be able to create a new quote or adjust the order before confirmation." },
    { question: "What payment methods are accepted?", answer: "You can pay online via credit/debit card through Stripe (Visa, Mastercard, Amex). For other payment methods (check, wire transfer), contact the Sales team." },
    { question: "How do I know when my order will be delivered?", answer: "Track your order status in My Orders. When it moves to IN_TRANSIT, the driver is on the way. You may receive an email notification when the status changes." },
    { question: "What if items are missing or damaged?", answer: "Contact Super Crown immediately. The delivery driver files a report, and the team will resolve any discrepancies — this may include credits or re-delivery." },
    { question: "How do I update my notification preferences?", answer: "Go to Client Portal → Settings (Configuración). Toggle which email notifications you want to receive: order updates, invoice reminders, promotions, etc." },
  ],
  troubleshooting: [
    { problem: "I can't see my order in the portal", cause: "The order may not be linked to your account, or it may still be in PENDING status.", solution: "Contact Sales to verify the order is assigned to your email. If just placed, it may take a few minutes to appear." },
    { problem: "The quote link in my email doesn't work", cause: "The link may have expired or the quote status changed.", solution: "Log in to the Client Portal → Quotes to view the quote directly. If not visible, contact Sales." },
    { problem: "Payment failed", cause: "Card declined, insufficient funds, or incorrect details.", solution: "Double-check your card details. Try a different card. If the issue persists, contact your bank or use an alternative payment method." },
    { problem: "I don't see my loyalty points", cause: "Points are credited after order completion and invoice payment.", solution: "Wait until your order reaches COMPLETED status. Points appear within 24 hours of completion." },
  ],
};

// ── DELIVERY GUIDE ─────────────────────────────────────────────────

const DELIVERY_GUIDE: RoleGuide = {
  role: "DELIVERY",
  label: "Delivery Driver",
  iconName: "truck",
  summary: "As a Delivery Driver, you handle assigned delivery routes. View your stops, navigate to locations, mark deliveries as en route / delivered, and create detailed delivery reports with photos and signatures.",
  mainArea: "/dashboard/delivery",
  menuItems: ["Dashboard", "My Deliveries"],
  capabilities: [
    "View your assigned routes and stops for the day/week",
    "See delivery details: address, phone, items, quantities",
    "Open Google Maps for navigation to each stop",
    "Mark stops as 'En Route' when departing",
    "Mark stops as 'Delivered' when completed",
    "Skip a stop if the client is unavailable",
    "Create delivery reports with photos and digital signatures",
    "Record receiver name and actual item quantities",
    "Report issues: missing items, damage, wrong items",
  ],
  restrictions: [
    "Cannot view or edit orders, invoices, or quotes",
    "Cannot create or modify routes",
    "Cannot access pricing, products, or team management",
    "Cannot see deliveries assigned to other drivers",
    "Cannot change order status manually (only through delivery actions)",
  ],
  processFlow: [
    { status: "LOGIN", label: "Start Your Day", actor: "You", description: "Log in and check today's assigned deliveries" },
    { status: "REVIEW", label: "Review Route", actor: "You", description: "Check each stop: address, items, special instructions" },
    { status: "NAVIGATE", label: "Navigate", actor: "You", description: "Open Google Maps for turn-by-turn directions" },
    { status: "EN_ROUTE", label: "Mark En Route", actor: "You", description: "Tap 'Mark En Route' when you leave for a stop" },
    { status: "DELIVER", label: "Deliver Items", actor: "You", description: "Hand off items to the receiver at the location" },
    { status: "MARK", label: "Mark Delivered", actor: "You", description: "Tap 'Mark Delivered' to confirm completion" },
    { status: "REPORT", label: "Create Report", actor: "You", description: "Record details: receiver, quantities, photos, signature" },
  ],
  tutorials: [
    {
      id: "driver-view-route",
      title: "Viewing Your Daily Route",
      description: "Check what deliveries you have for today and review all the details.",
      steps: [
        { action: "Log in to the dashboard", where: "Login page → /dashboard", detail: "Use your email and password. You'll be redirected to the driver dashboard automatically." },
        { action: "Go to My Deliveries", where: "Sidebar → My Deliveries", detail: "Click 'My Deliveries' in the left sidebar. This shows only YOUR assigned deliveries." },
        { action: "Select the date", where: "My Deliveries page → Date selector", detail: "By default, today's deliveries are shown. Use the date picker to view other days." },
        { action: "Review each stop", where: "Delivery list", detail: "Each stop shows: client name, address, items with quantities, special instructions, and current status (PENDING, EN_ROUTE, DELIVERED).", tip: "Check all stops before leaving — plan the most efficient route." },
      ],
    },
    {
      id: "driver-navigate",
      title: "Navigating to a Delivery Stop",
      description: "Get turn-by-turn directions to each delivery location.",
      steps: [
        { action: "Find the stop in your list", where: "My Deliveries", detail: "Locate the next stop you need to deliver to." },
        { action: "Click the address or map icon", where: "Stop card → Address area", detail: "Tap the address or the Google Maps icon. This opens Google Maps with the delivery address pre-filled." },
        { action: "Follow navigation", where: "Google Maps app", detail: "Google Maps will provide turn-by-turn directions. The app switches to navigation mode." },
        { action: "Call the client if needed", where: "Stop card → Phone icon", detail: "If you can't find the location, tap the phone icon to call the client directly.", tip: "Always call ahead if you'll be significantly early or late." },
      ],
    },
    {
      id: "driver-mark-enroute",
      title: "Marking a Stop as En Route",
      description: "Let the system know you're on your way to a delivery.",
      steps: [
        { action: "Find the pending stop", where: "My Deliveries → Stop with PENDING status", detail: "The stop will have a status badge showing 'PENDING'." },
        { action: "Click 'Mark En Route'", where: "Stop card → Action button", detail: "Tap the 'Mark En Route' button. The stop status changes to EN_ROUTE and the order transitions to IN_TRANSIT." },
        { action: "Start driving", where: "En route to location", detail: "The system now tracks that you're actively delivering this order. The client and Sales team can see the updated status.", tip: "Only mark En Route when you're actually departing — it updates the client." },
      ],
    },
    {
      id: "driver-mark-delivered",
      title: "Completing a Delivery",
      description: "Mark the delivery as completed when you've handed off the items.",
      steps: [
        { action: "Arrive at the location", where: "Client's address", detail: "Verify you're at the correct address by checking the stop details." },
        { action: "Hand off items to the receiver", where: "Client's location", detail: "Verify items with the receiver. Check quantities match the order." },
        { action: "Click 'Mark Delivered'", where: "Stop card → Action button (status must be EN_ROUTE)", detail: "Tap 'Mark Delivered'. The stop status changes to DELIVERED and the order transitions to DELIVERED." },
        { action: "Proceed to create a delivery report", where: "Post-delivery prompt", detail: "You'll see an option to create a delivery report. It's recommended to do this immediately while details are fresh." },
      ],
    },
    {
      id: "driver-create-report",
      title: "Creating a Delivery Report",
      description: "Document what was delivered, who received it, and capture proof of delivery.",
      steps: [
        { action: "Open the report form", where: "My Deliveries → Stop → 'Create Report' or /dashboard/delivery/[orderId]/report", detail: "After marking delivered, tap 'Create Report' or navigate to the report page for that order." },
        { action: "Enter receiver name", where: "Report form → Receiver field", detail: "Type the name of the person who received the delivery." },
        { action: "Verify item quantities", where: "Report form → Items section", detail: "For each item, enter the actual quantity delivered. If it differs from the expected quantity, the system flags it as a discrepancy." },
        { action: "Upload photos", where: "Report form → Photos section", detail: "Take photos of the delivered items at the location. Tap 'Add Photo' to capture or upload from your gallery.", tip: "Always take at least one photo — it protects both you and the company." },
        { action: "Collect signature", where: "Report form → Signature section", detail: "Ask the receiver to sign on the digital signature pad. This serves as proof of delivery." },
        { action: "Report any issues (if applicable)", where: "Report form → Issues section", detail: "If any items were missing, damaged, or wrong, check the issue box for that item and select the issue type. Add notes describing the problem." },
        { action: "Submit the report", where: "Report form → Submit button", detail: "Review everything and tap 'Submit Report'. The report is saved and visible to Sales and Admin." },
      ],
    },
    {
      id: "driver-skip-stop",
      title: "Skipping a Stop",
      description: "When a delivery cannot be completed (client unavailable, location closed, etc.).",
      steps: [
        { action: "Attempt contact", where: "Phone / on-site", detail: "Try calling the client using the phone number on the stop card. Wait a reasonable amount of time." },
        { action: "Click 'Skip Stop'", where: "Stop card → Skip action", detail: "If the delivery truly cannot be completed, tap the skip option. You'll be asked for a reason." },
        { action: "Provide a reason", where: "Skip dialog", detail: "Select or type the reason: client unavailable, location closed, access denied, etc.", tip: "Always try to contact the client first. Sales will follow up on skipped stops." },
        { action: "Proceed to next stop", where: "My Deliveries", detail: "Continue with your remaining deliveries. The skipped stop will be flagged for Sales to handle." },
      ],
    },
  ],
  glossary: [
    ...COMMON_GLOSSARY.filter(t => ["Route", "Stop", "Delivery Report", "Order", "Status"].includes(t.term)),
    ...STATUS_GLOSSARY.filter(t => ["READY", "IN_TRANSIT", "DELIVERED"].includes(t.term)),
    { term: "En Route", definition: "The driver is actively traveling to the delivery location. Triggered when the driver taps 'Mark En Route'." },
    { term: "Skip", definition: "Bypassing a delivery stop when it cannot be completed. Requires a reason and is flagged for Sales follow-up." },
    { term: "Discrepancy", definition: "A difference between the expected and actual delivered quantities. Flagged automatically when quantities don't match." },
  ],
  faq: [
    { question: "What if the client isn't at the delivery location?", answer: "Try calling using the phone number on the stop card. Wait a reasonable time. If still unavailable, use 'Skip Stop' with the reason 'Client unavailable'. Sales will follow up." },
    { question: "What if items are damaged during transport?", answer: "Note the damage in the delivery report under the Issues section. Select 'Damaged' as the issue type and take photos of the damage. The Admin team will handle resolution with the client." },
    { question: "Can I change the delivery order of my stops?", answer: "The route shows stops in the planned order, but you can deliver them in any sequence that makes sense logistically. Just mark each stop individually." },
    { question: "What if I delivered the wrong items?", answer: "Mark it in the delivery report as 'Wrong Item'. Contact Sales immediately so they can coordinate a correction with the client." },
    { question: "Do I need to create a report for every delivery?", answer: "It's strongly recommended. Delivery reports with photos and signatures protect everyone. If there's ever a dispute, the report is the primary evidence." },
  ],
  troubleshooting: [
    { problem: "I can't see any deliveries for today", cause: "No orders have been assigned to you, or routes haven't been created yet.", solution: "Check with Sales or Admin to confirm that orders are assigned to you. Make sure you're looking at the correct date." },
    { problem: "The 'Mark En Route' button is disabled", cause: "The stop may already be in EN_ROUTE status, or the order status doesn't allow this transition.", solution: "Check the current status of the stop. If it's already EN_ROUTE, proceed to mark it as Delivered instead." },
    { problem: "Google Maps won't open", cause: "The address may not be properly formatted, or Google Maps isn't installed.", solution: "Copy the address manually and paste it into your preferred maps app. Verify the address with the client by phone if needed." },
    { problem: "I can't upload photos for the report", cause: "Camera permissions may be blocked, or the file is too large.", solution: "Check your browser/app camera permissions. Try taking a new photo instead of uploading from gallery. Reduce photo quality if files are too large." },
  ],
};

// ── SALES GUIDE ────────────────────────────────────────────────────

const SALES_GUIDE: RoleGuide = {
  role: "SALES",
  label: "Sales",
  iconName: "shopping-bag",
  summary: "As Sales, you manage the complete quote-to-delivery pipeline. Create quotes, convert to orders, generate invoices, assign drivers, create routes, and monitor deliveries. Some status changes require Admin/Master approval.",
  mainArea: "/dashboard",
  menuItems: ["Dashboard", "Pricing", "Routes", "Deliveries", "Orders / Quotes", "Invoices", "Loyalty", "Status Requests"],
  capabilities: [
    "Create, edit, and send quotes to clients",
    "Convert approved quotes to orders",
    "Confirm orders (locks pricing)",
    "Generate invoices and PDF documents",
    "Mark orders as Ready for Delivery",
    "Create delivery routes with stops",
    "Assign drivers to orders and routes",
    "Monitor active deliveries",
    "Mark invoices as Paid",
    "View delivery reports",
    "Request status changes (requires approval for some)",
    "View pricing tiers and loyalty data",
  ],
  restrictions: [
    "Cannot manage products (add/edit/deactivate)",
    "Cannot create or manage coupons",
    "Cannot create or edit users",
    "Cannot approve status requests or adjustments",
    "Cannot access Audit Log",
    "Cannot manually close orders",
    "Cannot perform rollbacks",
  ],
  processFlow: [
    { status: "QUOTE_CREATE", label: "Create Quote", actor: "Sales", description: "Build quote with items, pricing, and client info" },
    { status: "QUOTE_SEND", label: "Send to Client", actor: "Sales", description: "Send the quote for client review via email" },
    { status: "QUOTE_APPROVE", label: "Client Approves", actor: "Client", description: "Client reviews and approves the quote" },
    { status: "CONVERT", label: "Convert to Order", actor: "Sales", description: "Click 'Convert to Order' — creates a CONFIRMED order" },
    { status: "INVOICE", label: "Generate Invoice", actor: "Sales", description: "Generate invoice and PDFs from the order" },
    { status: "READY", label: "Mark Ready", actor: "Sales", description: "Mark order as ready for delivery" },
    { status: "ASSIGN", label: "Assign Driver", actor: "Sales", description: "Create route and assign driver to the order" },
    { status: "TRANSIT", label: "In Transit", actor: "Driver", description: "Driver marks en route — order is IN_TRANSIT" },
    { status: "DELIVERED", label: "Delivered", actor: "Driver", description: "Driver marks delivered and creates report" },
    { status: "CLOSE", label: "Close & Pay", actor: "Admin", description: "Review report, mark paid, complete order" },
  ],
  tutorials: [
    {
      id: "sales-create-quote",
      title: "Creating and Sending a Quote",
      description: "Build a price proposal for a client and send it for approval.",
      steps: [
        { action: "Go to Orders / Quotes", where: "Dashboard → Orders / Quotes", detail: "Navigate to the orders and quotes section from the sidebar." },
        { action: "Click 'New Quote'", where: "Quotes tab → New Quote button", detail: "Start a new quote. Select the client from the dropdown or create a new client." },
        { action: "Add items", where: "Quote editor → Items section", detail: "Search for products and add them. Set quantities and per-unit prices. The system may suggest pricing based on tiers." },
        { action: "Review totals", where: "Quote editor → Summary", detail: "Check subtotals, any discounts, and the grand total. Verify all items and quantities are correct." },
        { action: "Save the quote", where: "Quote editor → Save button", detail: "Save the quote as a draft. You can still edit it." },
        { action: "Send to client", where: "Quote detail → 'Send to Client' button", detail: "Click 'Send to Client'. An email with the quote link is sent to the client. The quote status changes to SENT.", tip: "Double-check all pricing before sending — the client will see everything." },
      ],
    },
    {
      id: "sales-convert-order",
      title: "Converting a Quote to an Order",
      description: "Turn an approved quote into a confirmed order.",
      steps: [
        { action: "Find the approved quote", where: "Dashboard → Orders / Quotes → Quotes tab", detail: "Look for quotes with status CLIENT_APPROVED. These are ready to convert." },
        { action: "Open the quote", where: "Quote list → Click the quote", detail: "Review the approved quote one final time — items, pricing, client details." },
        { action: "Click 'Convert to Order'", where: "Quote detail → Action button", detail: "This creates a new Order in CONFIRMED status. Pricing is automatically locked." },
        { action: "Verify the order", where: "Order detail page (auto-redirect)", detail: "You'll be redirected to the new order. Verify all details transferred correctly. The quote will show a link to the order.", tip: "The order inherits all items and pricing from the quote. A link to the original quote is shown on the order detail." },
      ],
    },
    {
      id: "sales-confirm-order",
      title: "Confirming an Order",
      description: "For orders created manually (not from quotes), confirm to lock pricing.",
      steps: [
        { action: "Open the pending order", where: "Dashboard → Orders → Click the order", detail: "Find the order in PENDING status." },
        { action: "Review and edit if needed", where: "Order detail → Items section", detail: "While in PENDING status, you can still edit client info, items, quantities, and prices." },
        { action: "Click 'Confirm Order'", where: "Order detail → Action button", detail: "This locks all pricing and moves the order to CONFIRMED. After this, prices cannot be changed." },
        { action: "Proceed to generate invoice", where: "Order detail → Invoices & PDF section", detail: "Once confirmed, you can generate the invoice immediately or do it later.", tip: "Make sure all items have prices before confirming — items without prices will block invoice generation." },
      ],
    },
    {
      id: "sales-generate-invoice",
      title: "Generating an Invoice",
      description: "Create the invoice and PDF documents for a confirmed order.",
      steps: [
        { action: "Open the confirmed order", where: "Dashboard → Orders → Click order (CONFIRMED, READY, or IN_TRANSIT)", detail: "Invoice generation is available in CONFIRMED, READY, and IN_TRANSIT states." },
        { action: "Scroll to Invoices & PDF", where: "Order detail → Bottom section", detail: "Find the 'Invoices & PDF' section at the bottom of the order detail." },
        { action: "Click 'Generate Invoice'", where: "Invoices & PDF → Generate button", detail: "The system creates the invoice and generates downloadable PDFs. All items must have prices for this to work." },
        { action: "Download or view PDFs", where: "Invoices & PDF → PDF links", detail: "After generation, you can download the invoice PDF and order summary PDF.", tip: "Generate the invoice before delivery so the driver can hand it to the client if needed." },
      ],
    },
    {
      id: "sales-create-route",
      title: "Creating a Route and Assigning a Driver",
      description: "Plan a delivery route with stops and assign a driver.",
      steps: [
        { action: "Go to Routes", where: "Dashboard → Routes", detail: "Navigate to the Routes section in the sidebar." },
        { action: "Click 'New Route'", where: "Routes page → New Route button", detail: "Start creating a new delivery route." },
        { action: "Select a date", where: "Route editor → Date picker", detail: "Choose the delivery date for this route." },
        { action: "Add orders as stops", where: "Route editor → Add stops", detail: "Search for READY orders and add them as stops. Each stop represents one delivery." },
        { action: "Assign a driver", where: "Route editor → Driver selector", detail: "Select the delivery driver from the dropdown. Only users with DELIVERY role appear." },
        { action: "Save the route", where: "Route editor → Save", detail: "Save the route. The driver will see these stops in their 'My Deliveries' section.", tip: "Organize stops in a logical geographic order to optimize the driver's time." },
      ],
    },
    {
      id: "sales-mark-ready",
      title: "Marking an Order Ready for Delivery",
      description: "Move a confirmed order to READY status for driver assignment.",
      steps: [
        { action: "Open the confirmed order", where: "Dashboard → Orders → Click order (CONFIRMED)", detail: "The order must be in CONFIRMED status." },
        { action: "Click 'Mark Ready for Delivery'", where: "Order detail → Action button", detail: "This changes the status to READY. A driver can now be assigned." },
        { action: "Assign a driver", where: "Order detail → Assign Driver, or Routes page", detail: "You can assign a driver directly from the order detail or by creating/editing a route in the Routes section.", tip: "Generate the invoice before marking ready so everything is prepared before the driver picks up." },
      ],
    },
    {
      id: "sales-mark-paid",
      title: "Marking an Invoice as Paid",
      description: "Record payment received for an invoice.",
      steps: [
        { action: "Go to Invoices", where: "Dashboard → Invoices", detail: "Navigate to the invoices section." },
        { action: "Find the unpaid invoice", where: "Invoice list → Filter by status", detail: "Look for invoices with SENT or DRAFT status." },
        { action: "Click 'Mark Paid'", where: "Invoice detail or list → Mark Paid action", detail: "Click the 'Mark Paid' button. The invoice status changes to PAID.", tip: "Verify payment was actually received before marking. This affects the order closure checklist." },
      ],
    },
    {
      id: "sales-status-request",
      title: "Requesting a Status Change",
      description: "Some transitions require Admin/Master approval. Here's how to request them.",
      steps: [
        { action: "Open the order", where: "Dashboard → Orders → Click order", detail: "Navigate to the order that needs a status change." },
        { action: "Attempt the transition", where: "Order detail → Status action button", detail: "Click the button for the desired status. If it requires approval, a request will be created automatically." },
        { action: "Provide a reason (if asked)", where: "Status request dialog", detail: "For certain transitions, you'll be asked to provide a reason. Be clear and specific." },
        { action: "Wait for approval", where: "Dashboard → Status Requests", detail: "The request appears in the Status Requests section. An Admin or Master must approve it before the transition takes effect.", tip: "Check Status Requests regularly for updates on your pending requests." },
      ],
    },
  ],
  glossary: [
    ...COMMON_GLOSSARY,
    ...STATUS_GLOSSARY,
    ...QUOTE_STATUS_GLOSSARY,
    { term: "Convert to Order", definition: "Action that creates a new Order from an approved Quote. The order inherits all items and locked pricing." },
    { term: "Assign Driver", definition: "Linking a delivery driver to an order or route so they can see and handle the delivery." },
  ],
  faq: [
    { question: "Can I edit an order after confirming it?", answer: "No. Once confirmed, pricing is locked. If changes are needed, an Admin or Master can handle adjustments, or the order may need to be cancelled and recreated." },
    { question: "Why can't I generate an invoice?", answer: "All order items must have prices. Check for items with $0.00 or missing prices. The order must also be in CONFIRMED, READY, or IN_TRANSIT status." },
    { question: "How do I assign a driver to an order?", answer: "First mark the order as READY. Then either assign directly from the order detail (Assign Driver button) or add the order as a stop in a Route (Dashboard → Routes)." },
    { question: "What happens if a client rejects a quote?", answer: "The quote status changes to CLIENT_REJECTED. You can create a revised quote by duplicating and modifying, then resend." },
    { question: "Why does my status change say 'requires approval'?", answer: "Certain transitions (like QUOTE_PENDING → CONFIRMED) require Admin or Master approval. Your request is created automatically — check Status Requests for the approval status." },
    { question: "Can I see the original quote for an order?", answer: "Yes. If the order was created from a quote, a 'View Quote' link appears on the order detail page." },
  ],
  troubleshooting: [
    { problem: "Can't generate invoice — button is disabled or gives an error", cause: "Some items may have zero or missing prices.", solution: "Open the order and check every item price. Items at $0.00 will block generation. The order must be in CONFIRMED, READY, or IN_TRANSIT status." },
    { problem: "Can't assign driver — no drivers in dropdown", cause: "No users with DELIVERY role exist, or the order isn't in READY status.", solution: "Ask Admin to create Delivery users in Team. Ensure the order is marked as READY before assigning." },
    { problem: "Order stuck in a status — can't transition", cause: "Transition may require a different role, approval, or preconditions aren't met.", solution: "Check the error message for allowed transitions and required roles. Some transitions require Admin approval. Check Status Requests if a request was auto-created." },
    { problem: "Client didn't receive quote email", cause: "Email may be in spam, or client email is incorrect.", solution: "Verify the client's email address on the quote. Ask the client to check spam/junk folders. You can resend the quote." },
    { problem: "Route not showing driver's stops", cause: "Route date may not match, or driver isn't assigned.", solution: "Check that the route date matches the delivery date. Verify the driver is assigned. The driver sees stops in 'My Deliveries'." },
  ],
};

// ── ADMIN GUIDE ────────────────────────────────────────────────────

const ADMIN_GUIDE: RoleGuide = {
  role: "ADMIN",
  label: "Administrator",
  iconName: "shield",
  summary: "As Admin, you have full Sales capabilities PLUS system management: products, coupons, team, approvals, and audit. You approve status requests, manage adjustments, and close orders through the review process.",
  mainArea: "/dashboard",
  menuItems: ["All Sales items", "Products", "Coupons", "Team", "Audit Log"],
  inheritsFrom: ["SALES"],
  capabilities: [
    "Everything Sales can do (quotes, orders, invoices, routes, deliveries)",
    "Manage products: add, edit, deactivate menu items",
    "Create and manage coupons/promotions",
    "Create users with SALES and DELIVERY roles",
    "Edit team member details",
    "Approve or reject status change requests",
    "Approve or reject adjustment requests",
    "Review delivery reports and flag discrepancies",
    "Close orders through the closure checklist",
    "View the complete Audit Log",
  ],
  restrictions: [
    "Cannot create users with MASTER role",
    "Cannot perform rollbacks on order transitions",
    "Cannot manually force-close orders (Master only for edge cases)",
  ],
  processFlow: [
    { status: "MANAGE", label: "Manage Catalog", actor: "Admin", description: "Add/edit products, pricing tiers, and coupons" },
    { status: "TEAM", label: "Manage Team", actor: "Admin", description: "Create Sales and Delivery users" },
    { status: "SALES_FLOW", label: "Sales Operations", actor: "Admin/Sales", description: "Full quote → order → invoice → delivery pipeline" },
    { status: "APPROVE", label: "Approve Requests", actor: "Admin", description: "Review and approve status/adjustment requests" },
    { status: "REVIEW", label: "Post-Delivery Review", actor: "Admin", description: "Check delivery reports for discrepancies" },
    { status: "CLOSE", label: "Close Order", actor: "Admin", description: "Complete closure checklist and mark order COMPLETED" },
    { status: "AUDIT", label: "Audit & Monitor", actor: "Admin", description: "Review audit log for all system activity" },
  ],
  tutorials: [
    {
      id: "admin-manage-products",
      title: "Managing Products",
      description: "Add, edit, or deactivate items in the catering menu.",
      steps: [
        { action: "Go to Products", where: "Dashboard → Products", detail: "Navigate to the Products section in the sidebar." },
        { action: "View the product list", where: "Products page", detail: "See all products with name, category, status (active/inactive), and base pricing." },
        { action: "Add a new product", where: "Products → 'Add Product' button", detail: "Click 'Add Product' to open the product form." },
        { action: "Fill in product details", where: "Product form", detail: "Enter product name, description, category. Set pricing tiers for different headcount ranges (e.g., 1-25 guests: $X, 26-50 guests: $Y)." },
        { action: "Save the product", where: "Product form → Save", detail: "Save to add it to the catalog. It's immediately available for use in new quotes.", tip: "To deactivate a product without deleting it, toggle its status to 'Inactive'. It won't appear in new quotes." },
      ],
    },
    {
      id: "admin-manage-coupons",
      title: "Creating and Managing Coupons",
      description: "Set up discount codes for promotions.",
      steps: [
        { action: "Go to Coupons", where: "Dashboard → Coupons", detail: "Navigate to the Coupons section." },
        { action: "Click 'New Coupon'", where: "Coupons page → New Coupon button", detail: "Start creating a new coupon." },
        { action: "Set coupon details", where: "Coupon form", detail: "Enter the coupon code (e.g., SPRING25), discount type (percentage or flat amount), discount value, and expiry date." },
        { action: "Set conditions (if any)", where: "Coupon form → Conditions section", detail: "Optionally set minimum order amount, maximum uses, or specific product restrictions." },
        { action: "Save the coupon", where: "Coupon form → Save", detail: "Save to activate. Clients can see it in their Offers section.", tip: "Use memorable, short coupon codes. Clients will type them manually." },
      ],
    },
    {
      id: "admin-manage-team",
      title: "Managing Team Members",
      description: "Create new users and manage your team.",
      steps: [
        { action: "Go to Team", where: "Dashboard → Team", detail: "Navigate to the Team section." },
        { action: "View existing members", where: "Team page", detail: "See all users with their name, email, role, and status." },
        { action: "Click 'New User'", where: "Team page → New User button", detail: "Start creating a new team member." },
        { action: "Fill in user details", where: "User form", detail: "Enter name, email, and select the role: SALES or DELIVERY. Set a temporary password." },
        { action: "Save the user", where: "User form → Save", detail: "The user account is created. They can log in with the provided credentials.", tip: "You can create SALES and DELIVERY users. Only MASTER can create ADMIN users." },
      ],
    },
    {
      id: "admin-approve-requests",
      title: "Approving or Rejecting Status Requests",
      description: "Review and handle requests from Sales for status changes that need approval.",
      steps: [
        { action: "Go to Status Requests", where: "Dashboard → Status Requests", detail: "Navigate to the Status Requests section. Pending requests are shown prominently." },
        { action: "Review the request", where: "Request card", detail: "See who requested it, the order, current status, requested status, and the reason provided." },
        { action: "Open the related order", where: "Request card → Order link", detail: "Click through to review the order details before making a decision." },
        { action: "Approve or Reject", where: "Request card → Action buttons", detail: "Click 'Approve' to execute the transition, or 'Reject' to deny it. If rejecting, provide a reason.", tip: "Always check the order details before approving. Make sure the transition makes sense for the current situation." },
      ],
    },
    {
      id: "admin-close-order",
      title: "Closing an Order (Post-Delivery Review)",
      description: "Review a delivered order and complete the closure checklist.",
      steps: [
        { action: "Open the delivered order", where: "Dashboard → Orders → Order in DELIVERED status", detail: "Find and open the order that has been delivered." },
        { action: "Review the delivery report", where: "Order detail → Delivery Report section", detail: "Check the delivery report: receiver name, quantities, photos, signature. Look for any discrepancies." },
        { action: "Handle discrepancies (if any)", where: "Order detail → Adjustment section", detail: "If items were missing or damaged, create or review adjustment requests. Approve adjustments as needed." },
        { action: "Verify invoice is paid", where: "Order detail → Invoice section", detail: "Check that the invoice has been marked as PAID. If not, the order cannot be completed." },
        { action: "Move to Under Review", where: "Order detail → 'Start Review' action", detail: "Transition the order to UNDER_REVIEW. This requires a reason and the delivery report must exist." },
        { action: "Complete the closure checklist", where: "Order detail → Closure Checklist", detail: "Verify all items are green: delivery report reviewed, no pending adjustments, invoice paid." },
        { action: "Complete the order", where: "Order detail → 'Mark Complete' action", detail: "Move the order to COMPLETED. This is the final state — the order is fully closed.", tip: "If there are unresolved discrepancies, the order goes to DISPUTED instead. Resolve adjustments before completing." },
      ],
    },
    {
      id: "admin-audit-log",
      title: "Reviewing the Audit Log",
      description: "Monitor all system actions and track changes.",
      steps: [
        { action: "Go to Audit Log", where: "Dashboard → Audit Log", detail: "Navigate to the Audit Log section." },
        { action: "Browse entries", where: "Audit Log page", detail: "Entries are listed chronologically (newest first). Each shows: timestamp, user, action type, affected resource, and details." },
        { action: "Filter entries", where: "Audit Log → Filters", detail: "Filter by date range, user, or action type to find specific events." },
        { action: "Review details", where: "Audit entry → Expand", detail: "Click an entry to see the full details: what changed, old/new values, source of the change.", tip: "Regularly review the audit log for unusual activity, especially after status transitions and price changes." },
      ],
    },
  ],
  glossary: [
    ...COMMON_GLOSSARY,
    ...STATUS_GLOSSARY,
    ...QUOTE_STATUS_GLOSSARY,
    ...ADMIN_GLOSSARY,
  ],
  faq: [
    { question: "How do I deactivate a product without deleting it?", answer: "Go to Products → click the product → toggle its status to 'Inactive'. It won't appear in new quotes but existing orders are unaffected." },
    { question: "What's the difference between UNDER_REVIEW and DISPUTED?", answer: "UNDER_REVIEW is the normal post-delivery review. If discrepancies are found (missing items, damage), the order moves to DISPUTED. Once adjustments are resolved and the invoice is paid, it moves to COMPLETED." },
    { question: "Why can't I create an ADMIN user?", answer: "Only MASTER role users can create ADMIN accounts. You can create SALES and DELIVERY users." },
    { question: "How do adjustments work?", answer: "When a delivery report shows discrepancies, an adjustment request can be created. You review and approve/reject it. Approved adjustments may modify the invoice amount." },
    { question: "What triggers the Order Closure Checklist?", answer: "The checklist appears on orders in DELIVERED, UNDER_REVIEW, or DISPUTED status. It checks: delivery report exists, all report items reviewed, no pending adjustments, and invoice paid." },
  ],
  troubleshooting: [
    { problem: "Can't complete an order — checklist items are red", cause: "One or more closure requirements aren't met.", solution: "Check each item: Is there a delivery report? Are all report items reviewed? Are adjustments resolved? Is the invoice marked PAID? Address each red item." },
    { problem: "Product doesn't appear in quote builder", cause: "Product may be inactive or not saved properly.", solution: "Go to Products and check the product's status. Make sure it's Active. If recently added, try refreshing the page." },
    { problem: "Can't approve a status request", cause: "Preconditions for the transition may not be met.", solution: "Check the order's current state and what the transition requires. Some transitions need delivery reports, paid invoices, or reviewed items first." },
    { problem: "New team member can't log in", cause: "Credentials may be incorrect or the account may not be active.", solution: "Verify the email address was entered correctly. Reset their password from the Team page. Check that the user account is active." },
  ],
};

// ── MASTER GUIDE ───────────────────────────────────────────────────

const MASTER_GUIDE: RoleGuide = {
  role: "MASTER",
  label: "Master",
  iconName: "crown",
  summary: "As Master, you have complete system access. Everything Admin and Sales can do, plus: create Admin users, rollback order status transitions, and manually close orders. You are the final authority on all system operations.",
  mainArea: "/dashboard",
  menuItems: ["Everything Administrator sees"],
  inheritsFrom: ["SALES", "ADMIN"],
  capabilities: [
    "Everything Administrator can do",
    "Create users with ADMIN role",
    "Rollback order status to previous state (with reason)",
    "Manually close/force-complete orders",
    "Full, unrestricted system access",
  ],
  restrictions: [],
  processFlow: [
    { status: "ALL", label: "Full Operations", actor: "Master", description: "All Sales and Admin operations available" },
    { status: "ADMIN_USERS", label: "Create Admins", actor: "Master", description: "Create users with ADMIN role" },
    { status: "ROLLBACK", label: "Rollback Status", actor: "Master", description: "Revert an order to its previous status" },
    { status: "FORCE_CLOSE", label: "Force Close", actor: "Master", description: "Manually close orders regardless of checklist" },
    { status: "OVERSIGHT", label: "Full Oversight", actor: "Master", description: "Monitor all activity via Audit Log and dashboards" },
  ],
  tutorials: [
    {
      id: "master-create-admin",
      title: "Creating an Admin User",
      description: "Only Master can create users with the ADMIN role.",
      steps: [
        { action: "Go to Team", where: "Dashboard → Team", detail: "Navigate to the Team management section." },
        { action: "Click 'New User'", where: "Team page → New User button", detail: "Open the user creation form." },
        { action: "Select ADMIN role", where: "User form → Role dropdown", detail: "As Master, you'll see ADMIN in the role options (in addition to SALES and DELIVERY)." },
        { action: "Fill in details", where: "User form", detail: "Enter name, email, and temporary password. The ADMIN user will have all Admin capabilities once created." },
        { action: "Save", where: "User form → Save", detail: "The Admin account is created. Brief the new Admin on their responsibilities.", tip: "Only create Admin accounts for trusted team members. Admins can manage products, coupons, team, and approve requests." },
      ],
    },
    {
      id: "master-rollback",
      title: "Rolling Back an Order Status",
      description: "Revert an order to its previous status when a mistake was made.",
      steps: [
        { action: "Open the order", where: "Dashboard → Orders → Click the order", detail: "Find the order that needs its status reverted." },
        { action: "Click 'Rollback'", where: "Order detail → Rollback action (Master only)", detail: "This button is only visible to Master users. It will revert the order to its immediate previous status." },
        { action: "Provide a detailed reason", where: "Rollback dialog → Reason field", detail: "A reason is required. Be specific: why the rollback is needed, what went wrong." },
        { action: "Confirm the rollback", where: "Rollback dialog → Confirm", detail: "The order returns to its previous status. The rollback is recorded in the order history and audit log." },
        { action: "Take corrective action", where: "Order detail", detail: "After rollback, address the issue that caused the need for rollback. Then proceed with the correct transition.", tip: "Rollbacks should be rare. They're logged in the audit trail. Use them only when a genuine mistake was made." },
      ],
    },
    {
      id: "master-force-close",
      title: "Manually Closing an Order",
      description: "Force-close an order that can't be completed through the normal checklist.",
      steps: [
        { action: "Open the order", where: "Dashboard → Orders → Click the order", detail: "Find the problematic order." },
        { action: "Assess the situation", where: "Order detail", detail: "Review why the normal closure process isn't working. Check delivery reports, invoices, and adjustments." },
        { action: "Click 'Force Close'", where: "Order detail → Force Close (Master only)", detail: "This bypasses the normal closure checklist requirements." },
        { action: "Provide a thorough reason", where: "Force Close dialog → Reason field", detail: "Document why you're force-closing: what's incomplete and why it can't be resolved normally." },
        { action: "Confirm", where: "Force Close dialog → Confirm", detail: "The order moves to COMPLETED regardless of checklist status. This is fully logged.", tip: "Only use force-close for exceptional situations: stale orders, client-abandoned orders, or irrecoverable edge cases." },
      ],
    },
  ],
  glossary: [
    ...COMMON_GLOSSARY,
    ...STATUS_GLOSSARY,
    ...QUOTE_STATUS_GLOSSARY,
    ...ADMIN_GLOSSARY,
    { term: "Force Close", definition: "Manually moving an order to COMPLETED regardless of the normal checklist. Only Master users can do this. Requires a documented reason." },
  ],
  faq: [
    { question: "When should I use rollback vs. creating a new status request?", answer: "Use rollback when a transition was made by mistake (e.g., accidentally marked as DELIVERED). Use status requests for planned transitions that need approval. Rollbacks are immediate; requests go through the approval flow." },
    { question: "Can I rollback multiple steps?", answer: "No. Rollback reverts exactly one step — to the immediately previous status. If you need to go back further, you'll need to rollback multiple times, one step at a time." },
    { question: "Is there anything I cannot do?", answer: "Master has unrestricted access to all system features. There are no limitations. However, all actions are logged in the audit trail for accountability." },
    { question: "Should I create Admin users liberally?", answer: "No. Admin users can manage products, coupons, team members, and approve requests. Only create Admin accounts for senior, trusted team members who need these capabilities." },
  ],
  troubleshooting: [
    { problem: "Rollback failed — 'No history available'", cause: "The order has no recorded status transitions in its history.", solution: "Check the order's status history. If it was created directly in its current status (e.g., from a quote), there may be no previous status to rollback to." },
    { problem: "Force close not available", cause: "The UI button may not appear for certain terminal states.", solution: "Orders in COMPLETED or CANCELLED are already terminal — they can't be force-closed. Check the current status." },
    { problem: "Audit log shows unexpected changes", cause: "Another admin or automated process made changes.", solution: "Filter the audit log by date range and user to identify who made the changes. Review the details of each entry for context." },
  ],
};

// ── Export all guides ──────────────────────────────────────────────

export const GUIDES: Record<string, RoleGuide> = {
  CLIENT: CLIENT_GUIDE,
  DELIVERY: DELIVERY_GUIDE,
  SALES: SALES_GUIDE,
  ADMIN: ADMIN_GUIDE,
  MASTER: MASTER_GUIDE,
};

export const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  DELIVERY: "Delivery Driver",
  SALES: "Sales",
  ADMIN: "Administrator",
  MASTER: "Master",
};

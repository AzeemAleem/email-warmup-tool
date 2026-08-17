/**
 * Packaging-business email templates for warmup.
 * Topics are inspired by real B2B packaging conversations — not copied verbatim.
 * Placeholders: {{receiverName}}, {{senderName}}
 */

export interface EmailContent {
  subject: string;
  /** Body content only (greeting + signature added by personalize) */
  body: string;
}

const PACKAGING_TEMPLATES: EmailContent[] = [
  {
    subject: "Following up on the quote",
    body: "Just following up on the quote from last week — did we lock in final pricing, or is anything still pending on our side?",
  },
  {
    subject: "Invoice details check",
    body: "Quick one — I want to confirm the invoice details before we process payment. Can you resend the latest version if anything changed?",
  },
  {
    subject: "Production status check-in",
    body: "Could you give a quick update on where our order stands in production? I need it for timeline planning on our end.",
  },
  {
    subject: "Quality note on last batch",
    body: "We noticed a slight inconsistency in the last batch — a few units had a different finish. Could you look into that when you have a moment?",
  },
  {
    subject: "Reorder request",
    body: "We'd like to place a reorder with the same specs as last time. Can you confirm if pricing and lead time are still the same?",
  },
  {
    subject: "Thanks for the referral",
    body: "Wanted to say thanks for the recent referral — really appreciate it. Let me know if there's anything we can do in return.",
  },
  {
    subject: "Holiday closure heads-up",
    body: "Just a heads up that our office will be closed for a short break next week. Flagging it in case it affects any pending orders.",
  },
  {
    subject: "Latest catalog / price list",
    body: "Could you send over your latest catalog or price list? We're reviewing options for an upcoming project.",
  },
  {
    subject: "Scheduling a quick call",
    body: "Would you have time this week for a short call to go over our next order? Happy to work around your schedule.",
  },
  {
    subject: "Sustainability certifications",
    body: "Do you have sustainability or recycling certifications for your materials? A few of our clients have been asking.",
  },
  {
    subject: "Factory visit possibility",
    body: "We're planning to be in the area next month — would it be possible to stop by and see the production facility?",
  },
  {
    subject: "Scaling order volume",
    body: "We're expecting higher demand soon and wanted to check if you can handle a larger order volume without delays.",
  },
  {
    subject: "Contract renewal",
    body: "Our current agreement is coming up for renewal. Could you send the updated terms when convenient?",
  },
  {
    subject: "Business review follow-up",
    body: "Following up after our last review call — are there any action items still open on your side?",
  },
  {
    subject: "Packaging trends",
    body: "Curious what packaging trends you're seeing from similar clients lately. Anything worth us considering?",
  },
  {
    subject: "Comparing options before deciding",
    body: "We're comparing a couple of packaging options before finalizing. Could you send a clear cost breakdown so we can compare properly?",
  },
  {
    subject: "Expedited order request",
    body: "Is there any way to expedite our current order? We have a deadline coming up sooner than expected.",
  },
  {
    subject: "Damaged shipment",
    body: "A portion of our last shipment arrived damaged. Could you advise on next steps for a replacement or credit?",
  },
  {
    subject: "Price change clarification",
    body: "We noticed a change in pricing on the last quote — could you clarify what changed since our previous order?",
  },
  {
    subject: "Feedback after using the packaging",
    body: "Wanted to share quick feedback after using the packaging for a few weeks — overall it has held up really well.",
  },
  {
    subject: "Subscription box packaging",
    body: "We're setting up a monthly subscription box and need packaging that feels good to open but still ships efficiently. Any recommendations?",
  },
  {
    subject: "Wine bottle packaging",
    body: "For wine bottles, we need dividers that prevent clinking or breakage in transit. What setup do you usually recommend?",
  },
  {
    subject: "Skincare / glass bottle inserts",
    body: "Our bottles are glass and fairly small. What kind of insert would you suggest to keep them secure in the box?",
  },
  {
    subject: "Tea and coffee packaging",
    body: "We're packaging loose-leaf tea and coffee — do you offer resealable pouches, or would a rigid box be the better route?",
  },
  {
    subject: "Spice jar shipping",
    body: "For spice jars, we need packaging that keeps them upright and prevents lids from popping open in transit. Any ideas?",
  },
  {
    subject: "Shoe box stacking strength",
    body: "We need shoe boxes that can handle warehouse stacking without crushing. What board weight would you recommend?",
  },
  {
    subject: "Case + outer shipping box",
    body: "We need an inner case plus an outer shipping box. Can you handle both, or only the outer packaging?",
  },
  {
    subject: "Premium watch box",
    body: "We're looking for a watch box with a cushion insert that still feels premium. Do you offer that kind of finish?",
  },
  {
    subject: "Retail + shipping dual-purpose pack",
    body: "For pens and notebooks, we want packaging that works on retail shelves and still protects in shipping. Suggestions?",
  },
  {
    subject: "Pet product packaging",
    body: "We sell pet toys and treats — do you have packaging sturdy enough to survive rough handling before it even gets opened?",
  },
  {
    subject: "Seasonal holiday packaging",
    body: "We want a limited holiday-themed box this season. Is custom seasonal printing something you can turn around quickly?",
  },
  {
    subject: "Retail counter display",
    body: "We need a small POP display box for store counters. Can you design something like that?",
  },
  {
    subject: "Luxury finish options",
    body: "We want a more premium feel — matte finish, maybe a ribbon closure. What options do you offer?",
  },
  {
    subject: "Hot food packaging",
    body: "For food delivery, we need packaging that keeps heat in without going soggy. What material would you suggest?",
  },
  {
    subject: "Tamper-evident packaging",
    body: "We package small medical items and need tamper-evident sealing. Is that something you can build in?",
  },
  {
    subject: "Apparel accessories packaging",
    body: "For belts and scarves, we want packaging that folds neatly for retail but also protects during shipping.",
  },
  {
    subject: "Custom-fit for odd shapes",
    body: "We sell heavier, oddly shaped sporting goods. Can you design custom-fit boxes for that?",
  },
  {
    subject: "Plant packaging with ventilation",
    body: "We ship small potted plants and need packaging with ventilation and support so soil doesn't shift. Can you help?",
  },
  {
    subject: "Custom inserts for art supplies",
    body: "For paints and brushes, we need compartments inside the box. Do you offer custom inserts?",
  },
  {
    subject: "Hardware / parts packaging",
    body: "We ship small furniture hardware and want packaging that keeps everything organized for assembly.",
  },
  {
    subject: "Turnaround time question",
    body: "Could you share your typical turnaround from artwork approval to finished boxes?",
  },
  {
    subject: "Minimum order quantity",
    body: "What's the minimum order quantity you work with for a new packaging run?",
  },
  {
    subject: "Eco-friendly material options",
    body: "Do you offer eco-friendly or recyclable material options for packaging?",
  },
  {
    subject: "Custom printing options",
    body: "What custom printing options do you offer — foil, embossing, spot UV, that kind of thing?",
  },
  {
    subject: "Color matching process",
    body: "How does your color matching process work? Do you use Pantone references?",
  },
  {
    subject: "Sample approval process",
    body: "Could you walk me through your sample approval process before a full production run?",
  },
  {
    subject: "Order tracking",
    body: "Once an order is placed, how do we track production progress and shipping status?",
  },
  {
    subject: "Bulk pricing tiers",
    body: "Do you offer better pricing for bulk orders? I'd like to understand the volume tiers.",
  },
  {
    subject: "Artwork file format",
    body: "What file format do you need for artwork submission — AI, PDF, or something else?",
  },
  {
    subject: "Cosmetics packaging",
    body: "Could you help with packaging for a cosmetics line? We're looking for something that feels premium.",
  },
  {
    subject: "Electronics protective packaging",
    body: "We need protective packaging for small electronics. Can you help design that?",
  },
  {
    subject: "Supplements packaging",
    body: "Could you help create packaging for a supplements brand? Happy to share bottle sizes.",
  },
  {
    subject: "Candle packaging",
    body: "We're looking for candle packaging that protects well during shipping. What would you recommend?",
  },
  {
    subject: "Jewelry packaging",
    body: "Could you help with packaging for jewelry — small, secure, and presentable?",
  },
  {
    subject: "Bakery packaging",
    body: "We need packaging for bakery items that helps keep products fresh. Can you advise?",
  },
  {
    subject: "Apparel mailers or boxes",
    body: "Could you help with packaging for a clothing brand — mailers or boxes, whichever you'd recommend?",
  },
  {
    subject: "Dieline for review",
    body: "I've shared the dieline for our packaging — could you check it and confirm if it looks good on your end?",
  },
  {
    subject: "Help locating material",
    body: "I'm having trouble pinning down the exact material we discussed. Could you help me identify the right option?",
  },
  {
    subject: "Perfume packaging",
    body: "We're looking into packaging for perfume bottles. Which style usually works best for that?",
  },
  {
    subject: "Best size and material",
    body: "Based on what we've shared so far, could you suggest the best size and material for our packaging?",
  },
  {
    subject: "Box types you develop",
    body: "What types of boxes do you usually develop? Want to see which options fit our product best.",
  },
  {
    subject: "Shipping cost question",
    body: "Just checking — is shipping included on your side, or does that fall on us?",
  },
  {
    subject: "Shipping damage liability",
    body: "If a parcel is damaged in transit, is that covered on your side or ours? Want to clarify before we move forward.",
  },
  {
    subject: "Sample parcels for testing",
    body: "Before we commit to a full order, could you send a few sample parcels for testing?",
  },
  {
    subject: "Towel packaging",
    body: "Could you help create packaging for our towel line? Happy to share sizing details.",
  },
  {
    subject: "Toy packaging",
    body: "We're launching toys and need packaging designed for it. Could you help with that?",
  },
  {
    subject: "Games packaging",
    body: "Can you help create packaging for our games line? Let me know what info you need from us.",
  },
  {
    subject: "Book packaging",
    body: "We need packaging for books. Could you guide us on the best approach?",
  },
  {
    subject: "Cup packaging",
    body: "Could you help with packaging for cups, and suggest materials that would work well?",
  },
  {
    subject: "Chocolate packaging",
    body: "We need packaging for a chocolate line that keeps product fresh. Can you help create this?",
  },
  {
    subject: "Water bottle packaging",
    body: "Could you help create packaging for water bottles? Let us know what specs you need from us.",
  },
];

/** Pick a random packaging template */
export function getRandomPackagingTemplate(): EmailContent {
  return PACKAGING_TEMPLATES[
    Math.floor(Math.random() * PACKAGING_TEMPLATES.length)
  ];
}

/** Full pool for seeding DB */
export function getAllPackagingTemplates(): EmailContent[] {
  return [...PACKAGING_TEMPLATES];
}

/** Short in-thread replies that stay on the packaging topic */
const PACKAGING_REPLIES: string[] = [
  "Good question — I'll check with production and send you a clear answer on options and lead time.",
  "We can help with that. Let me confirm the specs and follow up with the best approach.",
  "Thanks for sending this over. I'll review it on our side and get back with a recommendation.",
  "Yes, that's something we handle. I'll share material and pricing notes shortly.",
  "Got it — I'll look at the current run and confirm what we can do for this order.",
  "Makes sense. I'll check stock and turnaround and reply with next steps.",
  "I can look into that. Give me a bit and I'll send the details so you can compare.",
  "Thanks for the update. I'll confirm with the team and follow up on this thread.",
];

export function getRandomPackagingReply(originalSubject: string): EmailContent {
  const body =
    PACKAGING_REPLIES[Math.floor(Math.random() * PACKAGING_REPLIES.length)];
  const subj = originalSubject.toLowerCase().startsWith("re:")
    ? originalSubject
    : `Re: ${originalSubject}`;
  return { subject: subj, body };
}

import type {
  ClinicLocation,
  Service,
  StaffMember,
  MembershipPlan,
  ServicePackage,
  Product,
} from "./types";

export const locations: ClinicLocation[] = [
  {
    id: "toluca",
    name: "Toluca Lake",
    shortName: "Toluca Lake",
    address: "4425 W. Riverside Drive, Suite 203",
    city: "Burbank, CA 91505",
    phone: "(818) 555-0360",
    hours: [
      { days: "Tuesday – Friday", open: "9:00 AM", close: "7:00 PM" },
      { days: "Saturday", open: "9:00 AM", close: "5:00 PM" },
      { days: "Sunday – Monday", open: "Closed", close: "" },
    ],
  },
  {
    id: "valencia",
    name: "Valencia",
    shortName: "Valencia",
    address: "24510 Town Center Dr, Suite 170",
    city: "Valencia, CA 91355",
    phone: "(661) 555-0360",
    hours: [
      { days: "Wednesday – Friday", open: "10:00 AM", close: "7:00 PM" },
      { days: "Saturday", open: "9:00 AM", close: "6:00 PM" },
      { days: "Sunday – Tuesday", open: "Closed", close: "" },
    ],
  },
];

export const services: Service[] = [
  {
    id: "svc-classic-facial",
    name: "Classic Facial",
    category: "Facials",
    price: 145,
    durationMin: 55,
    description:
      "Deep cleanse, exfoliation, extractions and a customized mask for balanced, glowing skin.",
  },
  {
    id: "svc-signature-facial",
    name: "Signature Customized Facial",
    category: "Facials",
    price: 295,
    durationMin: 90,
    description:
      "Carolina's fully bespoke facial — layered treatments tailored to your skin on the day.",
  },
  {
    id: "svc-derma-glow",
    name: "Derma Glow Facial",
    category: "Facials",
    price: 275,
    durationMin: 80,
    description:
      "Dermaplaning plus enzyme resurfacing for immediate luminosity and smooth texture.",
  },
  {
    id: "svc-cleopatra-gold",
    name: "Cleopatra 24K Gold Facial",
    category: "Facials",
    price: 250,
    durationMin: 85,
    description:
      "24K gold-infused ritual to firm, brighten and deeply nourish mature or dull skin.",
  },
  {
    id: "svc-zero-gravity",
    name: "Skin Zero Gravity Face Treatment",
    category: "Advanced Treatments",
    price: 450,
    durationMin: 90,
    description:
      "Microcurrent lifting and sculpting — the non-invasive alternative to injectables.",
  },
  {
    id: "svc-procell",
    name: "Procell Microchannel Therapy",
    category: "Advanced Treatments",
    price: 350,
    durationMin: 60,
    description:
      "Microchanneling with growth-factor serums to rebuild collagen and refine skin.",
  },
  {
    id: "svc-lymphatic",
    name: "Brazilian Lymphatic Drainage",
    category: "Body",
    price: 195,
    durationMin: 55,
    description:
      "Rhythmic sculpting massage to de-puff, detoxify and contour the body.",
  },
  {
    id: "svc-lymphatic-cavitation",
    name: "Brazilian Lymphatic Drainage with Cavitation",
    category: "Body",
    price: 295,
    durationMin: 75,
    description:
      "Lymphatic sculpting enhanced with ultrasonic cavitation for deeper contouring.",
  },
  {
    id: "svc-japanese-scalp",
    name: "Japanese Signature Scalp Treatment",
    category: "Scalp",
    price: 160,
    durationMin: 60,
    description:
      "Traditional Japanese head spa — deep scalp cleanse, massage and hydration.",
  },
  {
    id: "svc-luxury-scalp",
    name: "Skin 360 Luxury Scalp Experience",
    category: "Scalp",
    price: 275,
    durationMin: 90,
    description:
      "Our most indulgent head spa journey with steam, masks and extended massage.",
  },
  {
    id: "svc-post-op-body",
    name: "Post Cosmetic Surgery — Body",
    category: "Body",
    price: 245,
    durationMin: 60,
    description:
      "Gentle post-operative lymphatic care to reduce swelling and support recovery.",
  },
  {
    id: "svc-gel-manicure",
    name: "Gel Manicure",
    category: "Nails",
    price: 40,
    durationMin: 45,
    description: "Classic gel manicure with cuticle care and polish.",
  },
];

export const staff: StaffMember[] = [
  {
    id: "staff-carolina",
    name: "Carolina",
    role: "Owner · Lead Esthetician",
    initials: "CA",
    color: "#c19a43",
    locations: ["toluca", "valencia"],
    email: "carolina@skin360facebodyscalp.com",
    phone: "(818) 555-0101",
  },
  {
    id: "staff-marisol",
    name: "Marisol Vega",
    role: "Esthetician",
    initials: "MV",
    color: "#8a9a7b",
    locations: ["valencia"],
    email: "marisol@skin360facebodyscalp.com",
    phone: "(661) 555-0102",
  },
  {
    id: "staff-jenny",
    name: "Jenny Park",
    role: "Esthetician · Nail Artist",
    initials: "JP",
    color: "#b98e7e",
    locations: ["toluca"],
    email: "jenny@skin360facebodyscalp.com",
    phone: "(818) 555-0103",
  },
];

export const membershipPlans: MembershipPlan[] = [
  {
    id: "plan-glow",
    name: "Glow Society",
    monthlyPrice: 129,
    billingCycle: "Monthly",
    perks: [
      "One Classic Facial each month",
      "10% off all retail products",
      "Priority weekend booking",
    ],
    activeMembers: 14,
  },
  {
    id: "plan-radiance",
    name: "Radiance Elite",
    monthlyPrice: 249,
    billingCycle: "Monthly",
    perks: [
      "One Signature or Derma Glow Facial each month",
      "15% off all retail products",
      "Complimentary birthday scalp treatment",
      "Priority booking with Carolina",
    ],
    activeMembers: 8,
  },
  {
    id: "plan-scalp",
    name: "Scalp Ritual Club",
    monthlyPrice: 135,
    billingCycle: "Monthly",
    perks: [
      "One Japanese Signature Scalp Treatment each month",
      "10% off scalp care retail",
      "$25 credit toward the Luxury Scalp Experience",
    ],
    activeMembers: 6,
  },
];

export const servicePackages: ServicePackage[] = [
  {
    id: "pkg-series-10",
    name: "Series of 10 Sessions",
    serviceIds: ["svc-classic-facial", "svc-lymphatic", "svc-japanese-scalp"],
    sessions: 10,
    discountPct: 15,
    fullPrice: 1450,
    price: 1232.5,
    description:
      "Any series of ten sessions of the same treatment — 15% off. Priced here for the Classic Facial series.",
  },
  {
    id: "pkg-lymphatic-6",
    name: "Lymphatic Sculpt Series — 6 Sessions",
    serviceIds: ["svc-lymphatic"],
    sessions: 6,
    discountPct: 10,
    fullPrice: 1170,
    price: 1053,
    description:
      "Six Brazilian Lymphatic Drainage sessions, ideally taken 1–2 weeks apart.",
  },
  {
    id: "pkg-derma-trio",
    name: "Derma Glow Trio",
    serviceIds: ["svc-derma-glow"],
    sessions: 3,
    discountPct: 10,
    fullPrice: 825,
    price: 742.5,
    description: "Three Derma Glow Facials to keep skin resurfaced season to season.",
  },
  {
    id: "pkg-postop-8",
    name: "Post-Op Recovery — 8 Sessions",
    serviceIds: ["svc-post-op-body"],
    sessions: 8,
    discountPct: 12,
    fullPrice: 1960,
    price: 1724.8,
    description:
      "Eight post-cosmetic-surgery lymphatic sessions for a complete recovery protocol.",
  },
];

export const products: Product[] = [
  { id: "prod-01", name: "Vitamin C Brightening Serum 30ml", category: "Serums", sku: "S360-VCS-30", inStock: 14, lowStockThreshold: 5, cost: 28, retailPrice: 68, vendor: "Image Skincare" },
  { id: "prod-02", name: "Hydrating Gel Cleanser 200ml", category: "Cleansers", sku: "S360-HGC-200", inStock: 3, lowStockThreshold: 6, cost: 14, retailPrice: 38, vendor: "Circadia" },
  { id: "prod-03", name: "24K Gold Recovery Mask", category: "Masks", sku: "S360-24K-MSK", inStock: 8, lowStockThreshold: 4, cost: 32, retailPrice: 85, vendor: "Knesko" },
  { id: "prod-04", name: "Peptide Firming Moisturizer 50ml", category: "Moisturizers", sku: "S360-PFM-50", inStock: 11, lowStockThreshold: 5, cost: 26, retailPrice: 64, vendor: "Image Skincare" },
  { id: "prod-05", name: "Mineral SPF 40 Tinted 60ml", category: "Sun Care", sku: "S360-SPF-40T", inStock: 2, lowStockThreshold: 8, cost: 18, retailPrice: 48, vendor: "EltaMD" },
  { id: "prod-06", name: "Enzyme Resurfacing Polish 75ml", category: "Exfoliants", sku: "S360-ERP-75", inStock: 9, lowStockThreshold: 4, cost: 21, retailPrice: 54, vendor: "Circadia" },
  { id: "prod-07", name: "Hyaluronic Plumping Essence 100ml", category: "Serums", sku: "S360-HPE-100", inStock: 16, lowStockThreshold: 6, cost: 24, retailPrice: 58, vendor: "Hale & Hush" },
  { id: "prod-08", name: "Scalp Detox Scrub 150ml", category: "Scalp Care", sku: "S360-SDS-150", inStock: 7, lowStockThreshold: 4, cost: 16, retailPrice: 42, vendor: "Oway" },
  { id: "prod-09", name: "Silk Scalp Serum 50ml", category: "Scalp Care", sku: "S360-SSS-50", inStock: 4, lowStockThreshold: 5, cost: 22, retailPrice: 56, vendor: "Oway" },
  { id: "prod-10", name: "Post-Op Arnica Recovery Gel 120ml", category: "Body", sku: "S360-ARG-120", inStock: 12, lowStockThreshold: 5, cost: 15, retailPrice: 39, vendor: "Hale & Hush" },
  { id: "prod-11", name: "Lymphatic Body Oil 200ml", category: "Body", sku: "S360-LBO-200", inStock: 10, lowStockThreshold: 5, cost: 19, retailPrice: 52, vendor: "Ilike Organics" },
  { id: "prod-12", name: "Retinol Renewal Night Cream 50ml", category: "Moisturizers", sku: "S360-RNC-50", inStock: 6, lowStockThreshold: 4, cost: 30, retailPrice: 78, vendor: "Image Skincare" },
  { id: "prod-13", name: "Soothing Rose Toner 200ml", category: "Toners", sku: "S360-SRT-200", inStock: 13, lowStockThreshold: 5, cost: 12, retailPrice: 34, vendor: "Ilike Organics" },
  { id: "prod-14", name: "Growth Factor Ampoule Set (4)", category: "Serums", sku: "S360-GFA-4", inStock: 1, lowStockThreshold: 3, cost: 55, retailPrice: 130, vendor: "Procell" },
  { id: "prod-15", name: "Gentle Milk Cleanser 200ml", category: "Cleansers", sku: "S360-GMC-200", inStock: 8, lowStockThreshold: 4, cost: 13, retailPrice: 36, vendor: "Hale & Hush" },
  { id: "prod-16", name: "Copper Peptide Eye Cream 15ml", category: "Eye Care", sku: "S360-CPE-15", inStock: 5, lowStockThreshold: 3, cost: 27, retailPrice: 66, vendor: "Circadia" },
  { id: "prod-17", name: "Jade Gua Sha + Roller Duo", category: "Tools", sku: "S360-JGS-DUO", inStock: 15, lowStockThreshold: 5, cost: 9, retailPrice: 32, vendor: "Skin 360 Boutique" },
  { id: "prod-18", name: "Silk Pillowcase — Ivory", category: "Boutique", sku: "S360-SPC-IV", inStock: 9, lowStockThreshold: 4, cost: 20, retailPrice: 55, vendor: "Skin 360 Boutique" },
  { id: "prod-19", name: "Clarifying Charcoal Mask 100ml", category: "Masks", sku: "S360-CCM-100", inStock: 3, lowStockThreshold: 4, cost: 17, retailPrice: 46, vendor: "Circadia" },
  { id: "prod-20", name: "Gel Polish — Seasonal Shades (Set of 6)", category: "Nails", sku: "S360-GPS-6", inStock: 6, lowStockThreshold: 3, cost: 24, retailPrice: 60, vendor: "DND Gel" },
];

import { formatISO, subDays } from "date-fns";
import type { Client, ClientNote, IntakeForm, Member } from "./types";

const d = (daysAgo: number) =>
  formatISO(subDays(new Date(), daysAgo), { representation: "date" });

export const clients: Client[] = [
  { id: "cl-01", firstName: "Vanessa", lastName: "Moreno", email: "vanessa.moreno@gmail.com", phone: "(818) 555-2841", tags: ["VIP", "Member"], homeLocation: "toluca", joinedISO: d(540), lastVisitISO: d(4), totalSpent: 6420, visitCount: 32, birthday: "March 14", skinNotes: "Combination skin, melasma on cheeks. Loves the 24K Gold Facial." },
  { id: "cl-02", firstName: "Rachel", lastName: "Kim", email: "rachelkim.la@gmail.com", phone: "(818) 555-9034", tags: ["Member"], homeLocation: "toluca", joinedISO: d(410), lastVisitISO: d(9), totalSpent: 3185, visitCount: 19, birthday: "July 2", skinNotes: "Sensitive to strong acids — patch test first." },
  { id: "cl-03", firstName: "Daniella", lastName: "Reyes", email: "dreyes88@yahoo.com", phone: "(661) 555-1177", tags: ["Series Client"], homeLocation: "valencia", joinedISO: d(210), lastVisitISO: d(2), totalSpent: 2140, visitCount: 11, skinNotes: "Mid-way through lymphatic series; tracking measurements." },
  { id: "cl-04", firstName: "Priya", lastName: "Natarajan", email: "priya.nat@outlook.com", phone: "(818) 555-6612", tags: ["VIP"], homeLocation: "toluca", joinedISO: d(760), lastVisitISO: d(13), totalSpent: 8930, visitCount: 41, birthday: "November 8", skinNotes: "Zero Gravity devotee — books monthly. Prefers late afternoons." },
  { id: "cl-05", firstName: "Melissa", lastName: "Tran", email: "mtran.beauty@gmail.com", phone: "(661) 555-3358", tags: ["Member", "Sensitive Skin"], homeLocation: "valencia", joinedISO: d(330), lastVisitISO: d(6), totalSpent: 2755, visitCount: 16, skinNotes: "Rosacea-prone. Cool steam only, no fragrance." },
  { id: "cl-06", firstName: "Jasmine", lastName: "Okafor", email: "jas.okafor@gmail.com", phone: "(818) 555-7420", tags: ["New"], homeLocation: "toluca", joinedISO: d(12), lastVisitISO: d(5), totalSpent: 295, visitCount: 1, skinNotes: "First visit: Signature Facial. Interested in membership." },
  { id: "cl-07", firstName: "Sofia", lastName: "Petrossian", email: "sofia.p@icloud.com", phone: "(818) 555-1109", tags: ["VIP", "Series Client"], homeLocation: "toluca", joinedISO: d(890), lastVisitISO: d(1), totalSpent: 11240, visitCount: 58, birthday: "January 27", skinNotes: "On her third series of 10. Refers constantly — send thank-you gift." },
  { id: "cl-08", firstName: "Amanda", lastName: "Whitfield", email: "amandaw@hey.com", phone: "(661) 555-8823", tags: ["Post-Op"], homeLocation: "valencia", joinedISO: d(45), lastVisitISO: d(3), totalSpent: 1960, visitCount: 6, skinNotes: "Post-op BBL recovery protocol — week 5 of 8. Dr. Salzman referral." },
  { id: "cl-09", firstName: "Grace", lastName: "Lindqvist", email: "grace.lindqvist@gmail.com", phone: "(818) 555-4471", tags: ["Member"], homeLocation: "toluca", joinedISO: d(600), lastVisitISO: d(21), totalSpent: 4310, visitCount: 24, skinNotes: "Scalp Ritual Club member. Dry scalp in winter." },
  { id: "cl-10", firstName: "Natalie", lastName: "Bloom", email: "nat.bloom@gmail.com", phone: "(818) 555-3392", tags: [], homeLocation: "toluca", joinedISO: d(180), lastVisitISO: d(34), totalSpent: 885, visitCount: 5, skinNotes: "Prefers Jenny for gel manicures." },
  { id: "cl-11", firstName: "Carmen", lastName: "Delgado", email: "carmen.delgado@gmail.com", phone: "(661) 555-6641", tags: ["Member"], homeLocation: "valencia", joinedISO: d(275), lastVisitISO: d(8), totalSpent: 2210, visitCount: 14, skinNotes: "Glow Society member since spring." },
  { id: "cl-12", firstName: "Hannah", lastName: "Mizrahi", email: "hannahmiz@gmail.com", phone: "(818) 555-9915", tags: ["New"], homeLocation: "toluca", joinedISO: d(6), lastVisitISO: null, totalSpent: 0, visitCount: 0, skinNotes: "Booked first Derma Glow for this week — bridal prep, wedding in October." },
  { id: "cl-13", firstName: "Olivia", lastName: "Castellanos", email: "olivia.cast@gmail.com", phone: "(661) 555-2280", tags: ["Series Client"], homeLocation: "valencia", joinedISO: d(150), lastVisitISO: d(7), totalSpent: 1785, visitCount: 9, skinNotes: "Post-op series — graduating to maintenance lymphatic monthly." },
  { id: "cl-14", firstName: "Tessa", lastName: "Nakamura", email: "tessa.nak@gmail.com", phone: "(818) 555-5527", tags: ["VIP"], homeLocation: "toluca", joinedISO: d(980), lastVisitISO: d(11), totalSpent: 7615, visitCount: 37, birthday: "May 30", skinNotes: "Japanese scalp treatment regular — every three weeks like clockwork." },
  { id: "cl-15", firstName: "Brooke", lastName: "Ashford", email: "brooke.ashford@gmail.com", phone: "(661) 555-4436", tags: [], homeLocation: "valencia", joinedISO: d(95), lastVisitISO: d(29), totalSpent: 640, visitCount: 3, skinNotes: "Congested T-zone; recommended monthly classic facials." },
  { id: "cl-16", firstName: "Leila", lastName: "Haddad", email: "leila.haddad@icloud.com", phone: "(818) 555-8850", tags: ["Member", "Sensitive Skin"], homeLocation: "toluca", joinedISO: d(365), lastVisitISO: d(15), totalSpent: 3020, visitCount: 18, skinNotes: "Eczema flare-ups — keep products fragrance-free." },
  { id: "cl-17", firstName: "Monica", lastName: "Espinoza", email: "monica.esp@gmail.com", phone: "(661) 555-7714", tags: ["New"], homeLocation: "valencia", joinedISO: d(18), lastVisitISO: d(10), totalSpent: 195, visitCount: 1, skinNotes: "Came in for lymphatic drainage — marathon training recovery." },
  { id: "cl-18", firstName: "Yasmin", lastName: "Farahani", email: "yasmin.f@gmail.com", phone: "(818) 555-6698", tags: ["VIP", "Member"], homeLocation: "toluca", joinedISO: d(700), lastVisitISO: d(2), totalSpent: 9480, visitCount: 44, birthday: "September 19", skinNotes: "Radiance Elite. Alternates Signature Facial and Procell monthly." },
];

export const members: Member[] = [
  { id: "mem-01", clientId: "cl-01", planId: "plan-radiance", status: "active", startedISO: d(320), renewsISO: formatISO(subDays(new Date(), -9), { representation: "date" }) },
  { id: "mem-02", clientId: "cl-02", planId: "plan-glow", status: "active", startedISO: d(280), renewsISO: formatISO(subDays(new Date(), -14), { representation: "date" }) },
  { id: "mem-03", clientId: "cl-05", planId: "plan-glow", status: "active", startedISO: d(200), renewsISO: formatISO(subDays(new Date(), -3), { representation: "date" }) },
  { id: "mem-04", clientId: "cl-09", planId: "plan-scalp", status: "active", startedISO: d(430), renewsISO: formatISO(subDays(new Date(), -18), { representation: "date" }) },
  { id: "mem-05", clientId: "cl-11", planId: "plan-glow", status: "past-due", startedISO: d(275), renewsISO: d(4) },
  { id: "mem-06", clientId: "cl-16", planId: "plan-glow", status: "paused", startedISO: d(365), renewsISO: formatISO(subDays(new Date(), -30), { representation: "date" }) },
  { id: "mem-07", clientId: "cl-18", planId: "plan-radiance", status: "active", startedISO: d(540), renewsISO: formatISO(subDays(new Date(), -6), { representation: "date" }) },
  { id: "mem-08", clientId: "cl-14", planId: "plan-scalp", status: "active", startedISO: d(160), renewsISO: formatISO(subDays(new Date(), -21), { representation: "date" }) },
];

export const intakeForms: IntakeForm[] = [
  { id: "if-01", clientId: "cl-01", name: "New Client Intake & Skin History", uploadedISO: d(540), fileType: "PDF", sizeKB: 412 },
  { id: "if-02", clientId: "cl-01", name: "Advanced Treatment Consent — Procell", uploadedISO: d(210), fileType: "PDF", sizeKB: 188 },
  { id: "if-03", clientId: "cl-07", name: "New Client Intake & Skin History", uploadedISO: d(890), fileType: "PDF", sizeKB: 395 },
  { id: "if-04", clientId: "cl-07", name: "Series Agreement — 10 Sessions", uploadedISO: d(120), fileType: "PDF", sizeKB: 156 },
  { id: "if-05", clientId: "cl-08", name: "Post-Operative Care Intake", uploadedISO: d(45), fileType: "PDF", sizeKB: 505 },
  { id: "if-06", clientId: "cl-08", name: "Physician Clearance — Dr. Salzman", uploadedISO: d(44), fileType: "JPG", sizeKB: 1240 },
  { id: "if-07", clientId: "cl-06", name: "New Client Intake & Skin History", uploadedISO: d(12), fileType: "PDF", sizeKB: 402 },
  { id: "if-08", clientId: "cl-12", name: "New Client Intake & Skin History", uploadedISO: d(6), fileType: "PDF", sizeKB: 398 },
];

export const clientNotes: ClientNote[] = [
  { id: "note-01", clientId: "cl-01", authorStaffId: "staff-carolina", dateISO: d(4), text: "Skin looking noticeably brighter after switching to the retinol night cream. Keep gold mask monthly; revisit melasma plan in fall." },
  { id: "note-02", clientId: "cl-01", authorStaffId: "staff-carolina", dateISO: d(64), text: "Discussed upgrading to Radiance Elite — done. Prefers 5pm appointments after work." },
  { id: "note-03", clientId: "cl-07", authorStaffId: "staff-carolina", dateISO: d(1), text: "Session 6 of 10 complete. Texture on forehead fully smoothed out. She referred two friends this month — send the boutique candle as a thank-you." },
  { id: "note-04", clientId: "cl-08", authorStaffId: "staff-marisol", dateISO: d(3), text: "Week 5 post-op: swelling down significantly, fibrosis softening on left flank. Cleared for medium pressure next visit." },
  { id: "note-05", clientId: "cl-05", authorStaffId: "staff-marisol", dateISO: d(6), text: "Flare-up fully calmed since switching to Hale & Hush line. Do not reintroduce enzymes before August." },
  { id: "note-06", clientId: "cl-12", authorStaffId: "staff-carolina", dateISO: d(5), text: "Bridal consult: wedding October 17. Plan = Derma Glow now, Signature monthly, final glow facial 4 days before the wedding. No actives after Oct 1." },
];

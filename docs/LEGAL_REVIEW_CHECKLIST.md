# Legal Review Checklist — indiiOS Pre-Launch

> **Status:** Blocked on attorney sign-off. All items below must be resolved
> before the app goes live. The scaffolds are in
> `src/modules/legal/pages/LegalPages.tsx`.
>
> **What type of attorney:** You need a startup/tech attorney with music
> industry experience (or two: one tech, one entertainment). Firms like
> Cowan DeBaets (music-focused), Volunteer Lawyers for the Arts, or a
> general startup firm (Clerky, Cooley, Gunderson) can cover the tech side.
> Budget: $2,000–$8,000 for a standard SaaS ToS/Privacy bundle; the
> music-specific clauses (§4, §5, §7 below) may add cost.

---

## Terms of Service — Open Items

Located at: `TermsOfService()` in `LegalPages.tsx`

| # | Section | What needs to be written | Why it matters |
|---|---------|--------------------------|----------------|
| 1 | §4 Intellectual Property | Who owns AI-generated content? Platform vs. user. Also clarify that users keep ownership of original music they upload. | US Copyright Office currently does not protect purely AI-generated works. Your ToS needs to define this before a dispute arises. |
| 2 | §5 AI-Generated Content | License grant for Gemini outputs: can users resell AI images/videos? Are there restrictions? | Google's Gemini ToS imposes downstream restrictions. Your ToS must flow those down to users. |
| 3 | §7 Distribution Services | Terms governing DSP delivery: takedown SLAs, exclusivity, split sheet enforceability, what happens if a release is rejected. | If indiiOS distributes to Spotify/Apple on behalf of artists, you have a sub-distribution relationship. That needs explicit terms. |
| 4 | §9 Limitation of Liability | Standard disclaimer + indemnification cap. Cover: distribution errors, AI output inaccuracies, payment processing failures. | Without this clause, you're exposed to uncapped liability for platform errors. |
| 5 | §10 Governing Law | Which state's law governs? Arbitration clause or litigation? Class action waiver? | Michigan is likely (company is IndiiOS LLC, Detroit area). Arbitration clauses can significantly limit legal exposure. |
| 6 | Effective Date | Replace `[DATE_TBD]` with actual launch date | Legal documents must have a valid effective date. |

---

## Privacy Policy — Open Items

Located at: `PrivacyPolicy()` in `LegalPages.tsx`

| # | Section | What needs to be written | Why it matters |
|---|---------|--------------------------|----------------|
| 7 | §6 Data Retention | How long do you keep: user accounts after deletion, uploaded audio/video files, analytics data, split sheets and contracts? | GDPR Article 5(1)(e) requires specifying retention periods. No defined period = potential regulator fine. |
| 8 | Effective Date | Replace `[DATE_TBD]` with actual launch date | Same as above. |
| 9 | GDPR Data Controller registration | If serving EU users, you may need to register as a Data Controller with the relevant supervisory authority | Required for GDPR compliance in the EU. |

---

## DMCA Policy — Open Items

Located at: `DMCAPolicy()` in `LegalPages.tsx`

| # | Item | Action required |
|---|------|-----------------|
| 10 | `[DESIGNATED_AGENT_NAME]` | Name the person (or registered agent) at IndiiOS LLC who will receive DMCA notices |
| 11 | `[REGISTERED_ADDRESS]` | Provide the company's official registered address |
| 12 | `[PHONE_NUMBER]` | Provide a contact phone number for the designated agent |
| 13 | Copyright Office registration | **Register your DMCA agent** at https://www.copyright.gov/dmca-directory/ ($6/yr). Required to qualify for safe harbor under 17 U.S.C. § 512. |

---

## One-Time Business Tasks (Not Attorney-Dependent)

These can be done by the founding team without a lawyer:

| # | Task | How |
|---|------|-----|
| 14 | Register DMCA agent with Copyright Office | copyright.gov/dmca-directory — $6/year, takes 10 minutes |
| 15 | Set up `legal@indiios.com`, `privacy@indiios.com`, `dmca@indiios.com` email aliases | Forward to whoever handles legal inquiries |
| 16 | Add real Stripe price IDs to Cloud Functions env | `firebase functions:config:set stripe.price_pro_monthly=price_xxx` etc. |
| 17 | Set `VITE_FIREBASE_APP_CHECK_KEY` in production | Required for production (currently optional) — prevents API abuse |

---

## How to Close This Checklist

When each item above is resolved:
1. Update `LegalPages.tsx` — replace `[ATTORNEY_REVIEW_REQUIRED]`, `[DATE_TBD]`,
   `[DESIGNATED_AGENT_NAME]`, `[REGISTERED_ADDRESS]`, `[PHONE_NUMBER]` with
   the actual finalized text
2. Remove the amber "⚠️ Draft" warning banner from each legal page component
3. Check the item off this list

Once all 17 items are checked, the legal P0 blocker is cleared.

# Dialer batch plan (Bug 7 + 3.4, 3.5, 3.6, 3.8 + Edit contact in dialer)

## Clarifications locked in

- **Skip:** Just advance – keep them in queue (do NOT remove from queue on skip; can go back with Previous). Remove from queue only after a **call** is logged.
- **Bulk opener:** Company only – "Set opener for everyone at this company" (no multi-select in this batch).
- **Wrong number (both gone):** When both phone and mobile are cleared, auto-pause the contact from the dialer until they have a number again.

---

## 1. Bug 7 – Treat as done

- **notes-clarified.md:** Change Bug 7 status from `**NEXT**` to `**DONE**`.
- **QA.md:** Update Bug 7 section to "DONE (verified)" or keep as short verification checklist.

No code changes.

---

## 2. Feature 3.4 – Group by company in dialer session

**Spec:** Same company back-to-back; order (1) never-called / stalest first, (2) then group by company.

**Where:** [src/components/dialer/power-dialer.tsx](src/components/dialer/power-dialer.tsx) – `getFilteredContacts()`.

**Change:** After existing sort (AAA, then due date), add stable secondary sort by `company_id`, then tie-break by `id`.

---

## 3. Feature 3.5 – Bulk add opener (company only)

**Spec:** Add the same opener text to all contacts at a company.

- **API:** Bulk update `direct_referral_note` by company ID (or by list of contact IDs for that company).
- **UI:** On the **company page** (or company detail), add action: "Set opener for everyone at this company" – one opener text applied to all contacts in that company.

No multi-select from contacts list in this batch.

---

## 4. Feature 3.6 – Wrong number: remove phone; contact stays; if both gone, pause

**Spec:** Wrong number → clear that phone only; do not remove from pool. If **both** numbers end up cleared, auto-pause until they have a number again.

- **Current:** [src/hooks/use-calls.ts](src/hooks/use-calls.ts) already clears mobile or phone by `phone_used`; contact not paused.
- **Add:** After applying wrong_number update, if both `phone` and `mobile` are (or would be) null, set `dialer_status = "paused"` and e.g. `dialer_pause_reason_code = "no_phone"` so they leave the pool until a number is added.
- **QA:** Verify wrong-number clears the used number and contact stays in pool when one number remains; verify auto-pause when both are cleared.

---

## 5. Feature 3.8 – Same person 2–3x in session

**Spec:** Prevent the same contact from being served again after they’ve been **called** (not after skip).

- **Dedupe at start:** In [power-dialer.tsx](src/components/dialer/power-dialer.tsx), before `startSession(filteredContacts, ...)`, dedupe by `contact.id`.
- **Remove from queue after call only:** In [call-controls.tsx](src/components/dialer/call-controls.tsx), after successful `logCall.mutateAsync` in **handleSaveCall** (not in handleSkip), call `removeContactFromQueue(currentContact.id)`. Do not call `nextContact()` after that – `pruneQueue` already advances. In **handleSkip**, keep current behavior (no remove, just `nextContact()`).

---

## 6. Edit contact in dialer (NEW)

**Spec:** In the dialer, user can edit the current contact’s **first name**, **both phone numbers** (mobile + direct), and **email**, and have changes saved so they persist.

**Current state:** [src/components/dialer/contact-panel.tsx](src/components/dialer/contact-panel.tsx) shows name, mobile, phone, email as read-only (with copy). Cadence and opener are already editable and saved via `useUpdateContact` / referral hooks.

**Implementation:**

- **UI:** In the dialer contact panel, make **first name**, **mobile**, **phone**, and **email** editable (e.g. inline edit on click, or a small “Edit” toggle that switches those fields to inputs). Allow saving (e.g. Save button or blur/Enter).
- **Persistence:** On save, call `useUpdateContact` with `{ first_name?, phone?, mobile?, email? }`. Handle empty string as null for optional fields.
- **Store sync:** After a successful update, update the contact in the dialer store so the current contact and queue reflect the new data (e.g. patch `currentContact` and the matching contact in `queue` in [dialer-store.ts](src/stores/dialer-store.ts)). Option: add `updateCurrentContact(partial)` that patches both `currentContact` and the corresponding queue item by id.
- **Scope:** First name + both numbers + email only in this batch (last name / other fields can be a follow-up if needed).

---

## Implementation order

1. Docs: Bug 7 → DONE in notes-clarified + QA.md  
2. 3.8: Dedupe queue + remove from queue after call (not after skip)  
3. 3.4: Group by company in `getFilteredContacts()`  
4. 3.6: Add auto-pause when both numbers cleared; QA  
5. **Edit contact in dialer:** Contact panel editable fields + store sync  
6. 3.5: Bulk opener API + company page “Set opener for everyone at this company”

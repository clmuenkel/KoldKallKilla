# KoldKallKilla – QA checklist

Run when verifying bug fixes and regressions. Check off as you go: change `- [ ]` to `- [x]` when done.  
**Done bugs (1–7, 9–15, 17)** and **Dialer features (3.4, 3.5, 3.6, 3.8)** have steps below; **skipped (8, 16, 18)** have no QA.

---

## Bug 1 – Personal connector editable on contact page

- [ ] Open a contact page (not in dialer).
- [ ] Find the personal connector / referral field.
- [ ] Edit it and save; confirm the new value persists after refresh.
- [ ] Confirm it’s visible and not cluttered (same concept as in dialer).

---

## Bug 2 – New contacts correctly added to cadence

- [ ] Add a new contact (or import contacts).
- [ ] Confirm they get a `next_call_date` or are eligible for the dialer pool (in pool, due, or scheduled).
- [ ] Confirm they show up in the dialer when filters allow (e.g. stage, cadence) and don’t get stuck “unscheduled” when they should be in rotation.

---

## Bug 3 – Completed / session progress updates in real time

- [ ] Start a dial session; note “X completed / Y remaining” (or equivalent).
- [ ] Log a call (outcome + next); confirm the completed count and progress bar update **without** full page refresh.
- [ ] Confirm the same in session summary, mini bar, or any other place that shows session progress.

---

## Bug 4 – Call session logged correctly

- [ ] Start a session, make one or more calls, log outcomes (e.g. connected, voicemail, meeting).
- [ ] End or pause session; open session history or session detail.
- [ ] Confirm this session appears with correct call count and outcomes (and meetings if any).
- [ ] Confirm individual calls show in call history for the contact(s).

---

## Bug 5 – Cadence changeable from contact page and dialer

- [ ] **Contact page:** Open a contact; change cadence (e.g. next call date or cadence days); save. Confirm it saves and shows on the contact and in dialer when they’re in pool.
- [ ] **Dialer:** With a contact in the queue/card, change cadence (or next call date); confirm it saves and reflects on the contact and in subsequent dialer loads.

---

## Bug 6 – Each call has outcome and history

- [ ] Make a call and set an outcome (e.g. connected, voicemail, meeting, not interested).
- [ ] Open that contact’s call history / activity; confirm the call appears with the correct outcome and time.
- [ ] Confirm no “ghost” calls (calls with no outcome) or missing entries for calls you actually logged.

---

## Bug 7 – Notes and history syncing (DONE – verified)

- [ ] Add or edit a note on a contact (from contact page or dialer).
- [ ] Open the same contact elsewhere (e.g. dialer if you added from contact page, or vice versa); confirm the note appears.
- [ ] Confirm history/timestamped notes stay in sync (no “only in one place” behavior).

---

## Bug 9 – Company notes in dialer

- [ ] In dialer, add a note that includes `@company` content.
- [ ] Confirm the company note saves (no silent fail).
- [ ] If contact has no company, confirm a warning toast and that the personal note still saves.
- [ ] If save fails, confirm an error toast (not only console).

---

## Bug 10 & 11 – EST/CST and queue completion

- [ ] With **EST** contacts in the pool, confirm they appear under the Eastern timezone bucket (not Central).
- [ ] With **CST** contacts, confirm they appear under Central.
- [ ] Start a session with EST contacts in the queue.
- [ ] Make calls and complete/log outcomes; confirm queue completion (e.g. “X completed / Y remaining”) updates correctly for EST contacts, same as for CST/MST.
- [ ] Confirm “due today” behaves correctly for your timezone (no wrong-day inclusion/exclusion).

---

## Bug 12 – Notes “from current session” only when current

- [ ] Add a note in a previous session (or an older note exists on a contact).
- [ ] In dialer or contact view, confirm notes are not incorrectly labeled “from current session” when they’re from an older session.
- [ ] Only notes actually created in the current session should show as current-session.

---

## Bug 13 – Create contact not “Not authenticated”

- [ ] Create a new contact (from contacts list, company page, or wherever create exists).
- [ ] Confirm the flow completes and you do **not** see “Not authenticated” (or equivalent auth error) when you’re logged in.
- [ ] Confirm the contact is created and visible in the list / company.

---

## Bug 14 – Skip vs completed; “Left” = total − position

- [ ] Start a session with several contacts. Note total (e.g. 10) and “Left” or “remaining.”
- [ ] Skip one contact (no call logged); confirm “Left” = total − current position (e.g. 9 remaining when you’re at position 1 and skipped).
- [ ] Confirm skipped contacts do **not** count as “completed” or “called” in session stats or in “called today” logic (they shouldn’t be excluded from pool as if they were called).

---

## Bug 15 – Meetings not in Qualified; day behind

- [ ] Book a meeting for a contact (from dialer or contact page).
- [ ] Confirm that contact **does not** appear in Qualified anywhere (contact list, dialer, dashboard).
- [ ] Confirm the meeting date shows the **correct calendar day** (e.g. Tuesday, not Monday when scheduled for Tuesday).

---

## Bug 17 – Meetings in session history

- [ ] Start a dial session (queue with at least one contact).
- [ ] During that session, book a meeting for a contact (e.g. from Meeting dialog in dialer).
- [ ] End or view session history.
- [ ] Confirm that session shows the meeting (e.g. “meetings booked” or equivalent updated).

---

## 3.4 – Group by company in dialer session

- [ ] Start a dial session with contacts from multiple companies (and some from the same company).
- [ ] Confirm contacts from the **same company** appear **back-to-back** in the queue (grouped together).
- [ ] Confirm priority order is unchanged: AAA first, then stalest/due first, then grouped by company.

---

## 3.5 – Bulk add opener (company)

- [ ] Open a **company** detail page that has at least two contacts.
- [ ] Click **"Set opener for everyone"** and enter opener text (e.g. "John Smith told me to reach out").
- [ ] Save; confirm toast says opener was set for N contacts.
- [ ] Open one of those contacts (dialer or contact page); confirm the opener text appears.

---

## 3.6 – Wrong number: remove phone, contact stays in pool

- [ ] In dialer, call a contact and mark outcome **Wrong #** (and log the call).
- [ ] Confirm the **number you used** (mobile or direct) is cleared on that contact (e.g. open contact page or next time they appear – that number is gone).
- [ ] Confirm the contact **remains in the dialer pool** (not paused); they can still be served if they have another number.

---

## 3.8 – Same person 2–3x in one session

- [ ] Start a dial session with several contacts.
- [ ] Log a **call** for one contact (outcome + save). Confirm that contact is **removed from the queue** (no longer in upcoming list; progress updates).
- [ ] Skip another contact (log as skipped). Confirm they are also **removed from the queue**.
- [ ] Confirm you **cannot** get the same contact again in that session (e.g. they don’t appear in the list after being called/skipped).
- [ ] Start a new session; confirm the queue has **no duplicate contact IDs** (same person only once).

---

## Skipped (no QA)

- **Bug 8** – Not all notes showing on contact page  
- **Bug 16** – Contact type not being updated from “fresh” etc.  
- **Bug 18** – MEETING PAGE NOT WORKING  

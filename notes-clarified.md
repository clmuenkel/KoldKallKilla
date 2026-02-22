# KoldKallKilla – Clarified Specs (from conversation)

All sections below have product decisions locked in. Use this for implementation.

---

## 1. Cadence & "See each person's cadence"

| # | Item | Decision / spec |
|---|------|------------------|
| 1 | Way to see each person's cadence clearly | **Contact page + dialer page.** Timeline-style, up top, not cluttered. No dedicated cadence view. |
| 2 | Cadence vs normal call different in UI/analytics | **UI only:** small signifier (e.g. a light) for cadence call vs normal call. **Analytics:** no change – don't split or weight by cadence vs normal. |
| 3 | Serve never-called first; AAA first always | **AAA** always first. Then **prioritize never-called** (show first, but still show others). Then **prioritize "called least / longest since last call"** – ordering: never-called first, then by "longest time since last contact" (stalest first). |
| 4 | Mid-dial: remove certain timezones after hours | **Session-only.** Remove timezone mid-dial for the rest of that session. No persistence (you might want to call them at 5:30 or 6 another day). |
| 5 | Find and keep track of people taken out of pool; add back if needed | Same as "removed from pool." **Need:** ability to search/find people removed from pool and add them back. (Verify if this already exists.) |
| 6 | Intelligently schedule prospects (10 calls / 2–3 biz days, 600/day cap) | **Deferred.** Revisit later. |
| 7 | Design: table + prescheduled, rollover, non-cadence counts for day | Keep as design note; no decision yet (tied to #6). |
| 8 | Design: "just call → 2 days later; run out → new people; never-called in circulation" | Implement via #3 (prioritize never-called, then longest-since-last). |
| 9 | Referral: cadence ~every week and a half; no jurisdiction; send me email; AI screener (replace busy) | **No jurisdiction** = remove from pool. **Send me email** = same bucket as Interested/Follow-up (not a separate analytics outcome). **Referral** = set cadence to ~week and a half. **AI screener** = replace "busy" option. |
| 10 | How does ranking work with/without cadence / call someone without cadence randomly | Answer from code later; no product decision. |

---

## 2. Bugs

| # | Status | Item | Decision / spec |
|---|--------|------|------------------|
| 1 | **DONE** ✓ | Cannot edit personal connector in contact page; only in dialer | **Fix:** Add an editable "personal connector" field on the contact page (same concept as in dialer). Keep it visible and not cluttered. |
| 2 | **DONE** ✓ | All new contacts were not correctly added to cadence | Fix; no product decision. |
| 3 | **DONE** ✓ | Completed does not accurately update; page needs refresh for real-time changes | Fix; no product decision. |
| 4 | **DONE** ✓ | Call session not logged correctly sometimes; need to understand why | Fix; no product decision. |
| 5 | **DONE** ✓ | Can't change call cadence (from contact/dialer) | Fix; no product decision. |
| 6 | **DONE** ✓ | Double-check: each call updated and saved with outcome and has history | Fix; no product decision. |
| 7 | **DONE** ✓ | Notes and history notes not syncing | **Spec:** Notes and history should be synced together. Verify if already solved. |
| 8 | **SKIPPED** | Not all notes showing on contact page | Skipped for now. |
| 9 | **DONE** ✓ | Company notes sometimes don't save in dialer (Select Quote, HarboreOne, etc.) | Fix; check all. |
| 10 | **DONE** ✓ | EST contacts being added to CST in dialer; "why EST for a bunch of PST contacts?" | Fix; no product decision. |
| 11 | **DONE** ✓ | Call queue not completing for EST but does for CST and MST (DEBUG) | Fix; no product decision. |
| 12 | **DONE** ✓ | Notes show "from current session" even when older (DEBUG) | Fix; no product decision. |
| 13 | **DONE** ✓ | Create contact showing "Not authenticated" (DEBUG) | Fix; no product decision. |
| 14 | **DONE** ✓ | Skipping: Left = TOTAL − current position; skip not count as "called" or "completed" | Already specified; implement as stated. |
| 15 | **DONE** ✓ | Meetings: people in Qualified when they shouldn't be; meetings always a day behind | **Spec:** If someone has a meeting booked, they must appear in the **Meeting** section, not in **Qualified**. Fix "always a day behind" in implementation. |
| 16 | **SKIPPED** | Contact type not being updated from "fresh" etc. | Skipped for now. |
| 17 | **DONE** ✓ | Meetings not updating in session history | Fix; no product decision. |
| 18 | **SKIPPED** | MEETING PAGE NOT WORKING | Skipped for now. |

---

## 3. Features – Dialer & session

| # | Status | Item | Decision / spec |
|---|--------|------|------------------|
| 1 | **Skipped** | Easier way to end call | Current behavior is fine. |
| 2 | — | Tag contact as "pink" (find new number) | **Spec:** Visual tag only = "need to find a new number." **Priority:** Nice to have later; skip for now. |
| 3 | — | Google Voice inside system (no new tab) | **Priority:** Nice to have later; skip for now. |
| 4 | **DONE** ✓ | Group by company in dialer session | **Spec:** Group contacts so you call everyone from the **same company together**. Company order (A–Z or other) doesn't matter. **Constraint:** Don't break "serve never-called / longest-since-last first" – ordering: (1) never-called / stalest first, (2) then group those into companies so same company is back-to-back. |
| 5 | **DONE** ✓ | Bulk add opener context | **Spec:** Add the **same** opener text to **many contacts at once** (bulk). Company-level "Set opener for everyone at this company" implemented. |
| 6 | **DONE** ✓ | Wrong numbers | **Spec:** When marked "wrong number," **remove that phone number** from the contact (so they need a new number). **Do not** remove the person from the pool; contact stays. |
| 7 | **Skipped** | Next / clicking someone later in list just to look | Skipped. |
| 8 | **DONE** ✓ | Same person called 2–3x in one session | **Spec:** **Prevent** the same contact from being served again in the same session after they've been called (so they don't appear 2–3x in one session). Dedupe at session start + remove from queue after call/skip. |
| 9 | — | Task connected to person in dialer | No decision yet; implement when we do dialer tasks (show and/or create). |
| 10–14 | **Skipped** | In call + Next/Skip; no outcome logged; log after session; skip in analytics; connected+today skipped | Skipped per conversation. |
| — | — | Rest of Dialer section | Implement as written: search faster, auto-update notes/openers, remove 800ms save popup, pick-up/connected options (Referral, Hang up, Not interested, Retired, Wrong number, Meeting, Interested/Follow up, AI screener; Connected → meeting, hang up, email sent, call me later), remove from pool in session (contact or company; no time limit), edit name/delete or change numbers in dialer, Next saves outcome and advances, show "have meeting" in dialer, pause session pauses timer, don't re-serve same-day contacts when resuming, Enter logs call, Cmd+Click direct number to call, auto-show history + new note input, create task from notes adds person, read whole notes (not cut off), edit name and numbers in dialer and contact page. **DONE:** Quick number search for callbacks. Add previous analytics from before CRM; row-by-row notes/history for context. |

---

## 4. Features – Notes, BANT, UI

| # | Item | Decision / spec |
|---|------|------------------|
| 1 | Notes not shown easily; replace with BANT | **No BANT.** Make notes easier to see/use (no BANT fields or replacement). |
| 2 | Have to scroll down to give call outcome; replace with BANT | **No BANT.** Improve outcome UX so you don't have to scroll down (e.g. move outcome selector up or make it sticky). |
| 3 | AI screener option; replace "busy" | **Done.** Ignore. |
| 4 | Show phone number and email on contact page | **Done.** Ignore. |
| 5 | Expand notes if too big | **Spec:** Notes live in a small section (e.g. on the side). That section stays the same size; **allow scrolling inside it** so you can scroll through long notes within that box. |
| 6 | Making task in notes adds the person to it (like quick tasks in dialer) | Implement: creating a task from the notes area auto-adds the contact to that task. |

---

## 5. Features – Contacts & companies

| # | Item | Decision / spec |
|---|------|------------------|
| 1 | Adding contact: select company from already added companies | **Spec:** When creating a contact, **company is required.** User can select from existing companies (search/dropdown) or create a new one. |
| 2 | Adding contact via company page connects to company without re-entering company info | **Spec:** On a company page, "Add contact" creates a contact **auto-linked to that company**; no need to re-enter company name/details. |
| 3 | Add person to task easier; search for contact instead of long scroll | **Spec:** When adding people to a task (or meeting), use **search** to find the contact and add them – no long scroll list. |
| 4 | All tasks, meetings, creatable things: ability to add contacts (like Outlook) | **Spec:** **Multiple contacts** per task and per meeting (like Outlook attendees). User can search, find a person, and add them; repeat to add more. Same idea for other creatable things where "who is this for" applies. |

---

## 6. Features – Meetings

| # | Item | Decision / spec |
|---|------|------------------|
| 1 | Add people to meeting; from dialer, meeting connects to person and is visible | **Spec:** When you create a meeting from the dialer, **auto-add** that contact to the meeting. Meeting **auto-shows** for that person and **for the company**. Default **meeting name = company name** (or tie it to the company). Fix current behavior where it's not showing under company/person. |
| 2 | Create meetings from meeting creator and add people; show on contact page and in dialer | Implement as stated; show on contact page and in dialer. |
| 3 | Meetings connected to company | **Spec:** Each meeting is linked to **one company**. |
| 4 | Auto-add task due the day before meeting (send summary and info to team) | **Spec:** Create **one task** per meeting, due the day before, **visible to all attendees** (not one task per person). |
| 5 | Meeting page: popup scrollable and resizable | Implement when you click a meeting. |
| 6 | Meetings tab: easy to track, edit, seamless; enterprise-level patterns | Implement as stated. |
| 7 | Brainstorm: collaboration with boss (notes, status, next steps) | **Spec:** Notes and status already exist. **Add:** ability to **create tasks from the meeting UI**. Flow: have meeting → add notes → create a task from those notes (so the task is tied to the meeting and the notes). |

---

## 7. Features – Analytics & metrics

| # | Item | Decision / spec |
|---|------|------------------|
| 1 | What outcome counts as "answer"? | **Spec:** "Answer" = **connected** (human actually talked – e.g. you pressed the connected/pickup option). |
| 2 | Sessions: one session start/stop, not 30-min intervals | **Spec:** **One logical session** per "I started dialing / I stopped." No 30-minute windows. |
| 3 | Per session: time when picked up, time when meeting set | Implement; store and show per session. |
| 4 | Total session time; averages (e.g. calls per minute) | Implement as stated. |
| 5 | Timelines per session (answer + blurb + actions) as page when clicking session | Implement; session detail page shows timeline of answers with notes blurbs and actions (e.g. "meeting set"). |
| 6 | Timezone and connected results: what info for metrics? | To be defined in implementation; use for metrics where relevant. |
| 7 | Important metrics for each day's session in recent sessions (before clicking in) | Implement; show day-level metrics in recent sessions list. |
| 8 | "Daily Trend (14 days)" | **Spec:** User can **pick range**: e.g. one day ("how did I do that Monday?"), a week, two weeks, a month. Not fixed to 14 days. |
| 9 | Explain each analytic in detail and how it's figured out | Documentation / in-app help; do in implementation. |
| 10 | Percent rates: 2 decimal places | Implement everywhere we show %. |
| 11 | Get analytics from enterprise-level CRM first; then plan | **Spec:** Use **Salesforce** as reference. In **planning phase**, ask more questions to define what you want. |
| 12 | Stats per individual session (even if same day) | Implement as stated. |
| 13 | Stats per calendar day with a selection | Implement; user can select a calendar day and see stats for that day. |
| 14 | Clean up analytics in general | Implement during analytics work. |
| 15 | Streak: business days only; fix "one day" | **Spec:** Streak = **business days only**. Fix current bug (e.g. shows "one day" when it shouldn't). |

---

## 8. Features – Openers & misc

| # | Item | Decision / spec |
|---|------|------------------|
| 1 | Opener context: what it is, how set/updated, doesn't show when edited | **Spec:** **Per contact**, with **bulk for company**: you can set opener for one contact, or for everyone at a company. You can also add **one extra line per contact** on top of company opener. **UI:** When adding/editing opener context, show **two actions**: "Add for this person" and "Add for everyone in the company." Fix bug where edited opener doesn't show. |
| 2 | Auto-add opener as random person in employee queue (not C-suite / contact-center) | **Spec:** When auto-filling opener, pick someone from the company's employees. **Prefer:** not C-suite, not contact-center, and ideally not IT/similar. **If we can't** (e.g. no role data), fall back to any employee. Plan in implementation. |
| 3 | Groom non-contacted list before adding more | Skipped. |
| 4 | 1000 contacts (Supabase) workaround for metrics/dashboard | Skipped. |
| 5 | Automate/send emails through CRM; AI follow-ups, draft emails, track meetings | Skipped. |

---

## 9. Questions / Explain

| # | Item | Decision / spec |
|---|------|------------------|
| 1 | How does cold call completion work? Setting outcome and "next" doesn't complete it? | Answer in implementation; ensure "Next" saves outcome and marks call complete. |
| 2 | How do notes work? Do you see notes from previous sessions? | Answer in implementation; ensure notes are per-contact and visible across sessions. |
| 3 | What happens if you finish with no outcome logged? | Handled in Dialer section (skipped; implement as reasonable default when we build). |
| 4 | How is cadence stored? | Already documented: `next_call_date` + `cadence_days` on contact; no separate table. |
| 5 | How does ranking work with/without cadence? | Answer in implementation when building "never called / longest since last" and company grouping. |
| 6 | Good cadence for all contacts: how many calls, when to cycle out/in | Revisit in planning; ask more questions then. |

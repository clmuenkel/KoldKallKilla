# KoldKallKilla – Bugs, Features & Notes

> **How to use:** Work in batches (e.g. 5–15 items). Order below is by theme; priority is not set.

---

## Cadence & "See each person's cadence"

- **Feature:** Way to see each person's cadence clearly (easy for them to understand).
- **Feature:** Cadence request and "normal call" should be different (e.g. in UI/analytics).
- **Feature:** For cadence or no cadence, serve people (after AAA) that have **never been called** first, so no one is missed. AAA first always.
- **Feature:** Mid-dial session: ability to remove certain timezones if after hours, without breaking flow or session analytics.
- **Feature:** Find and keep track of all people taken out of the pool; ability to add them back if needed.
- **Question:** How does ranking work when calling with vs without cadence? How does cadence behave if you call someone without cadence randomly?
- **Question:** Can we intelligently schedule prospects (e.g. ~10 calls every 2–3 business days) within a cap (e.g. 600/day)? Add prospects and have them cadenced without manually fitting constraints.
- **Design:** Cadence today: `next_call_date` + `cadence_days` on contact; no separate cadence table. Consider: table + prescheduled people; missed = rolled over if under 600 next day; non-cadence calls still count for that day.
- **Design:** "Just call people → they get scheduled 2 days later; when I run out I call new people." Ensure everyone gets called over a week; only call fresh/new people; way to get "never called" people in circulation. (Ask Claude for simple approach with no holes.)
- **Referral:** Referral outcome should set cadence to ~every week and a half. Add: no jurisdiction (remove them), "send me email," AI screener (replace "busy").

---

## Bugs

- Cannot edit personal connector in contact page; only in dialer.
- All new contacts were not correctly added to cadence.
- Completed does not accurately update; page needs refresh for real-time changes.
- Call session not logged correctly sometimes; need to understand why.
- Can't change call cadence (from contact/dialer).
- Double-check: each call is updated and saved with outcome and has history (right now there may be none).
- Notes and history notes are not syncing; need to sync and define behavior.
- Not all notes showing on contact page (maybe only call notes); verify.
- Company notes (e.g. Select Quote Insurance, HarboreOne) sometimes don't save in dialer; check all.
- EST contacts being added to CST in dialer; also "why EST for a bunch of PST contacts?".
- Call queue not completing for EST but does for CST and MST (DEBUG).
- Notes show "from current session" even when older (DEBUG).
- Create contact showing "Not authenticated" (DEBUG).
- Skipping someone should reduce "Left" in dialer: Left = TOTAL − current position (e.g. called 50, skipped many, at 103 → Left = TOTAL − 103). Skip should not count as "called" or "completed."
- Meetings: people in "Qualified" when they shouldn't be; meetings always a day behind.
- Contact type not being updated from "fresh" etc.
- Meetings not updating in session history.
- MEETING PAGE NOT WORKING.

---

## Features – Dialer & session

- Search (company, contact, etc.) letter-by-letter is slow; make it faster.
- Auto-update when adding notes or openers during dialing.
- Easier way to end call.
- Ability to tag contact as "pink" to find a new number for them.
- Google Voice: run inside system instead of opening in new tab (if possible).
- **DONE:** Quick number search when someone calls back → go to their contact for context.
- In dialer session: group personas to call by company, alphabetically (call all of company 1, then 2, 3, …).
- Bulk add opener context.
- Add previous analytics from before CRM.
- History under notes for immediate context; consider row-by-row layout for notes/history/context.
- Remove 800ms saving popup; save in background.
- Pick-up selection: add options after (wrong number, email, hang up, meeting, follow up, etc.). Connected: add meeting, hang up, email sent, call me later.
- Pick-up options to support: Referral, Hang up, Not interested, Retired, Wrong number, Meeting, Interested/Follow up; AI screener option (replace "busy").
- What to do with wrong numbers (workflow/state).
- Remove contact from dialer pool in session; take contact or company out of pool within dialer; add "remove from pool" with no time limit.
- Edit name in dialer; delete mobile or change numbers from dialer.
- "Next" button should save outcome and advance; edge case: pressing someone later in list just to look.
- Delete mobile or change numbers from dialer.
- Edge case: same person called 2–3x in one dialer session.
- Task connected to person so you can check them in dialer.
- Edge cases: still in call mode but press Next or Skip.
- Behavior when finishing with no outcome logged.
- Show "have meeting" with someone in dialer.
- Pausing dial session should pause the timer.
- When stopping a dial session, don't re-serve contacts already spoken to that day; pick up where you left off. If contact is in both "no cadence" and "cadence" and was already called that day, still don't call again; update their cadence if not toggled. Clarify how cadence is stored.
- Ability to log outcome after dial session ends (e.g. they call back and you couldn't log live).
- Enter key should log the call in dialer.
- Option to press direct number and have it call (e.g. Cmd+Click).
- Skip: should not count as "called" or "completed"; count as "skip." Show e.g. "10 called, 2 skipped." Confirm whether skip goes into call analytics (maybe remove from analytics).
- **Edge case:** Previously called with "connected"; today you skip them — does that count as "connected" for today too?
- Auto-show history with note attached + input to add new note (better than switching tabs).
- Creating task from notes should add the person to it (like quick tasks in dialer).
- Read whole notes in dialer (not cut off).
- Ability to edit name and contact numbers in dialer and contact page.

---

## Features – Notes, BANT, UI

- Notes not shown easily; replace with BANT where appropriate.
- Have to scroll down to give call outcome; replace with BANT.
- Need AI screener option; replace "busy" (4).
- Show phone number and email on contact page (repeated for emphasis).
- Expand notes if too big.
- Making task in notes adds the person to it (like quick tasks in dialer).

---

## Features – Contacts & companies

- Adding contact: select company from already added companies.
- Adding contact via company page connects to company without re-entering company info.
- Feature: add person to task easier; search for contact instead of long scroll.
- All tasks, meetings, creatable things: ability to add contacts (like Outlook) so you know who the thing is for.

---

## Features – Meetings

- Add people to meeting as objects; from dialer, meeting directly connects to person and is visible.
- Create meetings from meeting creator and add people; show on contact page and in dialer.
- Meetings connected to company as well.
- Auto-add task for the person due the day before meeting (send summary and info to team).
- Meeting page: when clicking a meeting, popup should be scrollable and resizable.
- Meetings tab: easy to track, edit, seamless; draw from enterprise-level patterns.
- Brainstorm: what else on meetings tab for you and your boss to collaborate and know next steps?

---

## Features – Analytics & metrics

- Sessions: one session that you start/stop (not 30-min intervals). Per session: time when people picked up, time when meeting set.
- Total session time; averages (e.g. calls per minute).
- Define all important metrics; what outcome counts as "answer"?
- Timelines per session: when there was an answer, blurb of notes, actions (e.g. "meeting set") — as a page when clicking a session in recent sessions.
- Timezone and connected results: what info needed for metrics?
- See important metrics for each day's session in recent sessions (before clicking in).
- "Daily Trend (14 days)": explain meaning.
- Explain each analytic in detail and how it's figured out.
- Percent rates: 2 decimal places.
- Get analytics from enterprise-level CRM first; then plan.
- Stats for each individual session in general (even if same day).
- Stats per calendar day with a selection.
- Clean up analytics in general.
- Streak: business days only; fix (currently shows "one day").

---

## Features – Openers & misc

- What is opener context? How is it set and why isn't it updating? Opener context doesn't show when edited.
- Auto-add opener context as random person in employee queue for company (not C-suite nor contact-center specific); plan.
- Groom "non contacted" list before adding more contacts.
- Still limited to 1000 contacts at a time (Supabase); workaround for metrics/dashboard where all contacts are needed.
- Feature: automate/send emails through CRM.
- Feature: AI to keep up with follow-ups, draft emails, and track meetings to reduce busy work (with questions).

---

## Questions / Explain

- How does cold call completion work? Setting outcome and "next" doesn't complete it?
- How do notes work? Do you see notes from previous sessions?
- What happens if you finish with no outcome logged?
- How is cadence stored? (See Cadence section for current answer.)
- How does ranking work with/without cadence? (See Cadence section.)
- Come up with a good cadence for all contacts: how many calls is too much, when to cycle people out/in (figure out together).

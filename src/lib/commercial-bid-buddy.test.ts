import { test } from "node:test";
import assert from "node:assert/strict";

test("BidBuddy excludes paused, converted, exhausted and closed contacts without changing them", async () => {
  const module = await import("./commercial-bid-buddy").catch(() => null);
  assert.ok(module, "BidBuddy eligibility must be implemented");
  for (const dialer_status of ["paused", "converted", "exhausted"]) {
    const contact = { stage: "fresh", status: "active", dialer_status, total_calls: 0, company_id: null };
    assert.equal(module.isBidBuddyCallable(contact, new Set()), false);
    assert.equal(contact.dialer_status, dialer_status);
  }
  for (const stage of ["won", "lost"]) {
    assert.equal(module.isBidBuddyCallable({ stage, status: "active", dialer_status: "active", total_calls: 0, company_id: null }, new Set()), false);
  }
});

test("BidBuddy respects company pauses and call limits, but accepts fresh contacts", async () => {
  const module = await import("./commercial-bid-buddy").catch(() => null);
  assert.ok(module, "BidBuddy eligibility must be implemented");
  const contact = { stage: "fresh", status: "active", dialer_status: "active", total_calls: 0, company_id: "company-1" };
  assert.equal(module.isBidBuddyCallable(contact, new Set()), true);
  assert.equal(module.isBidBuddyCallable(contact, new Set(["company-1"])), false);
  assert.equal(module.isBidBuddyCallable({ ...contact, total_calls: 10 }, new Set()), false);
  assert.equal(module.isBidBuddyCallable({ ...contact, status: "inactive" }, new Set()), false);
  assert.equal(module.isBidBuddyCallable({ ...contact, tags: ["bidbuddy_identity_review"] }, new Set()), false);
});

test("Session category belongs to the calling session, not overlapping contact tags", async () => {
  const { useDialerStore } = await import("../stores/dialer-store");
  useDialerStore.getState().startSession([], undefined, "commercial_bid_buddy");
  assert.equal(useDialerStore.getState().sessionCategory, "commercial_bid_buddy");
  useDialerStore.getState().pauseSession();
  useDialerStore.getState().resumeSession();
  assert.equal(useDialerStore.getState().sessionCategory, "commercial_bid_buddy");
  useDialerStore.getState().endSession();
  assert.equal(useDialerStore.getState().sessionCategory, null);
  useDialerStore.getState().startSession([]);
  assert.equal(useDialerStore.getState().sessionCategory, null);
  useDialerStore.getState().endSession();
});

test("BidBuddy prioritizes commercial plumbing before other trades and residential", async () => {
  const module = await import("./commercial-bid-buddy").catch(() => null);
  assert.ok(module, "BidBuddy ordering must be implemented");
  const rows = [
    { id: "r", tags: ["bidbuddy_residential_plumbing"], company_name: "A" },
    { id: "o", tags: ["bidbuddy_other_commercial_trade"], company_name: "B" },
    { id: "p", tags: ["bidbuddy_commercial_plumbing"], company_name: "Z" },
  ];
  assert.deepEqual(rows.sort(module.compareBidBuddyContacts).map(c => c.id), ["p", "o", "r"]);
});

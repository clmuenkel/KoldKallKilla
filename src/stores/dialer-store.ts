import { create } from "zustand";
import type { Contact, TimestampedNote } from "@/types/database";

export type CallOutcome = "connected" | "voicemail" | "no_answer" | "ai_screener" | "wrong_number" | "gatekeeper" | "skipped";

// Extended CallDisposition to include new pickup dispositions
export type CallDisposition = 
  // Legacy dispositions
  | "interested_meeting" 
  | "interested_info" 
  | "callback" 
  | "not_interested_fit" 
  | "not_interested_solution" 
  | "not_interested_budget" 
  | "do_not_contact"
  // New pickup dispositions (required for connected calls)
  | "referral"
  | "hang_up"
  | "not_interested"
  | "retired"
  | "wrong_number"
  | "meeting"
  | "interested_follow_up";
export type PhoneType = "mobile" | "office";

export interface ReferralContext {
  type: "direct" | "company" | "manual" | "none";
  name?: string;
  title?: string;
  contactId?: string;
  date?: string;
  note?: string;
}

interface DialerState {
  // Session state
  isActive: boolean;
  isViewingHome: boolean; // True when user pauses session to view home
  sessionStartTime: Date | null;
  sessionDbId: string | null; // Database session ID for linking calls to sessions
  queue: Contact[];
  currentIndex: number;

  // Current call state
  currentContact: Contact | null;
  callStartTime: Date | null;
  callDuration: number;
  isCallActive: boolean;
  selectedPhoneType: PhoneType;

  // Call data
  notes: string;
  timestampedNotes: TimestampedNote[];
  outcome: CallOutcome | null;
  disposition: CallDisposition | null;

  // Referral context for opener
  referralContext: ReferralContext;

  // Qualification during call
  confirmedBudget: boolean;
  confirmedAuthority: boolean;
  confirmedNeed: boolean;
  confirmedTimeline: boolean;

  // Follow-up
  followUpDate: Date | null;

  // UI State
  showOutcomeDialog: boolean;
  awaitingPickupSelection: boolean;

  // Actions
  startSession: (contacts: Contact[], sessionDbId?: string) => void;
  setSessionDbId: (sessionDbId: string | null) => void;
  endSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  setQueue: (contacts: Contact[]) => void;
  pruneQueue: (predicate: (contact: Contact) => boolean) => void;
  removeContactFromQueue: (contactId: string) => void;
  removeCompanyContactsFromQueue: (companyId: string) => void;
  
  startCall: () => void;
  endCall: () => void;
  updateDuration: (seconds: number) => void;

  nextContact: () => void;
  previousContact: () => void;
  skipContact: () => void;
  goToContact: (index: number) => void;

  setNotes: (notes: string) => void;
  addTimestampedNote: (note: TimestampedNote) => void;
  updateTimestampedNote: (index: number, note: TimestampedNote) => void;
  deleteTimestampedNote: (index: number) => void;
  clearTimestampedNotes: () => void;
  
  setOutcome: (outcome: CallOutcome | null) => void;
  setDisposition: (disposition: CallDisposition | null) => void;
  
  setReferralContext: (context: ReferralContext) => void;
  clearReferralContext: () => void;
  
  setQualification: (field: "budget" | "authority" | "need" | "timeline", value: boolean) => void;
  setFollowUpDate: (date: Date | null) => void;
  setSelectedPhoneType: (phoneType: PhoneType) => void;
  getSelectedPhone: () => string | null;

  // UI State Actions
  setShowOutcomeDialog: (show: boolean) => void;
  setAwaitingPickupSelection: (awaiting: boolean) => void;
  openOutcomeDialog: () => void;
  openPickupDialog: () => void;
  closeOutcomeDialog: () => void;

  resetCallState: () => void;
}

export const useDialerStore = create<DialerState>((set, get) => ({
  // Initial state
  isActive: false,
  isViewingHome: false,
  sessionStartTime: null,
  sessionDbId: null,
  queue: [],
  currentIndex: 0,
  currentContact: null,
  callStartTime: null,
  callDuration: 0,
  isCallActive: false,
  selectedPhoneType: "mobile",
  notes: "",
  timestampedNotes: [],
  outcome: null,
  disposition: null,
  referralContext: { type: "none" },
  confirmedBudget: false,
  confirmedAuthority: false,
  confirmedNeed: false,
  confirmedTimeline: false,
  followUpDate: null,
  showOutcomeDialog: false,
  awaitingPickupSelection: false,

  startSession: (contacts, sessionDbId) => {
    set({
      isActive: true,
      isViewingHome: false,
      sessionStartTime: new Date(),
      sessionDbId: sessionDbId || null,
      queue: contacts,
      currentIndex: 0,
      currentContact: contacts[0] || null,
    });
  },

  setSessionDbId: (sessionDbId) => {
    set({ sessionDbId });
  },

  endSession: () => {
    set({
      isActive: false,
      isViewingHome: false,
      sessionStartTime: null,
      sessionDbId: null,
      queue: [],
      currentIndex: 0,
      currentContact: null,
      callStartTime: null,
      callDuration: 0,
      isCallActive: false,
      notes: "",
      timestampedNotes: [],
      outcome: null,
      disposition: null,
      referralContext: { type: "none" },
      confirmedBudget: false,
      confirmedAuthority: false,
      confirmedNeed: false,
      confirmedTimeline: false,
      followUpDate: null,
    });
  },

  pauseSession: () => {
    set({ isViewingHome: true });
  },

  resumeSession: () => {
    set({ isViewingHome: false });
  },

  setQueue: (contacts) => {
    set({
      queue: contacts,
      currentContact: contacts[get().currentIndex] || null,
    });
  },

  // Remove contacts from queue that match predicate
  // If current contact is removed, advance to next eligible
  // Note: Works even when session is paused (isViewingHome) so that
  // "Remove from Dialer Pool" takes effect immediately
  pruneQueue: (predicate) => {
    const { queue, currentIndex, currentContact } = get();
    if (queue.length === 0) return;

    // Find contacts to keep (predicate returns true for contacts to REMOVE)
    const newQueue = queue.filter(c => !predicate(c));
    
    if (newQueue.length === queue.length) {
      // No contacts were removed
      return;
    }

    // Calculate new index
    // Count how many contacts before current index were removed
    let newIndex = currentIndex;
    let currentRemoved = false;

    if (currentContact && predicate(currentContact)) {
      currentRemoved = true;
    }

    // Count removed contacts before current position
    for (let i = 0; i < currentIndex; i++) {
      if (predicate(queue[i])) {
        newIndex--;
      }
    }

    // Ensure newIndex is valid
    if (newQueue.length === 0) {
      // All contacts removed - end session
      get().endSession();
      return;
    }

    // If current was removed, stay at same position (which is now next eligible)
    // or go to last if we were at the end
    if (currentRemoved) {
      newIndex = Math.min(newIndex, newQueue.length - 1);
    }

    set({
      queue: newQueue,
      currentIndex: newIndex,
      currentContact: newQueue[newIndex] || null,
    });

    // If current contact changed, reset call state
    if (currentRemoved) {
      get().resetCallState();
    }
  },

  // Helper: remove a specific contact by ID
  removeContactFromQueue: (contactId) => {
    get().pruneQueue(c => c.id === contactId);
  },

  // Helper: remove all contacts from a specific company
  removeCompanyContactsFromQueue: (companyId) => {
    get().pruneQueue(c => c.company_id === companyId);
  },

  startCall: () => {
    set({
      isCallActive: true,
      callStartTime: new Date(),
      callDuration: 0,
    });
  },

  endCall: () => {
    const { callStartTime } = get();
    const duration = callStartTime
      ? Math.floor((new Date().getTime() - callStartTime.getTime()) / 1000)
      : 0;
    set({
      isCallActive: false,
      callDuration: duration,
    });
  },

  updateDuration: (seconds) => {
    set({ callDuration: seconds });
  },

  nextContact: () => {
    const { queue, currentIndex } = get();
    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      set({
        currentIndex: nextIndex,
        currentContact: queue[nextIndex],
      });
      get().resetCallState();
    }
  },

  previousContact: () => {
    const { queue, currentIndex } = get();
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      set({
        currentIndex: prevIndex,
        currentContact: queue[prevIndex],
      });
      get().resetCallState();
    }
  },

  skipContact: () => {
    get().nextContact();
  },

  goToContact: (index) => {
    const { queue } = get();
    if (index >= 0 && index < queue.length) {
      set({
        currentIndex: index,
        currentContact: queue[index],
      });
      get().resetCallState();
    }
  },

  setNotes: (notes) => set({ notes }),
  
  addTimestampedNote: (note) => {
    set((state) => ({
      timestampedNotes: [...state.timestampedNotes, note],
    }));
  },

  updateTimestampedNote: (index, note) => {
    set((state) => {
      const updated = [...state.timestampedNotes];
      updated[index] = note;
      return { timestampedNotes: updated };
    });
  },

  deleteTimestampedNote: (index) => {
    set((state) => ({
      timestampedNotes: state.timestampedNotes.filter((_, i) => i !== index),
    }));
  },

  clearTimestampedNotes: () => {
    set({ timestampedNotes: [] });
  },

  setOutcome: (outcome) => set({ outcome }),
  setDisposition: (disposition) => set({ disposition }),

  setReferralContext: (context) => set({ referralContext: context }),
  clearReferralContext: () => set({ referralContext: { type: "none" } }),

  setQualification: (field, value) => {
    switch (field) {
      case "budget":
        set({ confirmedBudget: value });
        break;
      case "authority":
        set({ confirmedAuthority: value });
        break;
      case "need":
        set({ confirmedNeed: value });
        break;
      case "timeline":
        set({ confirmedTimeline: value });
        break;
    }
  },

  setFollowUpDate: (date) => set({ followUpDate: date }),

  setSelectedPhoneType: (phoneType) => set({ selectedPhoneType: phoneType }),

  // UI State Actions
  setShowOutcomeDialog: (show) => set({ showOutcomeDialog: show }),
  setAwaitingPickupSelection: (awaiting) => set({ awaitingPickupSelection: awaiting }),
  openOutcomeDialog: () => set({ showOutcomeDialog: true }),
  openPickupDialog: () => set({ showOutcomeDialog: true, awaitingPickupSelection: true }),
  closeOutcomeDialog: () => set({ showOutcomeDialog: false, awaitingPickupSelection: false }),

  getSelectedPhone: () => {
    const { currentContact, selectedPhoneType } = get();
    if (!currentContact) return null;
    
    if (selectedPhoneType === "mobile") {
      return currentContact.mobile || currentContact.phone || null;
    }
    return currentContact.phone || currentContact.mobile || null;
  },

  resetCallState: () => {
    const { currentContact } = get();
    // Default to mobile if available, otherwise office
    const defaultPhoneType: PhoneType = currentContact?.mobile ? "mobile" : "office";
    set({
      callStartTime: null,
      callDuration: 0,
      isCallActive: false,
      selectedPhoneType: defaultPhoneType,
      notes: "",
      timestampedNotes: [],
      outcome: null,
      disposition: null,
      referralContext: { type: "none" },
      confirmedBudget: currentContact?.has_budget || false,
      confirmedAuthority: currentContact?.is_authority || false,
      confirmedNeed: currentContact?.has_need || false,
      confirmedTimeline: currentContact?.has_timeline || false,
      followUpDate: null,
    });
  },
}));

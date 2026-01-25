import { create } from "zustand";
import type { Contact, TimestampedNote } from "@/types/database";

export type CallOutcome = "connected" | "voicemail" | "no_answer" | "busy" | "wrong_number" | "gatekeeper" | "skipped";
export type CallDisposition = "interested_meeting" | "interested_info" | "callback" | "not_interested_fit" | "not_interested_solution" | "not_interested_budget" | "do_not_contact";
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

  // Actions
  startSession: (contacts: Contact[]) => void;
  endSession: () => void;
  setQueue: (contacts: Contact[]) => void;
  
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

  resetCallState: () => void;
}

export const useDialerStore = create<DialerState>((set, get) => ({
  // Initial state
  isActive: false,
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

  startSession: (contacts) => {
    set({
      isActive: true,
      queue: contacts,
      currentIndex: 0,
      currentContact: contacts[0] || null,
    });
  },

  endSession: () => {
    set({
      isActive: false,
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

  setQueue: (contacts) => {
    set({
      queue: contacts,
      currentContact: contacts[get().currentIndex] || null,
    });
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

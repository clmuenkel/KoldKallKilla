"use client";

import { useAuthId } from "./use-auth";

/**
 * The single CRM login that gets the follow-up / missed-meeting features
 * (zad@evioshq.com, the account the Evios agent keys on). Other logins
 * intentionally keep the original CRM with none of this new UI.
 */
export const PRIMARY_USER_ID = "9a642127-0b92-4388-8716-5d65a282f977";

export function useIsPrimaryUser(): boolean {
  return useAuthId() === PRIMARY_USER_ID;
}

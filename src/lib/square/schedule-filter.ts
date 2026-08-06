// Second safety layer for public availability: the girls' REAL schedules.
//
// Square's SearchAvailability only knows the bookable hours on each Square
// profile (currently defaults). The truth — Karen's Wed/Thu plus every-other-
// Saturday overrides, Catalina's 10–2, time off — lives in the app's
// availability rules/overrides/blocks. This filter drops any Square slot that
// falls outside them. Unmapped team members pass through: for them Square's
// own hours are the only authority we have.

// The scheduling engine interprets "HH:MM" rules in process-local time; this
// code also runs on UTC servers, so pin the process to salon time. (Belt and
// suspenders: TZ=America/Los_Angeles is also set in the deploy environment.)
process.env.TZ = "America/Los_Angeles";

import type {
  AvailabilityOverride,
  AvailabilityRule,
  TimeBlock,
} from "../../data/types";
import {
  staffWorkingWindows,
  type SchedulingContext,
} from "../scheduling/engine";

export interface ScheduleData {
  /** Square team member id -> app staff id. */
  staffSquareIds: Record<string, string>;
  availabilityRules: AvailabilityRule[];
  availabilityOverrides: AvailabilityOverride[];
  timeBlocks: TimeBlock[];
}

function engineCtx(data: ScheduleData): SchedulingContext {
  return {
    appointments: [],
    timeBlocks: data.timeBlocks,
    availabilityRules: data.availabilityRules,
    availabilityOverrides: data.availabilityOverrides,
    rooms: [],
    serviceById: new Map(),
  };
}

export function slotWithinSchedule(
  data: ScheduleData,
  squareTeamMemberId: string,
  startISO: string,
  durationMin: number
): boolean {
  const staffId = data.staffSquareIds[squareTeamMemberId];
  if (!staffId) return true;

  const start = new Date(startISO);
  const end = new Date(start.getTime() + durationMin * 60000);

  for (const block of data.timeBlocks) {
    if (block.staffId !== staffId) continue;
    const blockStart = new Date(block.startISO);
    const blockEnd = new Date(block.endISO);
    if (start < blockEnd && blockStart < end) return false;
  }

  const windows = staffWorkingWindows(
    engineCtx(data),
    staffId,
    start,
    "valencia"
  );
  return windows.some((w) => start >= w.start && end <= w.end);
}

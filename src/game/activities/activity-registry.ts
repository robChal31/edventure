import type { ActivityId } from "@/quiz/types";
import type { MapId } from "../world/maps/map-registry";
import type { Activity, ActivityContext } from "./activity";
import { FishingActivity } from "./fishing/fishing-activity";
import { CatchingBugsActivity } from "./catching-bugs/catching-bugs-activity";

export type ActivityEntry = {
    /** The map the student travels to for this activity. */
    mapId: MapId;
    create: (context: ActivityContext) => Activity;
};

/**
 * Which map hosts each activity. Fishing happens at the beach; add new
 * activities (and their maps) here.
 */
export const ACTIVITY_REGISTRY: Record<ActivityId, ActivityEntry> = {
    catching_bugs: {
        mapId: "farm",
        create: (context) => new CatchingBugsActivity(context),
    },
    fishing: {
        mapId: "beach",
        create: (context) => new FishingActivity(context),
    },
};

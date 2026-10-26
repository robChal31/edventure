import type { Interactable } from "../../types/interaction";
import type { Facing } from "../../types";
import { selectObjectTarget, type Point, type TargetBounds } from "@/game/equipment/targeting";

export class InteractionTargetSelector {
    constructor(private objects: readonly Interactable[]) {}

    findTarget(position: Point, facing: Facing, range: number): { object: Interactable; bounds: TargetBounds } | null {
        return selectObjectTarget(position, facing, range, this.objects.map((object) => ({
            object,
            bounds: object.getInteractionBounds(),
            valid: object.canInteract?.("axe") ?? true,
        })));
    }
}

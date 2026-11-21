import { Collidable } from "../common/types/collision";
import { Interactable } from "../common/types/interaction";
import { VisibleObject } from "../common/types/world-object";
import { WorldObject } from "./world-object";

export class WorldObjectRegistry {
    #objects: WorldObject[] = [];
    #interactables: Interactable[] = [];
    #collidables: Collidable[] = [];
    #visibleObjects: VisibleObject[] = [];

    public register(object: WorldObject): void {
        this.#objects.push(object);
        object.gameObject.once("destroy", () => this.unregister(object));

        if (object.interactable) {
            this.#interactables.push(
                object.interactable
            );
        }

        if (object.collidable) {
            this.#collidables.push(
                object.collidable
            );
        }

        if (object.visible) {
            this.#visibleObjects.push(
                object.visible
            );
        }
    }

    /** Mutate the arrays in place: systems keep references to these collections. */
    public unregister(object: WorldObject): void {
        const remove = <T>(items: T[], item: T | undefined) => {
            const index = item === undefined ? -1 : items.indexOf(item);
            if (index >= 0) items.splice(index, 1);
        };
        remove(this.#objects, object); remove(this.#interactables, object.interactable);
        remove(this.#collidables, object.collidable); remove(this.#visibleObjects, object.visible);
    }

    public registerAll(objects: WorldObject[]): void {
        objects.forEach((object) => {
            this.register(object);
        });
    }

    public get objects(): readonly WorldObject[] {
        return this.#objects;
    }

    public get interactables(): readonly Interactable[] {
        return this.#interactables;
    }

    public get collidables(): readonly Collidable[] {
        return this.#collidables;
    }

    public get visibleObjects(): readonly VisibleObject[] {
        return this.#visibleObjects;
    }
}
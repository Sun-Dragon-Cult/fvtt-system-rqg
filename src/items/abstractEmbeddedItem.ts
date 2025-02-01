import type { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import type { RqgActor } from "../actors/rqgActor";
import type { RqgItem } from "./rqgItem";

/**
 * Separate item specific actions that should be done on embedded items when actor _onCreateDescendantDocuments etc. is called.
 */
export abstract class AbstractEmbeddedItem {
  // TODO ***
  // public static init() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static preEmbedItem(actor: RqgActor, item: ItemData, options: object[], userId: string): void {}

  /**
   * Will be called when the item is embedded into an actor.
   */
  static async onEmbedItem(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    actor: RqgActor,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    child: RqgItem,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ): Promise<any> {}

  /**
   * Will be called before an embedded (Owned) item is updated.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static preUpdateItem(actor: RqgActor, item: RqgItem, result: any[], options: any): void {}

  /**
   * Will be called after a set of embedded items are deleted.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static onDeleteItem(actor: RqgActor, itemData: RqgItem, options: any, userId: string): any[] {
    return [];
  }

  /**
   * Allows each embedded item to prepare its data.
   */
  static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    return item;
  }

  /**
   * Allow updates to the items after active effects is applied.
   */
  static onActorPrepareDerivedData(item: RqgItem): RqgItem {
    return item;
  }

  // TODO not used (yet)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static activateActorSheetListeners(html: JQuery, sheet: any) {}
}

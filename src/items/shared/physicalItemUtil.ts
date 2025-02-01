import { RqgItem } from "../rqgItem";
import { localize, mergeArraysById, RqgError } from "../../system/util";
import { ItemTree } from "./ItemTree";
import { EquippedStatus } from "../../data-model/item-data/IPhysicalItem";

/**
 * Only update the content of a bag if the changed item is the bag itself and that change
 * is the equippedStatus.
 */
export function getLocationRelatedUpdates(
  actorEmbeddedItems: RqgItem[],
  physicalItem: RqgItem,
  updates: object[], // TODO Error what if not all updates have the same location !
): any[] {
  if ("isNatural" in physicalItem.system && physicalItem.system.isNatural) {
    return []; // natural weapons don't have location and are excluded from the LocationTree
  }

  const equippedStatusUpdate: any = updates.find(
    (u: any) => u._id === physicalItem.id && u["system.equippedStatus"],
  );
  const equippedStatusUpdateValue =
    equippedStatusUpdate && equippedStatusUpdate?.["system.equippedStatus"];

  const locationUpdate: any = updates.find(
    (u: any) => u._id === physicalItem.id && u["system.location"],
  );
  const locationUpdateValue = locationUpdate && locationUpdate?.["system.location"];

  const mergedUpdates: any[] = [];
  if (equippedStatusUpdateValue) {
    mergeArraysById(
      mergedUpdates,
      getChangedEquippedStatusRelatedUpdates(
        physicalItem,
        actorEmbeddedItems,
        equippedStatusUpdateValue,
      ),
    );
  }

  if (locationUpdateValue) {
    mergeArraysById(
      mergedUpdates,
      getChangedLocationRelatedChanges(
        actorEmbeddedItems,
        physicalItem,
        locationUpdateValue,
        equippedStatusUpdateValue,
      ),
    );
  }

  return mergedUpdates;
}

function getChangedEquippedStatusRelatedUpdates(
  physicalItem: RqgItem,
  actorEmbeddedItems: RqgItem[],
  equippedStatusUpdateValue: EquippedStatus | undefined,
): any[] {
  let containedItemUpdates = [];

  const sameLocationItemIds = new ItemTree(actorEmbeddedItems).getOtherItemIdsInSameLocationTree(
    physicalItem.name ?? "",
  );
  containedItemUpdates = sameLocationItemIds.map((id: string) => ({
    _id: id,
    "system.equippedStatus": equippedStatusUpdateValue,
  }));

  return containedItemUpdates;
}

function getChangedLocationRelatedChanges(
  actorEmbeddedItems: RqgItem[],
  physicalItem: RqgItem,
  locationUpdateValue: string | undefined,
  equippedStatusUpdateValue: EquippedStatus | undefined,
): any[] {
  const containedItemUpdates: any[] = [];

  const updatedItem = actorEmbeddedItems.find((i) => i.id === physicalItem.id);

  if (!updatedItem) {
    const msg = localize("RQG.Item.Notification.CantFindItem");
    ui.notifications?.error(msg);
    throw new RqgError(msg, actorEmbeddedItems);
  }
  updatedItem.system.location = locationUpdateValue; // Mimic the change that is about to happen so the tree can be searched
  const itemTree = new ItemTree(actorEmbeddedItems);
  const container = itemTree.getContainerNodeOfItem(physicalItem.name ?? "");
  if (container) {
    if (container.id !== updatedItem.id) {
      const sameLocationItemIds = new ItemTree(
        actorEmbeddedItems,
      ).getOtherItemIdsInSameLocationTree(physicalItem.name ?? "");

      mergeArraysById(
        containedItemUpdates,
        sameLocationItemIds.reduce((updates: any[], id: string) => {
          if (!id.startsWith("virtual:")) {
            updates.push({
              _id: id,
              "system.equippedStatus": container.equippedStatus, // set equipped status to what the container has
            });
          }
          return updates;
        }, []),
      );
    }
  }

  if (physicalItem.system.isContainer) {
    const sameLocationItemIds = new ItemTree(actorEmbeddedItems).getItemIdsDirectlyInSameContainer(
      physicalItem.name ?? "",
    );

    mergeArraysById(
      containedItemUpdates,
      sameLocationItemIds.reduce((acc: any[], id: string) => {
        if (equippedStatusUpdateValue) {
          acc.push({
            _id: id,
            "system.location": locationUpdateValue,
          });
        }
        return acc;
      }, []),
    );
  }

  return containedItemUpdates;
}

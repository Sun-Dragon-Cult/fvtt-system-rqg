import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import {
  assertItemType,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { showImproveAbilityDialog } from "../../applications/improveAbilityDialog";
import { contextMenuRunes } from "./contextMenuRunes";

export const passionMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | undefined,
): ContextMenu.Item[] => [
  {
    name: localize("RQG.Game.RollChat"),
    icon: contextMenuRunes.RollViaChat,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      await item?.abilityRoll();
    },
  },
  {
    name: localize("RQG.Game.RollQuick"),
    icon: contextMenuRunes.RollQuick,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Passion);
      if (item.system.chance == null) {
        const msg = localize("RQG.ContextMenu.Notification.CantDirectRollPassionError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      await item?.abilityRollImmediate();
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: contextMenuRunes.ToggleExperience,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item || item.type !== ItemTypeEnum.Passion) {
        const msg = localize("RQG.ContextMenu.Notification.CantToggleExperiencePassionError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      await item.update({ "system.hasExperience": !item.system.hasExperience }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.ImproveItem", {
      itemType: localizeItemType(ItemTypeEnum.Passion),
    }),
    icon: contextMenuRunes.Improve,
    condition: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item || item.type !== ItemTypeEnum.Passion) {
        const msg = localize("RQG.ContextMenu.Notification.CantImprovePassionError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      return !!item.system.hasExperience;
    },
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Passion);
      const speaker = ChatMessage.getSpeaker({ actor, token });
      showImproveAbilityDialog(item, speaker);
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Passion),
    }),
    icon: contextMenuRunes.Edit,
    condition: () => true,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantEditPassionError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Passion),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => true,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];

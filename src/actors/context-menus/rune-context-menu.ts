import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import {
  assertItemType,
  getDomDatasetAmongSiblings,
  getGame,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { showImproveAbilityDialog } from "../../applications/improveAbilityDialog";
import { contextMenuRunes } from "./contextMenuRunes";
import { Rqid } from "../../system/api/rqidApi";

export const runeMenuOptions = (
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
      assertItemType(item?.type, ItemTypeEnum.Rune);
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
      assertItemType(item?.type, ItemTypeEnum.Rune);
      await item.update({ "system.hasExperience": !item.system.hasExperience }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.ImproveItem", {
      itemType: localizeItemType(ItemTypeEnum.Rune),
    }),
    icon: contextMenuRunes.Improve,
    condition: () => true,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Rune);
      const speaker = ChatMessage.getSpeaker({ actor, token });
      showImproveAbilityDialog(item, speaker);
    },
  },
  {
    name: localize("RQG.ContextMenu.ViewDescription"),
    icon: contextMenuRunes.ViewDescription,
    condition: (el: JQuery) => {
      const rqid = getDomDatasetAmongSiblings(el, "rqid-link");
      return !!rqid;
    },
    callback: async (el: JQuery) => {
      const rqid = getDomDatasetAmongSiblings(el, "rqid-link");
      if (rqid) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Rune),
    }),
    icon: contextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM || actor.system.editMode,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Rune);
      if (!item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantEditRuneError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Rune),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];

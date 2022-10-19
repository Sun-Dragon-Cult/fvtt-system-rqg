import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import {
  assertItemType,
  getDomDatasetAmongSiblings,
  getGame,
  getRequiredDomDataset,
  localize,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { showImproveAbilityDialog } from "../../dialog/improveAbilityDialog";
import { ContextMenuRunes } from "./contextMenuRunes";
import { RqgItem } from "../../items/rqgItem";
import { Rqid } from "../../system/api/rqidApi";

export const runeMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | undefined
): ContextMenu.Item[] => [
  {
    name: localize("RQG.Game.RollChat"),
    icon: ContextMenuRunes.RollViaChat,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      await item?.toChat();
    },
  },
  {
    name: localize("RQG.Game.RollQuick"),
    icon: ContextMenuRunes.RollQuick,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Rune);
      await item?.abilityRoll();
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: ContextMenuRunes.ToggleExperience,
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
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Rune),
    }),
    icon: ContextMenuRunes.Improve,
    condition: () => true,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Rune);
      const speakerName = token?.name ?? actor.prototypeToken.name ?? "";
      showImproveAbilityDialog(actor, itemId, item, speakerName);
    },
  },
  {
    name: localize("RQG.ContextMenu.ViewDescription"),
    icon: ContextMenuRunes.ViewDescription,
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
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Rune),
    }),
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
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
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Rune),
    }),
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];

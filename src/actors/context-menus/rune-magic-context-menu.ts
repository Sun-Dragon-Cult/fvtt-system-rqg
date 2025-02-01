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
import { contextMenuRunes } from "./contextMenuRunes";
import { Rqid } from "../../system/api/rqidApi";

export const runeMagicMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: localize("RQG.Game.RollChat"),
    icon: contextMenuRunes.RollViaChat,
    condition: () => true,
    callback: async () => {
      // const itemId = getRequiredDomDataset(el, "item-id");
      // const item = actor.items.get(itemId);
      // TODO use future RuneMagicRoll
      // await item?.toChat();
    },
  },
  {
    name: localize("RQG.Game.RollQuick"),
    icon: contextMenuRunes.RollQuick,
    condition: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.RuneMagic);
      return item?.system.points === 1;
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.RuneMagic);
      // TODO use future RuneMagicRoll
      // item.abilityRoll({ runePointCost: 1, magicPointBoost: 0 });
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
      itemType: localizeItemType(ItemTypeEnum.RuneMagic),
    }),
    icon: contextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.RuneMagic);
      if (!item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the runemagic item from the runemagic context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.RuneMagic),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];

import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import {
  assertItemType,
  getDomDataset,
  getDomDatasetAmongSiblings,
  getGame,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SkillCategoryEnum } from "../../data-model/item-data/skillData";
import { showImproveAbilityDialog } from "../../applications/improveAbilityDialog";
import { contextMenuRunes } from "./contextMenuRunes";
import { Rqid } from "../../system/api/rqidApi";

export const skillMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | undefined,
): ContextMenu.Item[] => [
  {
    name: localize("RQG.Game.RollChat"),
    icon: contextMenuRunes.RollViaChat,
    condition: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Skill);
      return ![SkillCategoryEnum.MeleeWeapons, SkillCategoryEnum.MissileWeapons].includes(
        item.system.category,
      );
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      await item?.abilityRoll();
    },
  },
  {
    name: localize("RQG.Game.RollQuick"),
    icon: contextMenuRunes.RollQuick,
    condition: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Skill);
      return ![SkillCategoryEnum.MeleeWeapons, SkillCategoryEnum.MissileWeapons].includes(
        item.system.category,
      );
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Skill);
      const itemChance = item.system.chance;
      if (itemChance == null) {
        const msg = localize("RQG.ContextMenu.Notification.CantRollQuickSkillError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      await item?.abilityRollImmediate();
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: contextMenuRunes.ToggleExperience,
    condition: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Skill);
      return item.system.canGetExperience;
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Skill);
      await item.update({ "system.hasExperience": !item.system.hasExperience }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.ImproveItem", {
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Improve,
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && actor.items.get(itemId);
      return !!(item && item.type === ItemTypeEnum.Skill);
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Skill);
      const speaker = ChatMessage.getSpeaker({ actor, token });
      await showImproveAbilityDialog(item, speaker);
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
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Edit,
    condition: (el: JQuery) => !!getRequiredDomDataset(el, "item-id"),
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.type, ItemTypeEnum.Skill);
      if (!item.sheet) {
        const msg = `Couldn't find sheet on [${item.name}] on actor ${actor.name} to edit the skill item from the skill context menu`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];

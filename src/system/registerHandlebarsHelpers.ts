import { EquippedStatus } from "../data-model/item-data/IPhysicalItem";
import {
  getActorFromIds,
  getAvailableRunes,
  getGame,
  hasOwnProperty,
  localize,
  localizeItemType,
  RqgError,
} from "./util";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { RqgItem } from "../items/rqgItem";
import { systemId } from "./config";
import { Rqid } from "./api/rqidApi";

export const registerHandlebarsHelpers = function () {
  Handlebars.registerHelper("concat", (...strs) =>
    strs.filter((s) => typeof s !== "object").join("")
  );
  Handlebars.registerHelper("json", (context) => JSON.stringify(context));

  /** Workaround since handlebars can't handle ../@key
   * Will create a variable in scope, call with {{setVar 'myvar' @key this}}  */
  Handlebars.registerHelper("setVar", (varName, varValue, scope) => {
    scope[varName] = varValue;
  });

  Handlebars.registerHelper("currency", (value, unit) => {
    return `${new Intl.NumberFormat(navigator.language, {
      minimumFractionDigits: value % 1 ? 2 : 0, // 0 or 2 decimals
      maximumFractionDigits: 2,
    }).format(value)} ${unit}`;
  });

  Handlebars.registerHelper("multiplyCurrency", (quantity, value, unit) => {
    const total = Number(quantity) * Number(value);
    return `${new Intl.NumberFormat(navigator.language, {
      minimumFractionDigits: value % 1 ? 2 : 0, // 0 or 2 decimals
      maximumFractionDigits: 2,
    }).format(total)} ${unit}`;
  });

  Handlebars.registerHelper("decimalMultiply", (quantity, value, decimals) => {
    const fractionDigits = isNaN(decimals) ? undefined : Number(decimals);
    const total = Number(quantity) * Number(value);
    return `${new Intl.NumberFormat(navigator.language, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    }).format(total)}`;
  });

  Handlebars.registerHelper("itemname", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor && actor.items.get(itemId);
    return item ? item.name : "---";
  });

  Handlebars.registerHelper("localizeitemtype", (typeName) => {
    const itemType: ItemTypeEnum = typeName;
    return RqgItem.localizeItemTypeName(itemType);
  });

  Handlebars.registerHelper("skillname", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor && actor.items.get(itemId);
    if (!item) {
      return "---";
    }
    if (item.type !== ItemTypeEnum.Skill) {
      const msg = `Handlebar helper "skillname" called with an item that is not a skill`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, item, actor);
    }
    const specialization = item.system.specialization ? ` (${item.system.specialization})` : "";
    return `${item.system.skillName}${specialization}`;
  });

  /**
   * Takes an uuid directly to an embedded item (only)
   * or an uuid to an actor and an id to an embedded item on that actor
   */
  Handlebars.registerHelper("skillchance", (...args) => {
    const uuid = args?.[0];
    const embeddedSkillId = typeof args?.[1] === "string" ? args[1] : undefined;

    if (!uuid) {
      const msg = `Handlebar helper "skillchance" called with an empty uuid`;
      ui.notifications?.error(msg);
      console.log("RQG | ", msg, arguments);
      return "🐛";
    }

    // @ts-expect-error fromUuidSync
    const itemOrActor = fromUuidSync(uuid);
    const item =
      embeddedSkillId && itemOrActor.documentName === "Actor"
        ? itemOrActor.getEmbeddedDocument("Item", embeddedSkillId)
        : itemOrActor;
    if (item.documentName !== "Item") {
      const msg = `Expected item but got ${item.documentName}`;
      ui.notifications?.error(msg);
      console.log("RQG | ", msg, item, arguments);
      return "🐛";
    }
    return item ? item.system.chance : "---";
  });

  Handlebars.registerHelper("experiencedclass", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor && actor.items.get(itemId);
    // @ts-ignore hasExperience
    return item && item.system.hasExperience ? "experienced" : "";
  });

  Handlebars.registerHelper("quantity", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor && actor.items.get(itemId);
    if (!item) {
      return "---";
    }
    if (!hasOwnProperty(item.system, "quantity")) {
      const msg = `Handlebar helper quantity was called with an item without quantity propery`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    return item.system.quantity;
  });
  Handlebars.registerHelper("runeImg", (runeName: string): string | undefined => {
    if (!runeName) {
      return;
    }
    const availableRunes = getAvailableRunes();
    const rune = availableRunes.find((r) => r.name === runeName);
    if (!rune) {
      const msg = localize("RQG.Item.Notification.CantFindRuneInAvailableRunesError", {
        runeName: runeName,
      });
      ui.notifications?.error(msg);
      console.error("RQG |", msg);
      return "";
    }
    return rune.img;
  });

  Handlebars.registerHelper("defaultItemIconSrc", (itemType: string): string | undefined => {
    const defaultItemIconSettings: any = getGame().settings.get(
      systemId,
      "defaultItemIconSettings"
    );
    return defaultItemIconSettings[itemType];
  });

  Handlebars.registerHelper("equippedIcon", (equippedStatus: EquippedStatus): string => {
    equippedStatus = equippedStatus ? equippedStatus : "notCarried";
    return CONFIG.RQG.equippedIcons[equippedStatus];
  });

  Handlebars.registerHelper("gearViewIcon", (view: string): string => {
    return CONFIG.RQG.gearViewIcons[view as keyof typeof CONFIG.RQG.gearViewIcons];
  });

  Handlebars.registerHelper("yes-no", (bool: boolean): string => {
    return bool ? localize("RQG.Dialog.Common.yes") : localize("RQG.Dialog.Common.no");
  });

  Handlebars.registerHelper("multiply", (...nums) => {
    nums.pop();
    return Math.floor(nums.reduce((acc, n) => acc * n));
  });

  Handlebars.registerHelper("multiplyfixed2", (...nums) => {
    nums.pop();
    return nums.reduce((acc, n) => acc * n).toFixed(2);
  });

  Handlebars.registerHelper("sum", (...nums) => {
    nums.pop();
    return nums.reduce((acc, n) => acc + (n ?? 0), 0);
  });

  Handlebars.registerHelper("toLowerCase", function (value) {
    if (value) {
      return new Handlebars.SafeString(value.toLowerCase());
    } else {
      return "";
    }
  });

  Handlebars.registerHelper("rqidLinkTooltip", function (rqid: string) {
    const documentName = Rqid.getDocumentName(rqid);
    const itemType =
      documentName === "Item"
        ? (Rqid.getDocumentType(rqid) as ItemTypeEnum | undefined)
        : undefined;
    return localize("RQG.Foundry.ContentLink.RqidLinkTitle", {
      rqid: rqid,
      documentName: getGame().i18n.localize(`DOCUMENT.${documentName}`),
      documentType: itemType ? localizeItemType(itemType) : "",
    });
  });

  Handlebars.registerHelper("rqidLinkIcon", function (rqid: string) {
    return Rqid.getRqidIcon(rqid) || "";
  });
};

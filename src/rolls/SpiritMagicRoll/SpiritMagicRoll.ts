import {
  activateChatTab,
  getGameUser,
  isTruthy,
  localize,
  localizeItemType,
} from "../../system/util";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { calculateAbilitySuccessLevel } from "../AbilityRoll/calculateAbilitySuccessLevel";
import { AbilitySuccessLevelEnum } from "../AbilityRoll/AbilityRoll.defs";
import { SpiritMagicRollOptions } from "./SpiritMagicRoll.types";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class SpiritMagicRoll extends Roll {
  private _targetChance = 0; // Target value including any modifiers

  public static async rollAndShow(options: SpiritMagicRollOptions) {
    const roll = new SpiritMagicRoll("1d100", {}, options);
    await roll.evaluate();
    await roll.toMessage({ flavor: roll.flavor, speaker: options.speaker });
    activateChatTab();
    return roll;
  }

  constructor(formula: string, data: any, options: SpiritMagicRollOptions) {
    super("1d100", data, options);
    const o = this.options as SpiritMagicRollOptions;

    const modificationsSum =
      o?.modifiers?.reduce((acc, mod) => acc + Number(mod?.value) || 0, 0) ?? 0;
    this._targetChance = Math.max(0, (o.powX5 ?? 0) + modificationsSum); // -50% => 0% to make the calculations work
  }

  get successLevel(): AbilitySuccessLevelEnum | undefined {
    if (!this._evaluated || this.total === undefined) {
      return undefined;
    }
    const useSpecialCriticals =
      (this.options as SpiritMagicRollOptions).useSpecialCriticals ?? false;
    return calculateAbilitySuccessLevel(this._targetChance, this.total, useSpecialCriticals);
  }

  // Html for the "content" of the chat-message
  async render({ flavor = this.flavor, isPrivate = false } = {}) {
    if (!this._evaluated) {
      await this.evaluate({ async: true });
    }
    const chatData = {
      formula: isPrivate ? "???" : this._formula,
      flavor: isPrivate ? null : flavor, // TODO maybe show what the roll is?
      user: getGameUser().id,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "?" : Math.round(this.total! * 100) / 100,
      target: this._targetChance,
      successLevel: this.successLevel,
    };
    return renderTemplate(templatePaths.spiritMagicRoll, chatData);
  }

  // Html for what modifiers are applied and how many mp are used
  async getTooltip(): Promise<string> {
    const modifiers = (this.options as SpiritMagicRollOptions).modifiers ?? [];
    const nonzeroSignedModifiers = modifiers
      .filter((m) => isTruthy(m.value))
      .map((m: any) => {
        m.value = m.value.signedString();
        return m;
      });
    const o = this.options as SpiritMagicRollOptions;
    const mpCost = o.levelUsed + (o.magicPointBoost ?? 0);
    const mpDrawn = this.successLevel! <= AbilitySuccessLevelEnum.Success ? mpCost : 0;
    return renderTemplate(templatePaths.spiritMagicRollTooltip, {
      magicPointCostText: localize("RQG.Roll.SpiritMagicRoll.MagicPointCost", { cost: mpDrawn }),
      powX5: o.powX5,
      modifiers: nonzeroSignedModifiers,
    });
  }

  // Html for what Spirit Magic the roll is about
  get flavor(): string {
    const o = this.options as SpiritMagicRollOptions;
    const spellName = o.spellName;
    const flavorImg = o.spellImg ? `<img src="${o.spellImg}">` : "";
    const itemType = localizeItemType(ItemTypeEnum.SpiritMagic);
    const level = o.levelUsed;
    return `
<div class="rqg flavor">${flavorImg}</div>
<span class="roll-action">${spellName} <span class="roll-level">${level}</span></span>
<span>${itemType}</span><br>`;
  }
}

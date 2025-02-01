import type { AbilityRollOptions } from "./AbilityRoll.types";
import { calculateAbilitySuccessLevel } from "./calculateAbilitySuccessLevel";
import { activateChatTab, getGameUser, isTruthy, localizeItemType } from "../../system/util";
import { AbilitySuccessLevelEnum } from "./AbilityRoll.defs";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

export class AbilityRoll extends Roll {
  private _targetChance = 0; // Target value including any modifiers

  public static async rollAndShow(options: AbilityRollOptions) {
    const roll = new AbilityRoll("1d100", {}, options);
    await roll.evaluate();
    await roll.toMessage({ flavor: roll.flavor, speaker: options.speaker });
    activateChatTab();
    return roll;
  }

  constructor(formula: string, data: any, options: AbilityRollOptions) {
    super("1d100", data, options);
    const o = this.options as AbilityRollOptions;

    const modificationsSum =
      o?.modifiers?.reduce((acc, mod) => acc + Number(mod?.value) || 0, 0) ?? 0;
    this._targetChance = Math.max(0, o.naturalSkill! + modificationsSum); // -50% => 0% to make the calculations work
  }

  get successLevel(): AbilitySuccessLevelEnum | undefined {
    if (!this._evaluated || this.total === undefined) {
      return undefined;
    }
    const useSpecialCriticals = (this.options as AbilityRollOptions).useSpecialCriticals ?? false;
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
    return renderTemplate(templatePaths.abilityRoll, chatData);
  }

  // Html for what modifiers are applied
  async getTooltip(): Promise<string> {
    const modifiers = (this.options as AbilityRollOptions).modifiers ?? [];
    const nonzeroSignedModifiers = modifiers
      .filter((m) => isTruthy(m.value))
      .map((m: any) => {
        m.value = m.value.signedString();
        return m;
      });
    return renderTemplate(templatePaths.abilityRollTooltip, {
      naturalSkill: (this.options as AbilityRollOptions).naturalSkill,
      modifiers: nonzeroSignedModifiers,
    });
  }

  // Html for what ability the roll is about
  get flavor(): string {
    const o = this.options as AbilityRollOptions;
    const resultMsgHtml = o.resultMessages?.get(this.successLevel) ?? "";
    const flavorImg = o.abilityImg ? `<img src="${o.abilityImg}">` : "";
    const itemType = o.abilityType ? localizeItemType(o.abilityType) : "";
    return `
<div class="rqg flavor">${flavorImg}</div>
<span class="roll-action">${o.abilityName ?? ""}</span>
<span>${itemType}</span><br>
<div>${resultMsgHtml}</div>`;
  }
}

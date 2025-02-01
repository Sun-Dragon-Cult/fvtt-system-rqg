import { activateChatTab, getGameUser, isTruthy, localize } from "../../system/util";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { calculateAbilitySuccessLevel } from "../AbilityRoll/calculateAbilitySuccessLevel";
import { AbilitySuccessLevelEnum } from "../AbilityRoll/AbilityRoll.defs";
import { CharacteristicRollOptions } from "./CharacteristicRoll.types";

export class CharacteristicRoll extends Roll {
  private _targetChance = 0; // Target value including any modifiers

  public static async rollAndShow(options: CharacteristicRollOptions) {
    const roll = new CharacteristicRoll("1d100", {}, options);
    await roll.evaluate();
    await roll.toMessage({ flavor: roll.flavor, speaker: options.speaker });
    activateChatTab();
    return roll;
  }

  constructor(formula: string, data: any, options: CharacteristicRollOptions) {
    super("1d100", data, options);
    const o = this.options as CharacteristicRollOptions;

    const modificationsSum =
      o?.modifiers?.reduce((acc, mod) => acc + Number(mod?.value) || 0, 0) ?? 0;
    this._targetChance = Math.max(
      0,
      o.characteristicValue! * (o.difficulty ?? 5) + modificationsSum,
    ); // -50% => 0% to make the calculations work
  }

  get successLevel(): AbilitySuccessLevelEnum | undefined {
    if (!this._evaluated || this.total === undefined) {
      return undefined;
    }
    const useSpecialCriticals =
      (this.options as CharacteristicRollOptions).useSpecialCriticals ?? false;
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
    return renderTemplate(templatePaths.characteristicRoll, chatData);
  }

  // Html for what modifiers are applied
  async getTooltip(): Promise<string> {
    const modifiers = (this.options as CharacteristicRollOptions).modifiers ?? [];
    const nonzeroSignedModifiers = modifiers
      .filter((m) => isTruthy(m.value))
      .map((m: any) => {
        m.value = m.value.signedString();
        return m;
      });
    const o = this.options as CharacteristicRollOptions;
    return renderTemplate(templatePaths.characteristicRollTooltip, {
      characteristicName: localize(`RQG.Actor.Characteristics.${o.characteristicName}`),
      characteristicValue: o.characteristicValue,
      difficulty: o.difficulty ?? 5,
      difficultyName: this.getDifficultyName(o.difficulty ?? 5),
      modifiers: nonzeroSignedModifiers,
    });
  }

  // Html for what characteristic the roll is about
  get flavor(): string {
    const o = this.options as CharacteristicRollOptions;
    const characteristicName = localize(`RQG.Actor.Characteristics.${o.characteristicName}-full`);
    const characteristicTranslation = localize("RQG.Actor.Characteristics.Characteristic");
    return `<span class="roll-action">${characteristicName}</span>
            <span>${characteristicTranslation}</span><br>`;
  }

  private getDifficultyName(difficulty: number): string {
    const translationKeyDifficulty = difficulty === 0.5 ? 0 : difficulty;
    const translation = localize(`RQG.Game.RollDifficultyLevel.${translationKeyDifficulty}`);
    if (translation.startsWith("RQG.Game.RollDifficultyLevel.")) {
      return localize("RQG.Roll.CharacteristicRoll.Other");
    }
    return translation;
  }
}

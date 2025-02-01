import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { getGame, localize } from "../../system/util";
import { systemId } from "../../system/config";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";

export interface IAbility {
  /** The effective % chance of this ability with all modifiers added in */
  chance?: number;
  /** Is it possible to learn this ability by doing (setting hasExperience=true)? Otherwise the only way to increase the learned chance is by study */
  canGetExperience: boolean;
  /** Has this ability been successfully used and therefore up for an improvement roll */
  hasExperience?: boolean;
}
// mod?: string; // Modification, roll modifier formula compatible 0.7.x feature? Let it be a separate interface

export class ResultMessage {
  result!: AbilitySuccessLevelEnum;
  html!: string;
}

export class Ability {
  /** Do a roll against this ability and factor in all modifiers.
   * stat - an object that implements IAbility
   * chanceMod - a +/- value that changes the chance
   **/
  public static async roll(
    flavor: string,
    chance: number,
    chanceMod: number, // TODO supply full EffectModifier so it's possible to show "Broadsword (Bladesharp +10%, Darkness -70%) Fumble"
    speaker: ChatSpeakerDataProperties,
    resultMessages?: ResultMessage[],
  ): Promise<AbilitySuccessLevelEnum> {
    const r = new Roll("1d100");
    await r.evaluate({ async: true });
    const modifiedChance: number = chance + chanceMod;
    const useSpecialCriticals = getGame().settings.get(systemId, "specialCrit");
    const result = Ability.evaluateResult(modifiedChance, r.total!, useSpecialCriticals);
    let resultMsgHtml: string | undefined = "";
    if (resultMessages) {
      resultMsgHtml = resultMessages.find((i) => i.result === result)?.html;
    }
    const sign = chanceMod > 0 ? "+" : "";
    const chanceModText = chanceMod ? `${sign}${chanceMod}` : "";
    const resultText = localize(`RQG.Game.AbilityResultEnum.${result}`);
    await r.toMessage({
      flavor: `${flavor} (${chance}${chanceModText}%) <h1>${resultText}</h1><div>${resultMsgHtml}</div>`,
      speaker: speaker,
      // @ts-expect-error CHAT_MESSAGE_STYLES
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
    return result;
  }

  private static evaluateResult(
    chance: number,
    roll: number,
    useSpecialCriticals: boolean,
  ): AbilitySuccessLevelEnum {
    chance = Math.max(0, chance); // -50% = 0%

    const hyperCritical = useSpecialCriticals && chance >= 100 ? Math.ceil(chance / 500) : 0;
    const specialCritical = useSpecialCriticals && chance >= 100 ? Math.ceil(chance / 100) : 0;

    const critical = Math.max(1, Math.ceil((chance - 29) / 20) + 1);
    const special =
      chance === 6 || chance === 7 ? 2 : Math.min(95, Math.max(1, Math.ceil((chance - 7) / 5) + 1));
    const fumble = Math.min(100, 100 - Math.ceil((100 - chance - 9) / 20) + 1);
    const success = Math.min(95, Math.max(chance, 5));
    const fail = fumble === 96 ? 95 : Math.max(96, fumble - 1);
    const lookup = [
      { limit: hyperCritical, result: AbilitySuccessLevelEnum.HyperCritical },
      { limit: specialCritical, result: AbilitySuccessLevelEnum.SpecialCritical },
      { limit: critical, result: AbilitySuccessLevelEnum.Critical },
      { limit: special, result: AbilitySuccessLevelEnum.Special },
      { limit: success, result: AbilitySuccessLevelEnum.Success },
      { limit: fail, result: AbilitySuccessLevelEnum.Failure },
      { limit: Infinity, result: AbilitySuccessLevelEnum.Fumble },
    ];
    return lookup.filter((v) => roll <= v.limit)[0].result;
  }
}

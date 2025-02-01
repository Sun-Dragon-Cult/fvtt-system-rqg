import type { CombatManeuver, UsageType } from "../data-model/item-data/weaponData";
import type { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { Modifier } from "../rolls/AbilityRoll/AbilityRoll.types";

export type DefenceType = "parry" | "dodge" | "ignore";
export type AttackState = "Attacked" | "Defended" | "DamageRolled";

export type AttackDialogOptions = {
  attackState: AttackState;
  defenceType: DefenceType;
  chatMessageId: string;
  attackerToken: Token;
  defenderToken: Token;
  naturalSkill: number; // Unmodified chance
  weaponName?: string; // Skill name
  weaponImg?: string;
  combatManeuver?: CombatManeuver;
  usage?: UsageType;
  modifiers?: Modifier[];
  useSpecialCriticals?: boolean;
  speaker?: ChatSpeakerDataProperties;
};

import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import type { RqgActor } from "../../actors/rqgActor";
import type { UsageType } from "../../data-model/item-data/weaponData";
import type { DefenceType } from "../../chat/RqgChatMessage.types";

/** "fake" item to be able to handle reputation as Ability rolls */
export type PartialAbilityItem = {
  name: string | null;
  type?: ItemTypeEnum;
  img: string | null;
  system: { chance: number };
  parent?: RqgActor | null;
  checkExperience?: (result: AbilitySuccessLevelEnum | undefined) => Promise<void>;
};

export type DefenceDialogHandlebarsData = {
  defenceName: string | null;
  // abilityType?: string;
  // abilityImg: string | null;
  defenceChance: number;

  object: DefenceDialogObjectData;
  options: FormApplication.Options;
  title: string;
  defendingActorOptions: Record<string, string>;
  defenceOptions: Record<string, string>;
  parryingWeaponOptions: Record<string, string>;
  parryingWeaponUsageOptions: Record<string, string>;
  augmentOptions: Record<string, string>; // TODO Actually <number, string>
  subsequentDefendOptions: Record<string, string>; // TODO Actually <number, string>
  totalChance: number;
};

export type DefenceDialogObjectData = {
  defendingActorUuid: string | undefined;
  defence: DefenceType | undefined;
  parryingWeaponUuid: string | undefined;
  parryingWeaponUsage: UsageType | undefined;
  defenceItemUuid: string | undefined; // Could be a weapon skill or the Dodge skill
  augmentModifier: string;
  subsequentDefendModifier: string;
  otherModifier: string;
  otherModifierDescription: string;
};

import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import type { RqgActor } from "../../actors/rqgActor";

/** "fake" item to be able to handle reputation as Ability rolls */
export type PartialAbilityItem = {
  name: string | null;
  type?: ItemTypeEnum;
  img: string | null;
  system: { chance: number };
  parent?: RqgActor | null;
  checkExperience?: (result: AbilitySuccessLevelEnum | undefined) => Promise<void>;
};

export type AbilityRollDialogHandlebarsData = {
  abilityName: string | null;
  abilityType?: string;
  abilityImg: string | null;
  abilityChance: number;

  object: AbilityRollDialogObjectData;
  options: FormApplication.Options;
  title: string;
  augmentOptions: Record<string, string>; // TODO Actually <number, string>
  meditateOptions: Record<string, string>; // TODO Actually <number, string>
  totalChance: number;
};

export type AbilityRollDialogObjectData = {
  augmentModifier: string;
  meditateModifier: string;
  otherModifier: string;
  otherModifierDescription: string;
};

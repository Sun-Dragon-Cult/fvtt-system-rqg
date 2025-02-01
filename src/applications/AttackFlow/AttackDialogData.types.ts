import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import type { RqgActor } from "../../actors/rqgActor";
import type { UsageType } from "../../data-model/item-data/weaponData";
import type { RqgItem } from "../../items/rqgItem";

/** "fake" item to be able to handle reputation as Ability rolls */
export type PartialAbilityItem = {
  name: string | null;
  type?: ItemTypeEnum;
  img: string | null;
  system: { chance: number };
  parent?: RqgActor | null;
  checkExperience?: (result: AbilitySuccessLevelEnum | undefined) => Promise<void>;
};

export type AttackDialogHandlebarsData = {
  // abilityName: string | null;
  // abilityType?: string;
  // abilityImg: string | null;
  weaponItem: RqgItem;
  abilityChance: number;

  object: AttackDialogObjectData;
  options: FormApplication.Options;
  title: string;
  usageTypeOptions: Record<string, string>;
  augmentOptions: Record<string, string>; // TODO Actually <number, string>
  damageBonusSourceOptions: Record<string, string>;
  totalChance: number;
};

export type AttackDialogObjectData = {
  usageType: UsageType;
  augmentModifier: string;
  proneTarget: boolean;
  unawareTarget: boolean;
  darkness: boolean;
  otherModifier: string;
  otherModifierDescription: string;
  /** In the dialog it should be in the format `id:db` where the part before the colon is there to keep the select options unique */
  attackDamageBonus: string;
};

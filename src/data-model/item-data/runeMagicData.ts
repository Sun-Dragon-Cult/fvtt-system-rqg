import { ItemTypeEnum } from "./itemTypes";
import { Spell, SpellConcentrationEnum, SpellDurationEnum, SpellRangeEnum } from "./spell";
import { RqidLink } from "../shared/rqidLink";

export interface RuneMagicDataSourceData extends Spell {
  /** The cult this rune magic is learned from and where to draw rune points */
  cultId: string;
  /** Array of runes that can be used with this spell */
  runeRqidLinks: RqidLink[]; //
  /** Can the caster decide the number of rune points used */
  isStackable: boolean;
  /** Reduce max POW by the number of RP cast */
  isOneUse: boolean;
}

// --- Derived Data ---
export interface RuneMagicDataPropertiesData extends RuneMagicDataSourceData {
  /** Derived: Calculated from rune & cult items on the same actor */
  chance: number;
}

export interface RuneMagicDataSource {
  type: ItemTypeEnum.RuneMagic;
  system: RuneMagicDataSourceData;
}

export interface RuneMagicDataProperties {
  type: ItemTypeEnum.RuneMagic;
  system: RuneMagicDataPropertiesData;
}

export const defaultRuneMagicData: RuneMagicDataSourceData = {
  descriptionRqidLink: undefined,
  cultId: "",
  runeRqidLinks: [],
  points: 0,
  castingRange: SpellRangeEnum.Ranged,
  duration: SpellDurationEnum.Temporal,
  concentration: SpellConcentrationEnum.Passive,
  isRitual: false,
  isStackable: false,
  isOneUse: false,
  isEnchantment: false,
};

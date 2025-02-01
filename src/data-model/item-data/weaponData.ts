import { defaultPriceData, IPhysicalItem } from "./IPhysicalItem";
import { defaultResource, Resource } from "../shared/resource";
import { ItemTypeEnum } from "./itemTypes";
import { RqidLink } from "../shared/rqidLink";

export const damageType = {
  Crush: "crush",
  Slash: "slash",
  Impale: "impale",
  Parry: "parry",
  Special: "special",
} as const;
export type DamageType = (typeof damageType)[keyof typeof damageType];

export type UsageType = "oneHand" | "twoHand" | "offHand" | "missile";

export type CombatManeuver = {
  //** name used to identify this maneuver */
  name: string;
  damageType: DamageType;
  description?: string;
};

export type Usage = {
  /** The corresponding skill */
  skillRqidLink: RqidLink | undefined;
  combatManeuvers: CombatManeuver[];
  /** Weapon damage formula */
  damage: string;
  minStrength: number;
  minDexterity: number;
  //** Melee weapon SR */
  strikeRank?: number;
};

export interface WeaponDataSourceData extends IPhysicalItem {
  /** This weapon can be used with different skills etc depending on usage */
  usage: {
    [K in UsageType]: Usage;
  };
  defaultUsage: UsageType | undefined; // Used to remember how the actor used it lastly
  hitPoints: Resource;
  /** E.g. arm or --- instead of a number TODO Switch to hitLocation rqidLink */
  hitPointLocation: string;
  description: string;
  /** E.g. Fist, Grapple, Spit */
  isNatural: boolean;

  // --- missile weapon specific ---

  /** 0 =  s/mr (multiple/mr), 1 = 1/mr, 2 = 1/2mr, 3 = 1/3mr, 5 = 1/5mr */
  rate: number;
  /** meters at full chance, up to range*1.5 = 1/2 chance, up to range*2 1/4 chance */
  range: number;

  /** Can this weapon be used as a projectile - arrows for example */
  isProjectile: boolean;
  /** No damage bonus & uses projectiles */
  isProjectileWeapon: boolean;
  /** If true add half DB, if false it's projectile with no db */
  isThrownWeapon: boolean;
  /** No damage bonus & no linked projectile - lasso for example */
  isRangedWeapon: boolean;
  /** ItemId of ammunition for this projectile weapon */
  projectileId: string;
}

// --- Derived Data ---
export interface WeaponDataPropertiesData extends WeaponDataSourceData {}

export interface WeaponDataSource {
  type: ItemTypeEnum.Weapon;
  system: WeaponDataSourceData;
}

export interface WeaponDataProperties {
  type: ItemTypeEnum.Weapon;
  system: WeaponDataPropertiesData;
}

export const defaultWeaponData: WeaponDataSourceData = {
  usage: {
    oneHand: {
      skillRqidLink: undefined,
      combatManeuvers: [],
      damage: "",
      minStrength: 0,
      minDexterity: 0,
      strikeRank: 0,
    },
    offHand: {
      // All but skillRqidLink should normally be equal to oneHand
      skillRqidLink: undefined,
      combatManeuvers: [],
      damage: "",
      minStrength: 0,
      minDexterity: 0,
      strikeRank: 0,
    },
    twoHand: {
      skillRqidLink: undefined,
      combatManeuvers: [],
      damage: "",
      minStrength: 0,
      minDexterity: 0,
      strikeRank: 0,
    },
    missile: {
      skillRqidLink: undefined,
      combatManeuvers: [],
      damage: "",
      minStrength: 0,
      minDexterity: 0,
    },
  },
  defaultUsage: undefined,
  description: "",
  gmNotes: "",
  hitPoints: defaultResource,
  hitPointLocation: "",
  encumbrance: 0,
  location: "",
  attunedTo: "",
  physicalItemType: "unique",
  quantity: 1,
  isContainer: false,
  price: defaultPriceData,
  isNatural: false,
  equippedStatus: "carried",
  rate: 0,
  range: 0,
  isProjectile: false,
  isProjectileWeapon: false,
  isThrownWeapon: false,
  isRangedWeapon: false,
  projectileId: "",
};

import type { RqgItem } from "../items/rqgItem";

export type CombatOutcome = {
  // /** The base amount of damage to start calculations from */
  // attackerWeaponDamage: number | undefined;
  // /** How much damage should be applied to the defenders parry weapon */
  // defenderWeaponDamage: number | undefined;
  /**
   * The evaluated damage roll. If no damage is done, it's undefined.
   */
  damageRoll: Roll | undefined;
  /**
   * How much damage should be applied to either the defenders parry weapon
   * or the attacking weapon, if any. Which weapon it applies to is calculated elsewhere.
   */
  weaponDamage: number | undefined;
  /** The weapon (if any) that should be damaged */
  damagedWeapon: RqgItem | undefined;
  /** How much damage should be applied to the defenders hitlocation, AP not subtracted yet */
  defenderHitLocationDamage: number | undefined;
  /**
   * The hit location that should get the damage can be either the parry weapon HL (true)
   * or from the D20 roll (false)
   */
  useParryHitLocation: boolean;
  // /** If true don't use D20 roll, but the hit location of the parrying weapon instead */
  // parryingHitLocation: boolean;
  /** Do not subtract armor when applying damage to a hit location */
  ignoreDefenderAp: boolean;
};

export type DamagedWeapon = "parryWeapon" | "attackingWeapon" | "none";
export type DamageDegree = "none" | "normal" | "special" | "maxSpecial";

export type AttackDamages = {
  weaponDamage: number | undefined;
  defenderHitLocationDamage: number | undefined;
  parryingHitLocation: boolean;
};

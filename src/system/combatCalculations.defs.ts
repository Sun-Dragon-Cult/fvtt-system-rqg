import type { DamageDegree, DamagedWeapon } from "./combatCalculations.types";

/***************************************************
 *** From the rules Attack & Parry Results table ***
 ***************************************************/

/**
 * 2D array of what weapon is damaged, based on AbilitySuccessLevel. From the rules Attack & Parry Results table.
 * Defined as [attack success][parry success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
export const parryDamagedWeaponTable: readonly (DamagedWeapon | undefined)[][] = [
  // HyperCritical, SpecialCritical, Critical, Special, Success, Failure, Fumble Parry
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // HyperCritical Attack
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // SpecialCritical Attack
  [undefined, undefined, "parryWeapon", "parryWeapon", "parryWeapon", "none", "none"], // Critical Attack
  [undefined, undefined, "attackingWeapon", "parryWeapon", "parryWeapon", "none", "none"], // Special Attack
  [undefined, undefined, "attackingWeapon", "attackingWeapon", "parryWeapon", "none", "none"], // Success Attack
  [undefined, undefined, "attackingWeapon", "attackingWeapon", "attackingWeapon", "none", "none"], // Failure Attack
  [undefined, undefined, "attackingWeapon", "attackingWeapon", "attackingWeapon", "none", "none"], // Fumble Attack
];

/**
 * 2D array of ignore AP info, based on AbilitySuccessLevel. From the rules Attack & Parry Results table.
 * Defined as [attack success][parry success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
export const parryIgnoreApTable: readonly (boolean | undefined)[][] = [
  // HyperCritical, SpecialCritical, Critical, Special, Success, Failure, Fumble Dodge
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // HyperCritical Attack
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // SpecialCritical Attack
  [undefined, undefined, false, true, true, true, true], // Critical Attack
  [undefined, undefined, false, false, false, false, false], // Special Attack
  [undefined, undefined, false, false, false, false, false], // Success Attack
  [undefined, undefined, false, false, false, false, false], // Failure Attack
  [undefined, undefined, false, false, false, false, false], // Fumble Attack
];

/**
 * 2D array of damage amount info, based on AbilitySuccessLevel. From the rules Attack & Parry Results table.
 * Defined as [attack success][parry success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
export const parryDamageDegreeTable: readonly (DamageDegree | undefined)[][] = [
  // HyperCritical, SpecialCritical, Critical, Special, Success, Failure, Fumble Parry
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // HyperCritical Attack
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // SpecialCritical Attack
  [undefined, undefined, "normal", "maxSpecial", "maxSpecial", "maxSpecial", "maxSpecial"], // Critical Attack
  [undefined, undefined, "normal", "normal", "special", "special", "special"], // Special Attack
  [undefined, undefined, "special", "normal", "normal", "normal", "normal"], // Success Attack
  [undefined, undefined, "special", "special", "normal", "none", "normal"], // Failure Attack
  [undefined, undefined, "special", "special", "normal", "none", "none"], // Fumble Attack
];

/***************************************************
 *** From the rules Dodge Results table ***
 ***************************************************/

/**
 * 2D array of ignore AP info, based on AbilitySuccessLevel. From the rules Dodge Results table.
 * Defined as [attack success][dodge success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
export const dodgeIgnoreApTable: readonly (boolean | undefined)[][] = [
  // HyperCritical, SpecialCritical, Critical, Special, Success, Failure, Fumble Dodge
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // HyperCritical Attack
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // SpecialCritical Attack
  [undefined, undefined, false, false, true, true, true], // Critical Attack
  [undefined, undefined, false, false, false, false, false], // Special Attack
  [undefined, undefined, false, false, false, false, false], // Success Attack
  [undefined, undefined, false, false, false, false, false], // Failure Attack
  [undefined, undefined, false, false, false, false, false], // Fumble Attack
];

/**
 * 2D array of damage amount info, based on AbilitySuccessLevel. From the rules Dodge Results table.
 * Defined as [attack success][dodge success]
 * Does not include data for the unsupported HyperCritical & SpecialCritical
 */
export const dodgeDamageDegreeTable: readonly (DamageDegree | undefined)[][] = [
  // HyperCritical, SpecialCritical, Critical, Special, Success, Failure, Fumble Dodge
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // HyperCritical Attack
  [undefined, undefined, undefined, undefined, undefined, undefined, undefined], // SpecialCritical Attack
  [undefined, undefined, "none", "special", "special", "maxSpecial", "maxSpecial"], // Critical Attack
  [undefined, undefined, "none", "none", "special", "special", "special"], // Special Attack
  [undefined, undefined, "none", "none", "none", "normal", "normal"], // Success Attack
  [undefined, undefined, "none", "none", "none", "none", "none"], // Failure Attack
  [undefined, undefined, "none", "none", "none", "none", "none"], // Fumble Attack
];

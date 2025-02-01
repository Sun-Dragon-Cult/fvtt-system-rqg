import type { AttackDamages } from "./combatCalculations.types";

/**
 * calculations depending on attack-parry successLevel
 */
export const attackParryMap: Map<
  string,
  (damageRolled: number, parryingWeaponHp: number, attackingWeaponHp: number) => AttackDamages
> = new Map([
  ["2-2", critAttack_CritParry],
  ["2-3", critAttack_SpecialParry],
  ["2-4", critAttack_NormalParry],
  ["2-5", critAttack_FailParry],
  ["2-6", critAttack_FumbleParry],
  ["3-2", specialAttack_CritParry],
  ["3-3", specialAttack_SpecialParry],
  ["3-4", specialAttack_NormalParry],
  ["3-5", specialAttack_FailParry],
  ["3-6", specialAttack_FumbleParry],
  ["4-2", normalAttack_CritParry],
  ["4-3", normalAttack_SpecialParry],
  ["4-4", normalAttack_NormalParry],
  ["4-5", normalAttack_FailParry],
  ["4-6", normalAttack_FumbleParry],
  ["5-2", FailAttack_CritParry],
  ["5-3", FailAttack_SpecialParry],
  ["5-4", FailAttack_NormalParry],
  ["5-5", FailAttack_FailParry],
  ["5-6", FailAttack_FumbleParry],
  ["6-2", FumbleAttack_CritParry],
  ["6-3", FumbleAttack_SpecialParry],
  ["6-4", FumbleAttack_NormalParry],
  ["6-5", FumbleAttack_FailParry],
  ["6-6", FumbleAttack_FumbleParry],
]);

function critAttack_CritParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: damagePastParryWeapon,
    parryingHitLocation: true,
  };
}

function critAttack_SpecialParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: damagePastParryWeapon,
    parryingHitLocation: true,
  };
}

function critAttack_NormalParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: damagePastParryWeapon,
    parryingHitLocation: true,
  };
}

function critAttack_FailParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    parryingHitLocation: false,
  };
}

function critAttack_FumbleParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    parryingHitLocation: false,
  };
}

function specialAttack_CritParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

function specialAttack_SpecialParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: damagePastParryWeapon,
    parryingHitLocation: false,
  };
}

function specialAttack_NormalParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon,
    defenderHitLocationDamage: damagePastParryWeapon,
    parryingHitLocation: false,
  };
}

function specialAttack_FailParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    parryingHitLocation: false,
  };
}

function specialAttack_FumbleParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    parryingHitLocation: false,
  };
}

function normalAttack_CritParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

function normalAttack_SpecialParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

function normalAttack_NormalParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: damagePastParryWeapon,
    parryingHitLocation: true,
  };
}

function normalAttack_FailParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    parryingHitLocation: true,
  };
}

function normalAttack_FumbleParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    parryingHitLocation: true,
  };
}

function FailAttack_CritParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: damageRolled,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

function FailAttack_SpecialParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

function FailAttack_NormalParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}
function FailAttack_FailParry(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

function FailAttack_FumbleParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    parryingHitLocation: false,
  };
}

function FumbleAttack_CritParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: damageRolled,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

function FumbleAttack_SpecialParry(
  damageRolled: number,
  parryingWeaponHp: number,
  attackingWeaponHp: number,
): AttackDamages {
  const damagePastAttackWeapon = Math.max(0, damageRolled - attackingWeaponHp);
  return {
    weaponDamage: damagePastAttackWeapon,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

function FumbleAttack_NormalParry(
  damageRolled: number,
  parryingWeaponHp: number,
  attackingWeaponHp: number,
): AttackDamages {
  const damagePastAttackWeapon = Math.max(0, damageRolled - attackingWeaponHp);
  return {
    weaponDamage: damagePastAttackWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

function FumbleAttack_FailParry(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

function FumbleAttack_FumbleParry(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    parryingHitLocation: false,
  };
}

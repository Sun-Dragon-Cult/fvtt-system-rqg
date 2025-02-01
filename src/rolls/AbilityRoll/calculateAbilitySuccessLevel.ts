import { AbilitySuccessLevelEnum } from "./AbilityRoll.defs";

export function calculateAbilitySuccessLevel(
  rawChance: number,
  roll: number,
  useSpecialCriticals: boolean = false,
): AbilitySuccessLevelEnum {
  const chance = Math.max(0, rawChance);

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
  return lookup.find((v) => roll <= v.limit)!.result;
}

import { AbilitySuccessLevelEnum } from "./AbilityRoll.defs";
import { calculateAbilitySuccessLevel } from "./calculateAbilitySuccessLevel";

describe("Evaluate Ability Roll Success Levels", () => {
  beforeEach(() => {
    (global as any).game = { settings: {} };
    (global as any).game.settings.get = jest.fn(() => true); // Enable hyper criticals etc
  });

  describe.each`
    targetChance | roll   | expectedSuccessLevel
    ${-99}       | ${95}  | ${AbilitySuccessLevelEnum.Failure}
    ${-99}       | ${96}  | ${AbilitySuccessLevelEnum.Fumble}
    ${1}         | ${95}  | ${AbilitySuccessLevelEnum.Failure}
    ${1}         | ${96}  | ${AbilitySuccessLevelEnum.Fumble}
    ${150}       | ${100} | ${AbilitySuccessLevelEnum.Fumble}
    ${11}        | ${96}  | ${AbilitySuccessLevelEnum.Failure}
    ${11}        | ${97}  | ${AbilitySuccessLevelEnum.Fumble}
    ${31}        | ${97}  | ${AbilitySuccessLevelEnum.Failure}
    ${31}        | ${98}  | ${AbilitySuccessLevelEnum.Fumble}
    ${51}        | ${98}  | ${AbilitySuccessLevelEnum.Failure}
    ${51}        | ${99}  | ${AbilitySuccessLevelEnum.Fumble}
    ${70}        | ${99}  | ${AbilitySuccessLevelEnum.Fumble}
    ${71}        | ${99}  | ${AbilitySuccessLevelEnum.Failure}
    ${71}        | ${100} | ${AbilitySuccessLevelEnum.Fumble}
    ${1}         | ${1}   | ${AbilitySuccessLevelEnum.Critical}
    ${1}         | ${2}   | ${AbilitySuccessLevelEnum.Success}
    ${1}         | ${5}   | ${AbilitySuccessLevelEnum.Success}
    ${1}         | ${6}   | ${AbilitySuccessLevelEnum.Failure}
    ${6}         | ${2}   | ${AbilitySuccessLevelEnum.Special}
    ${6}         | ${3}   | ${AbilitySuccessLevelEnum.Success}
    ${7}         | ${2}   | ${AbilitySuccessLevelEnum.Special}
    ${13}        | ${3}   | ${AbilitySuccessLevelEnum.Special}
    ${13}        | ${4}   | ${AbilitySuccessLevelEnum.Success}
    ${18}        | ${4}   | ${AbilitySuccessLevelEnum.Special}
    ${18}        | ${5}   | ${AbilitySuccessLevelEnum.Success}
    ${108}       | ${22}  | ${AbilitySuccessLevelEnum.Special}
    ${108}       | ${23}  | ${AbilitySuccessLevelEnum.Success}
    ${29}        | ${1}   | ${AbilitySuccessLevelEnum.Critical}
    ${29}        | ${2}   | ${AbilitySuccessLevelEnum.Special}
    ${30}        | ${2}   | ${AbilitySuccessLevelEnum.Critical}
    ${30}        | ${3}   | ${AbilitySuccessLevelEnum.Special}
    ${50}        | ${3}   | ${AbilitySuccessLevelEnum.Critical}
    ${50}        | ${4}   | ${AbilitySuccessLevelEnum.Special}
    ${70}        | ${4}   | ${AbilitySuccessLevelEnum.Critical}
    ${70}        | ${5}   | ${AbilitySuccessLevelEnum.Special}
    ${110}       | ${6}   | ${AbilitySuccessLevelEnum.Critical}
    ${110}       | ${7}   | ${AbilitySuccessLevelEnum.Special}
    ${999}       | ${100} | ${AbilitySuccessLevelEnum.Fumble}
    ${999}       | ${96}  | ${AbilitySuccessLevelEnum.Failure}
    ${100}       | ${1}   | ${AbilitySuccessLevelEnum.HyperCritical}
    ${101}       | ${2}   | ${AbilitySuccessLevelEnum.SpecialCritical}
    ${101}       | ${3}   | ${AbilitySuccessLevelEnum.Critical}
  `("targetChance $targetChance & roll $roll", ({ targetChance, roll, expectedSuccessLevel }) => {
    it(`should return ${expectedSuccessLevel}`, async () => {
      const successLevel = calculateAbilitySuccessLevel(targetChance, roll, true);
      expect(successLevel).toBe(expectedSuccessLevel);
    });
  });
});

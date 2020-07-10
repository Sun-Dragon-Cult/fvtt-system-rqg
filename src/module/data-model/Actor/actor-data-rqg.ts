import {Attributes, emptyAttributes} from "./attributes";
import {Characteristics, emptyHumanoidCharacteristics} from "./characteristics";
import {basicElementalRunes, ElementalRunes} from "./elemental-runes";
import {basicPowerRunes, PowerRunes} from "./power-runes";
import {RaceEnum} from "./race";
import {emptyHumanoidHitLocations, HitLocation} from "./hit-location";

export class ActorDataRqg {
  constructor(
    public characteristics: Characteristics,
    public hitLocations: Array<HitLocation>, // Different races can have different hit locations
    public attributes: Attributes,
    public elements: ElementalRunes,
    public powers: PowerRunes,
    public race: RaceEnum = RaceEnum.Humanoid
  ) {
  };
}

export const emptyActorDataRqg: ActorDataRqg = new ActorDataRqg(
  emptyHumanoidCharacteristics,
  emptyHumanoidHitLocations,
  emptyAttributes,
  basicElementalRunes,
  basicPowerRunes
);

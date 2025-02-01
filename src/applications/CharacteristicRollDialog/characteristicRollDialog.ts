import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import {
  CharacteristicRollDialogHandlebarsData,
  CharacteristicRollDialogObjectData,
} from "./CharacteristicRollDialogData.types";
import { localize, RqgError } from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import { CharacteristicRollOptions } from "../../rolls/CharacteristicRoll/CharacteristicRoll.types";
import { CharacteristicRoll } from "../../rolls/CharacteristicRoll/CharacteristicRoll";

export class CharacteristicRollDialog extends FormApplication<
  FormApplication.Options,
  CharacteristicRollDialogHandlebarsData,
  CharacteristicRollDialogObjectData
> {
  private augmentOptions = {
    "0": "RQG.Dialog.Common.AugmentOptions.None",
    "50": "RQG.Dialog.Common.AugmentOptions.CriticalSuccess",
    "30": "RQG.Dialog.Common.AugmentOptions.SpecialSuccess",
    "20": "RQG.Dialog.Common.AugmentOptions.Success",
    "-20": "RQG.Dialog.Common.AugmentOptions.Failure",
    "-50": "RQG.Dialog.Common.AugmentOptions.Fumble",
  };

  private meditateOptions = {
    "0": "RQG.Dialog.Common.MeditateOptions.None",
    "5": "RQG.Dialog.Common.MeditateOptions.1mr",
    "10": "RQG.Dialog.Common.MeditateOptions.2mr",
    "15": "RQG.Dialog.Common.MeditateOptions.5mr",
    "20": "RQG.Dialog.Common.MeditateOptions.25mr",
    "25": "RQG.Dialog.Common.MeditateOptions.50mr",
  };

  private difficultyOptions = {
    "0": localize("RQG.Game.RollDifficultyLevel.0") + " (/2)",
    "1": localize("RQG.Game.RollDifficultyLevel.1") + " (*1)",
    "2": localize("RQG.Game.RollDifficultyLevel.2") + " (*2)",
    "3": localize("RQG.Game.RollDifficultyLevel.3") + " (*3)",
    "4": localize("RQG.Game.RollDifficultyLevel.4") + " (*4)",
    "5": localize("RQG.Game.RollDifficultyLevel.5") + " (*5)",
    "6": localize("RQG.Game.RollDifficultyLevel.6") + " (*6)",
  };

  private actor: RqgActor;
  constructor(
    actor: RqgActor,
    options: Partial<CharacteristicRollOptions> &
      Pick<CharacteristicRollOptions, "characteristicName">,
  ) {
    const formData: CharacteristicRollDialogObjectData = {
      difficulty: 5,
      augmentModifier: "0",
      meditateModifier: "0",
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.CharacteristicRoll.OtherModifier"),
    };

    options.characteristicValue = (actor.system.characteristics as any)[
      options.characteristicName
    ]?.value;
    if (options.characteristicValue == null) {
      throw new RqgError("tried to create Characteristic roll dialog without a value");
    }
    super(formData, options as any);
    this.actor = actor;
    this.object = formData;
  }

  get id() {
    // @ts-expect-error characteristicName
    return `${this.constructor.name}-${this.options.characteristicName}`;
  }

  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "roll-dialog", "characteristic-roll-dialog"],
      popOut: true,
      template: templatePaths.characteristicRollDialog,
      width: 400,
      left: 35,
      top: 15,
      title: "RQG.Dialog.CharacteristicRoll.Title",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  async getData(): Promise<CharacteristicRollDialogHandlebarsData> {
    const o = this.options as unknown as CharacteristicRollOptions;
    const characteristicName = o.characteristicName ?? "";
    const characteristicValue =
      (this.actor.system.characteristics as any)[characteristicName]?.value ?? 0;
    return {
      characteristicValue: characteristicValue,
      characteristicName: o.characteristicName ?? null,
      object: this.object,
      options: this.options,
      title: this.title,
      augmentOptions: this.augmentOptions,
      meditateOptions: this.meditateOptions,
      difficultyOptions: this.difficultyOptions,
      totalChance:
        Number(characteristicValue) * this.getDifficulty(this.object.difficulty) +
        Number(this.object.augmentModifier ?? 0) +
        Number(this.object.meditateModifier ?? 0) +
        Number(this.object.otherModifier ?? 0),
    };
  }

  activateListeners(html: JQuery): void {
    const o = this.options as unknown as CharacteristicRollOptions;
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLElement>("[data-characteristic-roll]").forEach((el) => {
      el.addEventListener("click", async () => {
        const options: CharacteristicRollOptions = {
          characteristicValue: o.characteristicValue,
          characteristicName: o.characteristicName,
          difficulty: this.getDifficulty(this.object.difficulty),
          modifiers: [
            {
              value: Number(this.object.augmentModifier),
              description: localize("RQG.Roll.CharacteristicRoll.Augment"),
            },
            {
              value: Number(this.object.meditateModifier),
              description: localize("RQG.Roll.CharacteristicRoll.Meditate"),
            },
            {
              value: Number(this.object.otherModifier),
              description: this.object.otherModifierDescription,
            },
          ],
          speaker: ChatMessage.getSpeaker({
            actor: this.actor,
          }),
        };

        const roll = await CharacteristicRoll.rollAndShow(options);
        if (!roll.successLevel) {
          throw new RqgError("Evaluated CharacteristicRoll didn't give successLevel");
        }
        await this.actor.checkExperience(o.characteristicName ?? "", roll.successLevel);
      });
    });

    super.activateListeners(html);
  }

  async _updateObject(event: Event, formData: CharacteristicRollDialogObjectData): Promise<void> {
    this.object = formData;
    this.render(true);
  }

  private getDifficulty(difficulty: number | string | undefined): number {
    const diff = Number(difficulty);
    const d = isNaN(diff) ? 5 : diff; // default to 5
    return d === 0 ? 0.5 : d; // half chance is represented by 0 in the select options
  }
}

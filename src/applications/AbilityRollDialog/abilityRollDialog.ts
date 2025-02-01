import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import {
  AbilityRollDialogHandlebarsData,
  AbilityRollDialogObjectData,
  PartialAbilityItem,
} from "./AbilityRollDialogData.types";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import { localize, RqgError, toKebabCase, trimChars } from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";

export class AbilityRollDialog<T extends PartialAbilityItem> extends FormApplication<
  FormApplication.Options,
  AbilityRollDialogHandlebarsData,
  AbilityRollDialogObjectData
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

  private abilityItem: T; // A fake reduced RqgItem to make reputation rolls work
  constructor(abilityItem: T, options: Omit<AbilityRollOptions, "naturalSkill"> = {}) {
    const formData: AbilityRollDialogObjectData = {
      augmentModifier: "0",
      meditateModifier: "0",
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.AbilityRoll.OtherModifier"),
    };

    super(formData, options as any);
    this.abilityItem = abilityItem;
    this.object = formData;
  }

  get id() {
    return `${this.constructor.name}-${trimChars(toKebabCase(this.abilityItem.name ?? ""), "-")}`;
  }

  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "roll-dialog", "ability-roll-dialog"],
      popOut: true,
      template: templatePaths.abilityRollDialog,
      width: 400,
      left: 35,
      top: 15,
      title: "RQG.Dialog.AbilityRoll.Title",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  async getData(): Promise<AbilityRollDialogHandlebarsData> {
    return {
      abilityName: this.abilityItem.name,
      abilityChance: this.abilityItem.system.chance,
      abilityType: this.abilityItem.type,
      abilityImg: this.abilityItem.img,
      object: this.object,
      options: this.options,
      title: this.title,
      augmentOptions: this.augmentOptions,
      meditateOptions: this.meditateOptions,
      totalChance:
        Number(this.abilityItem.system.chance ?? 0) +
        Number(this.object.augmentModifier ?? 0) +
        Number(this.object.meditateModifier ?? 0) +
        Number(this.object.otherModifier ?? 0),
    };
  }

  activateListeners(html: JQuery): void {
    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLElement>("[data-ability-roll]").forEach((el) => {
      el.addEventListener("click", async () => {
        const options: AbilityRollOptions = {
          naturalSkill: this.abilityItem.system.chance,
          modifiers: [
            {
              value: Number(this.object.augmentModifier),
              description: localize("RQG.Roll.AbilityRoll.Augment"),
            },
            {
              value: Number(this.object.meditateModifier),
              description: localize("RQG.Roll.AbilityRoll.Meditate"),
            },
            {
              value: Number(this.object.otherModifier),
              description: this.object.otherModifierDescription,
            },
          ],
          abilityName: this.abilityItem.name ?? undefined,
          abilityType: this.abilityItem.type ?? undefined,
          abilityImg: this.abilityItem.img ?? undefined,
          speaker: ChatMessage.getSpeaker({
            actor: this.abilityItem.parent as RqgActor | undefined,
          }),
          // resultMessages?: Map<AbilitySuccessLevelEnum | undefined, string>; // TODO Idea - add fields in IAbility to specify text specific for an ability
        };

        // Bypasses item.abilityRollImmediate to make reputation rolls work (they are not an item)
        const roll = await AbilityRoll.rollAndShow(options);
        if (!roll.successLevel) {
          throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
        }
        await this.abilityItem.checkExperience?.(roll.successLevel);
      });
    });

    super.activateListeners(html);
  }

  async _updateObject(event: Event, formData: AbilityRollDialogObjectData): Promise<void> {
    this.object = formData;
    this.render(true);
  }
}

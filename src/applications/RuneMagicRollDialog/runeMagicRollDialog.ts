import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import {
  RuneMagicRollDialogHandlebarsData,
  RuneMagicRollDialogObjectData,
} from "./RuneMagicRollDialogData.types";
import { localize, RqgError, toKebabCase, trimChars } from "../../system/util";
import type { RqgActor } from "../../actors/rqgActor";
import type { RqgItem } from "../../items/rqgItem";
import { RuneMagic } from "../../items/rune-magic-item/runeMagic";
import { RuneMagicRollOptions } from "../../rolls/RuneMagicRoll/RuneMagicRoll.types";

export class RuneMagicRollDialog extends FormApplication<
  FormApplication.Options,
  RuneMagicRollDialogHandlebarsData,
  RuneMagicRollDialogObjectData
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

  private ritualOptions = {
    "30": "RQG.Dialog.Common.RitualOptions.30min",
    "35": "RQG.Dialog.Common.RitualOptions.1h",
    "40": "RQG.Dialog.Common.RitualOptions.5h",
    "45": "RQG.Dialog.Common.RitualOptions.10h",
    "50": "RQG.Dialog.Common.RitualOptions.1d",
    "55": "RQG.Dialog.Common.RitualOptions.2d",
    "60": "RQG.Dialog.Common.RitualOptions.1week",
    "70": "RQG.Dialog.Common.RitualOptions.4weeks",
    "75": "RQG.Dialog.Common.RitualOptions.1season",
    "80": "RQG.Dialog.Common.RitualOptions.1year",
    "85": "RQG.Dialog.Common.RitualOptions.2years",
    "90": "RQG.Dialog.Common.RitualOptions.5years",
    "95": "RQG.Dialog.Common.RitualOptions.10years",
    "100": "RQG.Dialog.Common.RitualOptions.20years",
  };

  private spellItem: RqgItem;
  private eligibleRunes: RqgItem[];
  private eligibleRuneOptions: Record<string, string>;

  constructor(runeMagicSpellItem: RqgItem, options: Partial<RuneMagicRollOptions> = {}) {
    const formData: RuneMagicRollDialogObjectData = {
      levelUsed: runeMagicSpellItem.system.points,
      usedRuneId: options.usedRune?.id ?? "",
      boost: 0,
      augmentModifier: "0",
      meditateModifier: "0",
      otherModifier: "0",
      otherModifierDescription: localize("RQG.Dialog.RuneMagicRoll.OtherModifier"),
    };

    super(formData, options as any);
    this.spellItem = runeMagicSpellItem;
    this.eligibleRunes = RuneMagic.getEligibleRunes(this.spellItem);
    formData.usedRuneId = RuneMagic.getStrongestRune(this.eligibleRunes)?.id ?? "";
    this.eligibleRuneOptions = this.eligibleRunes.reduce(
      (acc, r) => ({ ...acc, [r.id ?? ""]: r.name }),
      {},
    );
    this.object = formData;
  }

  get id() {
    return `${this.constructor.name}-${trimChars(toKebabCase(this.spellItem.name ?? ""), "-")}`;
  }

  static get defaultOptions(): FormApplication.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "roll-dialog", "rune-magic-roll-dialog"],
      popOut: true,
      template: templatePaths.runeMagicRollDialog,
      width: 400,
      left: 35,
      top: 15,
      title: "RQG.Dialog.RuneMagicRoll.Title",
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      resizable: true,
    });
  }

  async getData(): Promise<RuneMagicRollDialogHandlebarsData> {
    const usedRune = this.getUsedRune();
    return {
      spell: this.spellItem,
      usedRune: usedRune,
      object: this.object,
      options: this.options,
      title: this.title,
      eligibleRuneOptions: this.eligibleRuneOptions,
      augmentOptions: this.augmentOptions,
      meditateOptions: this.meditateOptions,
      ritualOptions: this.ritualOptions,
      totalChance:
        Number(usedRune?.system.chance ?? 0) +
        Number(this.object.augmentModifier ?? 0) +
        Number(this.object.meditateModifier ?? 0) +
        Number(this.object.otherModifier ?? 0),
    };
  }

  private getUsedRune(): RqgItem {
    const usedRune = this.eligibleRunes.find((r) => r.id === this.object.usedRuneId);

    const usedOrStrongestRune = usedRune
      ? usedRune
      : RuneMagic.getStrongestRune(this.eligibleRunes);
    if (!usedOrStrongestRune) {
      throw new RqgError("Couldn't find a matching rune when casting rune magic spell");
    }
    return usedOrStrongestRune;
  }

  activateListeners(html: JQuery): void {
    const o = this.object;
    const usedRune = this.getUsedRune();
    const actor = this.spellItem.parent as RqgActor | undefined;
    const cult = actor?.items.find((i) => i.id === this.spellItem.system.cultId);
    if (!cult) {
      const msg = "No cult to cast the rune magic spell";
      throw new RqgError(msg);
    }

    // Do the roll to chat
    html[0]?.querySelectorAll<HTMLElement>("[data-rune-magic-roll]").forEach((el) => {
      el.addEventListener("click", async () => {
        const options: RuneMagicRollOptions = {
          usedRune: usedRune,
          runeMagicItem: this.spellItem,
          levelUsed: o.levelUsed,
          magicPointBoost: o.boost,
          modifiers: [
            {
              value: Number(o.augmentModifier),
              description: localize("RQG.Roll.RuneMagicRoll.Augment"),
            },
            {
              value: Number(o.meditateModifier),
              description:
                Number(o.meditateModifier) >= 30
                  ? localize("RQG.Roll.RuneMagicRoll.Ritual")
                  : localize("RQG.Roll.RuneMagicRoll.Meditate"),
            },
            {
              value: Number(o.otherModifier),
              description: o.otherModifierDescription,
            },
          ],
          speaker: ChatMessage.getSpeaker({
            actor: actor,
          }),
        };
        const validationError = RuneMagic.hasEnoughToCastSpell(cult, o.levelUsed, o.boost);
        if (validationError) {
          ui.notifications?.warn(validationError);
          return;
        }

        await this.spellItem.runeMagicRollImmediate(options);
      });
    });

    super.activateListeners(html);
  }

  async _updateObject(event: Event, formData: RuneMagicRollDialogObjectData): Promise<void> {
    this.object = formData;
    this.render(true);
  }
}

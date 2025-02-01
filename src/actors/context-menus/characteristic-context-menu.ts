import { RqgActor } from "../rqgActor";
import { Characteristic, Characteristics } from "../../data-model/actor-data/characteristics";
import {
  getDomDataset,
  localize,
  localizeCharacteristic,
  requireValue,
  RqgError,
} from "../../system/util";
import { ActorDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";
import { showImproveCharacteristicDialog } from "../../applications/improveCharacteristicDialog";
import { contextMenuRunes } from "./contextMenuRunes";

export const characteristicMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | undefined,
): ContextMenu.Item[] => [
  {
    name: localize("RQG.Game.RollChat"),
    icon: contextMenuRunes.RollViaChat,
    condition: () => true,
    callback: async (el: JQuery) => {
      const { name: characteristicName } = getCharacteristic(actor, el);
      await actor.characteristicRoll(characteristicName);
    },
  },
  {
    name: localize("RQG.Game.RollCharacteristicQuick"),
    icon: contextMenuRunes.RollQuick,
    condition: () => true,
    callback: async (el: JQuery): Promise<void> => {
      const { name: characteristicName } = getCharacteristic(actor, el);
      await actor.characteristicRollImmediate(characteristicName);
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: contextMenuRunes.ToggleExperience,
    condition: (el: JQuery) => {
      const { name: characteristicName } = getCharacteristic(actor, el);
      return characteristicName === "power";
    },
    callback: async (): Promise<RqgActor | undefined> =>
      await actor.update({
        "system.characteristics.power.hasExperience":
          !actor.system.characteristics.power.hasExperience,
      }),
  },
  {
    name: localize("RQG.ContextMenu.ImproveItem", {
      itemType: localize("RQG.Actor.Characteristics.Characteristic"),
    }),
    icon: contextMenuRunes.Improve,
    condition: (el: JQuery): boolean => {
      const { name: characteristicName, value: char } = getCharacteristic(actor, el);
      // You can train STR, CON, DEX, POW, and CHA, and you can increase POW via experience
      // You cannot train INT or increase it via experience

      if (char == null || char.value == null || !Number.isNumeric(char.value)) {
        return false;
      }

      const trainable = ["strength", "constitution", "dexterity", "power", "charisma"];
      return trainable.includes(characteristicName);
    },
    callback: (el: JQuery) => {
      const charName = getDomDataset(el, "characteristic") as keyof Characteristics | undefined;
      requireValue(charName, localize("RQG.ContextMenu.Notification.DatasetNotFound"));

      const characteristic = actor.system.characteristics[charName];
      (characteristic as any).name = charName; // TODO adding extra properties that's not on type Characteristic
      const speakerName = token?.name ?? actor.prototypeToken.name ?? "";
      if (
        characteristic != null &&
        characteristic.value != null &&
        Number.isNumeric(characteristic.value)
      ) {
        showImproveCharacteristicDialog(actor, "characteristic", characteristic, speakerName);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.InitializeCharacteristic"),
    icon: contextMenuRunes.InitializeCharacteristics,
    condition: (el: JQuery): boolean => {
      if (actor.system.editMode) {
        const { value: char } = getCharacteristic(actor, el);
        return char.formula != null && Roll.validate(char.formula);
      } else {
        return false;
      }
    },
    callback: async (el: JQuery) => {
      const characteristic = getDomDataset(el, "characteristic") as
        | keyof Characteristics
        | undefined;
      requireValue(characteristic, localize("RQG.ContextMenu.Notification.DatasetNotFound"));
      const confirmed = await confirmInitializeDialog(actor.name ?? "", characteristic);
      if (confirmed) {
        await initializeCharacteristic(actor, characteristic);

        ui.notifications?.info(
          localize("RQG.ContextMenu.CharacteristicInitialized", {
            characteristicName: localizeCharacteristic(characteristic),
            actorName: actor.name,
          }),
        );
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.InitializeAllCharacteristics"),
    icon: contextMenuRunes.InitializeAllCharacteristics,
    condition: (): boolean => actor.system.editMode,
    callback: async () => {
      const confirmed = await confirmInitializeDialog(actor.name ?? "");
      if (confirmed) {
        await initializeAllCharacteristics(actor);
        ui.notifications?.info(
          localize("RQG.ContextMenu.AllCharacteristicsInitialized", { actorName: actor.name }),
        );
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.SetAllCharacteristicsToAverage"),
    icon: contextMenuRunes.SetAllCharacteristicsToAverage,
    condition: (): boolean => actor.system.editMode,
    callback: async () => {
      const confirmed = await confirmInitializeDialog(actor.name ?? "");
      if (confirmed) {
        await setAllCharacteristicsToAverage(actor);
        ui.notifications?.info(
          localize("RQG.ContextMenu.AllCharacteristicsSetToAverage", { actorName: actor.name }),
        );
      }
    },
  },
];

async function getCharacteristicUpdate(
  characteristic: string,
  formula: string | undefined,
): Promise<DeepPartial<ActorDataConstructorData & { system: any }>> {
  if (!formula || !Roll.validate(formula)) {
    return {
      system: { characteristics: { [characteristic]: { value: "" } } },
    };
  }

  const r = new Roll(formula, {});
  await r.evaluate({ async: true });
  return {
    system: { characteristics: { [characteristic]: { value: Number(r.total) } } },
  };
}

export async function initializeCharacteristic(
  actor: RqgActor,
  characteristic: string,
): Promise<void> {
  if (!actor.isOwner || characteristic == null) {
    return;
  }

  const char = actor.system.characteristics[characteristic as keyof Characteristics];

  let formula = char?.formula;

  if (formula == null || !Roll.validate(formula)) {
    formula = undefined;
  }

  const updateData = await getCharacteristicUpdate(characteristic, formula);
  await actor.update(updateData);
  await initializeCurrentDerivedAttributes(actor);
}

export async function initializeAllCharacteristics(actor: RqgActor): Promise<void> {
  const updateData = {};

  if (!actor.isOwner) {
    return;
  }

  for (const characteristic of Object.keys(actor.system.characteristics)) {
    const char = actor.system.characteristics[characteristic as keyof Characteristics];

    if (char == null) {
      continue;
    }

    let update = {};

    if (char.formula == null || !Roll.validate(char.formula)) {
      update = await getCharacteristicUpdate(characteristic, undefined);
    } else {
      update = await getCharacteristicUpdate(characteristic, char.formula);
    }

    foundry.utils.mergeObject(updateData, update);
  }
  await actor.update(updateData);
  await initializeCurrentDerivedAttributes(actor);
}

/** Sets actor's current hitPoints.value to the hitPoints.max */
async function initializeCurrentDerivedAttributes(actor: RqgActor) {
  if (actor.system.attributes.hitPoints.max != null) {
    const hpUpdate = {
      "system.attributes.hitPoints.value": actor.system.attributes.hitPoints.max,
      "system.attributes.magicPoints.value": actor.system.attributes.magicPoints.max,
    };
    await actor.update(hpUpdate);
  }
}

export async function setAllCharacteristicsToAverage(actor: RqgActor): Promise<void> {
  if (!actor.isOwner) {
    return;
  }

  const averages = {} as { [key: string]: number | undefined };

  const updateData = {};

  for (const characteristic of Object.keys(actor.system.characteristics)) {
    const char = actor.system.characteristics[characteristic as keyof Characteristics];

    if (char == null) {
      continue;
    }

    if (char.formula == null || char.formula == "" || !Roll.validate(char.formula)) {
      // no existing or valid formula
      averages["cannot average"] = undefined;
    } else if (!averages[char.formula]) {
      let avg = 0;
      if (Number.isNumeric(char.formula)) {
        // formula is literal number
        avg = Number.parseInt(char.formula);
      } else {
        // formula is dice expression
        const rolls = await Roll.simulate(char.formula, 5000);
        avg = rolls.reduce((a, b) => a + b) / rolls.length;
        const fraction = avg % 1;
        // Round generously because many dice expressions produce a mean right around X.5 or X.0
        if (fraction > 0.4 && fraction < 0.6) {
          avg = Math.ceil(avg);
        } else {
          avg = Math.round(avg);
        }
      }

      averages[char.formula] = avg;
    }

    const update = await getCharacteristicUpdate(
      characteristic,
      averages[char.formula || "cannot average"]?.toString(),
    );
    foundry.utils.mergeObject(updateData, update);
  }
  await actor.update(updateData);
  await initializeCurrentDerivedAttributes(actor);
}

function getCharacteristic(
  actor: RqgActor,
  el: JQuery,
): { name: keyof Characteristics; value: Characteristic } {
  const characteristicName = getDomDataset(el, "characteristic");
  const actorCharacteristics: Characteristics = actor.system.characteristics;
  if (characteristicName && characteristicName in actorCharacteristics) {
    return {
      name: characteristicName as keyof Characteristics,
      value: actorCharacteristics[characteristicName as keyof typeof actorCharacteristics],
    };
  } else {
    throw new RqgError(
      localize("RQG.Contextmenu.Notification.CharacteristicNotFound", {
        characteristicName: characteristicName,
        actorName: actor.name,
      }),
    );
  }
}

async function confirmInitializeDialog(
  actorName: string,
  characteristic: string = "",
): Promise<boolean> {
  return await new Promise((resolve) => {
    const title = characteristic
      ? localize("RQG.ContextMenu.OverwriteCharacteristicDialogTitle", {
          characteristicName: localizeCharacteristic(characteristic),
          actorName: actorName,
        })
      : localize("RQG.ContextMenu.OverwriteAllCharacteristicsDialogTitle", {
          actorName: actorName,
        });
    const content = characteristic
      ? localize("RQG.ContextMenu.OverwriteCharacteristicDialog", {
          characteristicName: localizeCharacteristic(characteristic),
        })
      : localize("RQG.ContextMenu.OverwriteAllCharacteristicsDialog");
    const dialog = new Dialog({
      title: title,
      content: content,
      default: "submit",
      buttons: {
        submit: {
          icon: '<i class="fas fa-check"></i>',
          label: localize("RQG.Dialog.Common.btnConfirm"),
          callback: () => {
            resolve(true);
          },
        },
        cancel: {
          label: localize("RQG.Dialog.Common.btnCancel"),
          icon: '<i class="fas fa-times"></i>',
          callback: () => {
            resolve(false);
          },
        },
      },
    });
    dialog.render(true);
  });
}

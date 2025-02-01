import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { IAbility } from "../data-model/shared/ability";
import { RqgItem } from "../items/rqgItem";
import { systemId } from "../system/config";
import {
  assertItemType,
  convertFormValueToString,
  localize,
  localizeItemType,
  RqgError,
} from "../system/util";
import { templatePaths } from "../system/loadHandlebarsTemplates";
import type { AbilityImprovementData } from "./improveAbilityDialog.types";
import { RqgCalculations } from "../system/rqgCalculations";
import type { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";

/** Shows a dialog for improving a Passion, Rune, or Skill */
export async function showImproveAbilityDialog(
  item: RqgItem | undefined,
  speaker: ChatSpeakerDataProperties,
): Promise<void> {
  if (!item) {
    throw new RqgError("Tried to show improve ability dialog without ability item");
  }
  const ability = item.system as IAbility;

  const adapter: AbilityImprovementData = {
    name: item.name ?? "",
    typeLocName: localizeItemType(item.type),
    abilityType: "skill",
    showExperience: ability.hasExperience ?? false,
    showTraining: true,
    img: item.img,
    chance: ability.chance || 0,
    chanceToGain: Math.max(100 - Number(ability.chance), 1),
    experienceGainFixed: 3,
    experienceGainRandom: "1d6",
    trainingGainFixed: 2,
    trainingGainRandom: "1d6-1",
  };

  switch (item.type) {
    case ItemTypeEnum.Skill: {
      updateAdaptorForSkill(adapter, item);
      break;
    }

    case ItemTypeEnum.Passion: {
      assertItemType(item?.type, ItemTypeEnum.Passion);
      adapter.abilityType = "passion";
      // Cannot train passions
      adapter.showTraining = false;
      break;
    }

    case ItemTypeEnum.Rune: {
      assertItemType(item?.type, ItemTypeEnum.Rune);
      adapter.abilityType = "rune";
      adapter.name = item.system.rune;
      break;
    }

    default: {
      ui.notifications?.error(
        "Call to submitImproveAbilityDialog with item that was not a Passion, Rune, or Skill",
      );
      return;
    }
  }

  const btnImprove = localize("RQG.Dialog.improveAbilityDialog.btnDoImprovement");
  const btnCancel = localize("RQG.Dialog.improveAbilityDialog.btnCancel");
  const buttons: any = {};
  if (adapter.showExperience || adapter.showTraining) {
    // There's at least one thing to do so show the Submit button
    buttons.submit = {
      icon: '<i class="fas fa-check"></i>',
      label: btnImprove,
      callback: async (html: JQuery) =>
        await submitImproveAbilityDialog(html, item, speaker, adapter),
    };
  }
  buttons.cancel = {
    icon: '<i class="fas fa-times"></i>',
    label: btnCancel,
    callback: () => null,
  };

  const title = localize("RQG.Dialog.improveAbilityDialog.title", {
    name: adapter.name,
    typeLocName: adapter.typeLocName,
  });
  const content: string = await renderTemplate(templatePaths.dialogImproveAbility, {
    adapter: adapter,
  });

  new Dialog(
    {
      title: title,
      content: content,
      default: "submit",
      buttons: buttons,
    },
    {
      classes: [systemId, "dialog"],
    },
  ).render(true);
}

function updateAdaptorForSkill(adapter: AbilityImprovementData, item: RqgItem) {
  assertItemType(item?.type, ItemTypeEnum.Skill);
  adapter.abilityType = "skill";
  const actor = item.parent;
  if (!actor) {
    throw new RqgError("Tried to improve a skill item that isn't embedded on an actor", item);
  }
  const pureCategoryMods = RqgCalculations.skillCategoryModifiers(
    actor.system.characteristics.strength.value,
    actor.system.characteristics.size.value,
    actor.system.characteristics.dexterity.value,
    actor.system.characteristics.intelligence.value,
    actor.system.characteristics.power.value,
    actor.system.characteristics.charisma.value,
    false,
  );

  const category = Object.keys(pureCategoryMods).find((cat) => cat === item.system.category) as
    | keyof typeof pureCategoryMods
    | undefined;

  adapter.categoryMod = pureCategoryMods[category ?? "otherSkills"];
  if (adapter.chance > 75) {
    //Cannot train skills over 75%
    adapter.showTraining = false;
    adapter.skillOver75 = true;
  }

  adapter.chance =
    // @ts-expect-error _source
    adapter.categoryMod + item._source.system.baseChance + item._source.system.gainedChance;
  adapter.chanceToGain = Math.max(100 - Number(adapter.chance), 1);
}

async function submitImproveAbilityDialog(
  html: JQuery,
  item: RqgItem,
  speaker: ChatSpeakerDataProperties,
  adapter: AbilityImprovementData,
): Promise<void> {
  const abilityData = item.system;
  const actor = item.parent;
  if (!actor) {
    throw new RqgError("Tried to improve item that isn't embedded on an actor", item);
  }

  const formData = new FormData(html.find("form")[0]);
  const gainType = convertFormValueToString(formData.get("experiencegaintype"));
  let gain: number = 0;

  if (gainType === "experience-gain-fixed" || gainType === "experience-gain-random") {
    if (abilityData.hasExperience) {
      const categoryMod: number = adapter.categoryMod || 0;
      const rollFlavor = localize("RQG.Dialog.improveAbilityDialog.experienceRoll.flavor", {
        actorName: speaker.alias,
        name: adapter.name,
        typeLocName: adapter.typeLocName,
      });
      let rollContent;
      if (adapter.abilityType === "skill") {
        rollContent = localize("RQG.Dialog.improveAbilityDialog.experienceRoll.contentSkill", {
          mod: categoryMod,
          skillChance: adapter.chance,
          name: adapter.name,
          typeLocName: adapter.typeLocName,
        });
      } else {
        rollContent = localize("RQG.Dialog.improveAbilityDialog.experienceRoll.contentOther", {
          chance: adapter.chance,
          name: adapter.name,
          typeLocName: adapter.typeLocName,
        });
      }

      // roll 1d100 and add the category mod if skill
      const maybeSkillCategoryMod =
        adapter.abilityType === "skill" ? `+${categoryMod}[category mod]` : "";

      const expRoll = new Roll("1d100" + maybeSkillCategoryMod);
      await expRoll.toMessage({
        speaker: speaker,
        // @ts-expect-error CHAT_MESSAGE_STYLES
        type: CONST.CHAT_MESSAGE_STYLES.ROLL,
        flavor: `<h3>${rollFlavor}</h3><p>${rollContent}</p>`,
      });

      // Gain if the modified d100 roll is greater than (but not equal to) the skill chance, or if the roll is greater than or equal to 100
      if (
        expRoll.total !== undefined &&
        (expRoll.total > Number(adapter.chance) || expRoll.total >= 100)
      ) {
        // increase ability gainedChance, clear experience check
        const resultFlavor = localize(
          "RQG.Dialog.improveAbilityDialog.experienceResultChat.flavor",
          { name: adapter.name, typeLocName: adapter.typeLocName },
        );
        if (gainType === "experience-gain-fixed") {
          const resultContentChoseFixed = localize(
            "RQG.Dialog.improveAbilityDialog.experienceResultChat.contentChoseFixed",
            { gain: adapter.experienceGainFixed + "%" },
          );
          const gainRoll = new Roll(String(adapter.experienceGainFixed));
          await gainRoll.toMessage({
            speaker: speaker,
            // @ts-expect-error CHAT_MESSAGE_STYLES
            type: CONST.CHAT_MESSAGE_STYLES.ROLL,
            flavor: `<h3>${resultFlavor}</h3><p>${resultContentChoseFixed}</p>`,
          });
          gain = adapter.experienceGainFixed;
        }
        if (gainType === "experience-gain-random") {
          const resultContentChoseRandom = localize(
            "RQG.Dialog.improveAbilityDialog.experienceResultChat.contentChoseRandom",
            { gain: adapter.experienceGainRandom + "%" },
          );
          const gainRoll = new Roll(adapter.experienceGainRandom);
          await gainRoll.toMessage({
            speaker: speaker,
            // @ts-expect-error CHAT_MESSAGE_STYLES
            type: CONST.CHAT_MESSAGE_STYLES.ROLL,
            flavor: `<h3>${resultFlavor}</h3><p>${resultContentChoseRandom}</p>`,
          });
          gain = Number(gainRoll.total) || 0;
        }
      } else {
        // no increase, clear experience check
        gain = 0;
        const failedFlavor = localize(
          "RQG.Dialog.improveAbilityDialog.experienceGainFailed.flavor",
          { name: adapter.name, typeLocName: adapter.typeLocName },
        );
        const failedContent = localize(
          "RQG.Dialog.improveAbilityDialog.experienceGainFailed.content",
          { actorName: speaker.alias, name: adapter.name, typeLocName: adapter.typeLocName },
        );
        const failChat = {
          speaker: speaker,
          // @ts-expect-error CHAT_MESSAGE_STYLES
          type: CONST.CHAT_MESSAGE_STYLES.OTHER,
          flavor: failedFlavor,
          content: failedContent,
        };
        await ChatMessage.create(failChat);
      }
    } else {
      const msg = localize("RQG.Dialog.improveAbilityDialog.notifications.noExperience", {
        actorName: speaker.alias,
        name: adapter.name,
        typeLocName: adapter.typeLocName,
      });
      ui.notifications?.error(msg);
    }
  }
  if (gainType === "training-gain-fixed") {
    const flavor = localize("RQG.Dialog.improveAbilityDialog.trainingResultChat.flavor", {
      name: adapter.name,
      typeLocName: adapter.typeLocName,
    });
    const content = localize(
      "RQG.Dialog.improveAbilityDialog.trainingResultChat.contentChoseFixed",
      { gain: adapter.trainingGainFixed + "%" },
    );
    const roll = new Roll(String(adapter.trainingGainFixed));
    await roll.toMessage({
      speaker: speaker,
      // @ts-expect-error CHAT_MESSAGE_STYLES
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      flavor: `<h3>${flavor}</h3><p>${content}</p>`,
    });
    gain = adapter.trainingGainFixed;
  }
  if (gainType === "training-gain-random") {
    const flavor = localize("RQG.Dialog.improveAbilityDialog.trainingResultChat.flavor", {
      name: adapter.name,
      typeLocName: adapter.typeLocName,
    });
    const content = localize(
      "RQG.Dialog.improveAbilityDialog.trainingResultChat.contentChoseRandom",
      { gain: adapter.trainingGainRandom + "%" },
    );
    const gainRoll = new Roll(adapter.trainingGainRandom);
    await gainRoll.toMessage({
      speaker: speaker,
      // @ts-expect-error CHAT_MESSAGE_STYLES
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      flavor: `<h3>${flavor}</h3><p>${content}</p>`,
    });
    gain = Number(gainRoll.total) || 0;
  }

  if (adapter.abilityType === "skill") {
    const newGainedChance: number = Number(abilityData.gainedChance) + gain;
    await item.update({
      system: { hasExperience: false, gainedChance: newGainedChance },
    });
  } else {
    const newChance: number = Number(abilityData.chance) + gain;
    await item.update({ system: { hasExperience: false, chance: newChance } });
  }
}

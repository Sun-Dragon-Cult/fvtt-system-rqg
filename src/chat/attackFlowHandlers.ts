import type { RqgItem } from "../items/rqgItem";
import {
  assertActorType,
  assertItemType,
  getGame,
  getGameUser,
  getRequiredDomDataset,
  localize,
  logMisconfiguration,
  requireValue,
  RqgError,
  usersIdsThatOwnActor,
} from "../system/util";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { DefenceType } from "./RqgChatMessage.types";
import { DefenceDialog } from "../applications/AttackFlow/defenceDialog";
import { systemId } from "../system/config";
import { templatePaths } from "../system/loadHandlebarsTemplates";
import { RqgActor } from "../actors/rqgActor";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { DamageCalculations } from "../system/damageCalculations";
import type { RqgChatMessage } from "./RqgChatMessage";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import { socketSend } from "../sockets/RqgSocket";

/**
 * Open the Defence Dialog to let someone defend against the attack
 */
export async function handleDefend(clickedButton: HTMLButtonElement): Promise<void> {
  const { chatMessageId, attackWeaponUuid } = await getChatMessageInfo(clickedButton);

  const attackingWeapon = (await fromUuid(attackWeaponUuid)) as RqgItem | undefined;
  assertItemType(attackingWeapon?.type, ItemTypeEnum.Weapon);
  const defence = getRequiredDomDataset(clickedButton, "defence") as DefenceType;
  await new DefenceDialog(attackingWeapon, {
    defenceType: defence,
    chatMessageId: chatMessageId,
  }).render(true);
}

/**
 * Roll Damage and hit location rolls and update AttackChat with new state
 */
export async function handleDamageAndHitlocation(clickedButton: HTMLButtonElement): Promise<void> {
  const { chatMessageId } = await getChatMessageInfo(clickedButton);

  const attackChatMessage = getGame().messages?.get(chatMessageId) as RqgChatMessage | undefined;
  if (!attackChatMessage) {
    // TODO Warn about missing chat message
    return;
  }

  const attackingWeaponUuid = attackChatMessage.getFlag(systemId, "chat.attackWeaponUuid") as
    | string
    | undefined;
  requireValue(attackingWeaponUuid, "No attacking weapon in chat data", attackChatMessage);
  const attackWeapon = await fromUuid(attackingWeaponUuid);

  const hitLocationRoll = AbilityRoll.fromData(
    attackChatMessage.getFlag(systemId, "chat.hitLocationRoll"),
  ) as Roll | undefined;
  await hitLocationRoll?.evaluate();

  // TODO const hitlocation = get target and find hitlocation from roll
  // const weaponDamage: string = attackChatMessage.getFlag(systemId, "chat.weaponDamage");
  const damageRoll = Roll.fromData(attackChatMessage.getFlag(systemId, "chat.damageRoll"));
  // await damageRoll.evaluate();  // TODO This is already evaluated in CombatOuitcome to calc weaponDamage

  const attackRoll = AbilityRoll.fromData(
    attackChatMessage.getFlag(systemId, "chat.attackRoll"),
  ) as AbilityRoll | undefined;
  const attackerActor = attackWeapon?.parent; // TODO or attackingActorUuid
  const defendingActor = await fromUuid(
    attackChatMessage.getFlag(systemId, "chat.defendingActorUuid"),
  );

  if (!attackRoll || !attackerActor || !defendingActor) {
    const msg = "Not enough data to calculate outcome";
    ui.notifications?.error(msg);
    console.error(`RQG | ${msg}`);
    return;
  }

  const messageData = attackChatMessage.toObject();
  foundry.utils.mergeObject(
    messageData,
    {
      flags: {
        [systemId]: {
          chat: {
            attackState: `DamageRolled`,
            damageRoll: damageRoll,
            hitLocationRoll: hitLocationRoll,
          },
        },
      },
    },
    { overwrite: true },
  );

  messageData.content = await renderTemplate(
    templatePaths.attackChatMessage,
    messageData.flags.rqg!.chat!,
  );

  // socketSend({
  //   action: "updateChatMessage",
  //   messageId: attackChatMessage.id ?? "",
  //   // @ts-expect-error author
  //   messageAuthorId: attackChatMessage.author.id,
  //   update: messageData,
  // });
  await attackChatMessage?.update(messageData);

  // TODO update chat with rolls

  // TODO just testing.. should be part of the attack message.
  hitLocationRoll?.toMessage();
  damageRoll?.toMessage();
}

/**
 * Apply previously rolled damage to the actor pointed to by the actor-damage button
 */
export async function handleApplyActorDamage(clickedButton: HTMLButtonElement): Promise<void> {
  const { chatMessageId } = await getChatMessageInfo(clickedButton);

  const attackChatMessage = getGame().messages?.get(chatMessageId);
  if (!attackChatMessage) {
    // TODO Warn about missing chat message
    return;
  }
  const damagedActorUuid = getRequiredDomDataset(clickedButton, "wounded-actor-uuid");
  const damagedActor = (await fromUuid(damagedActorUuid)) as RqgActor | undefined;
  if (!damagedActor) {
    // TODO Warn about missing token
    return;
  }
  assertActorType(damagedActor.type, ActorTypeEnum.Character);
  const damageRoll = attackChatMessage.getFlag(systemId, "chat.damageRoll") as Roll;
  const hitLocationRoll = attackChatMessage.getFlag(systemId, "chat.hitLocationRoll") as Roll;
  const damageAmount = damageRoll.total ?? 0;
  const hitLocationNumberAffected = hitLocationRoll.total;
  if (!hitLocationNumberAffected) {
    // TODO Warn about missing hitlocationResult
    return;
  }
  const damagedHitLocation = damagedActor.items.find(
    (i) =>
      hitLocationNumberAffected >= i.system.dieFrom && hitLocationNumberAffected <= i.system.dieTo,
  );
  if (!damagedHitLocation) {
    // TODO Warn about missing hitlocation
    return;
  }

  const messageData = attackChatMessage.toObject();
  const messageDataUpdate = {
    flags: {
      [systemId]: {
        chat: {
          actorDamagedApplied: true,
          damagedHitLocation: damagedHitLocation,
        },
      },
    },
  };
  foundry.utils.mergeObject(messageData, messageDataUpdate, { overwrite: true });

  messageData.content = await renderTemplate(
    templatePaths.attackChatMessage,
    messageData.flags[systemId]!.chat!,
  );

  await attackChatMessage?.update(messageData);

  // TODO refactor to inflictWound method on actor instead
  // TODO FIXME BUG - does not reduce damage by AP on hit location !!! ***
  // @ts-expect-error speaker
  const speaker = attackChatMessage.speaker;

  const { hitLocationUpdates, actorUpdates, notification, uselessLegs } =
    DamageCalculations.addWound(
      damageAmount,
      true,
      damagedHitLocation!,
      damagedHitLocation!.parent as RqgActor,
      speaker,
    );

  console.error("RQG | TODO handle uselesslegs", uselessLegs); // TODO Handle uselesslegs

  if (hitLocationUpdates) {
    await damagedHitLocation!.update(hitLocationUpdates);
  }
  if (actorUpdates) {
    await damagedHitLocation!.update(actorUpdates as any);
  } // TODO fix type
  await ChatMessage.create({
    user: getGame().user?.id,
    speaker: speaker,
    content: localize("RQG.Item.HitLocation.AddWoundChatContent", {
      actorName: damagedHitLocation!.name,
      hitLocationName: damagedHitLocation!.name,
      notification: notification,
    }),
    whisper: usersIdsThatOwnActor(damagedHitLocation!.parent),
  });
}

/**
 * Reduce weapon HP by the number of points specified by the data-weapon-damage dataset on the button
 * or by looking at the flag data?
 */
export async function handleApplyWeaponDamage(clickedButton: HTMLButtonElement): Promise<void> {
  const { chatMessageId } = await getChatMessageInfo(clickedButton);

  const attackChatMessage = getGame().messages?.get(chatMessageId);
  if (!attackChatMessage) {
    // TODO Warn about missing chat message
    return;
  }

  const weaponDamage: string = attackChatMessage.getFlag(systemId, "chat.weaponDamage");
  ui.notifications?.info(`NotYetInvented ${clickedButton.dataset} weapoindamage ${weaponDamage}`);
}

/**
 * Roll the fumble rolltable and put the result in fumbleOutcome
 */
export async function handleRollFumble(clickedButton: HTMLButtonElement): Promise<void> {
  const chatMessageId = getRequiredDomDataset(clickedButton, "message-id");
  const fumblingActor = getRequiredDomDataset(clickedButton, "fumble");
  const attackChatMessage = getGame().messages?.get(chatMessageId) as RqgChatMessage | undefined;
  if (!attackChatMessage) {
    throw new RqgError("Couldn't find attack chat message");
  }

  const fumbleOutcome = await fumbleRoll();

  const messageData = attackChatMessage.toObject();
  let messageDataUpdate;

  if (fumblingActor === "attacker") {
    messageDataUpdate = {
      flags: {
        [systemId]: {
          chat: {
            attackerFumbled: false,
            attackerFumbleOutcome: fumbleOutcome,
          },
        },
      },
    };
  } else if (fumblingActor === "defender") {
    messageDataUpdate = {
      flags: {
        [systemId]: {
          chat: {
            defenderFumbled: false,
            defenderFumbleOutcome: fumbleOutcome,
          },
        },
      },
    };
  } else {
    throw new RqgError("Got unknown value in fumble button");
  }
  foundry.utils.mergeObject(messageData, messageDataUpdate, { overwrite: true });
  messageData.content = await renderTemplate(
    templatePaths.attackChatMessage,
    messageData.flags[systemId]!.chat!,
  );

  // @ts-expect-error author
  if (getGameUser().id === attackChatMessage.author.id) {
    await attackChatMessage.update(messageData);
  } else {
    socketSend({
      action: "updateChatMessage",
      messageId: attackChatMessage.id ?? "",
      // @ts-expect-error author
      messageAuthorId: attackChatMessage.author.id,
      update: messageData,
    });
  }
}

async function fumbleRoll(): Promise<string> {
  const fumbleTableName = getGame().settings.get(systemId, "fumbleRollTable");
  const fumbleTable = getGame().tables?.getName(fumbleTableName);
  if (!fumbleTable) {
    logMisconfiguration(
      localize("RQG.Dialog.weaponChat.FumbleTableMissingWarn", {
        fumbleTableName: fumbleTableName,
      }),
      true,
    );
    return "";
  }
  // @ts-expect-error draw
  const draw = await fumbleTable.draw({ displayChat: false });
  const text = draw.results.map((r: any) => `${r.text}<br>`); // TODO is TableResult

  return await TextEditor.enrichHTML(text, {
    // @ts-expect-error documents
    documents: true,
    async: true,
  });
}

/**
 * Utility function to extract data from the AttackChat html.
 * TODO How to decide what should be in html and what should be in flags?
 */
async function getChatMessageInfo(button: HTMLElement): Promise<{
  chatMessageId: string;
  attackWeaponUuid: string;
  defenceWeaponUuid: string | undefined;
}> {
  const chatMessageId = getRequiredDomDataset(button, "message-id");
  const chatMessage = getGame().messages?.get(chatMessageId) as RqgChatMessage | undefined;

  const attackWeaponUuid = chatMessage?.getFlag(systemId, "chat.attackWeaponUuid") as
    | string
    | undefined;
  if (!attackWeaponUuid) {
    throw new RqgError("No attackWeapon in chatFlags", chatMessage);
  }
  const defenceWeaponUuid = chatMessage?.getFlag(systemId, "chat.defenceWeaponUuid") as
    | string
    | undefined;
  return {
    chatMessageId: chatMessageId,
    attackWeaponUuid: attackWeaponUuid,
    defenceWeaponUuid: defenceWeaponUuid,
  };
}

export function getBasicOutcomeDescription(
  defence: string | undefined,
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum | undefined,
): string {
  switch (defence) {
    case "dodge": {
      return localize(`RQG.Game.DodgeResults.${attackSuccessLevel}-${defenceSuccessLevel ?? 5}`);
    }

    case "parry":
    default: {
      // Ignore (undefined defenceSuccessLevel) is handled like a failed parry (5)
      return localize(
        `RQG.Game.AttackParryResults.${attackSuccessLevel}-${defenceSuccessLevel ?? 5}`,
      );
    }
  }
}

/**
 * Optionally hide the display of chat card elements which should not be shown to user
 */
export const hideChatActionButtons = function (html: HTMLElement | undefined) {
  if (getGameUser().isGM) {
    return; // Do not hide anything from GM
  }

  // Otherwise conceal elements for unrelated actors/players
  const maybeHideElements = html?.querySelectorAll(".rqg.chat-card [data-visible-actor-uuid]");

  maybeHideElements?.forEach((el: Element) => {
    if (!(el instanceof HTMLElement)) {
      return;
    }
    // @ts-expect-error fromUuidSync
    const actor = fromUuidSync(el.dataset.visibleActorUuid);
    if (actor && !actor?.isOwner) {
      el.style.display = "none";
    }
  });
};

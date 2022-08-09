import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgActor } from "../../actors/rqgActor";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertItemType, formatModifier, localize } from "../../system/util";
import { ItemChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { ItemChatHandler } from "../../chat/itemChatHandler";
import { ResultEnum } from "../../data-model/shared/ability";

export class Rune extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneSheet, {
  //     types: [ItemTypeEnum.ElementalRune],
  //     makeDefault: true,
  //   });
  // }

  static async toChat(rune: RqgItem): Promise<void> {
    const flags: ItemChatFlags = {
      type: "itemChat",
      chat: {
        actorUuid: rune.actor!.uuid,
        tokenUuid: rune.actor!.token?.uuid,
        chatImage: rune.img ?? "",
        itemUuid: rune.uuid,
      },
      formData: {
        modifier: "",
      },
    };
    await ChatMessage.create(await ItemChatHandler.renderContent(flags));
  }

  static async abilityRoll(
    runeItem: RqgItem,
    options: { modifier: number }
  ): Promise<ResultEnum | undefined> {
    const chance: number = Number((runeItem?.data.data as any).chance) || 0;
    let flavor = localize("RQG.Dialog.itemChat.RollFlavor", { name: runeItem.name });
    if (options.modifier && options.modifier !== 0) {
      flavor += localize("RQG.Dialog.itemChat.RollFlavorModifier", {
        modifier: formatModifier(options.modifier),
      });
    }
    const speaker = ChatMessage.getSpeaker({ actor: runeItem.actor ?? undefined });
    const result = await runeItem._roll(flavor, chance, options.modifier, speaker);
    await runeItem.checkExperience(result);
    return result;
  }

  static preUpdateItem(actor: RqgActor, rune: RqgItem, updates: any[], options: any): void {
    if (rune.data.type === ItemTypeEnum.Rune) {
      const chanceResult = updates.find((r) => r["data.chance"] != null || r?.data?.chance != null);
      if (!chanceResult) {
        return;
      }
      if (rune.data.data.opposingRune) {
        const opposingRune = actor.items.getName(rune.data.data.opposingRune);
        const chance = chanceResult["data.chance"] || chanceResult.data.chance;
        this.adjustOpposingRuneChance(opposingRune, chance, updates);
      }
    }
  }

  private static adjustOpposingRuneChance(
    opposingRune: RqgItem | undefined,
    newChance: number,
    updates: object[]
  ) {
    assertItemType(opposingRune?.data.type, ItemTypeEnum.Rune);
    const opposingRuneChance = opposingRune.data.data.chance;
    if (newChance + opposingRuneChance !== 100) {
      updates.push({
        _id: opposingRune.id,
        data: { chance: 100 - newChance },
      });
    }
  }
}

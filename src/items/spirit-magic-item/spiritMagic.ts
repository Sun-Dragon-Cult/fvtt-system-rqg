import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgItem } from "../rqgItem";
import { assertItemType, localize } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export class SpiritMagic extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", SpiritMagicSheet, {
  //     types: [ItemTypeEnum.SpiritMagic],
  //     makeDefault: true,
  //   });
  // }

  /**
   * Check that the actor has enough magic points to cast the spell.
   * Return an error message if not allowed to cast.
   */
  public static hasEnoughToCastSpell(
    levelUsed: number | undefined,
    boost: number | undefined,
    spellItem: RqgItem,
  ): string | undefined {
    assertItemType(spellItem.type, ItemTypeEnum.SpiritMagic);
    if (levelUsed == null || levelUsed > spellItem.system.points) {
      return localize("RQG.Item.SpiritMagic.CantCastSpellAboveLearnedLevel");
    } else if (
      boost == null ||
      levelUsed + boost > (spellItem.actor?.system.attributes.magicPoints.value || 0)
    ) {
      return localize("RQG.Item.SpiritMagic.NotEnoughMagicPoints");
    } else {
      return;
    }
  }
}

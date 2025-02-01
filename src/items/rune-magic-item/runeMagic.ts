import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { RqgActor } from "../../actors/rqgActor";
import { RqgItem } from "../rqgItem";
import {
  assertActorType,
  assertItemType,
  getGame,
  isTruthy,
  localize,
  RqgError,
} from "../../system/util";
import { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import { ActorTypeEnum } from "../../data-model/actor-data/rqgActorData";
import { RuneDataPropertiesData } from "../../data-model/item-data/runeData";
import { RqidLink } from "../../data-model/shared/rqidLink";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";

type RpAndMpCost = { mp: number; rp: number; exp: boolean };

export class RuneMagic extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneMagicSheet, {
  //     types: [ItemTypeEnum.RuneMagic],
  //     makeDefault: true,
  //   });
  // }

  static onActorPrepareEmbeddedEntities(item: RqgItem): RqgItem {
    if (item.type !== ItemTypeEnum.RuneMagic || !item.actor) {
      const msg = localize("RQG.Item.Notification.WrongItemTypeRuneMagicError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    const actor = item.actor;
    if (item.system.cultId) {
      const runeMagicCult = actor.items.get(item.system.cultId);
      if (!runeMagicCult || runeMagicCult.type !== ItemTypeEnum.Cult) {
        // This warning can happen when drag-dropping a rune spell from one Actor to another,
        // but the notification happens a lot of times and doesn't really matter since the system immediately,
        // displays the "Which cult provides this Rune Magic?" dialog allowing the player to fix it.

        // const msg = localize("RQG.Item.Notification.ActorDoesNotHaveCultOnRuneMagicWarning");
        // ui.notifications?.warn(msg);
        // console.warn(msg, item, actor);

        item.system.cultId = ""; // remove the mismatched link to make it appear in the GUI
      }
      if (runeMagicCult && runeMagicCult.type === ItemTypeEnum.Cult) {
        item.system.chance = RuneMagic.calcRuneMagicChance(
          actor.items.toObject(),
          runeMagicCult.system.runeRqidLinks,
          item.system.runeRqidLinks,
        );
      }
    }
    return item;
  }

  private static calcRuneMagicChance(
    actorItems: ItemDataSource[],
    cultRuneRqidLinks: RqidLink[],
    runeMagicRuneRqidLinks: RqidLink[],
  ): number {
    const runeMagicRqids = runeMagicRuneRqidLinks.map((r) => r.rqid);
    const cultRqids = cultRuneRqidLinks.map((r) => r.rqid);
    const runeChances = actorItems.reduce((acc: number[], item) => {
      if (
        item.type === ItemTypeEnum.Rune &&
        (runeMagicRqids.includes(item.flags.rqg?.documentRqidFlags?.id ?? "") ||
          (runeMagicRqids.includes(CONFIG.RQG.runeRqid.magic) &&
            cultRqids.includes(item.flags.rqg?.documentRqidFlags?.id ?? "")))
      ) {
        acc.push(item.system.chance);
      }
      return acc;
    }, []);

    return Math.max(...runeChances);
  }

  /*
   * Connect runeMagic item to a cult.
   */
  static async onEmbedItem(
    actor: RqgActor,
    runeMagicItem: RqgItem,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ): Promise<any> {
    let updateData = {};
    const actorCults = actor.items.filter((i) => i.type === ItemTypeEnum.Cult);
    assertItemType(runeMagicItem.type, ItemTypeEnum.RuneMagic);

    // Do not ask what cult should get the RuneMagic item if it is already attached to a cult from the actor
    // (used in Cult Item for attaching common rune magic automatically)
    if (
      !runeMagicItem.system.cultId ||
      !actorCults.some((cult) => cult.id === runeMagicItem.system.cultId)
    ) {
      let cultId;
      // If the actor only has one cult then attach this runeMagic to that Cult
      if (actorCults.length === 1 && actorCults[0].id) {
        cultId = actorCults[0].id;
      } else {
        // else ask which one
        cultId = await RuneMagic.chooseCultDialog(
          actorCults.map((c) => {
            return { name: c.name, id: c.id };
          }),
          runeMagicItem.name ?? "",
          actor.name ?? "",
        );
      }
      updateData = {
        _id: runeMagicItem.id,
        system: { cultId: cultId },
      };
    }
    return updateData;
  }

  static async chooseCultDialog(
    actorCults: any,
    runeMagicName: string,
    actorName: string,
  ): Promise<string> {
    const htmlContent = await renderTemplate(templatePaths.dialogRuneMagicCult, {
      actorCults: actorCults,
      runeMagicName: runeMagicName,
      actorName: actorName,
    });
    return await new Promise((resolve, reject) => {
      const dialog = new Dialog({
        title: localize("RQG.Item.RuneMagic.runeMagicCultDialog.title"),
        content: htmlContent,
        default: "submit",
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: localize("RQG.Item.RuneMagic.runeMagicCultDialog.btnAddRuneMagic"),
            callback: (html: JQuery | HTMLElement) => {
              const selectedCultId = (html as JQuery).find("[name=cultId]").val() as string;
              resolve(selectedCultId);
            },
          },
          cancel: {
            label: localize("RQG.Dialog.Common.btnCancel"),
            icon: '<i class="fas fa-times"></i>',
            callback: () => {
              reject();
            },
          },
        },
      });
      dialog.render(true);
    });
  }

  /**
   * Check that the actor has enough magic and rune points to cast the spell.
   * Return an error message if not allowed to cast.
   */
  public static hasEnoughToCastSpell(
    cultItem: RqgItem,
    runePointCost: number | undefined,
    magicPointsBoost: number | undefined,
  ): string | undefined {
    assertItemType(cultItem?.type, ItemTypeEnum.Cult);
    if (runePointCost == null || runePointCost > (Number(cultItem.system.runePoints.value) || 0)) {
      return getGame().i18n.format("RQG.Item.RuneMagic.validationNotEnoughRunePoints");
    } else if (
      magicPointsBoost == null ||
      magicPointsBoost > (Number(cultItem.actor?.system.attributes?.magicPoints?.value) || 0)
    ) {
      return localize("RQG.Item.RuneMagic.RuneMagic.validationNotEnoughMagicPoints");
    } else {
      return undefined;
    }
  }

  /**
   * Given a rune spell and an actor, returns the runes that are possible to use for casting that spell.
   */
  static getEligibleRunes(runeMagicItem: RqgItem): RqgItem[] {
    assertItemType(runeMagicItem.type, ItemTypeEnum.RuneMagic);

    // The cult from where the spell was learned
    const cult = runeMagicItem.actor?.items.get(runeMagicItem.system.cultId);
    assertItemType(cult?.type, ItemTypeEnum.Cult);

    let usableRuneRqids: string[];
    const runeMagicRuneRqids = [
      ...new Set(runeMagicItem.system.runeRqidLinks.map((r: RqidLink) => r.rqid).filter(isTruthy)),
    ] as string[];
    if (runeMagicRuneRqids.includes(CONFIG.RQG.runeRqid.magic)) {
      // Actor can use any of the cult's runes to cast
      // And some cults have the same rune more than once, so de-dupe them
      usableRuneRqids = [...new Set(cult.system.runeRqidLinks.map((r: RqidLink) => r.rqid))].filter(
        isTruthy,
      ) as string[];
    } else {
      // Actor can use any of the Rune Magic Spell's runes to cast
      usableRuneRqids = runeMagicRuneRqids;
    }
    // Get the actor's versions of the runes, which will have their "chance"
    const runesForCasting = usableRuneRqids
      .map((runeRqid) => runeMagicItem.actor?.getBestEmbeddedDocumentByRqid(runeRqid))
      .filter(isTruthy);

    return runesForCasting;
  }

  static getStrongestRune(runeItems: RqgItem[]): RqgItem | undefined {
    if (runeItems.length === 0) {
      return undefined;
    }
    return runeItems.reduce((strongest: RqgItem, current: RqgItem) => {
      const strongestRuneChance = (strongest.system as RuneDataPropertiesData).chance ?? 0;
      const currentRuneChance = (current.system as RuneDataPropertiesData).chance ?? 0;
      return strongestRuneChance > currentRuneChance ? strongest : current;
    });
  }

  public static async handleRollResult(
    result: AbilitySuccessLevelEnum,
    runePointCost: number,
    magicPointsUsed: number,
    runeItem: RqgItem,
    runeMagicItem: RqgItem,
  ): Promise<void> {
    assertItemType(runeItem.type, ItemTypeEnum.Rune);
    assertItemType(runeMagicItem.type, ItemTypeEnum.RuneMagic);
    const cult = runeMagicItem.actor?.items.get(runeMagicItem.system.cultId ?? "");
    assertItemType(cult?.type, ItemTypeEnum.Cult);
    const isOneUse = runeMagicItem.system.isOneUse;

    const costs = RuneMagic.calcRuneAndMagicPointCost(result, runePointCost, magicPointsUsed);

    await RuneMagic.spendRuneAndMagicPoints(
      costs.rp,
      costs.mp,
      runeMagicItem.actor ?? undefined,
      cult,
      isOneUse,
    );
    if (costs.exp) {
      await runeItem.awardExperience();
    }

    if (costs.mp > 0 || costs.rp > 0) {
      ui.notifications?.info(
        localize("RQG.Item.RuneMagic.CastingCostInfo", {
          actorName: runeMagicItem.parent?.name,
          runePointAmount: costs.rp,
          magicPointAmount: costs.mp,
        }),
      );
    }
  }

  public static calcRuneAndMagicPointCost(
    result: AbilitySuccessLevelEnum,
    runePointCost: number,
    magicPointsUsed: number,
  ): RpAndMpCost {
    switch (result) {
      case AbilitySuccessLevelEnum.Critical:
      case AbilitySuccessLevelEnum.SpecialCritical:
      case AbilitySuccessLevelEnum.HyperCritical:
        // spell takes effect, Rune Points NOT spent, Rune gets xp check, boosting Magic Points spent
        return {
          mp: magicPointsUsed,
          rp: 0,
          exp: true,
        };

      case AbilitySuccessLevelEnum.Success:
      case AbilitySuccessLevelEnum.Special:
        // spell takes effect, Rune Points spent, Rune gets xp check, boosting Magic Points spent
        return {
          mp: magicPointsUsed,
          rp: runePointCost,
          exp: true,
        };

      case AbilitySuccessLevelEnum.Failure: {
        // spell fails, no Rune Point Loss, if Magic Point boosted, lose 1 Magic Point if boosted
        const boosted = magicPointsUsed >= 1 ? 1 : 0;
        return {
          mp: boosted,
          rp: 0,
          exp: false,
        };
      }

      case AbilitySuccessLevelEnum.Fumble: {
        // spell fails, lose Rune Points, if Magic Point boosted, lose 1 Magic Point if boosted
        const boosted = magicPointsUsed >= 1 ? 1 : 0;
        return {
          mp: boosted,
          rp: runePointCost,
          exp: false,
        };
      }

      default: {
        const msg = "Got unexpected result from roll in runeMagicChat";
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
    }
  }

  private static async spendRuneAndMagicPoints(
    runePoints: number,
    magicPoints: number,
    actor: RqgActor | undefined,
    cult: RqgItem,
    isOneUse: boolean,
  ) {
    assertItemType(cult.type, ItemTypeEnum.Cult);
    assertActorType(actor?.type, ActorTypeEnum.Character);
    // At this point if the current Rune Points or Magic Points are zero
    // it's too late. That validation happened earlier.
    const newRunePointTotal = (cult.system.runePoints.value || 0) - runePoints;
    const newMagicPointTotal = (actor?.system.attributes.magicPoints.value || 0) - magicPoints;
    let newRunePointMaxTotal = cult.system.runePoints.max || 0;
    if (isOneUse) {
      newRunePointMaxTotal -= runePoints;
      if (newRunePointMaxTotal < (cult.system.runePoints.max || 0)) {
        ui.notifications?.info(
          localize("RQG.Item.RuneMagic.SpentOneUseRunePoints", {
            actorName: actor?.name,
            runePoints: runePoints,
            cultName: cult.name,
          }),
        );
      }
    }
    const updateCultItemRunePoints: DeepPartial<ItemDataSource> = {
      _id: cult?.id,
      system: { runePoints: { value: newRunePointTotal, max: newRunePointMaxTotal } },
    };
    await actor?.updateEmbeddedDocuments("Item", [updateCultItemRunePoints]);
    const updateActorMagicPoints = {
      system: { attributes: { magicPoints: { value: newMagicPointTotal } } },
    };
    await actor?.update(updateActorMagicPoints);
  }
}

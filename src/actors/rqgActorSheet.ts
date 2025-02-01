import { SkillCategoryEnum } from "../data-model/item-data/skillData";
import { HomeLandEnum, OccupationEnum } from "../data-model/actor-data/background";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { HitLocationSheet } from "../items/hit-location-item/hitLocationSheet";
import { skillMenuOptions } from "./context-menus/skill-context-menu";
import { combatMenuOptions } from "./context-menus/combat-context-menu";
import { hitLocationMenuOptions } from "./context-menus/hit-location-context-menu";
import { passionMenuOptions } from "./context-menus/passion-context-menu";
import { gearMenuOptions } from "./context-menus/gear-context-menu";
import { spiritMagicMenuOptions } from "./context-menus/spirit-magic-context-menu";
import { cultMenuOptions } from "./context-menus/cult-context-menu";
import { runeMagicMenuOptions } from "./context-menus/rune-magic-context-menu";
import { runeMenuOptions } from "./context-menus/rune-context-menu";
import {
  EquippedStatus,
  equippedStatuses,
  PhysicalItemType,
} from "../data-model/item-data/IPhysicalItem";
import { characteristicMenuOptions } from "./context-menus/characteristic-context-menu";
import {
  assertHtmlElement,
  assertItemType,
  formatListByWorldLanguage,
  getGame,
  getGameUser,
  getHTMLElement,
  getItemDocumentTypes,
  getRequiredDomDataset,
  hasOwnProperty,
  isTruthy,
  localize,
  localizeItemType,
  range,
  requireValue,
  RqgError,
  usersIdsThatOwnActor,
} from "../system/util";
import { RuneDataSource, RuneTypeEnum } from "../data-model/item-data/runeData";
import { DamageCalculations } from "../system/damageCalculations";
import { actorHealthStatuses, LocomotionEnum } from "../data-model/actor-data/attributes";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { ActorWizard } from "../applications/actorWizardApplication";
import { systemId } from "../system/config";
import { RqidLink } from "../data-model/shared/rqidLink";
import { actorWizardFlags, documentRqidFlags } from "../data-model/shared/rqgDocumentFlags";
import { addRqidLinkToSheetHtml } from "../documents/rqidSheetButton";
import { RqgAsyncDialog } from "../applications/rqgAsyncDialog";
import { ActorSheetData } from "../items/shared/sheetInterfaces";
import { Characteristics } from "src/data-model/actor-data/characteristics";
import {
  extractDropInfo,
  getAllowedDropDocumentNames,
  hasRqid,
  isAllowedDocumentNames,
  onDragEnter,
  onDragLeave,
  updateRqidLink,
} from "../documents/dragDrop";
import { ItemTree } from "../items/shared/ItemTree";
import { CultRankEnum } from "../data-model/item-data/cultData";
import type { ItemDataSource } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";
import type { RqgActor } from "./rqgActor";
import type { RqgItem } from "../items/rqgItem";
import type { RqgToken } from "../combat/rqgToken";
import {
  getCombatantIdsToDelete,
  getCombatantsSharingToken,
  getSrWithoutCombatants,
} from "../combat/combatant-utils";
import { socketSend } from "../sockets/RqgSocket";
import { templatePaths } from "../system/loadHandlebarsTemplates";
import { CharacterSheetData, MainCult, UiSections } from "./rqgActorSheet.defs";

// Half prepared for introducing more actor types. this would then be split into CharacterSheet & RqgActorSheet
export class RqgActorSheet extends ActorSheet<
  ActorSheet.Options,
  CharacterSheetData | ActorSheet.Data
> {
  // What SRs is this actor doing things in. Not persisted data, controlling active combat.
  private activeInSR: Set<number> = new Set<number>();
  private incorrectRunes: RqgItem[] = [];

  get title(): string {
    const linked = this.actor.prototypeToken?.actorLink;
    const isToken = this.actor.isToken;

    let prefix = "";
    if (!linked) {
      prefix = isToken ? "[Token] " : "[Prototype] ";
    }
    const speakerName = isToken ? this.actor.token!.name : this.actor.prototypeToken.name;
    const postfix = isToken ? ` (${this.actor.prototypeToken.name})` : "";

    return prefix + speakerName + postfix;
  }

  static get defaultOptions(): ActorSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "sheet", ActorTypeEnum.Character],
      template: templatePaths.rqgActorSheet,
      width: 900,
      height: 700,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "combat",
        },
        {
          navSelector: ".gear-tabs",
          contentSelector: ".gear-body",
          initial: "by-item-type",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: "[data-dropzone]" }],
    });
  }

  /* -------------------------------------------- */

  async getData(): Promise<CharacterSheetData & ActorSheetData> {
    this.incorrectRunes = [];
    const system = foundry.utils.duplicate(this.document.system);
    const spiritMagicPointSum = this.getSpiritMagicPointSum();
    const dexStrikeRank = system.attributes.dexStrikeRank;
    const itemTree = new ItemTree(this.actor.items.contents); // physical items reorganised as a tree of items containing items

    // This will just give a random combatant connected to the actor if there are multiple
    // @ts-expect-error getCombatantByActor
    const actorCombatant = getGame().combat?.getCombatantByActor(this.actor);

    this.activeInSR = new Set(
      getCombatantsSharingToken(actorCombatant)
        .map((c) => c.initiative)
        .filter(isTruthy)
        .filter((sr: number) => sr >= 1 && sr <= 12),
    );

    const embeddedItems = await this.organizeEmbeddedItems(this.actor);

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isGM: getGameUser().isGM,
      isPC: this.actor.hasPlayerOwner,
      showCharacteristicRatings:
        getGame().settings.get(systemId, "showCharacteristicRatings") || false,
      system: system,
      // @ts-expect-error allApplicableEffects
      effects: [...this.actor.allApplicableEffects()],

      embeddedItems: embeddedItems,

      spiritCombatSkillData: this.actor.getBestEmbeddedDocumentByRqid(
        CONFIG.RQG.skillRqid.spiritCombat,
      ),
      dodgeSkillData: this.actor.getBestEmbeddedDocumentByRqid(CONFIG.RQG.skillRqid.dodge),

      mainCult: this.getMainCultInfo(),
      characterElementRunes: this.getCharacterElementRuneImgs(), // Sorted array of element runes with > 0% chance
      characterPowerRunes: this.getCharacterPowerRuneImgs(), // Sorted array of power runes with > 50% chance
      characterFormRunes: this.getCharacterFormRuneImgs(), // Sorted array of form runes that define the character
      loadedMissileSrDisplay: this.getLoadedMissileSrDisplay(dexStrikeRank), // (html) Precalculated missile weapon SRs if loaded at start of round
      loadedMissileSr: this.getLoadedMissileSr(dexStrikeRank),
      unloadedMissileSrDisplay: this.getUnloadedMissileSrDisplay(dexStrikeRank), // (html) Precalculated missile weapon SRs if not loaded at start of round
      unloadedMissileSr: this.getUnloadedMissileSr(dexStrikeRank),
      itemLocationTree: itemTree.toSheetData(),
      powCrystals: this.getPowCrystals(),
      spiritMagicPointSum: spiritMagicPointSum,
      freeInt: this.getFreeInt(spiritMagicPointSum),
      baseStrikeRank: this.getBaseStrikeRank(dexStrikeRank, system.attributes.sizStrikeRank),
      // @ts-expect-error async
      enrichedAllies: await TextEditor.enrichHTML(system.allies, { async: true }),
      enrichedBiography: await TextEditor.enrichHTML(system.background.biography ?? "", {
        // @ts-expect-error async
        async: true,
      }),

      // Lists for dropdown values
      occupations: Object.values(OccupationEnum),
      homelands: Object.values(HomeLandEnum),
      locations: itemTree.getPhysicalItemLocations(),
      healthStatuses: [...actorHealthStatuses],
      ownedProjectiles: this.getEquippedProjectiles(),
      locomotionModes: {
        [LocomotionEnum.Walk]: "Walk",
        [LocomotionEnum.Swim]: "Swim",
        [LocomotionEnum.Fly]: "Fly",
      },

      currencyTotals: this.calcCurrencyTotals(),
      // Disable the SR buttons for unlinked actors since double-clicking the combatant in the combat tracker opens the prototype token instead of the token.
      // @ts-expect-error inCombat
      isInCombat: this.actor.inCombat && this.actor.prototypeToken.actorLink,

      dexSR: [...range(1, this.actor.system.attributes.dexStrikeRank ?? 0)],
      sizSR: [
        ...range(
          (this.actor.system.attributes.dexStrikeRank ?? 0) + 1,
          (this.actor.system.attributes.sizStrikeRank ?? 0) +
            (this.actor.system.attributes.dexStrikeRank ?? 0),
        ),
      ],

      otherSR: [
        ...range(
          (this.actor.system.attributes.dexStrikeRank ?? 0) +
            (this.actor.system.attributes.sizStrikeRank ?? 0) +
            1,
          12,
        ),
      ],
      activeInSR: [...this.activeInSR],

      characteristicRanks: await this.rankCharacteristics(),
      bodyType: this.actor.getBodyType(),
      hitLocationDiceRangeError: this.getHitLocationDiceRangeError(),

      // UI toggles
      showHeropoints: getGame().settings.get(systemId, "showHeropoints"),
      showUiSection: this.getUiSectionVisibility(),
      actorWizardFeatureFlag: getGame().settings.get(systemId, "actor-wizard-feature-flag"),
      itemLoopMessage: itemTree.loopMessage,
      enrichedUnspecifiedSkill: await this.getUnspecifiedSkillText(),
      enrichedIncorrectRunes: await this.getIncorrectRunesText(embeddedItems?.rune),
    };
  }

  private async rankCharacteristics(): Promise<any> {
    const result = {} as { [key: string]: string };
    for (const characteristic of Object.keys(this.actor.system.characteristics)) {
      const rankClass = "characteristic-rank-";
      const char = this.actor.system.characteristics[characteristic as keyof Characteristics];

      if (char == null || char.value == null || char.formula == null || char.formula == "") {
        // cannot evaluate
        result.characteristic = "";
        continue;
      }

      if (Number.isNumeric(char.formula)) {
        // formula is a literal number and does not need evaluation
        result.characteristic = "";
        continue;
      }

      if (!Roll.validate(char.formula)) {
        // formula is not valid and cannnot be evaluated
        result.characteristic = "";
        continue;
      }

      const minRoll = new Roll(char.formula || "");
      const minTotal = await minRoll.evaluate({ minimize: true }).total;
      const maxRoll = new Roll(char.formula || "");
      const maxTotal = await maxRoll.evaluate({ maximize: true }).total;

      if (minTotal == null || maxTotal == null) {
        // cannot evaluate
        result.characteristic = "";
        continue;
      }

      if (char.value < minTotal) {
        result[characteristic] = rankClass + "low";
        continue;
      }

      if (char.value > maxTotal) {
        result[characteristic] = rankClass + "high";
        continue;
      }

      // the tens value of the percentage of the value compared to the maxTotal
      const rank = Math.floor(((char.value - minTotal) / (maxTotal - minTotal)) * 10);

      result[characteristic] = rankClass + rank;
    }
    return result;
  }

  private calcCurrencyTotals(): any {
    const currency: RqgItem[] = this.actor.items.filter(
      (i: RqgItem) => i.type === ItemTypeEnum.Gear && i.system.physicalItemType === "currency",
    );
    const result = { quantity: 0, price: { real: 0, estimated: 0 }, encumbrance: 0 };
    currency.forEach((curr) => {
      assertItemType(curr.type, ItemTypeEnum.Gear);
      result.quantity += Number(curr.system.quantity);
      result.price.real += curr.system.price.real * curr.system.quantity;
      result.price.estimated += curr.system.price.estimated * curr.system.quantity;
      if (curr.system.equippedStatus !== "notCarried") {
        result.encumbrance += curr.system.encumbrance * curr.system.quantity;
      }
      let conv;
      if (curr.system.price.estimated > 1) {
        conv = localize("RQG.Actor.Gear.CurrencyConversionTipOver1", {
          name: curr.name,
          value: curr.system.price.estimated,
        });
      } else if (curr.system.price.estimated === 1) {
        conv = localize("RQG.Actor.Gear.CurrencyConversionTipLunar");
      } else {
        conv = localize("RQG.Actor.Gear.CurrencyConversionTipUnder1", {
          name: curr.name,
          value: 1 / curr.system.price.estimated,
        });
      }
      curr.system.price.conversion = conv;
    });
    return result;
  }

  private getMainCultInfo(): MainCult {
    const cults = this.actor.items
      .filter((i) => i.type === ItemTypeEnum.Cult)
      .sort((a: RqgItem, b: RqgItem) => b.system.runePoints.max - a.system.runePoints.max);
    const mainCultItem: RqgItem | undefined = cults[0];
    const mainCultRankTranslation = mainCultItem?.system?.joinedCults.map((c: any) =>
      c.rank ? localize("RQG.Actor.RuneMagic.CultRank." + c.rank) : "",
    );
    return {
      name: mainCultItem?.name ?? "",
      id: mainCultItem?.id ?? "",
      rank: formatListByWorldLanguage(mainCultRankTranslation),
      descriptionRqid: mainCultItem?.system?.descriptionRqidLink?.rqid ?? "",
      hasMultipleCults: cults.length > 1,
    };
  }

  private getSpiritMagicPointSum(): number {
    return this.actor.items.reduce((acc: number, item: RqgItem) => {
      if (item.type === ItemTypeEnum.SpiritMagic && !item.system.isMatrix) {
        return acc + item.system.points;
      } else {
        return acc;
      }
    }, 0);
  }

  private getPowCrystals(): { name: string; size: number }[] {
    return (
      this.actor.appliedEffects &&
      this.actor.appliedEffects
        .filter(
          (e) =>
            e.changes.find((e: any) => e.key === "system.attributes.magicPoints.max") != undefined,
        )
        .map((e) => {
          return {
            name: e.name ?? "",
            size: e.changes
              .filter((c: any) => c.key === "system.attributes.magicPoints.max")
              .reduce((acc: number, c: any) => acc + Number(c.value), 0),
          };
        })
    );
  }

  private getFreeInt(spiritMagicPointSum: number): number {
    return (
      (this.actor.system.characteristics.intelligence.value ?? 0) -
      spiritMagicPointSum -
      this.actor.items.filter(
        (i: RqgItem) =>
          i.type === ItemTypeEnum.Skill &&
          i.system.category === SkillCategoryEnum.Magic &&
          !!i.system.runeRqidLinks?.length,
      ).length
    );
  }

  private getLoadedMissileSrDisplay(dexSr: number | undefined): string[] {
    const reloadIcon = CONFIG.RQG.missileWeaponReloadIcon;
    const loadedMissileSr = [
      ["1", reloadIcon, "6", reloadIcon, "11"],
      ["1", reloadIcon, "7", reloadIcon],
      ["2", reloadIcon, "9"],
      ["3", reloadIcon, "11"],
      ["4", reloadIcon],
      ["5", reloadIcon],
    ];
    return dexSr != null ? loadedMissileSr[dexSr] : [];
  }

  private getLoadedMissileSr(dexSr: number | undefined): string {
    const loadedMissileSr = ["1,6,11", "1,7", "2,9", "3,11", "4", "5"];
    return dexSr != null ? loadedMissileSr[dexSr] : "";
  }

  private getUnloadedMissileSrDisplay(dexSr: number | undefined): string[] {
    const reloadIcon = CONFIG.RQG.missileWeaponReloadIcon;
    const unloadedMissileSr = [
      [reloadIcon, "5", reloadIcon, "10"],
      [reloadIcon, "6", reloadIcon, "12"],
      [reloadIcon, "7", reloadIcon],
      [reloadIcon, "8"],
      [reloadIcon, "9"],
      [reloadIcon, "10"],
    ];
    return dexSr != null ? unloadedMissileSr[dexSr] : [];
  }

  private getUnloadedMissileSr(dexSr: number | undefined): string {
    const unloadedMissileSr = ["5,10", "6,12", "7", "8", "9", "10"];
    return dexSr != null ? unloadedMissileSr[dexSr] : "";
  }

  private getBaseStrikeRank(
    dexStrikeRank: number | undefined,
    sizStrikeRank: number | undefined,
  ): number | undefined {
    if (dexStrikeRank == null && sizStrikeRank == null) {
      return undefined;
    }

    return [dexStrikeRank, sizStrikeRank].reduce(
      (acc: number, value: number | undefined) => (Number(value) ? acc + Number(value) : acc),
      0,
    );
  }

  private getCharacterElementRuneImgs(): RuneDataSource[] {
    return this.actor.items
      .reduce((acc: any[], i: RqgItem) => {
        if (
          i.type === ItemTypeEnum.Rune &&
          i.system.runeType.type === RuneTypeEnum.Element &&
          !!i.system.chance
        ) {
          acc.push({
            id: i.id,
            img: i.img,
            rune: i.system.rune,
            chance: i.system.chance,
            descriptionRqid: i.system.descriptionRqidLink?.rqid,
          });
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.chance - a.chance);
  }

  private getCharacterPowerRuneImgs(): RuneDataSource[] {
    return this.actor.items
      .reduce((acc: any[], i: RqgItem) => {
        if (
          i.type === ItemTypeEnum.Rune &&
          i.system.runeType.type === RuneTypeEnum.Power &&
          i.system.chance > 50
        ) {
          acc.push({
            id: i.id,
            img: i.img,
            rune: i.system.rune,
            chance: i.system.chance,
            descriptionRqid: i.system.descriptionRqidLink?.rqid,
          });
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.chance - a.chance);
  }

  private getCharacterFormRuneImgs(): RuneDataSource[] {
    return this.actor.items
      .reduce((acc: any[], i: RqgItem) => {
        if (
          i.type === ItemTypeEnum.Rune &&
          i.system.runeType.type === RuneTypeEnum.Form &&
          (!i.system.opposingRuneRqidLink?.rqid || i.system.chance > 50)
        ) {
          acc.push({
            id: i.id,
            img: i.img,
            rune: i.system.rune,
            chance: i.system.chance,
            descriptionRqid: i.system.descriptionRqidLink?.rqid,
          });
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.chance - a.chance);
  }

  /**
   * Return a translated error string if the hit location dice do not cover the range 1-20
   * once and only once.
   * If there is no error, it returns an empty string.
   */
  private getHitLocationDiceRangeError(): string {
    const hitLocations = this.actor.items.filter((i) => i.type === ItemTypeEnum.HitLocation);
    if (hitLocations.length === 0) {
      return ""; // No hit locations is a valid state
    }
    const ranges = hitLocations.flatMap((hl) => [...range(hl.system.dieFrom, hl.system.dieTo)]);
    if (ranges.length === 20 && [...range(1, 20)].every((die) => ranges.includes(die))) {
      return "";
    } else {
      const sortedRanges = ranges.sort((a, b) => a - b);
      return localize("RQG.Actor.Health.HitLocationDiceDoNotAddUp", {
        dice: sortedRanges.join(", "),
      });
    }
  }

  /**
   * Take the embedded items of the actor and rearrange them for presentation.
   * returns something like this {armor: [RqgItem], elementalRune: [RqgItem], ... }
   * TODO Fix the typing
   */
  public async organizeEmbeddedItems(actor: RqgActor): Promise<any> {
    const itemTypes: any = Object.fromEntries(getItemDocumentTypes().map((t: string) => [t, []]));
    actor.items.forEach((item) => {
      itemTypes[item.type].push(item);
    });

    const currency: any = [];
    actor.items.forEach((item) => {
      if (item.type === ItemTypeEnum.Gear) {
        //TODO: Assert that this is Gear or something else that has physicalItemType??
        if (item.system.physicalItemType === "currency") {
          currency.push(item);
        }
      }
    });

    currency.sort(
      (a: any, b: any) =>
        (Number(a.system.price.estimated) < Number(b.system.price.estimated) ? 1 : -1) - 1,
    );

    itemTypes.currency = currency;

    // Separate skills into skill categories {agility: [RqgItem], communication: [RqgItem], ... }
    const skills: any = {};
    Object.values(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = itemTypes[ItemTypeEnum.Skill].filter((s: any) => cat === s.system.category);
    });
    // Sort the skills inside each category
    Object.values(skills).forEach((skillList) =>
      (skillList as RqgItem[]).sort((a: RqgItem, b: RqgItem) =>
        ("" + a.name).localeCompare("" + b.name),
      ),
    );
    itemTypes[ItemTypeEnum.Skill] = skills;

    // Prepare the object to hold the runes per runeType
    const resultObject = {
      [RuneTypeEnum.Element]: {},
      [RuneTypeEnum.Power]: {},
      [RuneTypeEnum.Form]: {},
      [RuneTypeEnum.Condition]: {},
      [RuneTypeEnum.Technique]: {},
    };

    // Separate runes into types (elemental, power, form, technique)
    itemTypes[ItemTypeEnum.Rune] = itemTypes[ItemTypeEnum.Rune].reduce((acc: any, rune: any) => {
      const runeRqidName = rune.flags?.rqg?.documentRqidFlags?.id
        ?.split(".")
        .pop()
        .split("-")
        .shift();
      const runeType = rune?.system.runeType.type;
      if (Object.values(RuneTypeEnum).includes(runeType)) {
        acc[runeType][runeRqidName] = rune;
      } else {
        this.incorrectRunes.push(rune);
      }
      return acc;
    }, resultObject);

    // Sort the hit locations
    if (getGame().settings.get(systemId, "sortHitLocationsLowToHigh")) {
      itemTypes[ItemTypeEnum.HitLocation].sort(
        (a: any, b: any) => a.system.dieFrom - b.system.dieFrom,
      );
    } else {
      itemTypes[ItemTypeEnum.HitLocation].sort(
        (a: any, b: any) => b.system.dieFrom - a.system.dieFrom,
      );
    }

    // Arrange wounds for display & add last rqid part
    itemTypes[ItemTypeEnum.HitLocation] = itemTypes[ItemTypeEnum.HitLocation].map(
      (hitLocation: any) => {
        hitLocation.system.woundsString = hitLocation.system.wounds.join("+");
        hitLocation.rqidName = hitLocation.flags?.rqg?.documentRqidFlags?.id?.split(".")[2] ?? "";
        return hitLocation;
      },
    );

    // Enrich Cult texts for holyDays, gifts & geases
    await Promise.all(
      itemTypes[ItemTypeEnum.Cult].map(async (cult: any) => {
        cult.system.enrichedHolyDays = await TextEditor.enrichHTML(cult.system.holyDays, {
          // @ts-expect-error async
          async: true,
        });
        // @ts-expect-error async
        cult.system.enrichedGifts = await TextEditor.enrichHTML(cult.system.gifts, { async: true });
        cult.system.enrichedGeases = await TextEditor.enrichHTML(cult.system.geases, {
          // @ts-expect-error async
          async: true,
        });
      }),
    );

    // Extract hasAccessToRuneMagic info from subCults
    itemTypes[ItemTypeEnum.Cult].map(async (cult: any) => {
      cult.hasAccessToRuneMagic = cult.system.joinedCults.some(
        (subCult: any) => subCult.rank !== CultRankEnum.LayMember,
      );
      return cult;
    });

    // Enrich passion description texts
    await Promise.all(
      itemTypes[ItemTypeEnum.Passion].map(async (passion: any) => {
        passion.system.enrichedDescription = await TextEditor.enrichHTML(
          passion.system.description,
          {
            // @ts-expect-error async
            async: true,
          },
        );
      }),
    );

    // Add extra info for Rune Magic Spells
    itemTypes[ItemTypeEnum.RuneMagic].forEach((runeMagic: RqgItem) => {
      const spellCult: RqgItem | undefined = actor.items.get(runeMagic.system.cultId);
      const cultCommonRuneMagicRqids =
        spellCult?.system.commonRuneMagicRqidLinks.map((r: RqidLink) => r.rqid) ?? [];

      runeMagic.system.isCommon = cultCommonRuneMagicRqids.includes(
        runeMagic?.flags?.rqg?.documentRqidFlags?.id ?? "",
      );
    });

    // Add weapon data
    itemTypes[ItemTypeEnum.Weapon].forEach((weapon: RqgItem) => {
      assertItemType(weapon.type, ItemTypeEnum.Weapon);

      const usages = weapon.system.usage;
      const actorStr = actor.system.characteristics.strength.value ?? 0;
      const actorDex = actor.system.characteristics.dexterity.value ?? 0;
      for (const key in usages) {
        const usage = usages[key];
        // @ts-expect-error isEmpty
        if (!foundry.utils.isEmpty(usage?.skillRqidLink?.rqid)) {
          usage.skillId = actor.getBestEmbeddedDocumentByRqid(usage.skillRqidLink.rqid)?.id;
          usage.unusable = false;
          usage.underMinSTR = false;
          usage.underMinDEX = false;
          if (actorStr < usage.minStrength) {
            usage.underMinSTR = true;
          }
          if (actorDex < usage.minDexterity) {
            usage.underMinDEX = true;
          }
          if (usage.underMinSTR) {
            usage.unusable = true;
          }
          if (usage.underMinDEX) {
            // STR can compensate for being under DEX min on 2 for 1 basis
            const deficiency = usage.minDexterity - actorDex;
            const strover = Math.floor((actorStr - usage.minStrength) / 2);
            if (usage.minStrength == null) {
              usage.unusable = true;
            } else {
              usage.unusable = deficiency > strover;
            }
          }
        }
      }

      const projectile = actor.items.find((i) => i.id === weapon.system.projectileId);
      if (projectile) {
        weapon.system.projectileQuantity = projectile.system.quantity;
        weapon.system.projectileName = projectile.name;
      }
    });
    itemTypes[ItemTypeEnum.Armor].sort((a: any, b: any) => a.sort - b.sort);
    itemTypes[ItemTypeEnum.Gear].sort((a: any, b: any) => a.sort - b.sort);
    itemTypes[ItemTypeEnum.Passion].sort((a: any, b: any) => a.sort - b.sort);
    itemTypes[ItemTypeEnum.RuneMagic].sort((a: any, b: any) => a.sort - b.sort);
    itemTypes[ItemTypeEnum.SpiritMagic].sort((a: any, b: any) => a.sort - b.sort);
    itemTypes[ItemTypeEnum.Weapon].sort((a: any, b: any) => a.sort - b.sort);

    itemTypes[ItemTypeEnum.Cult].sort(
      (a: any, b: any) => b.system.runePoints?.max - a.system.runePoints?.max,
    );

    return itemTypes;
  }

  private getUiSectionVisibility(): UiSections {
    return {
      health:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.system.attributes.hitPoints.max != null ||
        this.actor.items.some((i) => i.type === ItemTypeEnum.HitLocation),
      combat:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some(
          (i: RqgItem) =>
            i.getFlag(systemId, documentRqidFlags)?.id === CONFIG.RQG.skillRqid.dodge ||
            i.type === ItemTypeEnum.Weapon,
        ),
      runes:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.Rune),
      spiritMagic:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.SpiritMagic),
      runeMagic:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) =>
          [ItemTypeEnum.Cult, ItemTypeEnum.RuneMagic].includes(i.type),
        ),
      sorcery:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some(
          (i: RqgItem) =>
            i.type === ItemTypeEnum.Rune &&
            (i.system.isMastered || i.system.runeType.type === RuneTypeEnum.Technique),
        ),
      skills:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.Skill),
      gear:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some(
          (i: RqgItem) =>
            [ItemTypeEnum.Gear, ItemTypeEnum.Weapon, ItemTypeEnum.Armor].includes(i.type) &&
            !(i.system as any).isNatural, // Don't show gear tab for natural weapons
        ),
      passions:
        CONFIG.RQG.debug.showAllUiSections ||
        this.actor.items.some((i: RqgItem) => i.type === ItemTypeEnum.Passion),
      background: true,
      activeEffects: CONFIG.RQG.debug.showActorActiveEffectsTab && getGameUser().isGM,
    };
  }

  private async getUnspecifiedSkillText(): Promise<string | undefined> {
    const unspecifiedSkills = this.actor.items.filter(
      (i) => i.type === ItemTypeEnum.Skill && !!i.name && i.system?.specialization === "...",
    );
    if (unspecifiedSkills.length) {
      const itemLinks = unspecifiedSkills.map((s) => s.link).join(" ");
      const warningText = localize("RQG.Actor.Skill.UnspecifiedSkillWarning");
      return await TextEditor.enrichHTML(`${warningText} ${itemLinks}`, {
        // @ts-expect-error async
        async: true,
      });
    }
  }

  private async getIncorrectRunesText(embeddedRunes: any): Promise<string | undefined> {
    const validRuneIds = [
      ...Object.values(embeddedRunes.element).map((r: any) => r.id),
      Object.values(embeddedRunes.form).map((r: any) => r.id),
      Object.values(embeddedRunes.condition).map((r: any) => r.id),
      Object.values(embeddedRunes.technique).map((r: any) => r.id),
      Object.values(embeddedRunes.power)
        .filter((r: any) => {
          const runeRqidName = r?.flags?.rqg?.documentRqidFlags?.id
            ?.split(".")
            .pop()
            .split("-")
            .shift();
          return [
            "fertility",
            "death",
            "harmony",
            "disorder",
            "truth",
            "illusion",
            "stasis",
            "movement",
          ].includes(runeRqidName);
        })
        .map((r: any) => r.id),
    ].flat(Infinity);
    const extraRunes = this.actor.items.filter(
      (i) => i.type === ItemTypeEnum.Rune && !validRuneIds.includes(i.id),
    );
    embeddedRunes.invalid = extraRunes;

    if (this.incorrectRunes.length) {
      // incorrectRunes is initialised as a side effect in the organizeEmbeddedItems method
      const itemLinks = this.incorrectRunes.map((s) => s.link).join(" ");
      const warningText = localize("RQG.Actor.Rune.IncorrectRuneWarning");
      return await TextEditor.enrichHTML(`${warningText} ${itemLinks}`, {
        // @ts-expect-error async
        async: true,
      });
    }
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgActor | undefined> {
    const maxHitPoints = this.actor.system.attributes.hitPoints.max;

    if (
      formData["system.attributes.hitPoints.value"] == null || // Actors without hit locations should not get undefined
      (formData["system.attributes.hitPoints.value"] ?? 0) >= (maxHitPoints ?? 0)
    ) {
      formData["system.attributes.hitPoints.value"] = maxHitPoints;
    }

    // Hack: Temporarily change hp.value to what it will become so getCombinedActorHealth will work
    const hpTmp = this.actor.system.attributes.hitPoints.value;
    const mpTmp = this.actor.system.attributes.magicPoints.value;

    this.actor.system.attributes.hitPoints.value = formData["system.attributes.hitPoints.value"];
    this.actor.system.attributes.magicPoints.value =
      formData["system.attributes.magicPoints.value"];

    const newHealth = DamageCalculations.getCombinedActorHealth(this.actor);
    if (newHealth !== this.actor.system.attributes.health) {
      // @ts-expect-error this.token should be TokenDocument, but is typed as Token
      const speaker = ChatMessage.getSpeaker({ actor: this.actor, token: this.token });
      const speakerName = speaker.alias;
      let message;
      if (
        newHealth === "dead" &&
        // @ts-expect-error token.actor
        !this.token?.actor.statuses.has("dead")
      ) {
        message = `${speakerName} runs out of hitpoints and dies here and now!`;
      }
      if (
        newHealth === "unconscious" &&
        // @ts-expect-error token?.actor
        !this.token?.actor.statuses.has("unconscious")
      ) {
        message = `${speakerName} faints from lack of hitpoints!`;
      }
      if (message) {
        ChatMessage.create({
          user: getGameUser().id,
          speaker: speaker,
          content: message,
          whisper: usersIdsThatOwnActor(this.actor),
          // @ts-expect-error CHAT_MESSAGE_STYLES
          type: CONST.CHAT_MESSAGE_STYLES.WHISPER,
        });
      }
    }

    this.actor.system.attributes.hitPoints.value = hpTmp; // Restore hp so the form will work
    this.actor.system.attributes.magicPoints.value = mpTmp;
    if (this.token) {
      // @ts-expect-error wait for foundry-vtt-types issue #1165 #1166
      const tokenHealthBefore = this.token?.actor?.system.attributes.health;
      // @ts-expect-error wait for foundry-vtt-types issue #1165 #1166
      this.token.actor.system.attributes.health = newHealth; // "Pre update" the health to make the setTokenEffect call work
      // @ts-expect-error wait for foundry-vtt-types issue #1165 #1166
      HitLocationSheet.setTokenEffect(this.token.object as RqgToken, tokenHealthBefore);
    }
    formData["system.attributes.health"] = newHealth;

    return super._updateObject(event, formData);
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);
    if (!this.actor.isOwner) {
      // Only owners are allowed to interact
      return;
    }
    const htmlElement = html[0];
    // Foundry doesn't provide dragenter & dragleave in its DragDrop handling
    htmlElement.parentElement?.querySelectorAll<HTMLElement>("[data-dropzone]").forEach((elem) => {
      elem.addEventListener("dragenter", this._onDragEnter);
      elem.addEventListener("dragleave", this._onDragLeave);
    });

    // This is a hack to prevent activating button click listeners when typing return in input boxes
    // This invisible button at the start of the form will catch the event and do nothing.
    htmlElement.querySelectorAll<HTMLElement>("[data-return-sink]").forEach((el) => {
      el.addEventListener("click", async () => {
        (document.activeElement as HTMLElement)?.blur();
      });
    });

    new ContextMenu(
      html,
      ".characteristic.contextmenu",
      // @ts-expect-error wait for foundry-vtt-types issue #1165 #1166
      characteristicMenuOptions(this.actor, this.token),
    );
    new ContextMenu(html, ".combat.contextmenu", combatMenuOptions(this.actor));
    new ContextMenu(html, ".hit-location.contextmenu", hitLocationMenuOptions(this.actor));
    // @ts-expect-error wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".rune.contextmenu", runeMenuOptions(this.actor, this.token));
    new ContextMenu(html, ".spirit-magic.contextmenu", spiritMagicMenuOptions(this.actor));
    new ContextMenu(html, ".cult.contextmenu", cultMenuOptions(this.actor));
    new ContextMenu(html, ".rune-magic.contextmenu", runeMagicMenuOptions(this.actor));
    // @ts-expect-error wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".skill.contextmenu", skillMenuOptions(this.actor, this.token));
    new ContextMenu(html, ".gear.contextmenu", gearMenuOptions(this.actor));
    // @ts-expect-error wait for foundry-vtt-types issue #1165 #1166
    new ContextMenu(html, ".passion.contextmenu", passionMenuOptions(this.actor, this.token));

    // Use attributes data-item-edit, data-item-delete & data-item-roll to specify what should be clicked to perform the action
    // Set data-item-edit=actor.items._id on the same or an outer element to specify what item the action should be performed on.

    // Roll actor Characteristic
    htmlElement.querySelectorAll<HTMLElement>("[data-characteristic-roll]").forEach((el) => {
      const closestDataCharacteristic = el.closest("[data-characteristic]");
      assertHtmlElement(closestDataCharacteristic);
      const characteristicName = closestDataCharacteristic?.dataset.characteristic as
        | keyof typeof actorCharacteristics
        | undefined;

      let clickCount = 0;
      const actorCharacteristics = this.actor.system.characteristics;
      if (!characteristicName || !(characteristicName in actorCharacteristics)) {
        const msg = `Characteristic [${characteristicName}] isn't found on actor [${this.actor.name}].`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, this.actor);
      }
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);

        if (clickCount >= 2) {
          await this.actor.characteristicRollImmediate(characteristicName);

          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await this.actor.characteristicRoll(characteristicName);
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll actor Reputation
    htmlElement?.querySelectorAll<HTMLElement>("[data-reputation-roll]").forEach((el) => {
      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);

        if (clickCount >= 2) {
          await this.actor.reputationRollImmediate();
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await this.actor.reputationRoll();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Item (Rune, Skill, Passion)
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId);
      requireValue(item, "AbilityChance roll couldn't find skillItem");
      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        if (
          hasOwnProperty(item.system, "category") &&
          [
            SkillCategoryEnum.MeleeWeapons,
            SkillCategoryEnum.MissileWeapons,
            SkillCategoryEnum.Shields,
            SkillCategoryEnum.NaturalWeapons,
          ].includes(item.system.category)
        ) {
          ui.notifications?.warn(
            "To use a weapon please make sure it is equipped and use the Combat tab instead.",
          );
          return;
        }

        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          await item.abilityRollImmediate();
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await item.abilityRoll();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Rune Magic
    htmlElement?.querySelectorAll<HTMLElement>("[data-rune-magic-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const runeMagicItem = this.actor.getEmbeddedDocument("Item", itemId) as RqgItem | undefined;
      assertItemType(runeMagicItem?.type, ItemTypeEnum.RuneMagic);
      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        assertItemType(runeMagicItem.type, ItemTypeEnum.RuneMagic);
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          if (runeMagicItem.system.points > 1) {
            await runeMagicItem?.runeMagicRoll();
          } else {
            await runeMagicItem?.runeMagicRollImmediate();
          }

          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await runeMagicItem?.runeMagicRoll();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Spirit Magic
    htmlElement?.querySelectorAll<HTMLElement>("[data-spirit-magic-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId);
      if (!item) {
        const msg = `Couldn't find item [${itemId}] to roll Spirit Magic against`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        if (item.type !== ItemTypeEnum.SpiritMagic) {
          const msg = "Tried to roll a Spirit Magic Roll against some other Item";
          ui.notifications?.error(msg);
          throw new RqgError(msg, item);
        }
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          if (item.system.isVariable && item.system.points > 1) {
            await item.spiritMagicRoll();
          } else {
            await item.spiritMagicRollImmediate();
          }

          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await item.spiritMagicRoll();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Weapon Ability (send to chat)
    htmlElement?.querySelectorAll<HTMLElement>("[data-weapon-roll]").forEach((el) => {
      const weaponItemId = getRequiredDomDataset(el, "item-id");
      const weapon = this.actor.items.get(weaponItemId);
      assertItemType(weapon?.type, ItemTypeEnum.Weapon);

      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        if ((ev.target as HTMLElement)?.tagName === "SELECT") {
          return; // User clicked on a select element above this element - don't interpret it as an attack
        }

        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          // Ignore double clicks by doing the same as on single click
          await weapon.attack();
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              weapon.attack();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Flip hit location sort order
    htmlElement
      ?.querySelectorAll<HTMLElement>("[data-flip-sort-hitlocation-setting]")
      .forEach((el) => {
        el.addEventListener("click", async () => {
          const currentValue = getGame().settings.get(systemId, "sortHitLocationsLowToHigh");
          await getGame().settings.set(systemId, "sortHitLocationsLowToHigh", !currentValue);
          // Rerender all actor sheets the user has open
          Object.values(ui.windows).forEach((a: any) => {
            if (a?.document?.type === ActorTypeEnum.Character) {
              a.render();
            }
          });
        });
      });

    // Set comma separated Token SRs in Combat Tracker
    htmlElement?.querySelectorAll<HTMLElement>("[data-set-sr]").forEach((el: HTMLElement) => {
      const srValue = getRequiredDomDataset(el, "set-sr");
      const srToAdd = srValue.split(",").map((v) => Number(v.trim()));
      el.addEventListener("click", async () => {
        this.activeInSR = new Set(srToAdd);
        await this.updateActiveCombatWithSR(this.activeInSR);
      });
    });

    htmlElement?.querySelectorAll<HTMLElement>("[data-toggle-sr]").forEach((el: HTMLElement) => {
      const sr = Number(getRequiredDomDataset(el, "toggle-sr"));

      el.addEventListener("click", async () => {
        if (this.activeInSR.has(sr)) {
          this.activeInSR.delete(sr);
        } else {
          this.activeInSR.add(sr);
        }
        await this.updateActiveCombatWithSR(this.activeInSR);
      });
    });

    // Edit Item (open the item sheet)
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-edit]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${this.actor.name} to open item sheet (during setup).`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      el.addEventListener("click", () => item.sheet!.render(true));
    });

    // Delete Item (remove item from actor)
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-delete]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => RqgActorSheet.confirmItemDelete(this.actor, itemId));
    });

    // Sort Items alphabetically
    htmlElement?.querySelectorAll<HTMLElement>("[data-sort-items]").forEach((el) => {
      const itemType = getRequiredDomDataset(el, "sort-items");
      el.addEventListener("click", () => RqgActorSheet.sortItems(this.actor, itemType));
    });

    // Cycle the equipped state of a physical Item
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-equipped-toggle]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", async () => {
        if (itemId.startsWith("virtual:")) {
          const [, itemEquippedStatus, itemName] = itemId.split(":");
          const newEquippedStatus =
            equippedStatuses[
              (equippedStatuses.indexOf(itemEquippedStatus as EquippedStatus) + 1) %
                equippedStatuses.length
            ];
          const affectedItems = new ItemTree(
            this.actor.items.contents,
          ).getOtherItemIdsInSameLocationTree(itemName);
          const updates = affectedItems.map((id) => ({
            _id: id,
            system: { equippedStatus: newEquippedStatus },
          }));
          await this.actor.updateEmbeddedDocuments("Item", updates);
          return;
        }
        const item = this.actor.items.get(itemId);
        if (!item || !("equippedStatus" in item.system)) {
          const msg = `Couldn't find itemId [${itemId}] to toggle the equipped state (when clicked).`;
          ui.notifications?.error(msg);
          throw new RqgError(msg);
        }
        const newStatus =
          equippedStatuses[
            (equippedStatuses.indexOf(item.system.equippedStatus) + 1) % equippedStatuses.length
          ];
        // Will trigger a Actor#_onModifyEmbeddedEntity that will update the other physical items in the same location tree
        await item.update({ "system.equippedStatus": newStatus });
      });
    });

    // Edit item value
    htmlElement?.querySelectorAll<HTMLInputElement>("[data-item-edit-value]").forEach((el) => {
      const path = getRequiredDomDataset(el, "item-edit-value");
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("change", async (event) => {
        const item = this.actor.items.get(itemId);
        requireValue(item, `Couldn't find itemId [${itemId}] to edit an item (when clicked).`);
        await item.update({ [path]: (event.target as HTMLInputElement)?.value }, {});
      });
    });

    // Add wound to hit location
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-add-wound]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      // @ts-expect-error wait for foundry-vtt-types issue #1165 #1166
      const speakerName = (this.token?.name || this.actor.prototypeToken.name) ?? "";
      el.addEventListener("click", () =>
        HitLocationSheet.showAddWoundDialog(this.actor, itemId, speakerName),
      );
    });

    // Heal wounds to hit location
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-heal-wound]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => HitLocationSheet.showHealWoundDialog(this.actor, itemId));
    });

    // Edit Actor Active Effect
    htmlElement?.querySelectorAll<HTMLElement>("[data-actor-effect-edit]").forEach((el) => {
      const effectUuid = getRequiredDomDataset(el, "effect-uuid");
      el.addEventListener("click", () => {
        // @ts-expect-error fromUuidSync
        const effect = fromUuidSync(effectUuid);
        requireValue(effect, `No active effect id [${effectUuid}] to edit the effect`);
        new ActiveEffectConfig(effect).render(true);
      });
    });

    // Delete Item Active Effect
    htmlElement?.querySelectorAll<HTMLElement>("[data-actor-effect-delete]").forEach((el) => {
      const effectUuid = getRequiredDomDataset(el, "effect-uuid");
      el.addEventListener("click", () => {
        // @ts-expect-error fromUuidSync
        fromUuidSync(effectUuid)?.delete();
      });
    });

    // Roll Damage for spirit magic (and separate damage bonus)
    htmlElement?.querySelectorAll<HTMLElement>("[data-damage-roll]").forEach((el) => {
      const damage = el.dataset.damageRoll;
      requireValue(damage, "direct damage roll without damage");
      el.addEventListener("click", async () => {
        const r = new Roll(damage);
        await r.evaluate({ async: true });
        await r.toMessage({
          speaker: ChatMessage.getSpeaker(),
          // @ts-expect-error CHAT_MESSAGE_STYLES
          type: CONST.CHAT_MESSAGE_STYLES.ROLL,
          flavor: `damage`,
        });
      });
    });

    // Handle rqid links
    RqidLink.addRqidLinkClickHandlers(html);

    // Handle deleting RqidLinks from RqidLink Array Properties
    $(htmlElement!)
      .find("[data-delete-from-property]")
      .each((i: number, el: HTMLElement) => {
        const deleteRqid = getRequiredDomDataset($(el), "delete-rqid");
        const deleteFromPropertyName = getRequiredDomDataset($(el), "delete-from-property");
        el.addEventListener("click", async () => {
          const deleteFromProperty = getProperty(this.actor.system, deleteFromPropertyName);
          if (Array.isArray(deleteFromProperty)) {
            const newValueArray = (deleteFromProperty as RqidLink[]).filter(
              (r) => r.rqid !== deleteRqid,
            );
            await this.actor.update({ system: { [deleteFromPropertyName]: newValueArray } });
          } else {
            await this.actor.update({ system: { [deleteFromPropertyName]: "" } });
          }
        });
      });

    // Add Passion button
    htmlElement?.querySelectorAll<HTMLElement>("[data-passion-add]").forEach((el) => {
      el.addEventListener("click", async () => {
        const defaultItemIconSettings: any = getGame().settings.get(
          systemId,
          "defaultItemIconSettings",
        );
        const newPassionName = localize("RQG.Item.Passion.PassionEnum.Loyalty");
        const passion = {
          name: newPassionName,
          type: ItemTypeEnum.Passion,
          img: defaultItemIconSettings[ItemTypeEnum.Passion],
          system: { passion: newPassionName },
        };
        const createdItems = await this.actor.createEmbeddedDocuments("Item", [passion]);
        (createdItems[0] as RqgItem)?.sheet?.render(true);
      });
    });

    // handle in-grid editing of runes
    htmlElement?.querySelectorAll<HTMLElement>("[data-rune-grid-edit]").forEach((el) => {
      el.addEventListener("change", async (event) => {
        const updateId = getRequiredDomDataset($(el), "item-id");
        const newChance = parseInt((event.target as HTMLInputElement).value);
        await this.actor.updateEmbeddedDocuments("Item", [
          { _id: updateId, system: { chance: newChance } },
        ]);
      });
    });

    // handle in-grid editing of skills
    htmlElement?.querySelectorAll<HTMLElement>("[data-skill-grid-edit]").forEach((el) => {
      el.addEventListener("change", async (event) => {
        const updateId = getRequiredDomDataset($(el), "item-id");
        const newGainedChance = parseInt((event.target as HTMLInputElement).value);
        await this.actor.updateEmbeddedDocuments("Item", [
          { _id: updateId, system: { gainedChance: newGainedChance } },
        ]);
      });
    });

    // handle in-grid editing of passions
    htmlElement?.querySelectorAll<HTMLElement>("[data-passion-grid-edit]").forEach((el) => {
      el.addEventListener("change", async (event) => {
        const updateId = getRequiredDomDataset($(el), "item-id");
        const newChance = parseInt((event.target as HTMLInputElement).value);
        await this.actor.updateEmbeddedDocuments("Item", [
          { _id: updateId, system: { chance: newChance } },
        ]);
      });
    });

    // Add Gear buttons
    htmlElement?.querySelectorAll<HTMLElement>("[data-gear-add]").forEach((el) => {
      const physicalItemType = getRequiredDomDataset(el, "gear-add");
      el.addEventListener("click", async () => {
        const defaultItemIconSettings: any = getGame().settings.get(
          systemId,
          "defaultItemIconSettings",
        );

        const physicalItemType2ItemName = new Map<PhysicalItemType, string>([
          ["unique", "RQG.Actor.Gear.NewGear"],
          ["currency", "RQG.Actor.Gear.NewCurrency"],
          ["consumable", "RQG.Actor.Gear.NewConsumable"],
        ]);

        const name = localize(
          physicalItemType2ItemName.get(physicalItemType) ?? "RQG.Actor.Gear.NewGear",
        );

        const newGear = {
          name: name,
          type: ItemTypeEnum.Gear,
          img: defaultItemIconSettings[ItemTypeEnum.Gear],
          system: { physicalItemType: physicalItemType },
        };
        const createdItems = await this.actor.createEmbeddedDocuments("Item", [newGear]);
        (createdItems[0] as RqgItem)?.sheet?.render(true);
      });
    });
  }

  private async updateActiveCombatWithSR(activeInSR: Set<number>) {
    const combat = getGame().combat;
    if (!combat) {
      throw new RqgError(
        "Programming error: updateActiveCombatWithSR should not be run if there are no combats.",
      );
    }
    // Don't start from the token.combatant since double-clicking the combatant in the combat tracker opens the prototype token instead of the token.
    // @ts-expect-error actorId
    const actorCombatant = combat.combatants.find((c) => c.actorId === this.actor.id);
    const currentCombatants = getCombatantsSharingToken(actorCombatant);

    // Delete combatants that don't match activeInSR
    const combatantIdsToDelete = getCombatantIdsToDelete(currentCombatants, activeInSR);
    if (combatantIdsToDelete.length > 0) {
      if (getGameUser().isGM) {
        await combat.deleteEmbeddedDocuments("Combatant", combatantIdsToDelete);
      } else {
        socketSend({
          action: "deleteCombatant",
          combatId: combat.id,
          idsToDelete: combatantIdsToDelete,
        });
      }
    }
    if (activeInSR.size === 0) {
      await currentCombatants[0].update({ initiative: null });
    }

    // Create new Combatants for missing SR
    const srWithoutCombatants = getSrWithoutCombatants(currentCombatants, activeInSR);

    const newCombatants = srWithoutCombatants
      .map((sr) => ({
        // @ts-expect-error tokenId
        tokenId: currentCombatants[0].tokenId,
        // @ts-expect-error sceneId
        sceneId: currentCombatants[0].sceneId,
        // @ts-expect-error actorId
        actorId: currentCombatants[0].actorId,
        initiative: sr,
      }))
      .filter(isTruthy);
    if (newCombatants.length > 0) {
      await combat.createEmbeddedDocuments("Combatant", newCombatants);
    }
  }

  private getEquippedProjectiles(): any[] {
    return [
      [{ _id: "", name: "---" }],
      ...this.actor.getEmbeddedCollection("Item").filter(
        // @ts-expect-error type & system
        (i: RqgItem) =>
          i.type === ItemTypeEnum.Weapon &&
          i.system.isProjectile &&
          i.system.equippedStatus === "equipped",
      ),
    ];
  }

  static async confirmItemDelete(actor: RqgActor, itemId: string): Promise<void> {
    const item = actor.items.get(itemId);
    requireValue(item, `No itemId [${itemId}] on actor ${actor.name} to show delete item Dialog`);

    const itemTypeLoc: string = localizeItemType(item.type);

    const title = localize("RQG.Dialog.confirmItemDeleteDialog.title", {
      itemType: itemTypeLoc,
      itemName: item.name,
    });

    let content: string;
    if (item.type === ItemTypeEnum.Cult) {
      content = localize("RQG.Dialog.confirmItemDeleteDialog.contentCult", {
        itemType: itemTypeLoc,
        itemName: item.name,
        runeMagicSpell: localizeItemType(ItemTypeEnum.RuneMagic),
      });
    } else {
      content = localize("RQG.Dialog.confirmItemDeleteDialog.content", {
        itemType: itemTypeLoc,
        itemName: item.name,
      });
    }

    const confirmDialog = new RqgAsyncDialog<boolean>(title, content);

    const buttons = {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: localize("RQG.Dialog.Common.btnConfirm"),
        callback: async () => confirmDialog.resolve(true),
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: localize("RQG.Dialog.Common.btnCancel"),
        callback: () => confirmDialog.resolve(false),
      },
    };

    if (await confirmDialog.setButtons(buttons, "cancel").show()) {
      const idsToDelete = [];
      if (item.type === ItemTypeEnum.Cult) {
        const cultId = item.id;
        const runeMagicSpells = actor.items.filter(
          (i) => i.type === ItemTypeEnum.RuneMagic && i.system.cultId === cultId,
        );
        runeMagicSpells.forEach((s) => {
          idsToDelete.push(s.id);
        });
      }

      idsToDelete.push(itemId);
      await actor.deleteEmbeddedDocuments("Item", idsToDelete);
    }
  }

  _onDragEnter(event: DragEvent): void {
    onDragEnter(event);
  }

  _onDragLeave(event: DragEvent): void {
    onDragLeave(event);
  }

  protected async _onDrop(event: DragEvent): Promise<unknown> {
    event.preventDefault(); // Allow the drag to be dropped
    this.render(true); // Rerender instead of calling removeDragHoverClass to get rid of any dragHover classes. They are nested in the actorSheet.

    // @ts-expect-error getDragEventData
    const data = TextEditor.getDragEventData(event);
    const allowedDropDocumentNames = getAllowedDropDocumentNames(event);
    if (
      data.type !== "Compendium" &&
      !isAllowedDocumentNames(data.type, allowedDropDocumentNames)
    ) {
      return false;
    }

    const actor = this.actor;

    /**
     * A hook event that fires when some useful data is dropped onto an ActorSheet.
     * @function dropActorSheetData
     * @memberof hookEvents
     * @param {Actor} actor      The Actor
     * @param {ActorSheet} sheet The ActorSheet application
     * @param {object} data      The data that has been dropped onto the sheet
     */
    const allowed = Hooks.call("dropActorSheetData", actor, this, data);
    if (allowed === false) {
      return;
    }

    // Handle different data types (document names)
    switch (data.type) {
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
      case "Actor":
        return this._onDropActor(event, data);
      case "Item":
        return this._onDropItem(event, data);
      case "JournalEntry":
        return this._onDropJournalEntry(event, data);
      case "JournalEntryPage":
        return this._onDropJournalEntryPage(event, data);
      case "Folder":
        return this._onDropFolder(event, data);
      case "Compendium":
        return this._onDropCompendium(event, data);
      default:
        // This will warn about not supported Document Name
        isAllowedDocumentNames(data.type, [
          "ActiveEffect",
          "Actor",
          "Item",
          "JournalEntry",
          "JournalEntryPage",
          "Folder",
        ]);
    }
  }

  // @ts-expect-error parameter types
  async _onDropItem(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    // A player will not be able to copy an item to an Actor sheet
    // unless they are the owner.
    if (!this.actor.isOwner) {
      ui.notifications?.warn(
        localize("RQG.Actor.Notification.NotActorOwnerWarn", { actorName: this.actor.name }),
      );
      return false;
    }

    const { droppedDocument: item, isAllowedToDrop } = await extractDropInfo<RqgItem>(event, data);

    if (!isAllowedToDrop) {
      return false;
    }

    const itemData = item?.toObject();
    // Handle item sorting within the same Actor
    if (this.actor.uuid === item?.parent?.uuid) {
      return this._onSortItem(event, itemData) ?? false;
    }

    if (item.type === ItemTypeEnum.Occupation) {
      if (!hasRqid(item)) {
        return false;
      }
      await updateRqidLink(this.actor, "background.currentOccupationRqidLink", item);
      return [item];
    }

    if (!item.parent) {
      // Dropped from Sidebar
      // if (itemData.type === ItemTypeEnum.RuneMagic) {
      //   assertItemType(itemData.type, ItemTypeEnum.RuneMagic);
      //   itemData.data.cultId = ""; // clear cult id to avoid errors, player will have to associate this spell with a cult
      // }
      return this._onDropItemCreate(itemData);
    }

    const targetActor = this.actor;
    const sourceActor = item.parent;

    // Handle item sorting within the same Actor
    if (targetActor.uuid === sourceActor?.uuid) {
      return this._onSortItem(event, itemData) ?? false;
    }

    if (
      itemData.type === ItemTypeEnum.Armor ||
      itemData.type === ItemTypeEnum.Gear ||
      itemData.type === ItemTypeEnum.Weapon
    ) {
      // Prompt to confirm giving physical item from one Actor to another,
      // and ask how many if it has a quantity of more than one.
      return await this.confirmTransferPhysicalItem(itemData, sourceActor);
    } else {
      // Prompt to ensure user wants to copy intangible items
      //(runes, skills, passions, etc) from one Actor to another
      return await this.confirmCopyIntangibleItem(itemData, sourceActor);
    }
  }

  async _onDropJournalEntry(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | JournalEntry[]> {
    const {
      droppedDocument: droppedJournal,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
    } = await extractDropInfo<JournalEntry>(event, data);

    if (isAllowedToDrop && hasRqid(droppedJournal)) {
      await updateRqidLink(this.actor, targetPropertyName, droppedJournal);
      return [droppedJournal];
    }
    return false;
  }

  async _onDropCompendium(event: DragEvent, data: any): Promise<RqgItem[]> {
    if (!this.actor.isOwner) {
      return [];
    }
    const compendiumId = data.id;
    const pack = getGame().packs.get(compendiumId);
    const packIndex = await pack?.getIndex();
    if (!packIndex) {
      return [];
    }
    const documents = await Promise.all(
      packIndex.map(async (di) => {
        // @ts-expect-error uuid
        const doc = await fromUuid(di.uuid);
        return doc?.toObject();
      }),
    );
    return this._onDropItemCreate(documents.filter(isTruthy));
  }

  async _onDropJournalEntryPage(
    event: DragEvent,
    data: { type: string; uuid: string },
    // @ts-expect-error JournalEntryPage
  ): Promise<boolean | JournalEntryPage[]> {
    const {
      droppedDocument: droppedPage,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
      // @ts-expect-error JournalEntryPage
    } = await extractDropInfo<JournalEntryPage>(event, data);

    if (isAllowedToDrop && hasRqid(droppedPage)) {
      await updateRqidLink(this.actor, targetPropertyName, droppedPage);
      return [droppedPage];
    }
    return false;
  }

  private async confirmCopyIntangibleItem(
    incomingItemDataSource: ItemDataSource,
    sourceActor: RqgActor,
  ): Promise<RqgItem[] | boolean> {
    const adapter: any = {
      incomingItemDataSource: incomingItemDataSource,
      sourceActor: sourceActor,
      targetActor: this.actor,
    };
    const content: string = await renderTemplate(templatePaths.confirmCopyIntangibleItem, {
      adapter: adapter,
    });

    const title = localize("RQG.Dialog.confirmCopyIntangibleItem.title", {
      itemName: incomingItemDataSource.name,
      targetActor: this.actor.name,
    });
    const confirmDialog = new RqgAsyncDialog<RqgItem[] | boolean>(title, content);

    const buttons = {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: localize("RQG.Dialog.confirmCopyIntangibleItem.btnCopy"),
        callback: () => {
          confirmDialog.resolve(this.submitConfirmCopyIntangibleItem(incomingItemDataSource));
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: localize("RQG.Dialog.Common.btnCancel"),
        callback: () => confirmDialog.resolve(false),
      },
    };
    return await confirmDialog.setButtons(buttons, "submit").show();
  }

  private async submitConfirmCopyIntangibleItem(
    incomingItemDataSource: ItemDataSource,
  ): Promise<RqgItem[]> {
    return this._onDropItemCreate(incomingItemDataSource);
  }

  private async confirmTransferPhysicalItem(
    incomingItemDataSource: ItemDataSource,
    sourceActor: RqgActor,
  ): Promise<RqgItem[] | boolean> {
    const adapter: any = {
      incomingItemDataSource: incomingItemDataSource,
      sourceActor: sourceActor,
      targetActor: this.actor,
      // @ts-expect-error quantity
      showQuantity: incomingItemDataSource.system.quantity > 1,
    };

    const content: string = await renderTemplate(templatePaths.confirmTransferPhysicalItem, {
      adapter: adapter,
    });

    const title = localize("RQG.Dialog.confirmTransferPhysicalItem.title", {
      itemName: incomingItemDataSource.name,
      targetActor: this.actor.name,
    });

    const confirmDialog = new RqgAsyncDialog<RqgItem[] | boolean>(title, content);

    const buttons = {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: localize("RQG.Dialog.confirmTransferPhysicalItem.btnGive"),
        callback: async (html: JQuery | HTMLElement) =>
          confirmDialog.resolve(
            this.submitConfirmTransferPhysicalItem(
              html as JQuery,
              incomingItemDataSource,
              sourceActor,
            ),
          ),
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: localize("RQG.Dialog.Common.btnCancel"),
        callback: () => confirmDialog.resolve(false),
      },
    };
    return await confirmDialog.setButtons(buttons, "submit").show();
  }

  private async submitConfirmTransferPhysicalItem(
    html: JQuery,
    incomingItemDataSource: ItemDataSource,
    sourceActor: RqgActor,
  ): Promise<RqgItem[] | boolean> {
    const formData = new FormData(html.find("form")[0]);
    const data = Object.fromEntries(formData.entries());

    let quantityToTransfer: number = 1;
    if (data.numtotransfer) {
      quantityToTransfer = Number(data.numtotransfer);
    }
    return await this.transferPhysicalItem(incomingItemDataSource, quantityToTransfer, sourceActor);
  }

  private async transferPhysicalItem(
    incomingItemDataSource: ItemDataSource,
    quantityToTransfer: number,
    sourceActor: RqgActor,
  ): Promise<RqgItem[] | boolean> {
    if (!incomingItemDataSource) {
      ui.notifications?.error(localize("RQG.Actor.Notification.NoIncomingItemDataSourceError"));
      return false;
    }
    if (!hasOwnProperty(incomingItemDataSource.system, "quantity")) {
      ui.notifications?.error(
        localize("RQG.Actor.Notification.IncomingItemDataSourceNotPhysicalItemError"),
      );
      return false;
    }
    if (quantityToTransfer < 1) {
      ui.notifications?.error(localize("RQG.Actor.Notification.CantTransferLessThanOneItemError"));
      return false;
    }
    // @ts-expect-error quantity
    if (quantityToTransfer > incomingItemDataSource.system.quantity) {
      ui.notifications?.error(
        localize("RQG.Actor.Notification.CantTransferMoreThanSourceOwnsError", {
          itemName: incomingItemDataSource.name,
          sourceActorName: sourceActor.name,
        }),
      );
      return false;
    }

    const existingItem = this.actor.items.find(
      (i: RqgItem) =>
        i.name === incomingItemDataSource.name && i.type === incomingItemDataSource.type,
    );

    let newTargetQty = quantityToTransfer;
    const newSourceQty = Number(incomingItemDataSource.system.quantity) - quantityToTransfer;

    if (existingItem) {
      // Target actor has an item of this type with the same name

      newTargetQty += Number(existingItem.system.quantity);
      const targetUpdate = await this.actor.updateEmbeddedDocuments("Item", [
        { _id: existingItem.id, system: { quantity: newTargetQty } },
      ]);
      if (targetUpdate) {
        if (newSourceQty > 0) {
          // update with new source quantity
          return (await sourceActor.updateEmbeddedDocuments("Item", [
            { _id: incomingItemDataSource._id, system: { quantity: newSourceQty } },
          ])) as RqgItem[];
        } else {
          // delete source item
          // @ts-expect-error _id
          return sourceActor.deleteEmbeddedDocuments("Item", [incomingItemDataSource._id]);
        }
      }
    } else {
      // Target actor does not have an item of this type with the same name
      incomingItemDataSource.system.quantity = newTargetQty;
      const targetCreate = await this._onDropItemCreate(incomingItemDataSource);
      if (targetCreate) {
        if (newSourceQty > 0) {
          // update with new source quantity
          return (await sourceActor.updateEmbeddedDocuments("Item", [
            { _id: incomingItemDataSource._id, system: { quantity: newSourceQty } },
          ])) as RqgItem[];
        } else {
          // delete source item
          // @ts-expect-error _id
          return sourceActor.deleteEmbeddedDocuments("Item", [incomingItemDataSource._id]);
        }
      }
    }
    return false;
  }

  protected async _renderOuter(): Promise<JQuery<JQuery.Node>> {
    const html = (await super._renderOuter()) as JQuery<JQuery.Node>;
    await addRqidLinkToSheetHtml(html, this);

    const editModeLink = html.find(".title-edit-mode")[0];
    if (editModeLink) {
      editModeLink.dataset.tooltipDirection = "UP";
      editModeLink.dataset.tooltip = this.actor.system.editMode
        ? localize("RQG.Actor.EditMode.SwitchToPlayMode")
        : localize("RQG.Actor.EditMode.SwitchToEditMode");
    }

    return html;
  }

  protected _getHeaderButtons(): Application.HeaderButton[] {
    const headerButtons = super._getHeaderButtons();

    if (
      getGame().settings.get(systemId, "actor-wizard-feature-flag") && // TODO remove when wizard is released
      !this.actor.getFlag(systemId, actorWizardFlags)?.actorWizardComplete &&
      !this.actor.getFlag(systemId, actorWizardFlags)?.isActorTemplate
    ) {
      headerButtons.splice(0, 0, {
        class: `actor-wizard-button-${this.actor.id}`,
        label: localize("RQG.ActorCreation.AdventurerCreationHeaderButton"),
        icon: "fas fa-user-edit",
        onclick: () => this._openActorWizard(),
      });
    }

    const user = getGameUser();

    if (user.isGM || user.isTrusted) {
      if (this.actor.system.editMode) {
        headerButtons.splice(0, 0, {
          class: "title-edit-mode",
          label: "",
          icon: "edit-mode-icon",
          onclick: (event) => this._toggleEditMode(event),
        });
      } else {
        headerButtons.splice(0, 0, {
          class: "title-edit-mode",
          label: "",
          icon: "play-mode-icon",
          onclick: (event) => this._toggleEditMode(event),
        });
      }
    }

    return headerButtons;
  }

  _toggleEditMode(event: any) {
    const newMode = !this.actor.system.editMode;
    const link = getHTMLElement(event)?.closest("a");
    if (!link) {
      ui.notifications?.warn("No link element found when toggling editMode"); // Should never happen
      return;
    }

    if (newMode) {
      link.innerHTML = `<i class="edit-mode-icon"></i>`;
      link.dataset.tooltip = localize("RQG.Actor.EditMode.SwitchToPlayMode");
    } else {
      link.innerHTML = `<i class="play-mode-icon"></i>`;
      link.dataset.tooltip = localize("RQG.Actor.EditMode.SwitchToEditMode");
    }
    this.actor.update({ system: { editMode: newMode } });
  }

  _openActorWizard() {
    new ActorWizard(this.actor, {}).render(true);
  }

  private static async sortItems(actor: RqgActor, itemType: string): Promise<void> {
    const itemsToSort = actor.items.filter((i) => i.type === itemType);
    itemsToSort.sort((a: RqgItem, b: RqgItem) => {
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    itemsToSort.map((item: RqgItem, index) => {
      if (index === 0) {
        // @ts-expect-error sort
        item.sort = CONST.SORT_INTEGER_DENSITY;
      } else {
        // @ts-expect-error sort
        item.sort = itemsToSort[index - 1].sort + CONST.SORT_INTEGER_DENSITY;
      }
    });
    const updateData = itemsToSort.map((item) => ({
      _id: item.id,
      // @ts-expect-error sort
      sort: item.sort,
    }));
    await actor.updateEmbeddedDocuments("Item", updateData);
  }
}

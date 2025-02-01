import { RqgCalculations } from "../system/rqgCalculations";
import type { CharacterDataPropertiesData } from "../data-model/actor-data/rqgActorData";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { ItemTypeEnum, ResponsibleItemClass } from "../data-model/item-data/itemTypes";
import { RqgActorSheet } from "./rqgActorSheet";
import { DamageCalculations } from "../system/damageCalculations";
import {
  getGame,
  hasOwnProperty,
  localize,
  localizeCharacteristic,
  RqgError,
} from "../system/util";
import { initializeAllCharacteristics } from "./context-menus/characteristic-context-menu";
import { systemId } from "../system/config";
import { Rqid } from "../system/api/rqidApi";
import type { AnyDocumentData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/data.mjs";
import type EmbeddedCollection from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/embedded-collection.mjs";
import type { Document } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs";
import type { DocumentModificationOptions } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs";
import type {
  ActorData,
  PrototypeTokenData,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";
import type { RqgActiveEffect } from "../active-effect/rqgActiveEffect";
import type { RqgItem } from "../items/rqgItem";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import { CharacteristicRollOptions } from "../rolls/CharacteristicRoll/CharacteristicRoll.types";
import { CharacteristicRoll } from "../rolls/CharacteristicRoll/CharacteristicRoll";
import { Characteristic, Characteristics } from "../data-model/actor-data/characteristics";
import { CharacteristicRollDialog } from "../applications/CharacteristicRollDialog/characteristicRollDialog";
import { AbilityRollOptions } from "../rolls/AbilityRoll/AbilityRoll.types";
import { AbilityRollDialog } from "../applications/AbilityRollDialog/abilityRollDialog";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";
import { PartialAbilityItem } from "../applications/AbilityRollDialog/AbilityRollDialogData.types";

export class RqgActor extends Actor {
  static init() {
    CONFIG.Actor.documentClass = RqgActor;

    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet(systemId, RqgActorSheet as any, {
      label: "RQG.SheetName.Actor.Character",
      types: [ActorTypeEnum.Character],
      makeDefault: true,
    });
  }
  declare system: CharacterDataPropertiesData; // v10 type workaround
  declare prototypeToken: PrototypeTokenData; // v10 type workaround
  declare statuses: Set<string>; // v11 type workaround
  declare appliedEffects: RqgActiveEffect[]; // v11 type workaround

  /**
   * Only handles embedded Items
   */
  public getEmbeddedDocumentsByRqid(rqid: string | undefined): RqgItem[] {
    if (!rqid) {
      return [];
    }
    return this.items.filter((i) => i.getFlag(systemId, "documentRqidFlags.id") === rqid);
  }

  public getBestEmbeddedDocumentByRqid(rqid: string): RqgItem | undefined {
    return this.getEmbeddedDocumentsByRqid(rqid).sort(Rqid.compareRqidPrio)[0];
  }

  public async characteristicRoll(
    characteristicName: keyof Characteristics,
    options: Partial<CharacteristicRollOptions> = {},
  ): Promise<void> {
    const rollOptions = this.getCharacteristicRollDefaults(characteristicName, options);
    await new CharacteristicRollDialog(this, rollOptions).render(true);
  }
  /**
   * Do a characteristic roll and handle possible POW experience check afterward.
   */
  public async characteristicRollImmediate(
    characteristicName: keyof Characteristics,
    options: Omit<CharacteristicRollOptions, "characteristicValue" | "characteristicName"> = {},
  ): Promise<void> {
    const rollOptions = this.getCharacteristicRollDefaults(characteristicName, options);
    const characteristicRoll = await CharacteristicRoll.rollAndShow(rollOptions);
    await this.checkExperience(rollOptions.characteristicName, characteristicRoll.successLevel);
  }

  private getCharacteristicRollDefaults(
    characteristicName: keyof Characteristics,
    options: Partial<CharacteristicRollOptions>,
  ): CharacteristicRollOptions {
    const actorCharacteristics: any = this.system.characteristics;
    const rollCharacteristic = actorCharacteristics[characteristicName] as
      | Characteristic
      | undefined;

    if (!rollCharacteristic) {
      throw new RqgError(
        `Tried to roll characteristic with unknown characteristic name [${options.characteristicName}]`,
      );
    }

    return foundry.utils.mergeObject(
      options,
      {
        characteristicName: characteristicName,
        characteristicValue: rollCharacteristic.value ?? 0,
        difficulty: 5,
        speaker: ChatMessage.getSpeaker({ actor: this }),
      },
      { overwrite: false },
    ) as CharacteristicRollOptions;
  }

  /**
   * Open an ability roll dialog for reputation   */
  public async reputationRoll(
    options: Omit<AbilityRollOptions, "naturalSkill"> = {},
  ): Promise<void> {
    const reputationItem = this.createReputationFakeItem();
    await new AbilityRollDialog(reputationItem, options).render(true);
  }

  /**
   * Do a reputation (ability) Roll
   */
  public async reputationRollImmediate(
    options: Omit<AbilityRollOptions, "naturalSkill"> = {},
  ): Promise<void> {
    const reputationItem = this.createReputationFakeItem();
    const speaker = ChatMessage.getSpeaker({ actor: this });
    const useSpecialCriticals = getGame().settings.get(systemId, "specialCrit");

    const combinedOptions = foundry.utils.mergeObject(
      options,
      {
        naturalSkill: reputationItem.system.chance,
        modifiers: [],
        abilityName: reputationItem.name ?? undefined,
        abilityImg: reputationItem.img ?? undefined,
        useSpecialCriticals: useSpecialCriticals,
        speaker: speaker,
      },
      { overwrite: false },
    );

    await AbilityRoll.rollAndShow(combinedOptions);
  }

  private createReputationFakeItem(): PartialAbilityItem {
    const defaultItemIconSettings: any = getGame().settings.get(
      systemId,
      "defaultItemIconSettings",
    );
    return {
      name: "Reputation",
      img: defaultItemIconSettings.reputation,
      system: {
        chance: this.system.background.reputation ?? 0,
      },
    } as const;
  }

  // TODO should use result: SpiritMagicSuccessLevelEnum
  public async drawMagicPoints(amount: number, result: AbilitySuccessLevelEnum): Promise<void> {
    if (result <= AbilitySuccessLevelEnum.Success) {
      const newMp = (this.system.attributes.magicPoints.value || 0) - amount;
      await this.update({ "system.attributes.magicPoints.value": newMp });
      ui.notifications?.info(
        localize("RQG.Dialog.SpiritMagicRoll.SuccessfullyCastInfo", { amount: amount }),
      );
    }
  }

  /**
   * First prepare any derived data which is actor-specific and does not depend on Items or Active Effects
   */
  prepareBaseData(): void {
    super.prepareBaseData();
    // Set this here before Active effects to allow POW crystals to boost it.
    this.system.attributes.magicPoints.max = this.system.characteristics.power.value;
  }

  prepareEmbeddedDocuments(): void {
    // @ts-expect-error Foundry 9
    super.prepareEmbeddedDocuments();
    const actorSystem = this.system;
    const { con, siz, pow } = this.actorCharacteristics();
    actorSystem.attributes.hitPoints.max = RqgCalculations.hitPoints(con, siz, pow);

    this.items.forEach((item) =>
      ResponsibleItemClass.get(item.type)?.onActorPrepareEmbeddedEntities(item),
    );
  }

  /**
   * Apply any transformations to the Actor data which are caused by ActiveEffects.
   */
  applyActiveEffects(): void {
    super.applyActiveEffects();
  }

  /**
   * Apply final transformations to the Actor data after all effects have been applied
   */
  prepareDerivedData(): void {
    super.prepareDerivedData();
    const attributes = this.system.attributes;
    const { str, con, siz, dex, int, pow, cha } = this.actorCharacteristics();
    const skillCategoryModifiers = (this.system.skillCategoryModifiers =
      RqgCalculations.skillCategoryModifiers(
        str,
        siz,
        dex,
        int,
        pow,
        cha,
        this.system.attributes.isCreature,
      ));

    attributes.encumbrance = {
      max: this.calcMaxEncumbrance(
        str,
        con,
        attributes.move?.[attributes.move?.currentLocomotion]?.carryingFactor,
      ),
      travel: this.calcTravelEncumbrance(this.items),
      equipped: this.calcEquippedEncumbrance(this.items),
    };

    const equippedMovementEncumbrancePenalty = Math.min(
      0,
      (attributes.encumbrance.max || 0) - (attributes.encumbrance.equipped || 0),
    );

    attributes.move.value =
      this.system.attributes.move?.[attributes.move?.currentLocomotion]?.value || 0;

    attributes.move.equipped = attributes.move.value + equippedMovementEncumbrancePenalty;
    skillCategoryModifiers.agility += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.manipulation += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.stealth += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.meleeWeapons += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.missileWeapons += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.naturalWeapons += equippedMovementEncumbrancePenalty * 5;
    skillCategoryModifiers.shields += equippedMovementEncumbrancePenalty * 5;

    const travelMovementEncumbrancePenalty = Math.min(
      0,
      attributes.encumbrance.max - attributes.encumbrance.travel,
    );
    attributes.move.travel = attributes.move.value + travelMovementEncumbrancePenalty;

    this.items.forEach((item) =>
      ResponsibleItemClass.get(item.type)?.onActorPrepareDerivedData(item),
    );

    attributes.dexStrikeRank = RqgCalculations.dexSR(dex);
    attributes.sizStrikeRank = RqgCalculations.sizSR(siz);
    attributes.damageBonus = RqgCalculations.damageBonus(str, siz);
    attributes.healingRate = RqgCalculations.healingRate(con);
    attributes.spiritCombatDamage = RqgCalculations.spiritCombatDamage(pow, cha);

    attributes.health = DamageCalculations.getCombinedActorHealth(this);
  }

  /**
   * Return the bodyType of an actor. Currently only "humanoid" or "other"
   */
  public getBodyType(): string {
    const actorHitlocationRqids = this.items
      .filter((i) => i.type === ItemTypeEnum.HitLocation)
      .map((hl) => hl.flags?.rqg?.documentRqidFlags?.id ?? "");
    if (
      CONFIG.RQG.bodytypes.humanoid.length === actorHitlocationRqids.length &&
      CONFIG.RQG.bodytypes.humanoid.every((hitLocationRqid) =>
        actorHitlocationRqids.includes(hitLocationRqid),
      )
    ) {
      return "humanoid";
    } else {
      return "other";
    }
  }

  // Currently only marks POW experience
  public async checkExperience(
    characteristicName: string,
    result: AbilitySuccessLevelEnum | undefined,
  ): Promise<void> {
    if (
      result != null &&
      result <= AbilitySuccessLevelEnum.Success &&
      characteristicName === "power" &&
      !this.system.characteristics.power.hasExperience
    ) {
      await this.update({ "system.characteristics.power.hasExperience": true });
      const msg = localize("RQG.Actor.AwardExperience.GainedExperienceInfo", {
        actorName: this.name,
        itemName: localizeCharacteristic("power"),
      });
      ui.notifications?.info(msg);
    }
  }

  private calcMaxEncumbrance(
    str: number | undefined,
    con: number | undefined,
    carryingFactor: number | undefined,
  ): number {
    if (!str) {
      return 0;
    }
    return Math.round(Math.min(str, (str + (con ?? 0)) / 2) * (carryingFactor ?? 1));
  }

  private calcTravelEncumbrance(items: EmbeddedCollection<typeof RqgItem, ActorData>): number {
    return Math.round(
      items.reduce((sum: number, item: RqgItem) => {
        if (
          hasOwnProperty(item.system, "equippedStatus") &&
          ["carried", "equipped"].includes(item.system.equippedStatus)
        ) {
          const enc = (item.system.quantity ?? 1) * (item.system.encumbrance ?? 0);
          return sum + enc;
        }
        return sum;
      }, 0),
    );
  }

  private calcEquippedEncumbrance(items: EmbeddedCollection<typeof RqgItem, ActorData>): number {
    return Math.round(
      items.reduce((sum, item: RqgItem) => {
        if (
          hasOwnProperty(item.system, "physicalItemType") &&
          item.system.equippedStatus === "equipped"
        ) {
          const quantity = item.system.quantity ?? 1;
          const encumbrance = item.system.encumbrance ?? 0;
          return sum + quantity * encumbrance;
        }
        return sum;
      }, 0),
    );
  }

  // Entity-specific actions that should occur when the Entity is first created
  // @ts-expect-error _onCreate
  protected _onCreate(actorData: ActorData, options: DocumentModificationOptions, userId: string) {
    super._onCreate(actorData as any, options, userId); // TODO type bug ??

    if (!this.prototypeToken.actorLink) {
      initializeAllCharacteristics(this);
    }
  }

  protected _preCreateDescendantDocuments(
    parent: Document<any, any>,
    collection: string,
    data: AnyDocumentData[],
    options: object,
    userId: string,
  ): void {
    if (parent === this && collection === "items" && getGame().user?.id === userId) {
      data.forEach((d) => {
        // @ts-expect-error d.type
        ResponsibleItemClass.get(d.type)?.preEmbedItem(this, d, options, userId);
      });
    }
  }

  protected _onCreateDescendantDocuments(
    parent: Document<any, any>,
    collection: string,
    documents: Document<any, any>[],
    data: object[],
    options: object,
    userId: string,
  ): void {
    if (parent === this && collection === "items" && getGame().user?.id === userId) {
      documents.forEach((d: any) => {
        // TODO any bailout - fix types!
        ResponsibleItemClass.get(d.type)
          ?.onEmbedItem(this, d, options, userId)
          .then((updateData: any) => {
            // @ts-expect-error isEmpty
            if (!foundry.utils.isEmpty(updateData)) {
              this.updateEmbeddedDocuments("Item", [updateData]); // TODO move the actual update outside the loop (map instead of forEach)
            }
          });
      });
    }
    // @ts-expect-error _onCreateDescendantDocuments
    super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
  }

  protected _onDeleteDescendantDocuments(
    parent: Document<any, any>,
    collection: string,
    documents: Document<any, any>[],
    ids: string[],
    options: object,
    userId: string,
  ): void {
    if (parent === this && collection === "item" && getGame().user?.id === userId) {
      documents.forEach((d) => {
        // @ts-expect-error type
        const updateData = ResponsibleItemClass.get(d.type)?.onDeleteItem(
          this,
          d as RqgItem, // TODO type bailout - fixme
          options,
          userId,
        );
        if (updateData?.length) {
          this.updateEmbeddedDocuments("Item", updateData);
        }
      });
    }
    // @ts-expect-error _onDeleteDescendantDocuments
    super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);
  }

  // Return shorthand access to actor data & characteristics
  private actorCharacteristics(): {
    str: number | undefined;
    con: number | undefined;
    siz: number | undefined;
    dex: number | undefined;
    int: number | undefined;
    pow: number | undefined;
    cha: number | undefined;
  } {
    const characteristics = this.system.characteristics;
    const str = characteristics.strength.value;
    const con = characteristics.constitution.value;
    const siz = characteristics.size.value;
    const dex = characteristics.dexterity.value;
    const int = characteristics.intelligence.value;
    const pow = characteristics.power.value;
    const cha = characteristics.charisma.value;
    return { str, con, siz, dex, int, pow, cha };
  }
}

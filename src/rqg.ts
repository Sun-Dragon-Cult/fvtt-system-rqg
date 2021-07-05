import { registerRqgSystemSettings } from "./system/rqgSystemSettings.js";
import { loadHandlebarsTemplates } from "./system/loadHandlebarsTemplates.js";
import { RqgActor } from "./actors/rqgActor.js";
import { RqgItem } from "./items/rqgItem";
import { registerHandlebarsHelpers } from "./system/registerHandlebarsHelpers";
import { RqgActiveEffect } from "./actors/rqgActiveEffect";
import { RqgCombat } from "./combat/rqgCombat";
import { RQG_CONFIG, RqgConfig } from "./system/config";
import { ChatCardListeners } from "./chat/chatCardListeners";
import { Migrate } from "./system/migrate";
import { RqgCombatTracker } from "./combat/RqgCombatTracker";
import { RqgToken } from "./combat/rqgToken";

declare const CONFIG: RqgConfig;

Hooks.once("init", async () => {
  console.log("RQG | Initializing the Runequest Glorantha (Unofficial) Game System");
  CONFIG.RQG = RQG_CONFIG;

  // CONFIG.debug.hooks = true; // console log when hooks fire
  // CONFIG.debug.time = true; // console log time

  CONFIG.time = {
    turnTime: 0, // Don't advance time per combatant
    roundTime: 12, // Melee round
  };
  RqgActiveEffect.init();
  RqgCombat.init();
  RqgCombatTracker.init();
  RqgToken.init();
  RqgActor.init();
  RqgItem.init();
  ChatCardListeners.init();
  registerRqgSystemSettings();
  await loadHandlebarsTemplates();
  registerHandlebarsHelpers();
});

Hooks.once("ready", async () => {
  if (game.user?.isGM) {
    await Migrate.world();
    const runeCompendium = game.settings.get("rqg", "runesCompendium") as string;
    // Store runes in settings to avoid await on ItemSheet getData
    try {
      const runesIndex = await game.packs?.get(runeCompendium)?.getIndex();
      await game.settings.set("rqg", "runes", runesIndex);
    } catch (err) {
      await game.settings.set("rqg", "runes", []);
    }

    if (game.modules.get("about-time")?.active) {
      const gameTime: any = game.GameTime;
      gameTime.DTC.createFromData(gameTime.calendars.Glorantha);
      gameTime.DTC.saveUserCalendar(gameTime.calendars.Glorantha);
    }
  }
});

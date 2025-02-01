import { WeaponChatHandler } from "./weaponChatHandler";
import { RqgChatMessageFlags } from "../data-model/shared/rqgDocumentFlags";
import { systemId } from "../system/config";
import {
  handleApplyActorDamage,
  handleApplyWeaponDamage,
  handleDamageAndHitlocation,
  handleDefend,
  handleRollFumble,
  hideChatActionButtons,
} from "./attackFlowHandlers";

export type ChatMessageType = keyof typeof chatHandlerMap;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const chatHandlerMap = {
  weaponChat: WeaponChatHandler,
  attackChat: undefined, // TODO Remove this connection, only used to get ChatMessageTypes to rqgDocumentFlags??
};

export class RqgChatMessage extends ChatMessage {
  public static init() {
    CONFIG.ChatMessage.documentClass = RqgChatMessage;

    Hooks.on("renderChatLog", (chatLog: any, html: JQuery) => {
      RqgChatMessage.addChatListeners(html[0]);
    });
    // Hooks.on("renderChatPopout", (chatPopout: any, html: JQuery) => {
    //   if (html === chatPopout._element) {
    //     // This is called on chatMessage.update as well with different html - resulting in double listeners.
    //     // To prevent that check that html (which is a li.chat-message element in case of update) is the same as
    //     // chatPopout.element (which always is div.chat-popout)
    //     RqgChatMessage.addChatListeners(html[0]);
    //   }
    // });
    // Hooks.on("renderChatMessage", (chatItem, html) => {
    //   RqidLink.addRqidLinkClickHandlers(html); // TODO this might not work if rqid points to compendium (async)
    // });

    Hooks.on("renderChatMessage", (app: any, html: JQuery) => {
      // Only display combat action buttons to players that should see them
      // TODO run the attackTemplate renderer to replace the html here?
      hideChatActionButtons(html[0]);

      // Scroll to show the possibly enlarged message, but only if at bottom of chat
      // @ts-expect-error isAtBottom
      if (ui?.chat.isAtBottom) {
        // TODO how to make it work without releasing the execution thread?
        // @ts-expect-error scrollBottom
        setTimeout(() => ui?.chat.scrollBottom(), 0);
      }
    });
  }

  declare flags: { [systemId]: RqgChatMessageFlags }; // v10 type workaround

  private static addChatListeners(html: HTMLElement | undefined): void {
    html?.addEventListener("click", RqgChatMessage.clickHandler);
  }

  public static async clickHandler(clickEvent: MouseEvent): Promise<void> {
    const clickedButton = clickEvent.target as HTMLButtonElement;
    // ***************************
    // *** START - Attack Flow ***
    // ***************************

    if (clickedButton?.dataset.defence !== undefined) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleDefend(clickedButton); // Open Defence Dialog (roll defence)
    }

    if (clickedButton?.dataset.damageHitlocation !== undefined) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleDamageAndHitlocation(clickedButton); // Roll damage & hit location
    }

    if (clickedButton?.dataset.woundedActorUuid !== undefined) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleApplyActorDamage(clickedButton); // Inflict damage to actor
    }

    if (clickedButton?.dataset.damagedWeaponUuid !== undefined) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleApplyWeaponDamage(clickedButton); // Damage weapon HP
    }

    if (clickedButton?.dataset.fumble !== undefined) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleRollFumble(clickedButton); // Roll the Fumble table
    }

    // *************************
    // *** END - Attack Flow ***
    // *************************
  }

  private static commonClickHandling(clickEvent: MouseEvent, clickedButton: HTMLButtonElement) {
    clickEvent.preventDefault();
    clickedButton.disabled = true;
    setTimeout(() => (clickedButton.disabled = false), 1000); // Prevent double clicks
  }

  // private static async inputChangeHandler(inputEvent: Event): Promise<void> {
  //   const target = inputEvent.target;
  //   assertHtmlElement(target);
  //   if (target?.dataset.handleChange == null) {
  //     return; // Only handle inputs etc that are tagged with "data-handle-change"
  //   }
  //   const { chatMessageId } = RqgChatMessage.getChatMessageInfo(inputEvent);
  //   const chatMessage = getGame().messages?.get(chatMessageId) as RqgChatMessage;
  //   requireValue(chatMessage, localize("RQG.Dialog.Common.CantFindChatMessageError"));
  //
  //   const flags = chatMessage.flags.rqg;
  //   requireValue(flags, "No rqg flags found on chat message");
  //   const chatMessageType = flags?.type;
  //   requireValue(chatMessageType, "Found chatmessage without chat message type");
  //
  //   chatHandlerMap[chatMessageType].updateFlagsFromForm(flags, inputEvent);
  //   const data = await chatHandlerMap[chatMessageType].renderContent(flags);
  //
  //   const domChatMessages = document.querySelectorAll<HTMLElement>(
  //     `[data-message-id="${chatMessage.id}"]`,
  //   );
  //   const domChatMessage = Array.from(domChatMessages).find((m) =>
  //     m.contains(inputEvent.currentTarget as Node),
  //   );
  //   const isFromPopoutChat = !!domChatMessage?.closest(".chat-popout");
  //
  //   await chatMessage.update(data); // Rerenders the dom chatmessages
  //   const newDomChatMessages = document.querySelectorAll<HTMLElement>(
  //     `[data-message-id="${chatMessage.id}"]`,
  //   );
  //   const newDomChatMessage = Array.from(newDomChatMessages).find(
  //     (m) => !!m.closest<HTMLElement>(".chat-popout") === isFromPopoutChat,
  //   );
  //
  //   // Find the input element that inititated the change and move the cursor there.
  //   const inputElement = inputEvent.target;
  //   if (inputElement instanceof HTMLInputElement && inputElement.type === "text") {
  //     const elementName = inputElement?.name;
  //     const newInputElement = newDomChatMessage?.querySelector<HTMLInputElement>(
  //       `[name=${elementName}]`,
  //     );
  //     newInputElement && moveCursorToEnd(newInputElement);
  //   }
  //   // @ts-expect-error is marked as private!?
  //   ui.chat?.scrollBottom(); // Fix that the weapon chat gets bigger and pushes the rest of the chatlog down
  // }
  //
  // public static async formSubmitHandler(submitEvent: SubmitEvent): Promise<boolean> {
  //   submitEvent.preventDefault();
  //
  //   const { chatMessageId } = RqgChatMessage.getChatMessageInfo(submitEvent);
  //
  //   const clickedButton = submitEvent.submitter as HTMLButtonElement;
  //   clickedButton.disabled = true;
  //   setTimeout(() => (clickedButton.disabled = false), 1000); // Prevent double clicks
  //
  //   const chatMessage = getGame().messages?.get(chatMessageId) as RqgChatMessage | undefined;
  //   const flags = chatMessage?.flags.rqg;
  //   requireValue(flags, "Couldn't find flags on chatmessage");
  //
  //   const chatMessageType = flags.type;
  //
  //   chatHandlerMap[chatMessageType].updateFlagsFromForm(flags, submitEvent);
  //
  //   const form = submitEvent.target as HTMLFormElement;
  //   // Disable form until completed
  //   form.style.pointerEvents = "none";
  //
  //   await chatMessage.doRoll();
  //
  //   // Enabling the form again after DsN animation is finished TODO doesn't wait?
  //   form.style.pointerEvents = "auto";
  //   return false;
  // }
  //
  // public async doRoll(): Promise<void> {
  //   const flags = this.flags.rqg;
  //   requireValue(flags, "No rqg flags found on chat message");
  //   // TODO don't roll from chat, roll from dialog
  //   // const chatMessageType = flags.type;
  //   // await chatHandlerMap[chatMessageType].rollFromChat(this);
  // }
}

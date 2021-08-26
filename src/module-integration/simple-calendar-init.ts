import { calendar } from "./simple-calendar-glorantha";

declare const SimpleCalendar: any;
const simpleCalendarModule = "foundryvtt-simple-calendar";

export async function setupSimpleCalendar() {
  if (game.modules.get(simpleCalendarModule)?.active) {
    SimpleCalendar.api.configureCalendar(calendar); // calendar is basically an export of simple-calendar settings with current date removed
    return;
  }
}

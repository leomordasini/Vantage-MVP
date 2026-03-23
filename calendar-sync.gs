// ─────────────────────────────────────────────────────────────────────────────
// LIL Calendar Sync
// Copies events from your work Google Calendar to your personal calendar.
// Run this on your PERSONAL Google account at script.google.com
//
// SETUP:
// 1. Share your work calendar with your personal Gmail (read access)
// 2. Paste this script at script.google.com (logged into personal Gmail)
// 3. Set WORK_CALENDAR_ID below to your work email
// 4. Run setupTrigger() once manually to create the hourly trigger
// ─────────────────────────────────────────────────────────────────────────────

// ── Config ────────────────────────────────────────────────────────────────────

const WORK_CALENDAR_ID  = 'leonardo.mordasini@datadoghq.com'  // your work email
const PERSONAL_CALENDAR = 'primary'  // your personal calendar (primary = default)
const DAYS_AHEAD        = 14  // how many days ahead to sync
const DAYS_BEHIND       = 1   // how many days back to check (catches late accepts)

// ── Main sync function ────────────────────────────────────────────────────────

function syncCalendar() {
  const props       = PropertiesService.getScriptProperties()
  const now         = new Date()
  const start       = new Date(now.getTime() - DAYS_BEHIND * 24 * 60 * 60 * 1000)
  const end         = new Date(now.getTime() + DAYS_AHEAD  * 24 * 60 * 60 * 1000)

  let workCal
  try {
    workCal = CalendarApp.getCalendarById(WORK_CALENDAR_ID)
  } catch (e) {
    Logger.log('Could not access work calendar: ' + e.message)
    Logger.log('Make sure you have shared the work calendar with this Google account.')
    return
  }

  if (!workCal) {
    Logger.log('Work calendar not found: ' + WORK_CALENDAR_ID)
    Logger.log('Make sure you have shared the work calendar with this Google account.')
    return
  }

  const personalCal = CalendarApp.getCalendarById(PERSONAL_CALENDAR)
                   || CalendarApp.getDefaultCalendar()

  const events = workCal.getEvents(start, end)
  Logger.log('Found ' + events.length + ' events in work calendar')

  let created = 0
  let skipped = 0

  for (const event of events) {
    const eventId  = event.getId()
    const propKey  = 'synced_' + eventId

    // Skip if already copied
    if (props.getProperty(propKey)) {
      skipped++
      continue
    }

    // Skip declined events
    const myStatus = event.getMyStatus()
    if (myStatus === CalendarApp.GuestStatus.NO) {
      Logger.log('Skipping declined event: ' + event.getTitle())
      continue
    }

    // Skip all-day events that are just "holidays" or out-of-office markers
    const title = event.getTitle() || ''
    if (event.isAllDayEvent() && (
      title.toLowerCase().includes('out of office') ||
      title.toLowerCase().includes('ooo') ||
      title.toLowerCase().includes('holiday')
    )) {
      Logger.log('Skipping OOO/holiday: ' + title)
      continue
    }

    try {
      // Build attendee list (excluding self)
      const attendees = event.getGuestList()
        .filter(g => g.getEmail() !== WORK_CALENDAR_ID)
        .map(g => g.getName() || g.getEmail())
        .join(', ')

      // Build description with work context
      const originalDesc = event.getDescription() || ''
      const meetLink     = event.getLocation() || ''
      const syncNote     = `[Synced from work calendar]\nAttendees: ${attendees || 'none'}`
      const fullDesc     = syncNote + (originalDesc ? '\n\n' + originalDesc : '')

      let newEvent
      if (event.isAllDayEvent()) {
        newEvent = personalCal.createAllDayEvent(
          '🏢 ' + title,
          event.getAllDayStartDate(),
          event.getAllDayEndDate(),
          { description: fullDesc, location: meetLink }
        )
      } else {
        newEvent = personalCal.createEvent(
          '🏢 ' + title,
          event.getStartTime(),
          event.getEndTime(),
          { description: fullDesc, location: meetLink }
        )
      }

      // Mark as synced so we don't duplicate it
      props.setProperty(propKey, new Date().toISOString())
      created++
      Logger.log('Synced: ' + title + ' (' + event.getStartTime() + ')')

    } catch (e) {
      Logger.log('Failed to sync event "' + title + '": ' + e.message)
    }
  }

  Logger.log('Sync complete — created: ' + created + ', skipped (already synced): ' + skipped)
}

// ── Trigger setup — run this once manually ───────────────────────────────────

function setupTrigger() {
  // Remove any existing triggers for syncCalendar to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers()
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'syncCalendar') {
      ScriptApp.deleteTrigger(trigger)
    }
  }

  // Create a new hourly trigger
  ScriptApp.newTrigger('syncCalendar')
    .timeBased()
    .everyHours(1)
    .create()

  Logger.log('Hourly trigger created. Sync will run every hour automatically.')

  // Run an immediate sync now
  syncCalendar()
}

// ── Optional: clear sync history to re-sync everything ───────────────────────

function clearSyncHistory() {
  const props = PropertiesService.getScriptProperties()
  props.deleteAllProperties()
  Logger.log('Sync history cleared. Next run will re-sync all events.')
}

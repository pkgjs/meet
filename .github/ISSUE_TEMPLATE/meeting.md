## Date/Time

| Timezone | Date/Time |
|----------|-----------|
<%= [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Amsterdam',
  'Europe/Moscow',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney'
].map((zone) => {
  const zonedDate = date.toZonedDateTimeISO(zone)
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: zone
  })
  const formattedDate = formatter.format(new Date(zonedDate.epochMilliseconds))
  return `| ${zone} | ${formattedDate} |`
}).join('\n') %>

Or in your local time:
* https://www.timeanddate.com/worldclock/?iso=<%= date.toZonedDateTimeISO('UTC').toPlainDateTime().toString() %>

## Agenda

Extracted from **<%= agendaLabel %>** labelled issues and pull requests from **<%= owner %>/<%= repo %>** prior to the meeting.

<%= agendaIssues.map((i) => {
  return `* ${i.title} [#${i.number}](${i.html_url})`
}).join('\n') %>

## Links

* Minutes: <%= meetingNotes || '' %>

### Joining the meeting

* link for participants: <%= meetingLink %>
* For those who just want to watch:

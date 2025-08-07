'use strict'

module.exports = ({ agendaIssues, agendaLabel, owner, repo, issue }) => {
  return `
# ${issue.title}

## Links

  * **Recording**:
  * **GitHub Issue**: https://github.com/${owner}/${repo}/issues/${issue.number}

## Present

  *

## Announcements

## Agenda

*Extracted from **${agendaLabel}** labelled issues and pull requests from the **${owner} org** prior to the meeting.

${agendaIssues.map((i) => {
  return `* ${i.html_url}`
}).join('\n')}

## Q&A, Other

`
}

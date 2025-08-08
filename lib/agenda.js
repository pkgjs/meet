'use strict'

/**
 * get agenda issues and PRs from repositories
 * @param {Object} client - GitHub client
 * @param {Array} repos - array of objects with owner and repo properties
 * @param {string} agendaLabel - label to filter issues and PRs by
 * @returns {Promise<Array>} array of unique issues and PRs
 */
async function fetchAgendaItems (client, repos, agendaLabel) {
  const agendaIssues = []

  for (const r of repos) {
    const _agendaIssues = await client.paginate('GET /repos/{owner}/{repo}/issues', {
      owner: r.owner,
      repo: r.repo,
      state: 'open',
      labels: agendaLabel,
      per_page: 100
    })

    console.log(`Fetching issues for ${r.owner}/${r.repo}: Found ${_agendaIssues.length}`)

    for (const i of _agendaIssues) {
      console.log(`Adding Issue: ${i.url}`)
      agendaIssues.push(i)
    }
  }

  console.log(`Found ${agendaIssues.length} total issues for agenda`)
  return agendaIssues
}

module.exports = {
  fetchAgendaItems
}

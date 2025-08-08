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

  // deduplicate repos
  const uniqueRepos = [...new Map(
    repos.map(repo => [`${repo.owner}/${repo.repo}`, repo])
  ).values()]

  for (const r of uniqueRepos) {
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

    const _agendaPrs = (await client.paginate('GET /repos/{owner}/{repo}/pulls', {
      owner: r.owner,
      repo: r.repo,
      state: 'open',
      labels: agendaLabel,
      per_page: 100
    })).filter(pr => pr.labels.find(label => label.name === agendaLabel) &&
                     !(agendaIssues.find((i) => i.url === pr.url))) // workaround for flaky GH API/SDK behavior where sometimes the issue endpoint loads PRs

    console.log(`Fetching PRs for ${r.owner}/${r.repo}: Found ${_agendaPrs.length}`)

    for (const pr of _agendaPrs) {
      console.log(`Adding PR: ${pr.url}`)
      agendaIssues.push(pr)
    }
  }

  console.log(`Found ${agendaIssues.length} total issues for agenda`)
  return agendaIssues
}

module.exports = {
  fetchAgendaItems
}

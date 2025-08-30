'use strict'

/**
 * Builds a GitHub search query for agenda items (issues and PRs).
 * @param {Array<{owner: string, repo: string}>} repos - Array of objects, each with `owner` and `repo` string properties representing GitHub repositories.
 * @param {string[]} users - Array of GitHub usernames to filter by (used for `author` and `assignee` fields).
 * @param {string} agendaLabel - Label to filter issues and PRs by.
 * @returns {string} The GitHub search query string.
 */
function buildQuery (repos, users, agendaLabel) {
  // Deduplicate repos (owner+repo)
  const uniqueRepos = Array.from(
    new Map(repos.map((repo) => [`${repo.owner}/${repo.repo}`, repo])).values()
  )

  // Repo filter: repo:owner/repo OR ...
  const repoQuery = uniqueRepos
    .map(({ owner, repo }) => `repo:${owner}/${repo}`)
    .join(' OR ')

  // User filter: (author:user OR assignee:user OR ...)
  const userQuery = users
    .map((user) => `owner:${user}`)
    .join(' OR ')

  // Compose full query
  // Agenda label must be ANDed with repo/user filters
  return [
    `is:open label:"${agendaLabel}"`,
    [repoQuery, userQuery].filter(Boolean).join(' OR ')
  ]
    .filter(Boolean)
    .join(' ')
}
/**
 * Fetches agenda issues and PRs from repositories using the GitHub search endpoint.
 * @param {import('@octokit/core').Octokit} client - An authenticated GitHub API client (Octokit instance).
 * @param {Array<{owner: string, repo: string}>} repos - Array of objects, each with `owner` and `repo` string properties representing GitHub repositories.
 * @param {string[]} users - Array of GitHub usernames to filter by.
 * @param {string} agendaLabel - Label to filter issues and PRs by.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of unique issues and PRs.
 */
async function fetchAgendaItems (client, repos, users, agendaLabel) {
  const query = buildQuery(repos, users, agendaLabel)
  const items = await client.paginate('GET /search/issues', {
    q: query,
    per_page: 100
  })

  console.log(`Found ${items.length} total items for agenda`)
  return items
}

module.exports = {
  fetchAgendaItems,
  buildQuery
}

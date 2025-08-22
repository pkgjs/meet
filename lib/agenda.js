'use strict'

const { graphql } = require('@octokit/graphql')

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

async function fetchDiscussionsItems (repos, agendaLabel, token) {
  const agendaDiscussions = []
  for (const r of repos) {
    let hasNextPage = true
    let endCursor = null
    do {
      const query = `
          query($owner: String!, $name: String!, $after: String) {
            repository(owner: $owner, name: $name) {
              discussions(first: 100, after: $after) {
                pageInfo {
                  endCursor
                  hasNextPage
                }
                edges {
                  cursor
                  node {
                    id
                    title
                    url
                    labels(first: 10) {
                      nodes {
                        color
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `
      const variables = {
        owner: r.owner,
        name: r.repo,
        after: endCursor
      }

      const _agendaDiscussions = await graphql(query, {
        ...variables,
        headers: {
          authorization: `token ${token}`
        }
      })

      const discussions = _agendaDiscussions?.repository?.discussions

      if (discussions) {
        const { edges, pageInfo } = discussions
        for (const edge of edges) {
          const labels = edge.node?.labels.nodes
          if (Array.isArray(labels) && labels.some(label => label.name === agendaLabel)) {
            console.log(`Adding Discussion: ${edge.node.url}`)
            agendaDiscussions.push({
              id: edge.node.id,
              html_url: edge.node.url,
              title: edge.node.title
            })
          }
        }
        hasNextPage = pageInfo.hasNextPage
        endCursor = pageInfo.endCursor
      } else {
        hasNextPage = false
      }
    } while (hasNextPage)
  }

  console.log(`Found ${agendaDiscussions.length} total discussions for agenda`)

  return agendaDiscussions
}

module.exports = {
  fetchAgendaItems,
  fetchDiscussionsItems
}

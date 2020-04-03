'use strict'
const github = require('@actions/github')
const issues = require('../lib/issues')

;(async ([,, token, issueNumber]) => {
  if (!issueNumber) {
    return
  }
  console.log(`Closing test issue ${issueNumber}`)

  const client = new github.GitHub(token)
  await issues.closeIssue(client, issueNumber, {
    ...github.context.repo
  })
})(process.argv)

# Schedule regularly occuring meetings via GitHub Issue

<!--
[![NPM Version](https://img.shields.io/npm/v/meeting-maker.svg)](https://npmjs.org/package/meeting-maker)
[![NPM Downloads](https://img.shields.io/npm/dm/meeting-maker.svg)](https://npmjs.org/package/meeting-maker)
-->
[![test](https://github.com/pkgjs/meet/workflows/test/badge.svg)](https://github.com/pkgjs/meet/actions?query=workflow%3Atest)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/standard/standard)

Schedule meetings via a GitHub Action.  Creates issues based on a schedule and template.

This repository is managed by the [Package Maintenance Working Group](https://github.com/nodejs/package-maintenance), see [Governance](https://github.com/nodejs/package-maintenance/blob/master/Governance.md).


## Usage

```yaml
name: Schedule team meetings
on:
  schedule:
    - cron: '0 0 * * * *'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: pkgjs/meet@v0
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        schedules: 2020-04-02T17:00:00.0Z/P1D
```

### Inputs

The meeting schedule, issue, etc can be configured with inouts to this action.

- `token`: (required) The token from the action for calling to the GitHub API.
- `schedules`: (required) The ISO-8601 interval for the schedule. Default: `${now/P7D}` seven days from now
- `createWithin`: (required) The ISO-8601 duration for how soon before the meeting to create the issue. Default `P7D`
- `meetingLabel`: Label to create the meeting issue with. Default: `meeting`
- `agendaLabel`: Label to pull the agenda from. Default: `meeting-agenda`
- `issueTitle`: Template string for issue title.  Default: `Meeting <%= date.toFormat('yyyy-MM-dd') %>`
- `issueTemplate`: The name of the issue template found in `.github/ISSUE_TEMPLATE`. Default: `meeting.md`

### Default Issue Template

The default issue template can be seen here: https://github.com/wesleytodd/meeting-maker/issues/34

It is based off the one commonly used on across the Node.js Org, but any additions or improvements are welcome.

### JS API Usage

The main logic of the module is also published to npm.

```
$ npm i @pkgjs/meet
```

```javascript
const maker = require('@pkgjs/meet')

;(async () => {
  const issue = await maker.meetings.createNextMeeting(client, {
    owner: 'pkgjs',
    repo: 'meet',
    schedules: []
  })
  console.log(issue) // the response from the GitHub api creating the issue
})()
```

## Contributing

This package welcomes contributions.  While the basic unit tests are runnable
(`npm t`) Unfortunatly because it is requires access to the GitHub api it means
you need to have a token with access to create the issues as part of the
integration tests.  To specify the key you need to create a personal access token
and put it in a `.env` file as `GITHUB_TOKEN=<TOKEN>`.  Then you can run
`npm run test:integration` to run the main integration tests.  To be honest this
should probably be configurable, contributions welcome.

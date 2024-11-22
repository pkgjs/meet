const core = require('@actions/core')

// get the various inputs from GitHub Actions YAML provided by the user
const inputs = {
  title: core.getInput('issueTitle'),
  agendaLabel: core.getInput('agendaLabel'),
  invitees: core.getInput('invitees'),
  observers: core.getInput('observers'),
  meetingLink: core.getInput('meetingLink')
}

// template keys and values that we automagically replace in
// markdown templates that are passed to us.
const templates = {
  keys: {
    title: '<!-- title -->',
    agendaLabel: '<!-- agenda label -->',
    invitees: '<!-- invitees -->',
    observers: '<!-- observers  -->',
    meetingLink: '<!-- meeting link -->'
  },
  values: {
    title: inputs.issueTitle,
    agendaLabel: inputs.agendaLabel,
    invitees: inputs.invitees,
    observers: inputs.observers,
    meetingLink: inputs.meetingLink
  }
}

const convert = async function (template) {
  /*
    - things to add from cutenode/action-meeting
      - agenda issue title
      - agenda label
      - invited (need to add action metadata)
      - observers (need to add action metadata)
      - agenda
      - organization

    - other things to add:
      - time table (need to figure out logic)
      - meeting link (need to add action metadata)
      - viewing link (need to add action metadata)

    - things that may or may not exist
      - hackmd link
  */

  // This for in for in if while does the following:
  //
  // - starts a loop for every key in templates.keys
  // - starts a (nested) loop for every key in templates.values
  // - sets up shorthand for the values of the objects from both
  //   loops (keysValue and valuesValue representing
  //   templates.keys[keysKey] and templates.values[valuesKey])
  // - from there, we check to see if in this iteration of the
  //   for ...in loops the keys from both objects match. If
  //   they do, we continue on to replacement logic.
  // - replacement logic looks for the value from template.keys.
  //   We use a while loop to keep applying changes to every
  //   instance until there are none left.
  // - within the while loop, we reassign the inital string we're
  //   passed to one in which the earliest instance of the
  //   template.keys iteration we're on is replaces with the
  //   matching template.values value.
  for (const keysKey in templates.keys) {
    for (const valuesKey in templates.values) {
      const keysValue = templates.keys[keysKey]
      const valuesValue = templates.values[valuesKey]
      if (keysKey === valuesKey) {
        while (template.includes(keysValue) === true) {
          console.log(keysValue, valuesValue)
          template = template.replace(keysValue, valuesValue)
        }
      }
    }
  }

  return template
}

module.exports.templates = templates
module.exports.convert = convert

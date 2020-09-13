const {Command, flags} = require('@oclif/command')
const { statusRequest, purgeDetails, config } = require('./api')
const boxen = require('boxen')
const chalk = require('chalk')
const figures = require('figures')
const ora = require('ora')
const link = require('terminal-link')
const Parser = require('rss-parser')

const parser = new Parser()

class SesCommand extends Command {

  textChunks(text, final = '') {
    const words = text.split(" ")

    const newSplice = words.splice(0, 15)

    final = `${final ? `${final} \n` : ''}${newSplice.join(' ')}`

    if (words.length === 0) {
      return final;
    }

    return this.textChunks(words.join(' '), final)
  }

  async render(responseData, configService, flags) {
    for (const item of responseData) {
      const {page, status} = item

      const name = page.name.toLowerCase();

      const config = configService[name]

      const indicator = config.indicators[status.indicator] ? config.indicators[status.indicator] : 'orange';

      this.log(`
  ${link(chalk.bold(page.name), page.url)}
  ${chalk.keyword(indicator)(figures.bullet)} - ${chalk.grey(status.description)}
      `)

      if (status.indicator !== 'none') {

        const spinner = ora({
          text: 'loading incidents history...',
          prefixText: chalk.bold(`From ${name}`), 
          spinner: 'dots11',
          color: 'yellow'
        }).start()

        const {items, ...rest} = await parser.parseURL(config.rss)
        .finally(() => spinner.stop())
        
        this.log(`      ${chalk.bold(rest.title)}`)
        
        for (const item of items.slice(0, flags.incidents)) {
            const newText = item.contentSnippet.split(/\n/).reduce((prev, current) => {
              const words = current.split(" ")
              if (words.length > 20) {
                const reduceWidthWords = this.textChunks(current)
                current = reduceWidthWords;
              } 
                return `${prev} \n\n${current}`
            }, "")

            this.log(`${boxen(`${chalk.keyword('orange').bold(item.title)} - ${chalk.gray(item.link)} \n ${newText}`, { padding: 1, borderStyle: 'round', borderColor: 'gray', margin: {
              left: 5
            } })}`)
        }
      }
    }

    return configService;
  }

  async run() {
    const {flags} = this.parse(SesCommand)

    let summary = purgeDetails(
      statusRequest(flags.services),
      this.log
    )

    const spinner = ora({
      text: 'loading services...',
      prefixText: chalk.bold('Provide on'), 
      spinner: 'earth',
      color: 'gray'
    }).start()

    const response = await Promise.all(summary)
    .finally(() => spinner.stop())
    

    await this.render(response, config, flags)
  }
}

SesCommand.description = `Describe the command here
...
Welcome to ${chalk.bold('ses')}!

It's a simple CLI for check health status about external services. 🙌

currently just supporting: 
- ${chalk.bold('Github')}
- ${chalk.bold('Trello')}

Made with 💜  by ${chalk.magenta('clouby')}
`

SesCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({char: 'v'}),
  // add --help flag to show CLI version
  help: flags.help({char: 'h'}),
  services: flags.string({char: 's', description: 'name of services to check like {github,trello} (separated by `<space>`)', multiple: true, default: ['github', 'trello']}),
  incidents: flags.integer({ char: 'i', description: 'Number of latest incidents on the current services', default: 3 })
}

SesCommand.examples = [
  '$ ses ',
  '$ ses -s github trello',
]

module.exports = SesCommand

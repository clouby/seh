const fetch = require('node-fetch')
const chalk = require('chalk')
const figures = require('figures')
const configServices = require('../services')

const fetchData = (service) => {
    return fetch(service).then(response => response.json())
}

exports.purgeDetails = (result, log) => {
    if (result.errors.length) {
        log(`${chalk.keyword('orange')(figures.warning)} ${chalk.bold.keyword('orange')('Warning')} - We don't support ${result.errors.length > 1 ?  'these services' : 'this service'}: `)
        result.errors.forEach(item => {
            log(`   - ${chalk.bold(item)}`)
        })
    }

    return result.currents;
}

exports.statusRequest = (services) => {
    const result = { currents: [], errors: [] }

    for (const name of services) {
        const configService = configServices[name];

        if (!configService) {
            result.errors.push(name)
            continue
        }

        result.currents.push(
            fetchData(configService.status)
        )
    } 

    return result;
}

exports.config = configServices;
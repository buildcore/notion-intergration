require('dotenv').config()
const { Client } = require('@notionhq/client')
const { DateTime } = require('luxon')


const notion = new Client({ auth: process.env.NOTION_KEY })
const databaseId = process.env.NOTION_PRODUCTION_DATABASE_ID

const propertyDataTypes = {
    '^QJc': 'multi_select',
    '`;FF': 'number',
    'obD?': 'date',
    'xW;o': 'formula',
    '|t~m': 'number',
    '}tZR': 'formula',
    title: 'title'
}

// Core Functions

/* retrieveDatabase:
    output: notion API response */
async function retrieveDatabase() {
    const response = await notion.databases.retrieve({ database_id: databaseId })
    return response
}

/* createPage:
    input: (title, string), (date, ISO string), (types, [{ id: name }, ...]) */
async function createPage(title, date, types) {
    const response = await notion.pages.create({
        parent: {
            database_id: databaseId,
        },
        properties: {
            [process.env.NOTION_TITLE_PROPERTY_ID]: {
                title: [
                    {
                        type: 'text',
                        text: {
                            content: title
                        }
                    }
                ]
            },
            [process.env.NOTION_DATE_PROPERTY_ID]: {
                date: {
                    start: date
                }
            },
            [process.env.NOTION_TYPE_PROPERTY_ID]: {
                multi_select: types.map(type => { return { id: type.id } })
            }
        }
    })

    console.log(response)
}

// Handling of Notion Properties Object

/* notionPropertiesById:
    desc: rearranges the notion properties object to have ids first
    input: notion properties obj
    output: { property id: property details, ... } */
function notionPropertiesById(properties) {
    return Object.values(properties).reduce((obj, property) => {
        const { id, ...rest } = property
        return { ...obj, [id]: rest }
    }, {})
}

/* getTypes:
    desc: extract options from notion multiselect properties
    output: [{ option id: option name }, ...] */
async function getTypes() {
    const database = await retrieveDatabase()
    return notionPropertiesById(database.properties)[process.env.NOTION_TYPE_PROPERTY_ID].multi_select.options.map(type => {
        return { id: type.id, name: type.name }
    })
}

/* getDataTypesOfProperties:
    output: {id: data type, ...} */
async function getDataTypesOfProperties() {
    const database = await retrieveDatabase()
    return Object.values(database.properties).reduce((obj, property) => {
        return { ...obj, [property.id]: property.type }
    }, {})
}

// Handling different types of pages

/* getPropertyObject:
    input: (property, property id), (value, value from the parameters when creating page)
    output: corresponding property object with value inserted */
function getPropertyObject(id, value) {
    switch (propertyDataTypes[id]) {
        case 'multi_select':
            return { "multi_select": value }

        case 'number':
            return { "number": value }

        case 'date':
            return { "date": { "start": value } }
        case 'title':
            return { "title": [{ "type": "text", "text": { "content": value } }] }
    }
}

/* lazyCreatePage:
    desc: creates page only with the properties passed in, based on id and datatype pairing
    input: { property_id: value, ... }
    output: notion api response */
async function lazyCreatePage(properties) {
    const payload = Object.keys(properties).reduce((obj, property) => {
        return { ...obj, [property]: getPropertyObject(property, properties[property]) }
    },{})
    const response = await notion.pages.create({
        parent: {
            database_id: databaseId,
        },
        properties: payload
    })

    console.log(response)
}

// Handling Recurring Dates

/* generateISODateArr:
    input: (startDate, endDate, datetime strings from luxon), (intervalDay, int)
    output: [ISO strings of dates between start and end date] 
    example dates: 
        const startDate = DateTime.fromObject({year: 2021, month: 12, day: 25})
        const endDate = DateTime.fromObject({year: 2022, month: 1, day: 20}) */
function generateISODateArr(startDate, endDate, intervalDays) {
    const dateArr = [startDate.toISODate()]
    let counterDate = startDate
    while (counterDate < endDate) {
        counterDate = counterDate.set({ day: counterDate.get('day') + intervalDays })
        if (counterDate < endDate) {
            dateArr.push(counterDate.toISODate())
        } else {
            break
        }
    }
    return dateArr
}

/* createRecurringPages:
    desc: using date arr from generateISODateArr, create pages accordingly
    input: (title, string), (titleIncrement, boolean), (startDate, endDate, ISO strings), (intervalDays, int) */
async function createRecurringPages(title, titleIncrement = false, startDate, endDate, intervalDays) {
    const isoDateArr = generateISODateArr(startDate, endDate, intervalDays)
    if (titleIncrement) {
        let titleIncrementCount = 1
        for (let isoDate of isoDateArr) {
            await createPage(`${title} ${titleIncrementCount}`, isoDate)
            titleIncrementCount++
        }
    } else {
        for (let isoDate of isoDateArr) {
            await createPage(title, isoDate)
        }
    }
}

// exec
const startDate = DateTime.fromObject({year: 2021, month: 8, day: 16, hour: 11})

// lazyCreatePage({ [process.env.NOTION_TITLE_PROPERTY_ID]: 'test', [process.env.NOTION_DATE_PROPERTY_ID]: startDate })
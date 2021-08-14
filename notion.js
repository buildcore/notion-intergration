require('dotenv').config()
const { Client } = require('@notionhq/client')

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

/* lazyCreatePage:
desc: creates page only with the properties passed in, based on id and datatype pairing
input: { property_id: value, ... }
output: notion api response */
async function lazyCreatePage(properties) {
    const payload = Object.keys(properties).reduce((obj, property) => {
        return { ...obj, [property]: getPropertyObjectFromPropertyId(property, properties[property]) }
    },{})
    const response = await notion.pages.create({
        parent: {
            database_id: databaseId,
        },
        properties: payload
    })

    console.log(response)
}


// Handling of Notion Object

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

/* notionDataTypesById:
input: database notion object
output: {id: data type, ...} */
async function notionDataTypesById(database) {
    if (!database) {
        const databaseObject = await retrieveDatabase()
        database = databaseObject
    }
    return Object.values(database.properties).reduce((obj, property) => {
        return { ...obj, [property.id]: property.type }
    }, {})
}

/* getOptionsFromMultiselectProperty:
desc: extract options from notion multiselect properties
input: database notion object, multiselect property id
output: [{ option id: option name }, ...] */
async function getOptionsFromMultiselectProperty(database, id) {
    if (!database) {
        const databaseObject = await retrieveDatabase()
        database = databaseObject
    }
    return notionPropertiesById(database.properties)[id].multi_select.options.map(option => {
        return { id: option.id, name: option.name }
    })
}

/* getPropertyObjectFromPropertyId:
input: (property, property id), (value, value from the parameters when creating page)
output: corresponding property object with value inserted for page creatioin */
function getPropertyObjectFromPropertyId(id, value) {
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

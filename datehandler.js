const { DateTime } = require('luxon')

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
input: (createPage, function), (title, string), (titleIncrement, boolean), (startDate, endDate, ISO strings), (intervalDays, int) */
async function createRecurringPages(createPage, title, titleIncrement = false, startDate, endDate, intervalDays) {
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

export { createRecurringPages }
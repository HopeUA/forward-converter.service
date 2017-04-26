import app from 'server/server';
import path from 'path';
import fs from 'fs-extra-promise';
import fetch from 'node-fetch';
import xlsx from 'node-xlsx';
import moment from 'moment';
import wrap from 'common/utils/wrap';

const config = app.get('service');
const services = app.get('services');

const eventTypes = {
    EPISODE: 'episode',
    ANONS: 'anons',
    CATEGORY: 'category'
};

async function getMediaInfo(uid) {
    const url = `${services.media.url}/episodes/${uid}?token=${services.media.token}`;
    const response = await fetch(url);

    return await response.json();
}

function timecodeToMoment(tc, date) {
    return moment(`${date.year()} ${parseInt(date.month(), 10) + 1} ${date.date()} ${tc} +0300`, 'YYYY M D HH:mm:ss:SS Z');
}
function timecodeToSeconds(tc) {
    const parts = tc.split(':');

    return parseInt(parts[0], 10) * 60 * 60 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
}

async function parseLog(log, currentDate) {
    const uidPattern = /([^\\]+)\.[a-zA-Z0-9]+$/;
    const episodePattern = /^[A-Z]{4}\d{5}$/;

    const result = log.split("\n").reduce((events, rowData) => {
        const row = rowData.split("\t").reduce((row, el, index) => {
            switch (index) {
                case 0:
                    row.timeStart = el;
                    break;
                case 1:
                    row.duration = timecodeToSeconds(el);
                    break;
                case 2:
                    const match = uidPattern.exec(el.trim());
                    if (match !== null) {
                        row.uid = match[1];
                    }

                    if (el.search('rubrikatory') !== -1) {
                        row.type = eventTypes.CATEGORY;
                    } else if (el.search('anons') !== -1) {
                        row.type = eventTypes.ANONS;
                    } else if (episodePattern.test(row.uid)) {
                        row.type = eventTypes.EPISODE;
                    }
                    break;
            }

            return row;
        }, {});
        events.push(row);

        return events;
    }, []).map((row, idx, rows) => {
        const currentRow = row;
        const nextRow = rows[idx+1];
        if (nextRow) {
            currentRow.timeEnd = nextRow.timeStart;
        }

        return currentRow;
    });

    const events = [];
    for (const row of result) {
        switch (row.type) {
            case eventTypes.EPISODE:
                const info = await getMediaInfo(row.uid);
                if (!info.show) {
                    console.log(row.uid);
                }
                events.push({
                    uid: row.uid,
                    date: {
                        start: timecodeToMoment(row.timeStart, currentDate),
                        end: row.timeEnd ? timecodeToMoment(row.timeEnd, currentDate) : timecodeToMoment(row.timeStart, currentDate).add(row.duration, 's')
                    },
                    duration: info.duration,
                    title: info.title,
                    show: info.show.title,
                    author: info.author,
                    guests: info.guests
                });
                break;
            case eventTypes.CATEGORY:
                events.push({
                    uid: row.uid,
                    show: 'Рубрикатор',
                    title: 'Рубрикатор',
                    date: {
                        start: timecodeToMoment(row.timeStart, currentDate),
                        end: row.timeEnd ? timecodeToMoment(row.timeEnd, currentDate) : timecodeToMoment(row.timeStart, currentDate).add(row.duration, 's')
                    }
                });
                break;
            case eventTypes.ANONS:
                events.push({
                    uid: row.uid,
                    show: 'Анонс',
                    title: 'Анонс',
                    date: {
                        start: timecodeToMoment(row.timeStart, currentDate),
                        end: row.timeEnd ? timecodeToMoment(row.timeEnd, currentDate) : timecodeToMoment(row.timeStart, currentDate).add(row.duration, 's')
                    }
                });
                break;
        }

    }

    return events;
}

async function writeXls(events, currentDate) {
    const data = events.map((event) => {
        const dateStart = event.date.start.utcOffset('+03:00');
        const dateEnd = event.date.end.utcOffset('+03:00');
        const duration = moment.utc(dateEnd.diff(dateStart));

        return [
            event.show || '',
            event.title || '',
            duration.format('HH:mm:ss'),
            dateStart.format('HH:mm') + ' – ' + dateEnd.format('HH:mm'),
            '',
            event.author || '',
            event.guests || '',
            event.uid || '',
            dateStart.format()
        ];
    });
    data.unshift([
        'Программа',
        'Тема',
        'Длительность',
        'Таймкод',
        'Автор',
        'Ведущий',
        'Гости',
        'Код',
        'Дата'
    ]);

    const name = currentDate.format('YYYY-MM-DD');
    const buffer = xlsx.build([
        { name, data }
    ]);
    const storageDir = path.resolve(
        __dirname + '/../..',
        config.storagePath
    );
    const filePath = `${storageDir}/${name}.xlsx`;

    await fs.ensureDirAsync(storageDir);
    await fs.writeFileAsync(filePath, buffer);

    return `/${config.storagePath}/${name}.xlsx`;
}

module.exports = () => {
    return wrap(async (req, res) => {
        const fileName = req.headers['x-hope-filename'];
        const match = /(\d{2})_(\d{2})_(\d{4})/.exec(fileName);

        let currentDate = moment();
        if (match !== null) {
            currentDate = moment({
                day: match[1],
                month: parseInt(match[2], 10) - 1,
                year: match[3]
            });
        }

        const events = await parseLog(req.body.toString(), currentDate);
        const xls = await writeXls(events, currentDate);

        res.status(201);
        res.header({
            Location: xls
        });
        res.end();
    });
};

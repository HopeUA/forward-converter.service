import App from 'server/server';
import path from 'path';
import fs from 'fs-extra-promise';
import fetch from 'node-fetch';
import xlsx from 'node-xlsx';
import moment from 'moment';
import wrap from 'common/utils/wrap';

const config = App.get('service');
const services = App.get('services');

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

async function parseLog(log) {
    const uidPattern = /([A-Z]{4}\d{5})/;

    const result = log.split("\n").reduce((events, rowData) => {
        const row = rowData.split("\t").reduce((row, el, index) => {
            switch (index) {
                case 0:
                    row.dateEnd = el;
                    break;
                case 1:
                    row.dateStart = el;
                    break;
                case 2:
                    row.status = el;
                    break;
                case 3:
                    row.success = el === 'ok';
                    break;
                case 4:
                    const match = uidPattern.exec(el);
                    if (match !== null) {
                        row.uid = match[1];
                    }
                    break;
                case 9:
                    if (el.search('rubrikatory') !== -1) {
                        row.type = eventTypes.CATEGORY;
                    } else if (el.search('anons') !== -1) {
                        row.type = eventTypes.ANONS;
                    } else if (row.uid) {
                        row.type = eventTypes.EPISODE;
                    }
                    break;
            }

            return row;
        }, {});
        events.push(row);

        return events;
    }, []).filter((event) => {
        return event.status === 'played' && event.success && event.type
    });

    const events = [];
    for (const row of result) {
        switch (row.type) {
            case eventTypes.EPISODE:
                const info = await getMediaInfo(row.uid);
                events.push({
                    uid: row.uid,
                    date: {
                        start: moment(row.dateStart),
                        end: moment(row.dateEnd)
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
                    show: 'Рубрикатор',
                    date: {
                        start: moment(row.dateStart),
                        end: moment(row.dateEnd)
                    }
                });
                break;
            case eventTypes.ANONS:
                events.push({
                    show: 'Анонс',
                    date: {
                        start: moment(row.dateStart),
                        end: moment(row.dateEnd)
                    }
                });
                break;
        }

    }

    return events;
}

async function writeXls(events) {
    let currentDate = null;
    const data = events.map((event) => {
        console.log(event);
        const dateStart = event.date.start.utcOffset('+03:00');
        const dateEnd = event.date.end.utcOffset('+03:00');
        const duration = moment.utc(dateEnd.diff(dateStart));
        if (!currentDate) {
            currentDate = dateEnd.clone();
        }

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
        const events = await parseLog(req.body.toString());
        const xls = await writeXls(events);

        res.status(201);
        res.header({
            Location: xls
        });
        res.end();
    });
};

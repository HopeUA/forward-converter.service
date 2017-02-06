import App from 'server/server';
import path from 'path';
import fs from 'fs-extra-promise';
import fetch from 'node-fetch';
import xlsx from 'node-xlsx';
import moment from 'moment';
import wrap from 'common/utils/wrap';

const config = App.get('service');
const services = App.get('services');

async function getMediaInfo(uid) {
    const url = `${services.media.url}/episodes/${uid}?token=${services.media.token}`;
    const response = await fetch(url);

    return await response.json();
}

async function parseLog(log) {
    const uidPattern = /([A-Z]{4}\d{5})/;

    const result = log.split("\n").reduce((episodes, rowData) => {
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
            }

            return row;
        }, {});
        episodes.push(row);

        return episodes;
    }, []).filter((episode) => {
        return episode.status === 'played' && episode.success && episode.uid
    });

    const episodes = [];
    for (const row of result) {
        const info = await getMediaInfo(row.uid);
        episodes.push({
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
    }

    return episodes;
}

async function writeXls(episodes) {
    let currentDate = null;
    const data = episodes.map((episode) => {
        const dateStart = episode.date.start.utcOffset('+03:00');
        const dateEnd = episode.date.end.utcOffset('+03:00');
        const duration = moment.utc(dateEnd.diff(dateStart));
        if (!currentDate) {
            currentDate = dateEnd.clone();
        }

        return [
            episode.show,
            episode.title,
            duration.format('HH:mm:ss'),
            dateStart.format('HH:mm') + ' – ' + dateEnd.format('HH:mm'),
            '',
            episode.author,
            episode.guests,
            episode.uid,
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
        const episodes = await parseLog(req.body.toString());
        const xls = await writeXls(episodes);

        res.status(201);
        res.header({
            Location: xls
        });
        res.end();
    });
};

import App from 'server/server';
import Loopback from 'loopback';
import Path from 'path';

module.exports = () => {
    const config = App.get('service');

    const rootPath = Path.resolve(
        __dirname + '/../..',
        config.storagePath
    );

    return Loopback.static(rootPath, {
        redirect: false,
        index: false
    });
};

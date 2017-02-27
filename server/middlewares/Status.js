module.exports = () => {
    const started = new Date();

    return (req, res) => {
        res.send({
            version: process.env.APP_VERSION || 'dev',
            started,
            uptime: (Date.now() - Number(started)) / 1000,
        });
    };
};

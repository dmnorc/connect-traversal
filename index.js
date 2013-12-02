module.exports = process.env.CONNECT_COV
    ? require('./lib-cov/traverse')
    : require('./lib/traverse');

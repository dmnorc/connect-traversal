module.exports = process.env.CONNECT_TRAVERSAL_COV
    ? require('./lib-cov/traversal')
    : require('./lib/traversal');

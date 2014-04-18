var connect = require('connect')
    ,traversal = require('../');

var app = connect();
app.use(traversal.middleware);

var USERS = {};

traversal.registerResource('userResource', {
    getUser: function(cb) {
        var user = USERS[this.getId()];
        if (!user) {
            cb(new Error('there is no user with Id' + this.getId()));
        }
        cb(null, user);
    },
    update: function(user, cb) {
        if (!USERS[this.getId()]) {
            cb(new Error('there is no user with Id' + this.getId()));
        }
        USERS[this.getId()] = user;
        cb(null, user);
    },
    delete: function(cb) {
        if (!USERS[this.getId()]) {
            cb(new Error('there is no user with Id' + this.getId()));
        }
        delete USERS[this.getId()];
        cb(null, true);
    },
    getId: function() { return parseInt(this.key) }
});

traversal.registerResource('usersResource', {
    child: 'userResource',
    create: function(user, cb) {
        if (USERS[user.id]) {
            cb(new Error('this user exists: ' + user.id));
        }
        USERS[user.id] = user;
        cb(null, user);
    },
    childValidate: function(key) {
        return /\d+/.test(key);
    }
});

traversal.registerResource('rootResource', {
    children: {'users': 'usersResource'},
    attr: 'Test'
});

traversal.setRootResource('rootResource');

function send(res, body) {
    res.setHeader('Content-Length', body.length);
    res.setHeader('Content-Type', 'text/html');
    res.write(body);
    res.end();
}

// Views

traversal.getResourceChain('rootResource')
    .method('get').view(function(req, res) {
        send(res, '<h2>Main page</h2>');
    });

traversal.getResourceChain('usersResource')
    // Create user with id specified in subpath eg: POST /users/create/123
    .options({method:'post', name: 'create'}).view(function(req, res) {
        var user = {id: req.subpath[0], name: 'Test'};
        req.resource.create(user, function(err, user) {
            send(res, '<h2>Create user</h2>' + JSON.stringify(user));
        });
    });

traversal.getResourceChain('userResource')
    // Subscriber for userResource
    // get user for userResource views.
    .subscribe(function(req, res, next){
        req.resource.getUser(function(err, user) {
            if (err) {
                throw err;
            }
            req.user = user;
            next();
        });
    })
    // Profile view. GET /users/:id
    .method('get').view(function(req, res) {
        var root = req.resource.traverseTo('rootResource');
        send(res, root.attr + '<h2>Get user</h2>' + JSON.stringify(req.user));
    })
    // Delete user.  DELETE /users/:id/delete
    .method('delete').name('delete').view(function(req, res) {
        req.resource.delete(function(err, result) {
            send(res, '<h2>User removed</h2>');
        });
    });

app.listen(3000);


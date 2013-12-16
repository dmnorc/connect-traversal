/**
 * Resource.
 * @param req request object
 * @param name
 * @param parent instance
 * @param options additional params
 */
function Resource(req, name, parent, options) {
    this.req = req;
    this.name = name;
    this.parent = parent;
    this.options = options;
    return this;
}

/**
 * Stub for child validation.
 * @param name for validation.
 * @returns {boolean}
 */
Resource.prototype.childValidate = function(name) {
    return !!name;
};

/**
 * Gets registered resource by name.
 * @param name
 */
Resource.prototype.get = function (name) {
    var factory;
    if(this.children && this.children.indexOf(name) !== -1) {
        factory = this.__traversal__.resources[name];
    }
    else if(this.child && this.childValidate(name)) {
        factory = this.__traversal__.resources[this.child];
    }
    return factory ? new factory(this.req, name, this) : null;
};

/**
 * Traverse to resource.
 * @param resourceId resource id.
 */
Resource.prototype.traverseTo = function (resourceId) {
    function _check(resource) {
        if(resource.resource === resourceId) return resource;
        return resource.parent ? _check(resource.parent) : null;
    }
    return _check(this.parent);
};

function Traversal() {
    this.resources = {};
    this.paths = {};
}

/**
 * Registers resource.
 * @param name unique name of resource.
 * @param proto prototype of the resource.
 */
Traversal.prototype.registerResource = function(name, proto) {
    var obj = function () {
        this.resource = name;
        return obj.__super__.apply(this, arguments);
    };
    var Inheritance = function(){};
    Inheritance.prototype = Resource.prototype;
    obj.prototype = new Inheritance();
    obj.prototype.__constructor__ = obj;
    obj.prototype.__traversal__ = this;
    obj.__super__ = Resource;
    for (var k in proto) {
        obj.prototype[k] = proto[k];
    }
    this.resources[name] = obj;
};

Traversal.prototype.initResource = function(id, req, name, parent, options) {
    return this.resources[id] ? new this.resources[id](req, name, parent, options) : null;
}

Traversal.prototype.registerResourcePath = function(resourceId, ops, callbacks) {
    if (!this.resources[resourceId]) {
        throw Error('there is no registered resource: ' + resourceId);
    }

    var callbacks = Array.prototype.slice.call(arguments, 2);
    if (!callbacks.length) {
        throw Error('registerPath() requires callback functions');
    }
    callbacks.forEach(function(fn, i){
        if ('function' == typeof fn) return;
        var type = {}.toString.call(fn);
        var msg = 'registerPath() requires callback functions but got a ' + type;
        throw new Error(msg);
    });
    if (this.resources[resourceId]) {
        if (!this.paths[resourceId]) {
            this.paths[resourceId] = {};
        }
        var name = ops.name || 'all';
        if (!this.paths[resourceId][name]) {
            this.paths[resourceId][name] = {};
        }
        this.paths[resourceId][name][ops.method || 'all'] = callbacks;
    }
};

Traversal.prototype.getResourcePath = function(resourceId, ops) {
    if (this.paths[resourceId]) {
        var name;
        if (name = this.paths[resourceId][ops.name || 'all']) {
            return name[ops.method] || name['all']
        }
    }
    return null;
};

Traversal.prototype.build = function(req, res) {
    var paths = req.url.split('/').filter(function(el){ return !!el; });
    var root = this.initResource('root', req);
    function _build(resource) {
        var path = paths.shift();
        if(path) {
            var resource_n = resource.get(path);
            if (!resource_n) {
                req.path_name = path;
                req.subpath = paths;
                return resource;
            }
            return _build(resource_n);
        }
        return resource;
    }
    return _build(root);
};

module.exports = function(app) {
    if (!app.use) {
        throw Error('should be instance of connect.');
    }

    var traversal = new Traversal();

    app.use(function(req, res, next) {
        var resource = traversal.build(req, res);
        if (resource) {
            req.resource = resource;
            var callbacks = traversal.getResourcePath(resource.resource, {
                name: req.path_name,
                method: req.method
            });
            if (callbacks && callbacks.length) {
                var i = -1;
                function _callback() {
                    i++;
                    (i+1) == callbacks.length
                        ? callbacks[i](req, res, next)
                        : callbacks[i](req, res, _callback);
                }
                return _callback();
            }
        }
        return next();
    });

    app.registerRootResource = function(proto) {
        traversal.registerResource('root', proto);
    };

    app.registerResource = function(id, proto) {
        if (id !== 'root' && !traversal.resources.root) {
            throw Error('At first root resource should be registered.');
        }
        traversal.registerResource(id, proto);
    };

    app.initResource = function(id, req, name, parent, options) {
        return traversal.initResource(id, req, name, parent, options);
    };

    app.registerResourcePath = function(resourceId, options, callbacks) {
        traversal.registerResourcePath.apply(traversal, arguments);
    }
    return app;
}

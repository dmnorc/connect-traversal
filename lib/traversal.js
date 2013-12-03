/**
 * Resource.
 * @param name
 * @param parent instance
 * @param options additional params
 */
function Resource(name, parent, options) {
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
 * Stub for init method that triggers in constructor.
 */
Resource.prototype.init = function() {};

/**
 * Gets registered resource by name.
 * @param name
 */
Resource.prototype.get = function (name) {
    var factory;
    if(this.children && this.children[name]) {
        this.__traversal__.checkResource(this.children[name]);
        factory = this.__traversal__.resources[this.children[name]];
    }
    else if(this.child && this.childValidate(name)) {
        this.__traversal__.checkResource(this.child);
        factory = this.__traversal__.resources[this.child];
    }
    return factory ? new factory(name, this) : null;
};

function Traversal() {
    this.resources = {};
    this.paths = {};
}

Traversal.prototype.checkResource = function(id) {
    if (!this.resources[id]) {
        throw Error('there is no registered resource: ' + id);
    }
    return true;
}

/**
 * Registers resource.
 * @param name unique name of resource.
 * @param proto prototype of the resource.
 */
Traversal.prototype.registerResource = function(name, proto) {
    var obj = function () {
        this.resource = name;
        var inst = obj.__super__.apply(this, arguments);
        inst.init();
        return inst;
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

Traversal.prototype.initResource = function(id, name, parent, options) {
    return this.resources[id] ? new this.resources[id](name, parent, options) : null;
}

Traversal.prototype.setRootResource = function(id) {
    this.checkResource(id);
    this.root = this.resources[id];
}

Traversal.prototype.registerResourcePath = function(resourceId, ops, callbacks) {
    if(!this.root) {
        throw Error("root resource hasn't been set yet.");
    }
    this.checkResource(resourceId);
    if(ops.parent) {
        this.checkResource(ops.parent);
    }
    var callbacks = Array.prototype.slice.call(arguments, 2);
    if (!callbacks.length) {
        throw Error('registerPath() requires callback functions');
    }
    callbacks.forEach(function(fn, i) {
        if ('function' == typeof fn) return;
        throw new Error("registerPath() requires callback functions of 'function' type");
    });
    if (!this.paths[resourceId]) {
        this.paths[resourceId] = {};
    }
    var name = ops.name || 'index';
    if (!this.paths[resourceId][name]) {
        this.paths[resourceId][name] = {};
    }
    var parent = ops.parent || 'all';
    if (!this.paths[resourceId][name][parent]) {
        this.paths[resourceId][name][parent] = {};
    }
    var method = ops.method ? ops.method.toLowerCase() : 'all';
    this.paths[resourceId][name][parent][method] = callbacks;
};

Traversal.prototype.getResourcePath = function(resourceId, ops) {
    if (this.paths[resourceId]) {
        var name;
        if (name = this.paths[resourceId][ops.name || 'index']) {
            var parent = name[ops.parent] ? name[ops.parent] : name['all'];
            if (parent) {
                return parent[ops.method.toLowerCase()] || parent['all'];
            }
        }
    }
    return null;
};

Traversal.prototype.build = function(req, res) {
    var paths = req.url.split('/').filter(function(el){ return !!el; });
    var root = new this.root();
    function _build(resource) {
        var path = paths.shift();
        if(path) {
            var resource_n = resource.get(path);
            if (!resource_n) {
                req.pathName = path;
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
    var traversal = app.traversal = new Traversal();
    app.use(function(req, res, next) {
        var resource = traversal.build(req, res);
        if (resource) {
            req.resource = resource;
            var callbacks = traversal.getResourcePath(resource.resource, {
                name: req.pathName,
                method: req.method,
                parent: resource.parent ? resource.parent.resource : null
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
    return app.traversal;
}

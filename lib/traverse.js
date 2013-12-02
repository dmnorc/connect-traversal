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
        factory = traverse.resources[name];
    }
    else if(this.child && this.childValidate(name)) {
        factory = traverse.resources[this.child];
    }
    return factory ? new factory(this.req, name, this) : null;
};

function Traverse() {}
Traverse.prototype.resources = {};
Traverse.prototype.paths = {};

/**
 * Registers resource.
 * @param name unique name of resource.
 * @param proto prototype of the resource.
 */
Traverse.prototype.registerResource = function(name, proto) {
    var obj = function () {
        this.__resource__ = name;
        return obj.__super__.apply(this, arguments);
    };
    var Inheritance = function(){};
    Inheritance.prototype = Resource.prototype;
    obj.prototype = new Inheritance();
    obj.prototype.constructor = obj;
    obj.__super__ = Resource;
    for (var k in proto) {
        obj.prototype[k] = proto[k];
    }
    this.resources[name] = obj;
};

Traverse.prototype.registerPath = function(resource, ops, callbacks) {
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
    if (this.resources[resource]) {
        if (!this.paths[resource]) {
            this.paths[resource] = {};
        }
        var name = ops.name || 'all';
        if (!this.paths[resource][name]) {
            this.paths[resource][name] = {};
        }
        this.paths[resource][name][ops.method || 'all'] = callbacks;
    }
};

Traverse.prototype.getPath = function(resource, ops) {
    if (this.paths[resource]) {
        var name;
        if (name = this.paths[resource][ops.name || 'all']) {
            return name[ops.method] || name['all']
        }
    }
    return null;
};

Traverse.prototype.build = function(req, res) {
    var paths = req.url.split('/').filter(function(el){ return !!el; });
    var root = new this.resources.root(req, 'root');
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

var traverse = new Traverse();

exports.middleware = function(req, res, next) {
    console.log('dispatching %s %s (%s)', req.method, req.url, req.originalUrl);
    var resource = traverse.build(req, res);
    if (resource) {
        req.resource = resource;
        var callbacks = traverse.getPath(resource.__resource__, {
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
}

exports.registerResource = function(name, proto) {
    traverse.registerResource(name, proto);
}

exports.registerPath = function(resource, options, callbacks) {
    traverse.registerPath.apply(traverse, arguments);
}

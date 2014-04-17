'use strict';

var util = require('util'),
    Chain = require('./chain');


/**
 * Resource.
 * @param key
 * @param parent instance
 * @param options additional params
 */
function Resource(key, parent, options) {
    this.key = key;
    this.parent = parent;
    this.options = options;
    return this;
}

/**
 * Stub for child validation.
 * @param key for validation.
 * @returns {boolean}
 */
Resource.prototype.childValidate = function(key) {
    return !!key;
};

/**
 * Stub for init method triggering in the constructor.
 */
Resource.prototype.init = function() {};

/**
 * Gets registered resource by name.
 * @param key
 */
Resource.prototype.get = function (key) {
    var factory;
    if(this.children && this.children[key]) {
        this.__traversal__.checkResource(this.children[key]);
        factory = this.__traversal__.resources[this.children[key]];
    }
    else if(this.child && this.childValidate(key)) {
        this.__traversal__.checkResource(this.child);
        factory = this.__traversal__.resources[this.child];
    }
    return factory ? new factory(key, this) : null;
};


/**
 * Traverse to resource.
 * @param resourceId resource id.
 */
Resource.prototype.traverseTo = function (resourceId) {
    function _traverseTo(resource) {
        if(resource.resource === resourceId) return resource;
        return resource && resource.parent ? _traverseTo(resource.parent) : null;
    }
    return _traverseTo(this.parent);
};

/**
 * Traversal object.
 * @constructor
 */
function Traversal() {
    this.resources = {};
    this.chains = {};
}

/**
 * Check if resource is registered.
 * @param id resource id.
 * @throw Error if resource is not registered.
 */
Traversal.prototype.checkResource = function(id) {
    if (!this.resources[id]) {
        throw Error('there is no registered resource: ' + id);
    }
};

/**
 * Register resource.
 * @param id is the unique name of resource.
 * @param proto is the prototype of the resource.
 */
Traversal.prototype.registerResource = function(id, proto) {
    var obj = function () {
        this.resource = id;
        var inst = obj.__super__.apply(this, arguments);
        inst.init();
        return inst;
    };
    var Inheritance = function(){};
    Inheritance.prototype = Resource.prototype;
    obj.prototype = new Inheritance;
    obj.prototype.constructor = obj;
    obj.prototype.__traversal__ = this;
    obj.__super__ = Resource;
    Object.getOwnPropertyNames(proto).forEach(function(name) {
        obj.prototype[name] = proto[name];
    });
    obj.prototype.toString = function() {
        return util.format('#<Resource[%s]>', this.resource);
    };
    this.resources[id] = obj;
};

/**
 * Create registered resource instance with specified params.
 */
Traversal.prototype.initResource = function(id, key, parent, options) {
    return this.resources[id] ? new this.resources[id](key, parent, options) : null;
};

/**
 * Set resource as root.
 * @param id resource id
 */
Traversal.prototype.setRootResource = function(id) {
    this.checkResource(id);
    this.root = this.resources[id];
};

/**
 * Register path for registered resource.
 * @param resourceId resource id
 * @param ops options {parent, method, name}
 */
Traversal.prototype.getResourceChain = function(resourceId) {
    if(!this.root) {
        throw Error("root resource hasn't been set yet.");
    }
    this.checkResource(resourceId);
    if (!this.chains[resourceId])  this.chains[resourceId] = new Chain();
    return this.chains[resourceId];
};

/**
 * Retrieve path by resource id and options.
 * @param resourceId resource id
 * @param ops options {parent, method, name}
 */
Traversal.prototype.getResourcePath = function(resourceId, ops) {
    if (this.chains[resourceId]) {
        return this.chains[resourceId].getCallbacks(ops.name, ops.parent, ops.method);
    }
    return null;
};

/**
 * Build resources chain by request.
 * @param req http.Request
 * @return resource
 */
Traversal.prototype.buildChain = function(req) {
    var paths = req.url.split('/').filter(function(el){ return !!el; });
    var root = new this.root();
    function _build(resource) {
        var path = paths.shift();
        if(path) {
            var resource_n = resource.get(path);
            if (!resource_n) {
                req.pathname = path;
                req.subpath = paths;
                return resource;
            }
            return _build(resource_n);
        }
        return resource;
    }
    return _build(root);
};

/**
 * Remove registered Resources and Paths.
 */
Traversal.prototype.clear = function (){
    this.resources = {};
    this.chains = {};
    this.root = null;
};

/**
 * Build url for resource
 * @param resource resource instance
 * @param pathname additional pathname appendix
 * @return String url.
 */
Traversal.prototype.buildResourceUrl = function(resource, pathname) {
    var parts = [];
    if (pathname) parts.push(pathname);

    function _getKeyAndParent(resource) {
        if (resource.key) parts.unshift(resource.key);
        if (resource.parent) {
            _getKeyAndParent(resource.parent);
        }
    }
    _getKeyAndParent(resource);
    return '/' + parts.join('/');
};

var traversal = new Traversal;

/**
 * Middleware for connect application.
 */
traversal.middleware = function(req, res, next) {
    var resource = traversal.buildChain(req);
    if (resource) {
        req.resource = resource;
        req.buildResourceUrl = traversal.buildResourceUrl;
        var callbacks = traversal.getResourcePath(resource.resource, {
            name: req.pathname,
            method: req.method,
            parent: resource.parent ? resource.parent.resource : null
        });
        if (callbacks && callbacks.length) {
            var i = -1;
            return _callback();
        }
    }

    function _callback() {
        i++;
        (i+1) == callbacks.length
            ? callbacks[i](req, res, next)
            : callbacks[i](req, res, _callback);
    }
    return next();
};

module.exports = traversal;

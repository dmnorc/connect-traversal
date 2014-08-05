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
Resource.prototype.childValidate = function (key) {
    return !!key;
};

/**
 * Stub for init method triggering in the constructor.
 */
Resource.prototype.init = function () {};

/**
 * Gets registered resource by name.
 * @param key
 */
Resource.prototype.get = function (key) {
    var Factory;
    if (this.children && this.children[key]) {
        this.traversal_._checkResource(this.children[key]);
        Factory = this.traversal_.resources[this.children[key]];
    } else if (this.child && this.childValidate(key)) {
        this.traversal_._checkResource(this.child);
        Factory = this.traversal_.resources[this.child];
    }
    return Factory ? new Factory(key, this) : null;
};


/**
 * Traverse to resource.
 * @param resourceId resource id.
 */
Resource.prototype.traverseTo = function (resourceId) {
    function _traverseTo(resource) {
        if (resource.resource === resourceId) { return resource; }
        return resource && resource.parent ? _traverseTo(resource.parent) : null;
    }
    return _traverseTo(this.parent);
};

Resource.prototype.toString = function () {
    return util.format('#<Resource[%s]>', this.resource);
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
 * Register resource.
 * @param id is the unique name of resource.
 * @param proto is the prototype of the resource.
 */
Traversal.prototype.registerResource = function (id, proto) {
    //Constructor for resource
    var obj = function () {
        this.resource = id;
        var inst = obj.super_.apply(this, arguments);
        inst.init();
        return inst;
    };
    // Inheritance of Resource function class
    util.inherits(obj, Resource);
    obj.prototype.traversal_ = this;
    Object.getOwnPropertyNames(proto).forEach(function (name) {
        obj.prototype[name] = proto[name];
    });
    // Registration of Resource obj.
    this.resources[id] = obj;
};

/**
 * Create registered resource instance with specified params.
 */
Traversal.prototype.initResource = function (id, key, parent, options) {
    this._checkResource(id);
    return new this.resources[id](key, parent, options);
};

/**
 * Set resource as root.
 * @param id resource id
 */
Traversal.prototype.setRootResource = function (id) {
    this._checkResource(id);
    this.root = this.resources[id];
};

/**
 * Register path for registered resource.
 * @param resourceId resource id
 */
Traversal.prototype.getResourceChain = function (resourceId) {
    if (!this.root) {
        throw new Error("root resource hasn't been set yet.");
    }
    this._checkResource(resourceId);
    if (!this.chains[resourceId]) { this.chains[resourceId] = new Chain(); }
    return this.chains[resourceId].options({});
};

/**
 * Check if resource is registered.
 * @api private.
 */
Traversal.prototype._checkResource = function (id) {
    if (!this.resources[id]) {
        throw new Error('there is no registered resource: ' + id);
    }
};

/**
 * Retrieve path by resource id and options.
 * @api private
 */
Traversal.prototype._getResourcePath = function (resourceId, ops) {
    if (this.chains[resourceId]) {
        return this.chains[resourceId].getCallbacks(ops);
    }
    return null;
};

/**
 * Build resources chain by request.
 * @api private
 */
Traversal.prototype._buildChain = function (req) {
    if (!this.root) { return null; }
    var root = new this.root(),
        paths = req.url.split('/').filter(function (el) { return !!el; });

    function build(resource) {
        var path = paths.shift(),
            resource_n;
        if (path) {
            resource_n = resource.get(path);
            if (!resource_n) {
                req.pathname = path;
                req.subpath = paths;
                return resource;
            }
            return build(resource_n);
        }
        return resource;
    }
    return build(root);
};

/**
 * Remove registered Resources and Paths.
 */
Traversal.prototype.clear = function () {
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
Traversal.prototype.buildResourceUrl = function (resource, pathname) {
    var parts = [];
    if (pathname) { parts.push(pathname); }

    function getKeyAndParent(resource) {
        if (resource.key) { parts.unshift(resource.key); }
        if (resource.parent) {
            getKeyAndParent(resource.parent);
        }
    }
    getKeyAndParent(resource);
    return '/' + parts.join('/');
};

var traversal = new Traversal();

/**
 * Middleware for connect application.
 */
traversal.middleware = function (req, res, next) {
    var resource = traversal._buildChain(req),
        isXhr,
        callbacks;

    if (!resource) { return next(); }

    req.resource = resource;
    req.buildResourceUrl = traversal.buildResourceUrl;

    isXhr = function () {
        var val = req.headers['X-Requested-With'] || req.headers['x-requested-with'] || '';
        return 'xmlhttprequest' === val.toLowerCase();
    };
    callbacks = traversal._getResourcePath(resource.resource, {
        name: req.pathname || '',
        method: req.method,
        parent: resource.parent ? resource.parent.resource : null,
        xhr: isXhr()
    });

    return (function () {
        var iterator;
        function callback() {
            iterator++;
            return (iterator + 1) === callbacks.length
                ? callbacks[iterator](req, res, next)
                : callbacks[iterator](req, res, callback);
        }

        if (callbacks && callbacks.length) {
            iterator = -1;
            return callback();
        }
        return next();
    }());
};

module.exports = traversal;

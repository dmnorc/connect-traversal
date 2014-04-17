/**
 * Chain object, helps to build handlers
 * @constructor
 */
function Chain() {
    this._method = '*';
    this._name = '*';
    this._parent = '*';
    this._allCounter = 0;
    this._all = {};
    this._only = {};
}

/**
 * Method setter
 * @param method
 * @returns {*}
 */
Chain.prototype.method = function(method) {
    this._method = method.toLowerCase();
    return this;
};

/**
 * Name setter
 * @param name
 * @returns {*}
 */
Chain.prototype.name = function(name) {
    this._name = name;
    return this;
};

/**
 * Parent setter
 * @param parent
 * @returns {*}
 */
Chain.prototype.parent = function(parent) {
    this._parent = parent;
    return this;
};

/**
 * Returns sorted list of callbacks by name, parent, method.
 * @param name
 * @param parent
 * @param method
 * @returns {*}
 */
Chain.prototype.getCallbacks = function(name, parent, method) {
    var callbacks = {},
        result = [],
        self = this;

    var only = self.__getCallbacks.apply(self, ['only', name, parent, method, '*']);
    if (!only) return [];

    callbacks[only.index] = only.callbacks;

    name = name || '*';
    parent = parent || '*';
    method = method || '*';

    // get cases for all callbacks.
    var cases = [
        ['all', '*', '*', '*']
    ];
    if (method !== '*') {
        cases.push(['all', '*', '*', method]);
        if (parent !== '*') {
            cases.push(['all', '*', parent, method]);
            if (name !== '*') {
                cases.push(['all', name, parent, method]);
            }
        } else {
            if (name !== '*') {
                cases.push(['all', name, '*', method]);
            }
        }
    }
    if (parent !== '*') {
        cases.push(['all', '*', parent, '*']);
        if (name !== '*') {
            cases.push(['all', name, parent, '*']);
        }
    }
    if (name !== '*') {
        cases.push(['all', name, '*', '*']);
    }
    cases.forEach(function(params) {
        var fns = self.__getCallbacks.apply(self, params);
        if (fns) {
            callbacks[fns.index] = fns.callbacks;
        }
    });
    Object.keys(callbacks).sort().forEach(function(key){
        result = result.concat(callbacks[key]);
    });
    return result;
};

/**
 * Subscribes handlers for all child handlers
 * @returns {*}
 */
Chain.prototype.all = function() {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift('all');
    return this.__reg.apply(this, args);
};

/**
 * Register handlers
 * @returns {*}
 */
Chain.prototype.only = function() {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift('only');
    return this.__reg.apply(this, args);
};

Chain.prototype.__reg = function(type) {
    var callbacks = Array.prototype.slice.call(arguments, 1);
    if (!callbacks.length) {
        throw Error('registerPath() requires callback functions');
    }
    callbacks.forEach(function(fn) {
        if ('function' == typeof fn) return;
        throw new Error("registerPath() requires callback functions of 'function' type");
    });
    if (!this['_' + type][this._name]) this['_' + type][this._name] = {};
    if (!this['_' + type][this._name][this._parent]) this['_' + type][this._name][this._parent] = {};
    this['_' + type][this._name][this._parent][this._method] = {
        index: this._allCounter++,
        callbacks: callbacks
    };
    return this;
}

Chain.prototype.__getCallbacks = function(type, name, parent, method, def) {
    if (this['_' + type]) {
        if (name = this['_' + type][name || def]) {
            parent = name[parent || def] || name[def];
            if (parent) {
                return parent[method.toLowerCase()] || parent[def];
            }
        }
    }
    return null;
};

module.exports = Chain;

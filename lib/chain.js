'use strict';

/**
 * Chain object, helps to build handlers
 * @constructor
 */
function Chain() {
    this._method = this.ignore;
    this._name = this.ignore;
    this._parent = this.ignore;
    this._order = 0;
}

Chain.prototype.ignore = '*';
Chain.prototype.allAttr = 'all';
Chain.prototype.onlyAttr = 'only';

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
    name = name || this.ignore;
    parent = parent || this.ignore;
    method = method || this.ignore;

    var callbacks = {},
        result = [],
        self = this;

    var only = self.__getCallbacks(this.onlyAttr, name, parent, method, this.ignore);
    if (!only) return [];

    callbacks[only.order] = only.callbacks;

    // get cases for all callbacks.
    var cases = [
        [this.allAttr, this.ignore, this.ignore, this.ignore]
    ];
    if (method !== this.ignore) {
        cases.push([this.allAttr, this.ignore, this.ignore, method]);
        if (parent !== this.ignore) {
            cases.push([this.allAttr, this.ignore, parent, method]);
            if (name !== this.ignore) {
                cases.push([this.allAttr, name, parent, method]);
            }
        } else {
            if (name !== this.ignore) {
                cases.push([this.allAttr, name, this.ignore, method]);
            }
        }
    }
    if (parent !== this.ignore) {
        cases.push([this.allAttr, this.ignore, parent, this.ignore]);
        if (name !== this.ignore) {
            cases.push([this.allAttr, name, parent, this.ignore]);
        }
    }
    if (name !== this.ignore) {
        cases.push([this.allAttr, name, this.ignore, this.ignore]);
    }
    cases.forEach(function(params) {
        var fns = self.__getCallbacks.apply(self, params);
        if (fns) {
            callbacks[fns.order] = fns.callbacks;
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
    args.unshift(this.allAttr);
    return this.__reg.apply(this, args);
};

/**
 * Register handlers
 * @returns {*}
 */
Chain.prototype.only = function() {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift(this.onlyAttr);
    return this.__reg.apply(this, args);
};

Chain.prototype.__reg = function(type) {
    var callbacks = Array.prototype.slice.call(arguments, 1);
    if (!callbacks.length) {
        throw TypeError('required at least 1 callback');
    }
    callbacks.forEach(function(fn) {
        if ('function' == typeof fn) return;
        throw new TypeError("required callback functions of 'function' type");
    });
    if (!this['_' + type]) this['_' + type] = {};
    var typeObj = this['_' + type];
    if (!typeObj[this._name]) typeObj[this._name] = {};
    if (!typeObj[this._name][this._parent]) typeObj[this._name][this._parent] = {};
    typeObj[this._name][this._parent][this._method] = {
        order: this._order++,
        callbacks: callbacks
    };
    return this;
};

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

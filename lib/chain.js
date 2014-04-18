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
Chain.prototype.subscribeAttr = 'subscribe';
Chain.prototype.viewAttr = 'view';

/**
 * Method setter
 * @param method
 * @returns {*}
 */
Chain.prototype.method = function(method) {
    this._method = method ? method.toLowerCase() : this.ignore;
    return this;
};

/**
 * Name setter
 * @param name
 * @returns {*}
 */
Chain.prototype.name = function(name) {
    this._name = name || this.ignore;
    return this;
};

/**
 * Parent setter
 * @param parent
 * @returns {*}
 */
Chain.prototype.parent = function(parent) {
    this._parent = parent || this.ignore;
    return this;
};

/**
 * Options setter
 * @param options
 * @returns {*}
 */
Chain.prototype.options = function(options) {
    this.name(options.name);
    this.parent(options.parent);
    this.method(options.method);
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

    var only = self.__getCallbacks(this.viewAttr, name, parent, method, this.ignore);
    if (!only) return [];

    callbacks[only.order] = only.callbacks;

    // get cases for subscribe callbacks.
    var cases = [
        [this.subscribeAttr, this.ignore, this.ignore, this.ignore]
    ];
    if (method !== this.ignore) {
        cases.push([this.subscribeAttr, this.ignore, this.ignore, method]);
        if (parent !== this.ignore) {
            cases.push([this.subscribeAttr, this.ignore, parent, method]);
            if (name !== this.ignore) {
                cases.push([this.subscribeAttr, name, parent, method]);
            }
        } else {
            if (name !== this.ignore) {
                cases.push([this.subscribeAttr, name, this.ignore, method]);
            }
        }
    }
    if (parent !== this.ignore) {
        cases.push([this.subscribeAttr, this.ignore, parent, this.ignore]);
        if (name !== this.ignore) {
            cases.push([this.subscribeAttr, name, parent, this.ignore]);
        }
    }
    if (name !== this.ignore) {
        cases.push([this.subscribeAttr, name, this.ignore, this.ignore]);
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
 * Subscribes handlers for subscribe child handlers
 * @returns {*}
 */
Chain.prototype.subscribe = function() {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift(this.subscribeAttr);
    return this.__reg.apply(this, args);
};

/**
 * Register handlers
 * @returns {*}
 */
Chain.prototype.view = function() {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift(this.viewAttr);
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

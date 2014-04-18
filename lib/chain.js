'use strict';

/**
 * Chain object, helps to build handlers
 * @constructor
 */
function Chain() {
    var self = this;
    self._options = {
        method: 'GET',
        name: 'index',
        parent: self._ignore,
        xhr: self._ignore
    };
    self._order = 0;
}

Chain.prototype._ignore = '*';
Chain.prototype._subscribeAttr = 'subscribe';
Chain.prototype._viewAttr = 'view';

Chain.prototype._optionsName = ['parent', 'name', 'method', 'xhr'];

Chain.prototype.parent = function(value) {
    this._options.parent = value || this._ignore;
    return this;
};
Chain.prototype.name = function(value) {
    this._options.name = value || 'index';
    return this;
};
Chain.prototype.method = function(value) {
    this._options.method = value ? value.toUpperCase() : 'GET';
    return this;
};
Chain.prototype.xhr = function(value) {
    this._options.xhr = value || this._ignore;
    return this;
};

/**
 * Options setter
 * @param options
 * @returns {*}
 */
Chain.prototype.options = function(options) {
    var self = this;
    self._optionsName.forEach(function(name) {
        self[name](options[name]);
    });
    return self;
};

/**
 * Returns sorted list of callbacks by name, parent, method.
 * @param options
 * @returns {*}
 */
Chain.prototype.getCallbacks = function(options) {
    var callbacks = {},
        result = [],
        self = this;
    var callbacksObjects = self.__getCallbacksObjects(self._viewAttr, options);
    if (!callbacksObjects.length) return [];
    callbacksObjects = callbacksObjects.concat(self.__getCallbacksObjects(self._subscribeAttr, options, true));
    callbacksObjects.forEach(function(obj) {
        callbacks[obj.order] = obj.callbacks;
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
    args.unshift(this._subscribeAttr);
    return this.__reg.apply(this, args);
};

/**
 * Register handlers
 * @returns {*}
 */
Chain.prototype.view = function() {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift(this._viewAttr);
    return this.__reg.apply(this, args);
};

Chain.prototype.__reg = function(type) {
    var callbacks = Array.prototype.slice.call(arguments, 1);
    var self = this;
    if (!callbacks.length) {
        throw TypeError('required at least 1 callback');
    }
    callbacks.forEach(function(fn) {
        if ('function' == typeof fn) return;
        throw new TypeError("required callback functions of 'function' type");
    });

    if (!self['_' + type]) self['_' + type] = {};
    var obj = self['_' + type];
    self._optionsName.forEach(function(name, i) {
        var option = self._options[name];
        if (!obj[option]) {
            if (i == self._optionsName.length - 1) {
                obj[option] = {
                    order: self._order++,
                    callbacks: callbacks
                };
            } else {
                obj[option] = {};
            }
        }
        obj = obj[option];
    });
    return this;
};

Chain.prototype.__getCallbacksObjects = function(type, options, all) {
    var self = this;
    if (self['_' + type]) {
        var callbacksPaths = [self['_' + type]];
        self._optionsName.forEach(function(name, i) {
            var tempPaths = [];
            callbacksPaths.forEach(function(path) {
                var param = options[name];
                if (all) {
                    if (path[self._ignore]) {
                        tempPaths.push(path[self._ignore]);
                    }
                    if (param && param !== self._ignore && path[param]) {
                        tempPaths.push(path[param]);
                    }
                } else {
                    if ((param !== self._ignore) && path[param]) {
                        tempPaths.push(path[param]);
                    } else {
                        if (path[self._ignore]) {
                            tempPaths.push(path[self._ignore]);
                        }
                    }
                }

            });
            callbacksPaths = tempPaths;
        });
        return callbacksPaths;
    }

    return [];
};

module.exports = Chain;
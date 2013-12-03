/**
 * Module dependencies.
 */

var assert = require('assert')
    , connect = require('connect')
    ,traversal = require('../');

function MockRequest(url, method) {
    this.url = url;
    this.method = method;
}

describe('Resource register tests: ', function () {
    it('Try to register resource without root resource registration', function (done) {
        var app = traversal(connect());
        try {
            app.registerResource('test', {testAttr: 1});
            assert.fail();
        } catch(e) {
            assert.ok(e);
            assert.ok(!app.initResource('test', new MockRequest('test', 'GET'), 'test'));
        }
        done();
    });

    it('Register `test` and `testItem` resource', function (done) {
        var app = traversal(connect());
        app.registerRootResource({
            children: ['test'],
            testAttr: 1,
            testMethod: function() { return this.testAttr + 1}
        });
        app.registerResource('test', {
            child: ['testItem'],
            testAttr2: 2
        });
        app.registerResource('testItem', {
            getId: function() { return parseInt(this.name) }
        });

        var root = app.initResource('root', new MockRequest('test', 'GET'), 'test');
        assert.equal(root.testAttr, 1);
        assert.equal(root.testMethod(), 2);
        assert.ok(!root.parent);
        assert.equal(root.name, 'test');
        assert.equal(root.req.url, 'test');
        assert.equal(root.req.method, 'GET');
        var test = root.get('test');
        assert.equal(test.name, 'test');
        assert.equal(test.req.url, 'test');
        assert.equal(test.parent, root);
        assert.equal(test.testAttr2, 2);
        var testItem = test.get('123');
        assert.equal(testItem.name, '123');
        assert.equal(testItem.req.url, 'test');
        assert.equal(testItem.parent, test);
        assert.equal(testItem.getId(), 123);
        done();
    });
});
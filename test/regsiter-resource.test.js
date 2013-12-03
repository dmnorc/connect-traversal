/**
 * Module dependencies.
 */

var assert = require('assert')
    , connect = require('connect')
    ,traversal = require('../');


describe('Resource register tests: ', function () {
    it('Try to initialize with not a connect instance', function (done) {
        try {
            traversal({});
            assert.fail();
        } catch(e) {
            assert.ok(e);
        }
        done();
    });
    it('Try to set as root unregistered resource', function (done) {
        var travers = traversal(connect());
        try {
            travers.setRootResource('rootResource');
            assert.fail();
        } catch(e) {
            assert.ok(e);
        }
        done();
    });

    it('Register `testResource` and `testItemResource` resource', function (done) {
        var travers = traversal(connect());
        travers.registerResource('rootResource', {
            children: {'test': 'testResource'},
            testAttr: 1,
            testMethod: function() { return this.testAttr + 1}
        });
        travers.registerResource('testResource', {
            child: 'testItemResource',
            testAttr2: 2
        });
        travers.registerResource('testItemResource', {
            child: 'asd',
            children: {'test': 'asd'},
            getId: function() { return parseInt(this.name) }
        });
        travers.setRootResource('rootResource');

        var root = travers.initResource('rootResource', 'test');
        assert.equal(root.testAttr, 1);
        assert.equal(root.testMethod(), 2);
        assert.ok(!root.parent);
        assert.equal(root.name, 'test');
        var test = root.get('test');
        assert.equal(test.name, 'test');
        assert.equal(test.parent, root);
        assert.equal(test.testAttr2, 2);
        var testItem = test.get('123');
        assert.equal(testItem.name, '123');
        assert.equal(testItem.parent, test);
        assert.equal(testItem.getId(), 123);

        try {
            testItem.get('123')
            assert.fail();
        } catch(e) {
            assert.ok(e);
        }

        try {
            testItem.get('test')
            assert.fail();
        } catch(e) {
            assert.ok(e);
        }
        done();
    });
});
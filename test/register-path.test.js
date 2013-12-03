/**
 * Module dependencies.
 */

var assert = require('assert')
    ,connect = require('connect')
    ,request = require('supertest')
    ,traversal = require('../');

describe('Unregistered path test: ', function () {
    it('try to register path for unregistered resource', function (done) {
        var app = traversal(connect());
        try {
            app.registerResourcePath('test', {}, function(req, res){
                res.send('123');
            });
            assert.fail();
        } catch (e) {
            assert.ok(e);
        }
        done();
    });
});

describe('Path tests: ', function () {
    var app = traversal(connect());

    before(function(done){
        app.registerRootResource({
            children: ['test'],
            testAttr: 1
        });
        app.registerResource('test', {
            testAttr2: 2
        });

        app.registerResourcePath('root', {}, function(req, res){
            assert.ok(req.resource);
            res.setHeader("Content-Length", 1);
            res.write("1");
            res.end();
        });
        app.registerResourcePath('root', {method: 'POST'}, function(req, res){
            assert.ok(req.resource);
            res.setHeader("Content-Length", 1);
            res.write("2");
            res.end();
        });
        app.registerResourcePath('root', {method: 'POST', name: 'xxx'}, function(req, res){
            assert.ok(req.resource);
            res.setHeader("Content-Length", 1);
            res.write("3");
            res.end();
        });
        app.registerResourcePath('test', {}, function(req, res){
            res.send('123');
        });

        done();
    })

    it('path request', function (done) {
        request(app)
            .get('/')
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                assert.equal(res.text, "1");
                done()
            });
    });

    it('path request with specific HTTP method', function(done) {
        request(app)
            .post('/')
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                assert.equal(res.text, "2");
                done()
            });
    });

    it('path request with specific HTTP method and path name', function(done) {
        request(app)
            .post('/xxx')
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                assert.equal(res.text, "3");
                done()
            });
    });
});
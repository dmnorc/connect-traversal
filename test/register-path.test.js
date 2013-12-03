/**
 * Module dependencies.
 */

var assert = require('assert')
    ,connect = require('connect')
    ,request = require('supertest')
    ,traversal = require('../');

describe('Unregistered path test: ', function () {
    it('try to register path for unregistered resource', function (done) {
        var travers = traversal(connect());
        try {
            travers.registerResourcePath('testResource', {}, function(req, res){});
            assert.fail();
        } catch (e) {
            assert.ok(e);
        }
        travers.registerResource('testResource', {
            testAttr2: 2
        });
        try {
            travers.registerResourcePath('testResource', {}, function(req, res){});
            assert.fail();
        } catch (e) {
            assert.ok(e);
        }

        travers.setRootResource('testResource');

        try {
            travers.registerResourcePath('asd', {}, function(req, res){});
            assert.fail();
        } catch (e) {
            assert.ok(e);
        }

        try {
            travers.registerResourcePath('testResource', {});
            assert.fail();
        } catch (e) {
            assert.ok(e);
        }

        try {
            travers.registerResourcePath('testResource', {}, 'asd');
            assert.fail();
        } catch (e) {
            assert.ok(e);
        }
        done();
    });
});

describe('Path tests: ', function () {
    var app = connect();
    var travers = traversal(app);

    before(function(done){
        travers.registerResource('rootResource', {
            children: {'test': 'testResource', 'par': 'parResource'},
            testAttr: 1
        });
        travers.registerResource('testResource', {
            children: {'par': 'parResource'},
            testAttr2: 2
        });
        travers.registerResource('parResource', {});
        travers.setRootResource('rootResource');

        travers.registerResourcePath('rootResource', {}, function(req, res){
            assert.equal(req.resource.resource, 'rootResource');
            assert.ok(!req.subpath);
            assert.ok(!req.pathName);
            res.setHeader("Content-Length", 1);
            res.write("1");
            res.end();
        });
        travers.registerResourcePath('rootResource', {method: 'post'}, function(req, res){
            assert.equal(req.resource.resource, 'rootResource');
            assert.ok(!req.pathName);
            assert.ok(!req.subpath);
            res.setHeader("Content-Length", 1);
            res.write("2");
            res.end();
        });
        travers.registerResourcePath('rootResource', {method: 'POST', name: 'xxx'}, function(req, res){
            assert.ok(req.resource);
            assert.equal(req.resource.resource, 'rootResource');
            assert.equal(req.pathName, 'xxx');
            assert.ok(req.subpath);
            res.setHeader("Content-Length", 1);
            res.write("3");
            res.end();
        });
        travers.registerResourcePath('testResource', {}, function(req, res){
            assert.equal(req.resource.resource, 'testResource');
            assert.ok(!req.pathName);
            assert.ok(!req.subpath);
            assert.equal(req.resource.parent.resource, 'rootResource');
            res.setHeader("Content-Length", 1);
            res.write("4");
            res.end();
        });

        travers.registerResourcePath('parResource', {parent: 'testResource'}, function(req, res){
            assert.ok(req.resource);
            assert.ok(!req.pathName);
            assert.ok(!req.subpath);
            assert.equal(req.resource.parent.resource, 'testResource');
            res.setHeader("Content-Length", 1);
            res.write("5");
            res.end();
        });

        done();
    })

    it('request to Resource', function (done) {
        request(app)
            .get('/')
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                assert.equal(res.text, "1");
                done()
            });
    });

    it('request to Resource with invalid path name', function (done) {
        request(app)
            .get('/foo')
            .expect(404)
            .end(function(err, res){
                assert.equal(res.status , 404);
                done()
            });
    });

    it('request to Resource with specified HTTP method', function(done) {
        request(app)
            .post('/')
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                assert.equal(res.text, "2");
                done()
            });
    });

    it('request to Resource with specified HTTP method and path name', function(done) {
        request(app)
            .post('/xxx/123')
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                assert.equal(res.text, "3");
                done()
            });
    });

    it('request to children Resource', function(done) {
        request(app)
            .post('/test')
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                assert.equal(res.text, "4");
                done()
            });
    });

    it('request to Resource with parent differs from specified parent', function(done) {
        request(app)
            .post('/par')
            .expect(404)
            .end(function(err, res){
                assert.equal(res.status , 404);
                done();
            });
    });

    it('request to children Resource with specified parent', function(done) {
        request(app)
            .post('/test/par')
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                assert.equal(res.text, "5");
                done()
            });
    });
});
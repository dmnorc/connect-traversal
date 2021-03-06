/**
 * Module dependencies.
 */

var assert = require('assert')
    ,connect = require('connect')
    ,request = require('supertest')
    ,traversal = require('../');

describe('Unregistered path test: ', function () {
    before(function(done){
        traversal.clear();
        done();
    });

    var app = connect();
    app.use(traversal.middleware);

    it('request without Root Resource', function (done) {
        request(app)
            .get('/')
            .expect(404, done);
    });

    it('try to register path for unregistered resource', function (done) {
        traversal.registerResource('testResource', {
            testAttr2: 2
        });
        try {
            traversal.getResourceChain('testResource').view(function(req, res){});
            assert.fail();
        } catch (e) {
            assert.ok(e);
        }

        try {
            traversal.getResourceChain('asd').view(function(req, res){});
            assert.fail();
        } catch (e) {
            assert.ok(e);
        }

        traversal.setRootResource('testResource');

        try {
            traversal.getResourceChain('testResource').view();
            assert.fail();
        } catch (e) {
            assert.ok(e);
        }

        try {
            traversal.getResourceChain('testResource').view('asd');
            assert.fail();
        } catch (e) {
            assert.ok(e);
        }
        done();
    });
});

describe('Path tests: ', function () {
    var app = connect();
    app.use(traversal.middleware);

    before(function(done){
        traversal.clear();
        traversal.registerResource('rootResource', {
            children: {'test': 'testResource', 'par': 'parResource', 'no': 'noCallbacksResource'},
            testAttr: 1
        });
        traversal.registerResource('testResource', {
            children: {'par': 'parResource'},
            testAttr2: 2
        });
        traversal.registerResource('parResource', {});
        traversal.registerResource('noCallbacksResource', {});
        traversal.setRootResource('rootResource');
        traversal.getResourceChain('rootResource').xhr(false).view(function(req, res){
            assert.equal(req.resource.resource, 'rootResource');
            assert.ok(!req.subpath);
            assert.ok(!req.pathname);
            res.setHeader("Content-Length", 1);
            res.write("1");
            res.end();
        });
        traversal.getResourceChain('rootResource').method('post').view(function(req, res){
            assert.equal(req.resource.resource, 'rootResource');
            assert.ok(!req.pathname);
            assert.ok(!req.subpath);
            res.setHeader("Content-Length", 1);
            res.write("2");
            res.end();
        });
        traversal.getResourceChain('rootResource').method('POST').name('xxx').view(function(req, res){
            assert.ok(req.resource);
            assert.equal(req.resource.resource, 'rootResource');
            assert.equal(req.pathname, 'xxx');
            assert.equal(req.buildResourceUrl(req.resource, 'xxx'), req.url);
            assert.ok(req.subpath);
            res.setHeader("Content-Length", 1);
            res.write("3");
            res.end();
        });
        traversal.getResourceChain('testResource').method('*').view(function(req, res, next){
            req.checkPrev = true;
            next();
        }, function(req, res){
            assert.equal(req.resource.resource, 'testResource');
            assert.ok(!req.pathname);
            assert.ok(!req.subpath);
            assert.ok(req.checkPrev);
            assert.equal(req.resource.parent.resource, 'rootResource');
            res.setHeader("Content-Length", 1);
            res.write("4");
            res.end();
        });

        traversal.getResourceChain('parResource').method('*').subscribe(function(req, res, next){
            req.checkPrev = true;
            next();
        });

        traversal.getResourceChain('parResource').method('*').parent('testResource').xhr(true).view(function(req, res){
            assert.ok(req.resource);
            assert.ok(!req.pathname);
            assert.ok(!req.subpath);
            assert.ok(req.checkPrev);
            assert.equal(req.buildResourceUrl(req.resource), req.url);
            assert.equal(req.resource.parent.resource, 'testResource');
            assert.equal(req.resource.parent.resource, req.resource.traverseTo('testResource').resource);
            assert.equal(req.resource.parent.parent.resource, req.resource.traverseTo('rootResource').resource);
            assert.ok(!req.resource.traverseTo('parResource'));
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
                request(app)
                    .get('/')
                    .set('X-Requested-With', 'XMLHttpRequest')
                    .expect(404)
                    .end(done);
            });
    });

    it('request to Resource without callbacks', function (done) {
        request(app)
            .get('/no')
            .expect(404, done);
    });

    it('request to Resource with invalid path name', function (done) {
        request(app)
            .get('/foo/bar')
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
            .post('/xxx')
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
            .set('X-Requested-With', 'XMLHttpRequest')
            .expect(200)
            .end(function(err, res){
                if (err) return done(err);
                assert.equal(res.text, "5");
                done()
            });
    });

    it('request to children Resource with specified parent', function(done) {
        request(app)
            .post('/test/par')
            .expect(404, done);
    });
});
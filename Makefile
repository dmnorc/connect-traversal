REPORTER = spec

test:
	@mocha --reporter $(REPORTER)

test-cov: lib-cov
	@CONNECT_TRAVERSAL_COV=1 $(MAKE) -s test REPORTER=html-cov > coverage.html

lib-cov:
	@jscoverage lib lib-cov

.PHONY: test test-cov
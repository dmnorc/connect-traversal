Traversal for Connect application. v0.3 [![Build Status](https://travis-ci.org/dmnorc/connect-traversal.png)](https://travis-ci.org/dmnorc/connect-traversal)
=================
[![NPM](https://nodei.co/npm/connect-traversal.png?stars&downloads)](https://nodei.co/npm/connect-traversal/)

connect-traversal is a middleware for Connect and Express framework that allows to use URL traversal instead of URL dispatching.

Traversal mechanism is more powerful then Url dispatching and used in popular frameworks such as Rails, Pyramid.

For registering new resource just call method where you should specify unique resource name and object with your methods and properties.
traversal.registerResource('resourceName', {...});

Resource prototype has methods and properties that can be overridden.

Properties:
```
key: - Resource key
parent: parent Resource
options: custom properties can be set here
resource: resourceName - unique id of resource.
children: {'key': 'resourceName'} - map of (key, resource id) determining children resources through fixed key.
child: 'resourceName' - child resource that can be created through a custom id-like key.
```
Methods:
```
init() - method that triggering in constructor. Here can be specified special actions.
childValidate(key) - method allows to create special rules for key validation.
```
After registration, you can retrieve instance.
```
var resource = traversal.initResource('resourceName', 'key', parentResource, options);
```
And retrieve for example child resource by key that was specified in children property.
```
var childResource  = resource.get('key'); // childResource.parent == resource
```

Example:
```
var traversal = require('connect-traversal');

var newsResource = {
  getNews: function() {
    // Logic depends on parent resource.
    if (this.parent.resource == 'userResource') {
      // parent resource is UserResource
      var userId = this.parent.key
      // get news for user...
    } else {
      // parent resource is RootResource
      // get common news for all users...
    }
  }
}
traversal.registerResource('newsResource', newsResource);

var userResource = {
  children: {'news': 'newsResource'},
  getUser: function() {
    ...
  }
}
traversal.registerResource('userResource', userResource);

var usersResource = {
  child: 'userResource',
  childValidate: function(key) {
    return !!key.match(/\d+/);
  }
}
traversal.registerResource('usersResource', usersResource);

var rootResource = {
  children: {
    'users': 'usersResource',
    'news': 'newsResource'
  }
};
traversal.registerResource('rootResource', rootResource);
...
var root = traversal.initResource('rootResource');
var user = root.get('users').get('123'); // userResource with key '123'
var news1 = root.get('news') // newsResource with parent rootResource
var news2 = user.get('news') // newsResource with parent userResource with key '123'
```

For auto-generating resource chain based on the url in Connect application (in other words to include traversing into Connect-Express app), this app should use traversal middleware.
```
var traversal = require('connect-traversal');
app.use(traversal.middleware);
```
Also handlers should be registered:
.method(method) - specify HTTP method for handlers
.parent(resourceName) - specify resource parent for handler.
.name(resourceName) - specify additional name for handler.
.only() - triggers only the most appropriate handler in chain.
.all() - this is additional parent subscribers for all child handlers.
```
traversal.getResourceChain('resourceName')
    .all(callback1, callback2, ...) // triggers for all child only()  with any name, method, parent
    .method('get').all(callback1, callback2, ...) // triggers for all child only() with 'get' method
    .name('some-name').only(callback1, callback2, ...) // triggers for name 'some-name' and 'get' method.
    .parent('SomeResource').only(callback1, callback2, ...) // to additional for above only. Only these handlers trigger for for name 'some-name', 'get' method and parent 'SomeResource'
```
options object where can be specified HTTP method, parent resource and name appendix for filtering and special behavior.
{method, parent, name}
```
// this callbacks will trigger on GET /users/user/123, but for POST 404 will be thrown.
traversal.getResourceChain('userResource').all(function(req, res, next) {
    Subscriber for any userResource path.
    req.user = req.resource.getUser();
    next();
}).method('get').only(function(req, res) {
  var userResource = req.resource //userResource for user 123
  
  var parent = resource.parent //UsersResource
  parent.createUser({id: '222'});
  var anotherUserResource = parent.get('222'); //userResource for user 222
  // req.buildResourceUrl(userResource) is '/users/user/123'
  // req.buildResourceUrl(userResource, 'blabla') is '/users/user/123/blabla'
  // req.buildResourceUrl(userResource.parent) is '/users/'
});

// will trigger for POST /users/create with special appendix path name only
traversal.getResourceChain('usersResource').method('post').name('create').only(function(req, res) {
    // req.pathname = 'create'
    var resource = req.resource //usersResource
});

// will trigger for GET /users/random/222/333 with special appendix path name only
traversal.getResourceChain('usersResource').method('get').name('random').only(function(req, res) {
  // req.pathname == 'random'
  // req.resource //UsersResource
  // also contains subpath list
  // req.subpath == ['222', '333']
  var resource = req.resource //usersResource
  res.send('users');
});

// will trigger on GET, POST, any HTTP method /users/123/news
// but not for /news because of specified parent resource.
traversal.getResourceChain('newsResource').method('*').parent('userResource').only(function(req, res) {
  var resource = req.resource // newsResource
  resource.parent // userResource
  res.send(resource.getNews());
});
```




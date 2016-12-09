var
  should = require('should'),
  Promise = require('bluebird'),
  sinon = require('sinon'),
  sandbox = sinon.sandbox.create(),
  Request = require('kuzzle-common-objects').Request,
  BadRequestError = require('kuzzle-common-objects').errors.BadRequestError,
  ForbiddenError = require('kuzzle-common-objects').errors.ForbiddenError,
  UnauthorizedError = require('kuzzle-common-objects').errors.UnauthorizedError,
  Kuzzle = require('../../../../lib/api/kuzzle'),
  rewire = require('rewire'),
  FunnelController = rewire('../../../../lib/api/controllers/funnelController');

describe('funnelController.processRequest', () => {
  var
    kuzzle,
    processRequest;

  before(() => {
    kuzzle = new Kuzzle();
    processRequest = FunnelController.__get__('processRequest');
  });

  beforeEach(() => {
    sandbox.stub(kuzzle.repositories.token, 'verifyToken', () => {
      return Promise.resolve({
        userId: 'user'
      });
    });
    sandbox.stub(kuzzle.internalEngine, 'get').returns(Promise.resolve({}));
    return kuzzle.services.init({whitelist: []})
      .then(() => {
        kuzzle.funnel.init();
      });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should reject the promise if no controller is specified', () => {
    var object = {
      action: 'create'
    };

    var request = new Request(object);

    return should(processRequest(kuzzle, kuzzle.funnel, request)).be.rejectedWith(BadRequestError);
  });

  it('should reject the promise if no action is specified', () => {
    var object = {
      controller: 'write'
    };

    var request = new Request(object);

    return should(processRequest(kuzzle, kuzzle.funnel, request)).be.rejectedWith(BadRequestError);
  });

  it('should reject the promise if the controller doesn\'t exist', () => {
    var object = {
      controller: 'toto',
      action: 'create'
    };

    var request = new Request(object);

    return should(processRequest(kuzzle, kuzzle.funnel, request)).be.rejectedWith(BadRequestError);
  });

  it('should reject the promise if the action doesn\'t exist', () => {
    var object = {
      controller: 'write',
      action: 'toto'
    };

    var request = new Request(object);

    return should(processRequest(kuzzle, kuzzle.funnel, request)).be.rejectedWith(BadRequestError);
  });

  it('should reject the promise with UnauthorizedError if an anonymous user is not allowed to execute the action', () => {
    kuzzle.repositories.token.verifyToken.restore();
    sandbox.stub(kuzzle.repositories.user, 'load').returns(Promise.resolve({_id: -1, isActionAllowed: sandbox.stub().returns(Promise.resolve(false))}));
    sandbox.stub(kuzzle.repositories.token, 'verifyToken').returns(Promise.resolve({userId: -1}));

    return should(processRequest(kuzzle, kuzzle.funnel, new Request({controller: 'document', index: '@test', action: 'get'})))
      .be.rejectedWith(UnauthorizedError);
  });

  it('should reject the promise with UnauthorizedError if an authenticated user is not allowed to execute the action', () => {
    kuzzle.repositories.token.verifyToken.restore();
    sandbox.stub(kuzzle.repositories.user, 'load').returns(Promise.resolve({_id: 'user', isActionAllowed: sandbox.stub().returns(Promise.resolve(false))}));
    sandbox.stub(kuzzle.repositories.token, 'verifyToken').returns(Promise.resolve({user: 'user'}));

    return should(processRequest(kuzzle, kuzzle.funnel, new Request({controller: 'document', index: '@test', action: 'get'})))
      .be.rejectedWith(ForbiddenError);
  });

  it('should resolve the promise if everything is ok', () => {
    var request = new Request({
      requestId: 'requestId',
      controller: 'index',
      action: 'list',
      collection: 'collection'
    });

    kuzzle.repositories.token.verifyToken.restore();
    sandbox.stub(kuzzle.repositories.user, 'load').returns(Promise.resolve({_id: 'user', isActionAllowed: sandbox.stub().returns(Promise.resolve(true))}));
    sandbox.stub(kuzzle.repositories.token, 'verifyToken').returns(Promise.resolve({user: 'user'}));
    sandbox.stub(kuzzle.funnel.controllers.index, 'list').returns(Promise.resolve());

    return processRequest(kuzzle, kuzzle.funnel, request);
  });
});

'use.strict'

const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

module.exports = function ExpressApiBuilder(options) {

    let supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
        app = express(),
        router = express.Router(),
        postDeploySteps = {};
        self = this;

    this.environemnt = undefined;

    app.use(bodyParser.json({
        type: 'application/json'
    }));
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use((req, res, next) => {
        console.log('***** ENV middleware %s', req.path);
        if(self.environemnt) {
            let route = req.path.replace('/', '');
            req.env = this.environemnt[route].variables;
        } else {
            req.env = {};
        }
        next();
    });
    app.use('/', router);

    self.addPostDeployStep = function (name, stepFunction) {
        if (typeof name !== 'string') {
            throw new Error('addPostDeployStep requires a step name as the first argument');
        }
        if (typeof stepFunction !== 'function') {
            throw new Error('addPostDeployStep requires a function as the second argument');
        }
        if (postDeploySteps[name]) {
            throw new Error(`Post deploy hook "${name}" already exists`);
        }
        postDeploySteps[name] = stepFunction;
    };

    self.addPostDeployConfig = function (stageVarName, prompt, configOption) {

    };

    self.postDeploy = function (options, environmentDetails, utils) {
        const steps = Object.keys(postDeploySteps),
            stepResults = {},
            executeStepMapper = function (acc, stepName) {
                acc.push(Promise.resolve()
                    .then(() => postDeploySteps[stepName](options, environmentDetails, utils))
                    .then(result => stepResults[stepName] = result));
                return acc;
            };
        if (!steps.length) {
            return Promise.resolve(false);
        }
        let promises = steps.reduce(executeStepMapper, []);
        return Promise.all(promises).then(() => stepResults);
    };

    self.defineEnvironment = function(environemnt) {
        self.environemnt = environemnt;
    };

    setUpHandler = function (method) {
        let m = method.toLowerCase();
        self[m] = function (route, handler, options) {
            let canonicalRoute = route;
            if (!/^\//.test(canonicalRoute)) {
                canonicalRoute = '/' + route;
            }

            switch (m) {
            case 'get':
                router.get(canonicalRoute, handler);
                break;
            case 'post':
                router.post(canonicalRoute, handler);
                break;
            case 'put':
                router.put(canonicalRoute, handler);
                break;
            case 'delete':
                router.delete(canonicalRoute, handler);
                break;
            case 'head':
                router.head(canonicalRoute, handler);
                break;
            case 'patch':
                router.patch(canonicalRoute, handler);
                break;
            }
        };
    };
    ['ANY'].concat(supportedMethods).forEach(setUpHandler);
    app.listen(3000, () => console.log('Example app listening on port 3000!'))
}

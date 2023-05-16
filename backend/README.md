# Functions split

Boilerplate template for [Serverless](https://serverless.com) allowing to easily separate each function into it's own dedicated file or folder.

The template is using [Typescript](https://www.typescriptlang.org/) with [NodeJS 16.x](https://nodejs.org/) and it uses [esbuild plugin](https://github.com/floydspace/serverless-esbuild/) to reduce each packaged function.

## Project creation

`sls create --template-url https://github.com/DanielMuller/serverless-template-aws-esbuild-typescript/tree/master/ --path my-new-service --name awesome-service`

### Configuration

Create and edit _config/dev.yml_ and _config/production.yml_ to suit your needs.

Run `nvm use` to load the right node version and `npm install` to install all the dependencies.

## File structure

- **events/**  
  Store all events related to testing
- **lib/config.js**  
  Javascript module to build serverless.yml
- **resources/**  
  Contains yml files describing each resource. Definitions can be nested 2 levels deep, in a subfolder describing the AWS resource, like `IamRole/specificServiceRole.yml`.
  The folder name is expected to follow [Serverless convention](https://serverless.com/framework/docs/providers/aws/guide/resources#aws-cloudformation-resource-reference) for naming.
- **src/handlers/**  
  Contains each individual Lambda function (.js) and it's definitions (fct.\*.yml).
  In addition to the usual _handler_ and _event_ definitions, the yml can also hold a specific _resource_ definition related to the function, without the need for an entry in the _resources/_ folder.
- **config/stages/**  
  Stage specific configurations.

## Deploy

`sls deploy` (development) or `sls deploy -s production`

### ESBuild

ESBuild will automatically bundle only the used dependencies and create a unique and smaller bundle for each function.

## Logging

[lambda-log](https://www.npmjs.com/package/lambda-log) provides a more structured way of logging:

```javascript
const log = require('lambda-log')
log.info('Log Tag', { key1: value1, key2: value2 })
```

Which will result in:

```
{"_logLevel":"info","msg":"Log Tag","key1":"value1","key2":"value2","_tags":["log","info"]}
```

You can also add meta data by default:

```
log.options.meta.fct = 'fctName'
log.options.meta.requestId = event.requestContext.requestId
log.options.meta.path = event.path
log.options.meta.sourceIp = event.requestContext.identity.sourceIp
```

import { boot } from 'quasar/wrappers';
import { Amplify } from 'aws-amplify';
import AmplifyVue from '@aws-amplify/ui-vue';
import awsconfig from '../aws-exports';
Amplify.configure(awsconfig);

export default boot(({ router, app }) => {
  app.use(AmplifyVue);
  app.config.globalProperties.$Amplify = Amplify;
  let logLevel = 'INFO';
  if (process.env.DEV || process.env.USER_BRANCH === 'dev') {
    logLevel = 'DEBUG';
  }

  router.beforeResolve(async (to, from, next) => {
    if (to.matched.some((record) => record.meta.requiresAuth)) {
      // eslint-disable-next-line no-unused-vars
      let user;
      return await Amplify.Auth.currentAuthenticatedUser()
        .then((data: any) => {
          if (data && data.signInUserSession) {
            user = data;
          }
          next();
          return;
        })
        .catch((e: Error) => {
          next({
            name: 'Auth',
          });
          return;
        });
    }
    next();
    return;
  });
});

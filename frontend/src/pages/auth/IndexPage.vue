<script setup lang="ts">
import { Authenticator } from '@aws-amplify/ui-vue';
import '@aws-amplify/ui-vue/styles.css';
import { Hub } from 'aws-amplify';
import { useRouter } from 'vue-router';
const router = useRouter();

const listener = (data: any) => {
  switch (data.payload.event) {
    case 'signOut':
      router.push({ name: 'Home' });
      break;
    case 'signIn':
      router.push({ name: 'Admin' });
      break;
    default:
      break;
  }
};

Hub.listen('auth', listener);
</script>
<template lang="pug">
q-page(padding)
  authenticator(:hide-sign-up="true")
    template(v-slot="{ signOut }")
      q-btn(@click="signOut") Sign Out
</template>

<template lang="pug">
q-page(padding)
  q-stepper(
    v-model="stepId"
    vertical
    color="primary"
    animated
    v-if="stepId>0"
  )
    q-step(
      :name="1"
      title="Upload Your Image"
      icon="image"
      :done="stepId > 1"
    )
      q-uploader(
        :disable="uploadUrl==='' || uploadDisabled"
        :url="uploadUrl"
        auto-upload
        method="PUT"
        :send-raw="true"
        style="width:800px;max-width:800px"
        accept=".jpg, .jpeg, .png"
        @rejected="onRejected"
        @uploaded="uploaded"
        @start="uploadDisabled=true"
        @finish="uploadDisabled=false"
      )
      q-stepper-navigation
        q-btn(@click="stepId = 2" color="primary" label="Skip")

    q-step(
      :name="2"
      title="Contact Information"
      icon="person"
      :done="stepId > 2"
    )
      .q-gutter-md(style="max-width:300px")
        q-input(outlined v-model="profile.name" label="Name")
        q-input(outlined v-model="profile.email" label="E-Mail" )
        q-stepper-navigation
          q-btn(@click="saveProfile" color="primary" label="Save" :disabled="!profile.name || !profile.email")

    q-step(
      :name="4"
      title="Done"
      icon="check"
      :done="stepId > 4"
    )
      q-banner.bg-positive.text-white(rounded)
        template(v-slot:avatar)
          q-icon.q-pr-md(name="check_circle" color="white")
          h4 Thanks for your participation.
      q-btn.q-ma-md(:to="{'name':'Home'}" icon="home" color="primary" label="Back to Home")

  .text-center(v-else-if="stepId<0")
      q-banner.bg-negative.text-white(rounded)
        template(v-slot:avatar)
          q-icon.q-pr-md(name="error" color="white")
          h4 Invalid Code Provided
      q-btn.q-ma-md(:to="{'name':'Home'}" icon="home" color="primary" label="Back to Home")

  .text-center(v-else)
    q-spinner(
      color="primary"
      size="3em"
    )
</template>

<script lang="ts" setup>
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';
import { ref } from 'vue';
import { useRoute } from 'vue-router';
interface StepToId {
  new: number;
  image: number;
  profile: number;
  done: number;
}

const stepToId: StepToId = {
  new: 1,
  image: 2,
  profile: 3,
  done: 4,
};
const profile = ref({ name: '', email: '' });
const uploadDisabled = ref(false);
const uploadUrl = ref('');
const uploadKey = ref('');
const stepId = ref(0);
const $q = useQuasar();
function onRejected(rejectedEntries: any) {
  // Notify plugin needs to be installed
  // https://quasar.dev/quasar-plugins/notify#Installation
  $q.notify({
    type: 'negative',
    message: `${rejectedEntries.length} file(s) did not pass validation constraints`,
    position: 'top',
  });
}
function uploaded(info: any) {
  api
    .put(`/participant/${token}`, {
      step: 'image',
      image: { key: uploadKey.value },
    })
    .then((res) => {
      stepId.value = stepToId['image'];
    })
    .catch((e) => {
      $q.notify({
        type: 'negative',
        message: 'Image upload failed, try again',
        position: 'top',
      });
    });
}
function saveProfile() {
  api
    .put(`/participant/${token}`, {
      step: 'profile',
      name: profile.value.name,
      email: profile.value.email,
    })
    .then((res) => {
      api.put(`/participant/${token}`, {
        step: 'done',
      });
      stepId.value = stepToId['done'];
    })
    .catch((e) => {
      $q.notify({
        type: 'negative',
        message: 'Unable to save. Try again',
        position: 'top',
      });
    });
}

const route = useRoute();
const token = route.params.token;
api
  .get(`/participant/${token}`)
  .then((res) => {
    const step: keyof StepToId = res.data.step || 'new';
    if (!step) {
      stepId.value = 1;
      return;
    }
    const stepValue = Number(stepToId[step]);
    if (isNaN(stepValue)) {
      stepId.value = 1;
      return;
    }
    if (stepValue === 1) {
      api.get(`/participant/${token}/uploadUrl`).then((res) => {
        uploadUrl.value = res.data.uploadUrl;
        uploadKey.value = res.data.key;
      });
    }
    stepId.value = stepValue;
  })
  .catch((e) => {
    stepId.value = -1;
  });
</script>

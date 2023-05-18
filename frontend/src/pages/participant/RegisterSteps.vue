<template lang="pug">
q-page(padding)
  .row.justify-end
    q-btn(flat rounded dense size="md" label="en" :color="locale==='en' ? 'black':'primary'" @click="locale='en'")
    q-btn(flat rounded dense size="md" label="fr" :color="locale==='fr' ? 'black':'primary'" @click="locale='fr'")
  q-stepper(
    v-model="stepId"
    vertical
    color="primary"
    animated
    v-if="stepId>0"
  )
    q-step(
      :name="1"
      :title="$t('upload_image')"
      icon="image"
      :done="stepId > 1"
    )
      q-file(
        v-model="fileImage"
        clearable
        filled
        :label="$t('drop_here')"
        color="primary"
        accept=".jpg, .jpeg, .png, image/*"
        @rejected="onRejected"
        style="max-width:400px"
      )
        template(v-slot:prepend)
          q-icon(name="file_upload")

      q-stepper-navigation.q-gutter-md.q-pb-md
        q-btn(@click="stepId = 2" color="secondary" :label="$t('skip')" icon="not_interested")
        q-btn(v-if="img()" @click="upload" color="primary" :label="$t('upload')" icon="upload")

      q-card
        cropper.cropper(:src="img()" :stencil-props="{aspectRatio: 34/21}" @change="change" minWidth="1190" minHeigth="735")

    q-step(
      :name="2"
      :title="$t('contact_information')"
      icon="person"
      :done="stepId > 2"
    )
      .q-gutter-md(style="max-width:300px")
        .text-body2.text-italic {{ $t('contact_disclaimer') }}
        q-input(outlined v-model="profile.name" :label="$t('name')")
        q-input(outlined v-model="profile.email" :label="$t('email')")
        q-stepper-navigation
          q-btn(@click="saveProfile" color="primary" :label="$t('save')" :disabled="!profile.name || !profile.email")
    q-step(
      :name="4"
      :title="$t('done')"
      icon="check"
      :done="stepId > 4"
    )

      h5 {{ $t('thanks') }}
      .text-body(v-html="$t('next_steps')")
      q-btn.q-ma-md(:to="{'name':'Home'}" icon="home" color="primary" :label="$t('back_home')")

  .text-center(v-else-if="stepId<0")
      q-banner.bg-negative.text-white(rounded)
        template(v-slot:avatar)
          q-icon.q-pr-md(name="error" color="white")
          h4 {{ $t('invalid_code') }}
      q-btn.q-ma-md(:to="{'name':'Home'}" icon="home" color="primary" :label="$t('back_home')")

  .text-center(v-else)
    q-spinner(
      color="primary"
      size="3em"
    )
</template>

<script lang="ts" setup>
import 'vue-advanced-cropper/dist/style.css';
import { QFile, useQuasar } from 'quasar';
import { Cropper } from 'vue-advanced-cropper';
import { api } from 'src/boot/axios';
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

interface StepToId {
  new: number;
  image: number;
  profile: number;
  done: number;
}

interface Coordinates {
  width: number;
  height: number;
  left: number;
  top: number;
}
const stepToId: StepToId = {
  new: 1,
  image: 2,
  profile: 3,
  done: 4,
};

const { locale } = useI18n({ useScope: 'global' });
const profile = ref({ name: '', email: '' });
const uploadUrl = ref('');
const uploadKey = ref('');
const stepId = ref(0);
const $q = useQuasar();
const { t } = useI18n();
const fileImage = ref<File | null>(null);
const cropCoordinates = ref<Coordinates>({
  width: 0,
  height: 0,
  left: 0,
  top: 0,
});
function img() {
  if (fileImage.value !== null) {
    return URL.createObjectURL(fileImage.value);
  }
  return '';
}
function change({
  coordinates,
  canvas,
}: {
  coordinates: Coordinates;
  canvas: any;
}) {
  cropCoordinates.value = coordinates;
  if (canvas.width < 1190 || canvas.height < 735) {
    fileImage.value = null;
    $q.notify({
      type: 'negative',
      message: t('image_too_small'),
      position: 'top',
    });
  }
}

function onRejected(rejectedEntries: any) {
  // Notify plugin needs to be installed
  // https://quasar.dev/quasar-plugins/notify#Installation
  $q.notify({
    type: 'negative',
    message: t('image_rejected'),
    position: 'top',
  });
}

async function upload() {
  if (!fileImage.value) {
    return;
  }
  var options = {
    headers: {
      'Content-Type': fileImage.value.type,
    },
  };
  try {
    await api.put(uploadUrl.value, fileImage.value, options);
    uploaded();
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: t('image_upload_error'),
      position: 'top',
    });
  }
}

async function uploaded() {
  await api
    .put(`/participant/${token}`, {
      step: 'image',
      image: { key: uploadKey.value, crop: cropCoordinates.value },
      locale: locale.value,
    })
    .then((res) => {
      stepId.value = stepToId['image'];
    })
    .catch((e) => {
      $q.notify({
        type: 'negative',
        message: t('image_upload_error'),
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
      locale: locale.value,
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
        message: t('save_error'),
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

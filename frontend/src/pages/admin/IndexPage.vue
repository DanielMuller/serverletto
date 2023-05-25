<template lang="pug">
q-page(padding)
  authenticator(:hide-sign-up="true")

  .qa-pa-md(v-if="auth.authStatus==='authenticated'")
    .q-gutter-y-md
      q-tabs.bg-primary.text-white.shadow-2(v-model="tab")
        q-tab(name="qr" icon="qr_code_2" label="Generate Code" :disable="appClosed")
        q-tab(name="list" icon="list" label="List Participants")
        q-tab(name="settings" icon="settings" label="Settings")
        q-tab(@click="auth.signOut" icon="logout" label="Sign Out")
      q-tab-panels(v-model="tab" animated @before-transition="panelChange")
        q-tab-panel(name="qr")
          .column.items-center
            q-btn(label="Generate" @click="newParticipant()" color="positive")
            .qa-pa-md.full-width.text-center(v-if="qrCodeUrl")
              q-img.q-ma-md(:src="qrCodeUrl" style="max-width:400px; max-height:400px")
            q-chip(icon="link" clickable v-if="token" @click="copyUrl" :label="token")
        q-tab-panel(name="settings").q-gutter-md
          q-card(flat bordered)
            q-item
              q-item-section(avatar)
                q-icon(name="lock")
              q-item-section
                q-item-label Application Status
            q-separator
            q-card-section
              .q-gutter-md.row
                q-toggle(@click="updateStatus()" v-model="appClosed" :color="appClosed ? 'negative': 'positive'" checked-icon="lock" unchecked-icon="lock_open" :label="appClosed ? 'Application closed to new partiticpants' : 'Application is running'" size="lg" keep-color)
          q-card(flat bordered)
            q-item
              q-item-section(avatar)
                q-icon(name="email")
              q-item-section
                q-item-label Notifications E-Mails
            q-separator
            q-card-section
              .q-gutter-md.row
                q-input(outlined filled dense v-model="newName" label="Name")
                q-input(outlined filled dense v-model="newEmail" label="E-Mail")
                q-btn(icon="person_add" rounded flat @click="addContact()")
            transition-group(leave-active-class="animated flipOutX")
              q-card-section(v-for="(contact,index) in notificationContacts" :key="contact.param")
                .q-gutter-md.row
                  q-input(outlined filled dense label="Name" v-model="contact.name")
                  q-input(outlined filled dense label="E-Mail" v-model="contact.email")
                  q-btn(icon="save" rounded flat @click="updateContact(index)")
                  q-btn(icon="delete" rounded flat color="negative" @click="deleteContact(index)")
          q-card(flat bordered)
            q-item
              q-item-section(avatar)
                q-icon(name="festival")
              q-item-section
                q-item-label Event
            q-separator
            q-card-section
              .q-gutter-md.column
                .text-body2 Available Languages
                q-option-group(inline v-model="languages" :options="getLanguagesOptions()" color="primary" type="checkbox")
                .text-body2 Default language
                q-option-group(inline v-model="defaultLanguage" :options="availableLanguages()" color="primary")
                .text-body2 Name
                q-input(v-for="l of availableLanguages()" outlined filled :label="`Event Name (${l.value})`" v-model="eventNames[l.value]" :disable="l.disable")
                  template(v-slot:before)
                    .text-body2 {{ l.label }}
                .text-body2 Label on Image
                q-input(v-for="l of availableLanguages()" outlined filled :label="`Label on Image (${l.value})`" v-model="imageLabels[l.value]" :disable="l.disable")
                  template(v-slot:before)
                    .text-body2 {{ l.label }}
                q-btn(icon='save_alt' color="primary" label="Save" @click="updateParams")

        q-tab-panel(name="list")
          q-btn(v-if="hasMore===true" :label="fetchLabel()" @click="listParticipants()" color="positive")
          .q-pa-md
            q-table(:rows="rows" :columns="columns" row-key="participantId" :pagination="{rowsPerPage:50}")
              template(v-slot:body-cell-image="props")
                q-td(:props="props")
                  q-icon.cursor-pointer(v-if="props.value" name="image" size="2em" color="primary" @click="imageSrc=buildSrc(props.value);showImage=true")
  q-dialog(v-model="showImage")
    q-card(style="width: 700px; max-width: 80vw;")
      q-card-section.row.items-center.q-pb-none
        q-space
        q-btn(icon="close" flat round dense v-close-popup)
      q-card-section
        q-img(:src="imageSrc")
</template>
<script setup lang="ts">
import '@aws-amplify/ui-vue/styles.css';
import { useQuasar } from 'quasar';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-vue';
import { ref } from 'vue';
import QRCode from 'qrcode';
import { api } from 'src/boot/axios';
import { copyToClipboard } from 'quasar';
import awsconfig from '../../aws-exports';

const appClosed = ref(false);
const newName = ref('');
const newEmail = ref('');
const auth = useAuthenticator();
const tab = ref('qr');
const qrCodeUrl = ref('');
const token = ref('');
const showImage = ref(false);
const imageSrc = ref('');
const $q = useQuasar();
const languages = ref(['en', 'fr']);
const defaultLanguage = ref('en');
const languagesOptions = [
  {
    label: 'English',
    value: 'en',
  },
  {
    label: 'French',
    value: 'fr',
  },
];
const eventNames = ref<Record<string, string>>({});
const imageLabels = ref<Record<string, string>>({});
function availableLanguages() {
  return languagesOptions.map((el) => {
    return {
      label: el.label,
      value: el.value,
      disable: !languages.value.some((value) => {
        return value === el.value;
      }),
    };
  });
}
function getLanguagesOptions() {
  return languagesOptions.map((el) => {
    return {
      label: el.label,
      value: el.value,
      disable: el.value === defaultLanguage.value,
    };
  });
}

const columns = [
  {
    name: 'participantId',
    required: true,
    label: 'Id',
    field: 'participantId',
  },
  {
    name: 'step',
    required: true,
    label: 'Step',
    field: 'step',
  },
  {
    name: 'createdAt',
    required: true,
    label: 'CreatedAt',
    field: 'createdAt',
  },
  {
    name: 'updatedAt',
    required: true,
    label: 'UpdatedAt',
    field: 'updatedAt',
  },
  {
    name: 'name',
    required: true,
    label: 'Name',
    field: 'name',
  },
  {
    name: 'email',
    required: true,
    label: 'E-Mail',
    field: 'email',
  },
  {
    name: 'image',
    required: true,
    label: 'Image',
    field: 'watermarkImage',
  },
];

const rows = ref([] as any[]);
const notificationContacts = ref([] as any[]);

const lastEvaluatedKey = ref(undefined);
const hasMore = ref(true);
const userUrl = ref('');

function panelChange(newVal: string | number, oldVal: string | number) {
  if (newVal === 'list') {
    rows.value = [];
    listParticipants();
  }
  if (newVal === 'settings') {
    notificationContacts.value = [];
    listContacts();
    listSettings();
  }
}

function buildSrc(watermarkImage?: { bucket: string; key: string }) {
  if (!watermarkImage) {
    return '';
  }
  if (!watermarkImage.key) {
    return '';
  }
  return `https://${awsconfig.domain}/${watermarkImage.key}`;
}

function copyUrl() {
  if (userUrl.value) {
    copyToClipboard(userUrl.value)
      .then(() => {
        $q.notify({
          type: 'positive',
          message: 'URL copied to clipboard',
          position: 'top',
        });
      })
      .catch(() => {
        // fail
      });
  }
}
async function newParticipant() {
  try {
    const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
    const response = await api.post(
      '/participant',
      {},
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
      }
    );
    token.value = response.data.participantId;
    const origin = window.location.origin;
    userUrl.value = `${origin}/participant/${token.value}`;

    QRCode.toDataURL(`${userUrl.value}`, {
      width: 400,
      margin: 0,
    }).then((url) => {
      qrCodeUrl.value = url;
    });
  } catch (e: any) {
    $q.notify({
      type: 'negative',
      message: 'Creation failed',
      caption: e.message,
      position: 'top',
    });
  }
}

function fetchLabel() {
  if (!lastEvaluatedKey.value) {
    return 'Fetch';
  } else {
    return 'More';
  }
}

async function listParticipants() {
  $q.loading.show();
  const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
  const response = await api.get('/participant', {
    params: {
      limit: 50,
      lastEvaluatedKey: lastEvaluatedKey.value,
    },
    headers: { Authorization: `Bearer ${jwtToken}` },
  });
  const items = response.data.items;
  if (response.data.lastEvaluatedKey) {
    lastEvaluatedKey.value = response.data.lastEvaluatedKey.participantId;
  } else {
    lastEvaluatedKey.value = undefined;
    hasMore.value = false;
  }
  rows.value = [...rows.value, ...items];
  $q.loading.hide();
}
async function listContacts() {
  $q.loading.show();
  try {
    const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
    const response = await api.get('/settings/contacts', {
      params: {
        limit: 50,
        lastEvaluatedKey: lastEvaluatedKey.value,
      },
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    const items = response.data.items;
    if (response.data.lastEvaluatedKey) {
      lastEvaluatedKey.value = response.data.lastEvaluatedKey.participantId;
    } else {
      lastEvaluatedKey.value = undefined;
      hasMore.value = false;
    }
    notificationContacts.value = [...notificationContacts.value, ...items];
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: 'Error loading Settings',
      position: 'center',
    });
  }
  $q.loading.hide();
}
async function deleteContact(index: number) {
  $q.loading.show();
  try {
    const contactId = notificationContacts.value[index].param;
    const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
    await api.delete(`/settings/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    notificationContacts.value.length > 0 &&
      notificationContacts.value.splice(notificationContacts.value[index], 1);
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: 'Error adding Contact',
      position: 'center',
    });
  }
  $q.loading.hide();
}
async function updateContact(index: number) {
  const contact = notificationContacts.value[index];
  $q.loading.show();
  try {
    const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
    const response = await api.put(
      `/settings/contacts/${contact.param}`,
      {
        param: contact.param,
        name: contact.name,
        email: contact.email,
      },
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
      }
    );
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: 'Error adding Contact',
      position: 'center',
    });
  }
  $q.loading.hide();
}
async function addContact() {
  $q.loading.show();
  try {
    const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
    const response = await api.post(
      '/settings/contacts',
      {
        name: newName.value,
        email: newEmail.value,
      },
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
      }
    );
    const newContact = response.data;
    notificationContacts.value.unshift(newContact);
    newName.value = '';
    newEmail.value = '';
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: 'Error adding Contact',
      position: 'center',
    });
  }
  $q.loading.hide();
}
async function listSettings() {
  $q.loading.show();
  try {
    const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
    const response = await api.get('/settings/params', {
      params: {
        limit: 50,
        lastEvaluatedKey: lastEvaluatedKey.value,
      },
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    const items = response.data.items;
    if (response.data.lastEvaluatedKey) {
      lastEvaluatedKey.value = response.data.lastEvaluatedKey.participantId;
    } else {
      lastEvaluatedKey.value = undefined;
      hasMore.value = false;
    }
    languages.value = items.languages || ['en', 'fr'];
    defaultLanguage.value = items.defaultLanguage || 'en';
    eventNames.value = items.eventNames || {
      en: 'Name in English',
      fr: 'Nom en français',
    };
    imageLabels.value = items.imageLabels || {
      en: 'Label in English',
      fr: 'Libellé en français',
    };
    appClosed.value = items.appClosed || false;
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: 'Error loading Settings',
      position: 'center',
    });
  }
  $q.loading.hide();
}
async function updateParams() {
  $q.loading.show();
  try {
    const payload: Record<string, string | string[]> = {
      languages: JSON.parse(JSON.stringify(languages.value)),
      defaultLanguage: defaultLanguage.value,
    };
    for (const [k, v] of Object.entries(eventNames.value)) {
      const langKey = `eventNames#${k}`;
      payload[langKey] = v as string;
    }
    for (const [k, v] of Object.entries(imageLabels.value)) {
      const langKey = `imageLabels#${k}`;
      payload[langKey] = v as string;
    }

    const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
    await api.put('/settings/params', payload, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: 'Error adding Contact',
      position: 'center',
    });
  }
  $q.loading.hide();
}
async function updateStatus() {
  $q.loading.show();
  try {
    const payload: Record<string, boolean> = {
      appClosed: appClosed.value,
    };

    const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
    await api.put('/settings/params', payload, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: 'Error changing Status',
      position: 'center',
    });
  }
  $q.loading.hide();
}
</script>

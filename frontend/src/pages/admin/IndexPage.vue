<template lang="pug">
q-page(padding)
  authenticator(:hide-sign-up="true")

  .qa-pa-md(v-if="auth.authStatus==='authenticated'")
    q-gutter-y-md
      q-tabs.bg-primary.text-white.shadow-2(v-model="tab")
        q-tab(name="qr" icon="qr_code_2" label="Generate Code")
        q-tab(name="list" icon="list" label="List Participants")
        q-tab(@click="auth.signOut" icon="logout" label="Sign Out")
      q-tab-panels(v-model="tab" animated)
        q-tab-panel(name="qr")
          .column.items-center
            q-btn(label="Generate" @click="newParticipant()" color="positive")
            .qa-pa-md.full-width.text-center(v-if="qrCodeUrl")
              q-img.q-ma-md(:src="qrCodeUrl" style="max-width:400px; max-height:400px")
            q-chip(icon="link" clickable v-if="token" @click="copyUrl" :label="token")
        q-tab-panel(name="list")
          q-btn(v-if="hasMore===true" :label="fetchLabel()" @click="listParticipants()" color="positive")
          .q-pa-md
            q-table(:rows="rows" :columns="columns" row-key="participantId" :pagination="{rowsPerPage:50}")
              template(v-slot:body-cell-image="props")
                q-icon(v-if="props.value" name="image" size="2em" color="primary" @click="imageSrc=props.value;showImage=true")
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

const auth = useAuthenticator();
const tab = ref('qr');
const qrCodeUrl = ref('');
const token = ref('');
const showImage = ref(false);
const imageSrc = ref('');
const $q = useQuasar();
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
    field: 'imageSrc',
  },
];

const rows = ref([] as any[]);
const lastEvaluatedKey = ref(undefined);
const hasMore = ref(true);
const userUrl = ref('');

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
}
</script>

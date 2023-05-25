<template lang="pug">
q-page(padding)
  authenticator(:hide-sign-up="true")

  .row.justify-end
    q-btn(icon="admin_panel_settings" label="Back to Admin" :to="{name:'Admin'}" color="primary")
  .column.items-center.q-gutter-md(v-if="!drawDone")
    .column.justify-evenly.q-gutter-md
      .text-h2.text-weight-bold.text-center(v-if="eligibileParticipants>0") {{ eligibileParticipants }} Participants
      q-btn(:loading="drawRunning" label="Draw" color="secondary" icon="emoji_events" @click="runDraw()" glossy size="xl" padding="xl lg" :disable="eligibileParticipants===0")
        template(v-slot:loading)
          q-spinner-gears
  .column.items-center.q-gutter-md(v-if="drawDone")
    .row.justify-evenly.q-gutter-md(v-if="winners.length>=1")
      q-card.q-pa-md.bg-yellow-6(style="max-width:300px;" :data-id="winners[0].participantId" @click="showWinner[0]=true")
        q-item
          q-item-section
            q-item-label.text-center
              .text-h5 1st Price
        q-skeleton(height="154px" width="250px" v-if="!showWinner[0]")
        q-img(height="154px" width="250px" :src="buildSrc(winners[0].watermarkImage)" @click="imageSrc=buildSrc(winners[0].watermarkImage);showImage=true" v-else)
        q-card-actions.q-gutter-md(align="right" v-if="!showWinner[0]")
          q-skeleton(type="QBtn")
        q-card-actions.q-gutter-md(align="right" v-else)
          .text-h5 {{ winners[0].name }}
          q-btn.icon-cursor(icon="forward_to_inbox" round color="primary" @click="sendEmail(winners[0].participantId)")

    .row.justify-evenly.q-gutter-md(v-if="winners.length>=2")
      q-card.q-pa-md.bg-blue-grey-2(style="max-width:300px;" :data-id="winners[1].participantId" v-if="winners.length>=2" @click="showWinner[1]=true")
        q-item
          q-item-section
            q-item-label.text-center
              .text-h5 2nd Price
        q-skeleton(height="154px" width="250px" v-if="!showWinner[1]")
        q-img(height="154px" width="250px" :src="buildSrc(winners[1].watermarkImage)" @click="imageSrc=buildSrc(winners[1].watermarkImage);showImage=true" v-else)
        q-card-actions.q-gutter-md(align="right" v-if="!showWinner[1]")
          q-skeleton(type="QBtn")
        q-card-actions.q-gutter-md(align="right" v-else)
          .text-h5 {{ winners[1].name }}
          q-btn.icon-cursor(icon="forward_to_inbox" round color="primary" @click="sendEmail(winners[1].participantId)")
      q-card.q-pa-md.bg-amber-9(style="max-width:300px;" :data-id="winners[2].participantId" v-if="winners.length>=3" @click="showWinner[2]=true")
        q-item
          q-item-section
            q-item-label.text-center
              .text-h5 3rd Price
        q-skeleton(height="154px" width="250px" v-if="!showWinner[2]")
        q-img(height="154px" width="250px" :src="buildSrc(winners[2].watermarkImage)" @click="imageSrc=buildSrc(winners[2].watermarkImage);showImage=true" v-else)
        q-card-actions.q-gutter-md(align="right" v-if="!showWinner[2]")
          q-skeleton(type="QBtn")
        q-card-actions.q-gutter-md(align="right" v-else)
          .text-h5 {{ winners[2].name }}
          q-btn.icon-cursor(icon="forward_to_inbox" round color="primary" @click="sendEmail(winners[2].participantId)")
    .row.justify-evenly.q-gutter-md(v-if="winners.length>3")
      q-card.q-pa-md(style="max-width:300px;" v-for="(item, index) in winners.slice(3)" :key="item.participantId" :data-id="item.participantId" @click="showWinner[index+3]=true")
        q-item
          q-item-section
            q-item-label.text-center
              .text-h5 {{ index+4 }}th
        q-skeleton(height="154px" width="250px" v-if="!showWinner[index+3]")
        q-img(height="154px" width="250px" :src="buildSrc(winners[index+3].watermarkImage)" @click="imageSrc=buildSrc(winners[index+3].watermarkImage);showImage=true" v-else)
        q-card-actions.q-gutter-md(align="right" v-if="!showWinner[index+3]")
          q-skeleton(type="QBtn")
        q-card-actions.q-gutter-md(align="right" v-else)
          .text-h5 {{ winners[index+3].name }}
          q-btn.icon-cursor(icon="forward_to_inbox" round color="primary" @click="sendEmail(winners[index+3].participantId)")
    q-dialog(v-model="showImage" full-width full-height)
      q-card
        q-card-section.row.items-center.q-pb-none
          q-space
          q-btn(icon="close" flat round dense v-close-popup)
        q-card-section
          q-img(:src="imageSrc")
</template>

<script setup lang="ts">
import { api } from 'src/boot/axios';
import { onMounted, ref } from 'vue';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-vue';
import { useQuasar } from 'quasar';
import awsconfig from '../../aws-exports';

const showImage = ref(false);
const imageSrc = ref('');
const imageName = ref('');
const drawRunning = ref(false);
const drawDone = ref(false);
const eligibileParticipants = ref(0);
const auth = useAuthenticator();
const $q = useQuasar();
const winners = ref<any[]>([]);
const showWinner = ref<boolean[]>([]);
function runDraw() {
  drawRunning.value = true;
  drawDone.value = false;
  const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
  api
    .get('/settings/raffle/draw', {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
    .then((res) => {
      winners.value = res.data.items;
      setTimeout(() => {
        // we're done, we reset loading state
        drawRunning.value = false;
        drawDone.value = true;
      }, 3000);
    })
    .catch((e) => {
      $q.notify({
        type: 'negative',
        message: 'Error Drawing Winners',
        position: 'center',
      });
    });
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
function sendEmail(participantId: string): void {
  console.log(participantId);
  const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
  api
    .post(
      '/settings/raffle/notify',
      {
        participantId,
      },
      {
        headers: { Authorization: `Bearer ${jwtToken}` },
      }
    )
    .then((res) => {
      $q.notify({
        type: 'positive',
        message: 'Notification Sent',
        position: 'center',
      });
    })
    .catch((e) => {
      $q.notify({
        type: 'negative',
        message: 'Error Sending Notification',
        position: 'center',
      });
    });
}

onMounted(() => {
  setTimeout(() => {
    const jwtToken = auth.user.signInUserSession.accessToken.jwtToken;
    api
      .get('/settings/raffle/count', {
        headers: { Authorization: `Bearer ${jwtToken}` },
      })
      .then((res) => {
        eligibileParticipants.value = res.data.count;
      })
      .catch((e) => {
        console.error(e);
      });
  }, 1000);
});
</script>

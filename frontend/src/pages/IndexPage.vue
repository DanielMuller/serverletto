<template lang="pug">
q-page.column.items-center.justify-evenly
  .text-h1.text-weight-bolder(style="font-size:10vmin") Serverletto
  .text-h6.text-weight-medium(style="font-size:5vmin") powered by
  .text-h1.text-weight-bold(style="font-size:10vmin") InstaGururoid
  polaroid-image(image="/serverlessguru-logo.svg")
    p From ServerlessGuru
    p with
    q-icon(name="favorite" style="color: #ff0000; font-size: 3em;")
</template>
<script>
import PolaroidImage from 'components/PolaroidImage.vue';
export default {
  name: 'IndexPage',
  components: {
    PolaroidImage,
  },
};
</script>
